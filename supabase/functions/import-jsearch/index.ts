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

function deriveDomain(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return undefined;
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

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const rapidApiKey = Deno.env.get("RAPIDAPI_JSEARCH_KEY");
        const supabase = createClient(supabaseUrl, serviceKey);

        if (!rapidApiKey) {
            return new Response(JSON.stringify({ error: "RAPIDAPI_JSEARCH_KEY secret is missing" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const body = await req.json().catch(() => ({}));
        const { source_id } = body;

        let query = supabase.from("job_api_sources").select("*").eq("provider", "jsearch").eq("status", "active");
        if (source_id) {
            query = query.eq("id", source_id);
        }
        const { data: sources, error: srcErr } = await query;
        if (srcErr || !sources || sources.length === 0) {
            return new Response(JSON.stringify({ error: "No active jsearch sources found." }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const results: any[] = [];
        let globalAbort = false;
        let globalAbortReason = '';

        for (const source of sources) {
            if (globalAbort) {
                console.log(`Skipping source ${source.name} due to global abort: ${globalAbortReason}`);
                results.push({ source: source.name, status: 'skipped', reason: globalAbortReason });
                continue;
            }

            // Inter-source delay
            if (results.length > 0) {
                await delay(3000);
            }

            console.log(`Starting JSearch import for ${source.name}...`);

            const { data: run, error: runErr } = await supabase.from("job_import_runs").insert({
                source_id: source.id,
                provider: "jsearch",
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
                const searchQuery = config.query || "jobs in sofia";
                const country = config.country || null;
                const datePosted = config.date_posted || "week";
                const maxPages = Math.min(config.num_pages || 1, 3); // Cap at 3 pages to conserve credits
                let page = 1;
                let hasMore = true;

                while (hasMore && pagesFetched < maxPages) {
                    if (globalAbort) {
                        console.log(`Global abort during pagination for ${source.name}`);
                        break;
                    }

                    const params = new URLSearchParams();
                    params.set("query", searchQuery);
                    params.set("page", String(page));
                    params.set("num_pages", "1"); // Always fetch 1 page at a time for credit control
                    if (country) params.set("country", country);
                    params.set("date_posted", datePosted);
                    if (config.employment_types) params.set("employment_types", config.employment_types);
                    if (config.work_from_home === true) params.set("work_from_home", "true");
                    if (config.radius) params.set("radius", String(config.radius));

                    const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;
                    console.log(`Fetching JSearch page=${page}, query="${searchQuery}"`);

                    const resp = await fetch(url, {
                        method: "GET",
                        headers: {
                            "x-rapidapi-key": rapidApiKey,
                            "x-rapidapi-host": "jsearch.p.rapidapi.com",
                        }
                    });

                    // Check for quota/rate-limit errors
                    if (resp.status === 429 || resp.status === 402) {
                        const errText = await resp.text();
                        globalAbortReason = `API quota exceeded (HTTP ${resp.status})`;
                        globalAbort = true;
                        console.error(`${globalAbortReason}: ${errText}`);
                        errors.push(globalAbortReason);
                        break;
                    }

                    // Check rate-limit headers
                    const requestsRemaining = parseInt(resp.headers.get('x-ratelimit-requests-remaining') || '999');
                    if (requestsRemaining <= 0) {
                        globalAbortReason = `API requests exhausted (x-ratelimit-requests-remaining: ${requestsRemaining})`;
                        globalAbort = true;
                        console.error(globalAbortReason);
                        errors.push(globalAbortReason);
                        // Still process this page's data
                    }

                    if (!resp.ok) {
                        const errText = await resp.text();
                        throw new Error(`JSearch API error ${resp.status}: ${errText}`);
                    }

                    const respData = await resp.json();
                    console.log(`JSearch response status: ${respData.status}, data length: ${(respData.data || []).length}, request_id: ${respData.request_id || 'n/a'}`);
                    if (!respData.data || respData.data.length === 0) {
                        console.log(`JSearch raw response keys: ${Object.keys(respData).join(', ')}`);
                    }
                    const jobs = respData.data || [];

                    if (jobs.length === 0) {
                        hasMore = false;
                        break;
                    }

                    pagesFetched++;
                    recordsReceived += jobs.length;

                    let pageSkipped = 0;

                    for (const job of jobs) {
                        try {
                            const externalJobId = job.job_id || '';
                            if (!externalJobId) {
                                recordsFailed++;
                                continue;
                            }

                            // Check for existing import item
                            const { data: existingItem } = await supabase
                                .from('job_import_items')
                                .select('id, status, job_posting_id')
                                .eq('provider', 'jsearch')
                                .eq('source_id', source.id)
                                .eq('external_source_job_id', externalJobId)
                                .maybeSingle();

                            if (existingItem && existingItem.status === 'inserted') {
                                recordsSkippedDuplicate++;
                                pageSkipped++;
                                continue;
                            }

                            const title = job.job_title || "Untitled";
                            const rawApplyUrl = job.job_apply_link;
                            if (!rawApplyUrl) {
                                recordsFailed++;
                                errors.push(`Job ${externalJobId} missing apply URL`);
                                continue;
                            }

                            const applyUrl = rawApplyUrl;
                            const canonicalUrlStr = cleanCanonicalUrl(rawApplyUrl);

                            const companyName = job.employer_name || 'Unknown Company';
                            const companyDomain = deriveDomain(job.employer_website);

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
                                // Map JSearch fields
                                const cityRaw = job.job_city || null;
                                const countryRaw = job.job_country || null;

                                let postedAt = null;
                                if (job.job_posted_at_datetime_utc) {
                                    try { postedAt = new Date(job.job_posted_at_datetime_utc).toISOString(); } catch { /* skip */ }
                                }

                                let workMode = null;
                                if (job.job_is_remote === true) {
                                    workMode = 'remote';
                                }

                                let empType = null;
                                if (job.job_employment_type) {
                                    const typeMap: Record<string, string> = {
                                        'FULLTIME': 'full-time',
                                        'PARTTIME': 'part-time',
                                        'CONTRACTOR': 'contract',
                                        'INTERN': 'internship',
                                    };
                                    empType = typeMap[job.job_employment_type] || job.job_employment_type.toLowerCase();
                                }

                                const { data: newPost, error: ipErr } = await supabase.from('job_postings').insert({
                                    employer_id: empId,
                                    canonical_url: canonicalUrlStr,
                                    apply_url: applyUrl,
                                    title: title,
                                    location_city: cityRaw,
                                    location_slug: normalizeCitySlug(cityRaw),
                                    location_country: countryRaw,
                                    posted_at: postedAt,
                                    last_scraped_at: new Date().toISOString(),
                                    source_type: 'EXTERNAL',
                                    ingestion_channel: 'api',
                                    external_source_provider: 'jsearch',
                                    external_source_job_id: externalJobId,
                                    source_url: rawApplyUrl,
                                    raw_source_payload: job,
                                    status: 'ACTIVE',
                                    approval_status: 'PENDING',
                                    work_mode: workMode,
                                    employment_type: empType,
                                    salary_min: job.job_min_salary || null,
                                    salary_max: job.job_max_salary || null,
                                    salary_period: job.job_salary_period || null,
                                    currency: job.job_salary_currency || null,
                                }).select('id').single();

                                if (ipErr) {
                                    recordsFailed++;
                                    errors.push(`Insert posting failed: ${ipErr.message}`);
                                    continue;
                                }

                                postingId = newPost.id;
                                finalDedupeStatus = 'inserted';
                                recordsInserted++;

                                // Store job description
                                const descText = job.job_description || null;
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
                                provider: 'jsearch',
                                external_source_job_id: externalJobId,
                                job_posting_id: postingId,
                                source_url: rawApplyUrl,
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

                    // Duplicate circuit breaker
                    if (jobs.length > 0) {
                        const dupeRatio = pageSkipped / jobs.length;
                        if (dupeRatio > 0.8) {
                            console.log(`High duplicate ratio (${(dupeRatio * 100).toFixed(0)}%) for ${source.name}, stopping pagination`);
                            hasMore = false;
                            break;
                        }
                    }

                    if (globalAbort) break;

                    if (jobs.length < 10) {
                        hasMore = false;
                    } else {
                        page++;
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
