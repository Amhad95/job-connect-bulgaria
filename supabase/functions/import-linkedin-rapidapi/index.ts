import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeCitySlug(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const lower = raw.trim().toLowerCase();
    const map: Record<string, string> = {
        sofia: "sofia", "софия": "sofia",
        plovdiv: "plovdiv", "пловдив": "plovdiv",
        varna: "varna", "варна": "varna",
        burgas: "burgas", "бургас": "burgas",
        ruse: "ruse", "русе": "ruse", rousse: "ruse",
        "stara zagora": "stara-zagora", "стара загора": "stara-zagora",
        "veliko tarnovo": "veliko-tarnovo", "велико търново": "veliko-tarnovo", "veliko turnovo": "veliko-tarnovo",
        pleven: "pleven", "плевен": "pleven",
        blagoevgrad: "blagoevgrad", "благоевград": "blagoevgrad",
        gabrovo: "gabrovo", "габрово": "gabrovo",
    };
    return map[lower] ?? null;
}

function cleanCanonicalUrl(raw: string): string {
    try {
        const u = new URL(raw);
        const stripPrefixes = ['utm_', 'fbclid', 'gclid', 'ref', 'trk', 'trackingId'];
        for (const key of [...u.searchParams.keys()]) {
            if (stripPrefixes.some(p => key.startsWith(p))) {
                u.searchParams.delete(key);
            }
        }
        let cleaned = u.origin + u.pathname;
        const qs = u.searchParams.toString();
        if (qs) cleaned += '?' + qs;
        return cleaned.replace(/\/$/, '');
    } catch {
        return raw.split('?')[0].replace(/\/$/, '');
    }
}

async function getOrCreateEmployer(supabase: any, companyName: string, companyDomain?: string): Promise<string | null> {
    if (!companyName) return null;

    const { data: existing } = await supabase
        .from('employers')
        .select('id')
        .ilike('name', companyName)
        .limit(1)
        .maybeSingle();

    if (existing) return existing.id;

    if (companyDomain) {
        const { data: existingDomain } = await supabase
            .from('employers')
            .select('id')
            .ilike('website_domain', companyDomain)
            .limit(1)
            .maybeSingle();
        if (existingDomain) return existingDomain.id;
    }

    const baseSlug = generateSlug(companyName) || 'company';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const { data: slugCheck } = await supabase.from('employers').select('id').eq('slug', slug).maybeSingle();
        if (!slugCheck) break;
        slug = `${baseSlug}-${counter++}`;
        if (counter > 50) return null;
    }

    const { data: newEmp, error } = await supabase.from('employers').insert({
        name: companyName,
        slug: slug,
        website_domain: companyDomain || null,
        approval_status: 'approved'
    }).select('id').single();

    if (error) {
        console.error("Error creating employer", error);
        return null;
    }
    return newEmp.id;
}

function deriveDomain(orgUrl?: string): string | undefined {
    if (!orgUrl) return undefined;
    try {
        return new URL(orgUrl).hostname.replace(/^www\./, '');
    } catch {
        return undefined;
    }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const rapidApiKey = Deno.env.get("RAPIDAPI_LINKEDIN_JOBS_KEY");
        const rapidApiHost = Deno.env.get("RAPIDAPI_LINKEDIN_JOBS_HOST") || "linkedin-job-search-api.p.rapidapi.com";
        const supabase = createClient(supabaseUrl, serviceKey);

        if (!rapidApiKey) {
            return new Response(JSON.stringify({ error: "RAPIDAPI_LINKEDIN_JOBS_KEY secret is missing" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const body = await req.json().catch(() => ({}));
        const { source_id } = body;

        let query = supabase.from("job_api_sources").select("*").eq("provider", "linkedin_rapidapi").eq("status", "active");
        if (source_id) {
            query = query.eq("id", source_id);
        }
        const { data: sources, error: srcErr } = await query;
        if (srcErr || !sources || sources.length === 0) {
            return new Response(JSON.stringify({ error: "No active linkedin_rapidapi sources found." }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const results = [];
        let globalAbort = false;
        let globalAbortReason = '';

        for (const source of sources) {
            // Global abort: skip remaining sources if quota exhausted
            if (globalAbort) {
                console.log(`Skipping source ${source.name} due to global abort: ${globalAbortReason}`);
                results.push({ source: source.name, status: 'skipped', reason: globalAbortReason });
                continue;
            }

            // Inter-source delay (skip for first source)
            if (results.length > 0) {
                await delay(3000);
            }

            console.log(`Starting LinkedIn RapidAPI import for ${source.name}...`);

            const { data: run, error: runErr } = await supabase.from("job_import_runs").insert({
                source_id: source.id,
                provider: "linkedin_rapidapi",
                status: "running"
            }).select().single();

            if (runErr || !run) {
                console.error("Failed to create run row", runErr);
                continue;
            }

            let pagesFetched = 0;
            let recordsReceived = 0;
            let recordsInserted = 0;
            let recordsUpdated = 0;
            let recordsSkippedDuplicate = 0;
            let recordsFailed = 0;
            const errors: string[] = [];

            try {
                const config = source.config_json || {};
                const endpoint = config.endpoint || "active-jb-7d";
                const limit = config.limit || 100;
                let offset = config.offset || 0;
                let hasMore = true;
                const maxPages = 5;

                while (hasMore && pagesFetched < maxPages) {
                    if (globalAbort) {
                        console.log(`Global abort during pagination for ${source.name}`);
                        break;
                    }

                    const params = new URLSearchParams();
                    params.set("limit", String(limit));
                    params.set("offset", String(offset));
                    if (config.description_type) params.set("description_type", config.description_type);
                    if (config.location_filter) params.set("location_filter", config.location_filter);
                    if (config.title_filter) params.set("title_filter", config.title_filter);
                    if (config.type_filter) params.set("type_filter", config.type_filter);
                    if (config.agency !== undefined) params.set("agency", String(config.agency));
                    if (config.remote !== undefined) params.set("remote", String(config.remote));
                    if (config.order) params.set("order", config.order);
                    if (config.external_apply_url !== undefined) params.set("external_apply_url", String(config.external_apply_url));

                    const url = `https://${rapidApiHost}/${endpoint}?${params.toString()}`;
                    console.log(`Fetching LinkedIn RapidAPI page offset=${offset}, url=${endpoint}`);

                    const resp = await fetch(url, {
                        method: "GET",
                        headers: {
                            "x-rapidapi-key": rapidApiKey,
                            "x-rapidapi-host": rapidApiHost,
                        }
                    });

                    // Check for quota/rate-limit errors — abort ALL sources
                    if (resp.status === 429 || resp.status === 402) {
                        const errText = await resp.text();
                        globalAbortReason = `API quota exceeded (HTTP ${resp.status})`;
                        globalAbort = true;
                        console.error(`${globalAbortReason}: ${errText}`);
                        errors.push(globalAbortReason);
                        break;
                    }

                    // Check rate-limit headers for remaining quota
                    const jobsRemaining = parseInt(resp.headers.get('x-ratelimit-jobs-remaining') || '999');
                    if (jobsRemaining <= 0) {
                        globalAbortReason = `API quota exhausted (x-ratelimit-jobs-remaining: ${jobsRemaining})`;
                        globalAbort = true;
                        console.error(globalAbortReason);
                        errors.push(globalAbortReason);
                        // Still process this page's data since it was fetched
                    }

                    if (!resp.ok) {
                        const errText = await resp.text();
                        throw new Error(`RapidAPI error ${resp.status}: ${errText}`);
                    }

                    const respData = await resp.json();
                    const jobs = Array.isArray(respData) ? respData : (respData.data || respData.jobs || []);

                    if (jobs.length === 0) {
                        hasMore = false;
                        break;
                    }

                    pagesFetched++;
                    recordsReceived += jobs.length;

                    let pageSkipped = 0;

                    for (const job of jobs) {
                        try {
                            const jobId = String(job.id || job.job_id || '');
                            if (!jobId) {
                                recordsFailed++;
                                continue;
                            }

                            const { data: existingItem } = await supabase
                                .from('job_import_items')
                                .select('id, status, job_posting_id')
                                .eq('provider', 'linkedin_rapidapi')
                                .eq('source_id', source.id)
                                .eq('external_source_job_id', jobId)
                                .maybeSingle();

                            if (existingItem && existingItem.status === 'inserted') {
                                recordsSkippedDuplicate++;
                                pageSkipped++;
                                continue;
                            }

                            const title = job.title || "Untitled";
                            const rawApplyUrl = job.external_apply_url || job.url;
                            if (!rawApplyUrl) {
                                recordsFailed++;
                                errors.push(`Job ${jobId} missing URL`);
                                continue;
                            }

                            const applyUrl = rawApplyUrl;
                            const canonicalUrlStr = cleanCanonicalUrl(rawApplyUrl);

                            const companyName = job.organization || 'Unknown Company';
                            const companyDomain = deriveDomain(job.organization_url || job.linkedin_org_url);

                            const empId = await getOrCreateEmployer(supabase, companyName, companyDomain);
                            if (!empId) {
                                recordsFailed++;
                                errors.push(`Failed to resolve employer for ${companyName}`);
                                continue;
                            }

                            let finalDedupeStatus = 'inserted';
                            const { data: publicDup } = await supabase
                                .from('job_postings')
                                .select('id')
                                .eq('canonical_url', canonicalUrlStr)
                                .maybeSingle();

                            let postingId = publicDup?.id;

                            if (publicDup) {
                                await supabase.from('job_postings').update({
                                    last_seen_at: new Date().toISOString(),
                                    status: 'ACTIVE',
                                }).eq('id', publicDup.id);
                                finalDedupeStatus = 'duplicate_skipped';
                                recordsSkippedDuplicate++;
                                pageSkipped++;
                            } else {
                                const citiesArr = job.cities_derived || job.locations_derived || [];
                                const cityRaw = Array.isArray(citiesArr) ? citiesArr[0] : null;
                                const countriesArr = job.countries_derived || [];
                                const countryRaw = Array.isArray(countriesArr) ? countriesArr[0] : null;

                                let postedAt = null;
                                const rawDate = job.date_posted || job.date_created;
                                if (rawDate) {
                                    try { postedAt = new Date(rawDate).toISOString(); } catch { /* skip */ }
                                }

                                let workMode = null;
                                if (job.remote_derived === true || job.ai_work_arrangement === 'remote') {
                                    workMode = 'remote';
                                } else if (job.ai_work_arrangement === 'hybrid') {
                                    workMode = 'hybrid';
                                } else if (job.ai_work_arrangement === 'onsite') {
                                    workMode = 'onsite';
                                }

                                const empType = Array.isArray(job.employment_type) ? job.employment_type[0] : (job.ai_employment_type || null);

                                const { data: newPost, error: ipErr } = await supabase.from('job_postings').insert({
                                    employer_id: empId,
                                    canonical_url: canonicalUrlStr,
                                    apply_url: applyUrl,
                                    title: title,
                                    location_city: cityRaw || null,
                                    location_slug: normalizeCitySlug(cityRaw),
                                    location_country: countryRaw || null,
                                    posted_at: postedAt,
                                    last_scraped_at: new Date().toISOString(),
                                    source_type: 'EXTERNAL',
                                    ingestion_channel: 'api',
                                    external_source_provider: 'linkedin_rapidapi',
                                    external_source_job_id: jobId,
                                    source_url: job.url || applyUrl,
                                    raw_source_payload: job,
                                    status: 'ACTIVE',
                                    approval_status: 'PENDING',
                                    work_mode: workMode,
                                    employment_type: empType,
                                    seniority: job.seniority || null,
                                    industry: job.linkedin_org_industry || null,
                                    professional_field: job.ai_taxonomies_a_primary_filter || null,
                                }).select('id').single();

                                if (ipErr) {
                                    recordsFailed++;
                                    errors.push(`Insert posting failed: ${ipErr.message}`);
                                    continue;
                                }

                                postingId = newPost.id;
                                finalDedupeStatus = 'inserted';
                                recordsInserted++;

                                const descText = job.description_text || job.description || null;
                                if (descText) {
                                    await supabase.from('job_posting_content').insert({
                                        job_id: postingId,
                                        description_text: descText,
                                        store_mode: 'FULL_TEXT'
                                    });
                                }
                            }

                            await supabase.from('job_import_items').insert({
                                run_id: run.id,
                                source_id: source.id,
                                provider: 'linkedin_rapidapi',
                                external_source_job_id: jobId,
                                job_posting_id: postingId,
                                source_url: job.url,
                                apply_url: applyUrl,
                                dedupe_key: canonicalUrlStr,
                                status: finalDedupeStatus,
                                raw_payload: job
                            });

                        } catch (jobErr) {
                            recordsFailed++;
                            errors.push(`Job loop error: ${jobErr instanceof Error ? jobErr.message : String(jobErr)}`);
                        }
                    }

                    // Duplicate circuit breaker: if >80% of page is dupes, stop paginating
                    if (jobs.length > 0) {
                        const dupeRatio = pageSkipped / jobs.length;
                        if (dupeRatio > 0.8) {
                            console.log(`High duplicate ratio (${(dupeRatio * 100).toFixed(0)}%) for ${source.name}, stopping pagination`);
                            hasMore = false;
                            break;
                        }
                    }

                    // Stop if global abort was triggered by header check
                    if (globalAbort) {
                        break;
                    }

                    if (jobs.length < limit) {
                        hasMore = false;
                    } else {
                        offset += limit;
                        await delay(1500);
                    }
                }

                await supabase.from("job_import_runs").update({
                    status: globalAbort ? "failed" : "completed",
                    finished_at: new Date().toISOString(),
                    pages_fetched: pagesFetched,
                    records_received: recordsReceived,
                    records_inserted: recordsInserted,
                    records_updated: recordsUpdated,
                    records_skipped_duplicate: recordsSkippedDuplicate,
                    records_failed: recordsFailed,
                    error_summary: errors.length > 0 ? errors.slice(0, 10).join("; ") : null
                }).eq("id", run.id);

                await supabase.from("job_api_sources").update({
                    last_run_at: new Date().toISOString()
                }).eq("id", source.id);

                results.push({ source: source.name, status: globalAbort ? 'aborted' : 'completed', inserted: recordsInserted, skipped: recordsSkippedDuplicate, failed: recordsFailed });

            } catch (runErr) {
                console.error("Run failed", runErr);
                await supabase.from("job_import_runs").update({
                    status: "failed",
                    finished_at: new Date().toISOString(),
                    error_summary: runErr instanceof Error ? runErr.message : String(runErr),
                    pages_fetched: pagesFetched,
                    records_received: recordsReceived,
                    records_inserted: recordsInserted,
                    records_updated: recordsUpdated,
                    records_skipped_duplicate: recordsSkippedDuplicate,
                    records_failed: recordsFailed,
                }).eq("id", run.id);

                results.push({ source: source.name, status: 'failed', error: runErr instanceof Error ? runErr.message : String(runErr) });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
