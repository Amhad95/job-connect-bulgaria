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
        const apiKey = Deno.env.get("THEIRSTACK_API_KEY");
        const supabase = createClient(supabaseUrl, serviceKey);

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "THEIRSTACK_API_KEY secure env variable is missing" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const body = await req.json().catch(() => ({}));
        const { source_id } = body;

        let query = supabase.from("job_api_sources").select("*").eq("provider", "theirstack").eq("status", "active");
        if (source_id) {
            query = query.eq("id", source_id);
        }
        const { data: sources, error: srcErr } = await query;
        if (srcErr || !sources || sources.length === 0) {
            return new Response(JSON.stringify({ error: "No active TheirStack sources found." }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const results = [];
        let globalAbort = false; // Abort all sources on 402/429

        for (const source of sources) {
            // If a previous source hit 402/429, stop immediately
            if (globalAbort) {
                results.push({ source: source.name, status: 'skipped', reason: 'global_abort_no_credits' });
                continue;
            }

            console.log(`Starting import for ${source.name}...`);

            const { data: run, error: runErr } = await supabase.from("job_import_runs").insert({
                source_id: source.id,
                provider: "theirstack",
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
                let page = source.config_json?.page || 0;
                const limit = source.config_json?.limit || 25;
                let hasMore = true;

                while (hasMore && pagesFetched < 5) { // Reduced cap: 5 pages max
                    const payload = { ...source.config_json, page, limit };

                    console.log(`Fetching TheirStack page ${page}`);
                    const tsResp = await fetch("https://api.theirstack.com/v1/jobs/search", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });

                    // Global abort on 402 (no credits) or 429 (rate limit)
                    if (tsResp.status === 402 || tsResp.status === 429) {
                        const errText = await tsResp.text();
                        const reason = tsResp.status === 402 ? 'no_credits_remaining' : 'rate_limited';
                        console.error(`TheirStack ${tsResp.status}: ${errText} — aborting ALL sources`);
                        globalAbort = true;

                        await supabase.from("job_import_runs").update({
                            status: "failed",
                            finished_at: new Date().toISOString(),
                            pages_fetched: pagesFetched,
                            records_received: recordsReceived,
                            records_inserted: recordsInserted,
                            records_updated: recordsUpdated,
                            records_skipped_duplicate: recordsSkippedDuplicate,
                            records_failed: recordsFailed,
                            error_summary: `${reason}: ${errText.slice(0, 200)}`
                        }).eq("id", run.id);

                        results.push({ source: source.name, status: 'failed', reason, inserted: recordsInserted });
                        break; // exit page loop — globalAbort will skip remaining sources
                    }

                    if (!tsResp.ok) {
                        const errText = await tsResp.text();
                        throw new Error(`TheirStack API error ${tsResp.status}: ${errText}`);
                    }

                    const tsData = await tsResp.json();
                    const jobs = tsData.data || tsData.jobs || [];

                    if (jobs.length === 0) {
                        hasMore = false;
                        break;
                    }

                    pagesFetched++;
                    recordsReceived += jobs.length;
                    let pageSkipped = 0; // Track duplicates per page

                    for (const job of jobs) {
                        try {
                            const jobId = job.id || job.job_id;
                            if (!jobId) {
                                recordsFailed++;
                                continue;
                            }

                            const { data: existingItem } = await supabase
                                .from('job_import_items')
                                .select('id, status, job_posting_id')
                                .eq('provider', 'theirstack')
                                .eq('source_id', source.id)
                                .eq('external_source_job_id', jobId)
                                .maybeSingle();

                            if (existingItem && existingItem.status === 'inserted') {
                                recordsSkippedDuplicate++;
                                pageSkipped++;
                                continue;
                            }

                            const title = job.job_title || job.title || "Untitled";
                            const applyUrl = job.final_url || job.url;
                            if (!applyUrl) {
                                recordsFailed++;
                                errors.push(`Job ${jobId} missing URL`);
                                continue;
                            }

                            const cityRaw = Array.isArray(job.job_location) ? job.job_location[0] : (job.job_location || job.location);
                            const companyName = job.company || job.company_name || 'Unknown Company';

                            const empId = await getOrCreateEmployer(supabase, companyName, job.company_domain);
                            if (!empId) {
                                recordsFailed++;
                                errors.push(`Failed to resolve employer for ${companyName}`);
                                continue;
                            }

                            let finalDedupeStatus = 'inserted';
                            const canonicalUrlStr = applyUrl.split('?')[0].replace(/\/$/, "");

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
                                    external_source_job_id: jobId,
                                }).eq('id', publicDup.id);
                                finalDedupeStatus = 'duplicate_skipped';
                                recordsSkippedDuplicate++;
                                pageSkipped++;
                            } else {
                                let postedAt = null;
                                const rawDate = job.date_posted || job.discovered_at;
                                if (rawDate) {
                                    try { postedAt = new Date(rawDate).toISOString(); } catch (_e) { }
                                }

                                const { data: newPost, error: ipErr } = await supabase.from('job_postings').insert({
                                    employer_id: empId,
                                    canonical_url: canonicalUrlStr,
                                    apply_url: applyUrl,
                                    title: title,
                                    location_city: cityRaw || null,
                                    location_slug: normalizeCitySlug(cityRaw),
                                    posted_at: postedAt,
                                    last_scraped_at: new Date().toISOString(),
                                    source_type: 'EXTERNAL',
                                    ingestion_channel: 'api',
                                    external_source_provider: 'theirstack',
                                    external_source_job_id: jobId,
                                    source_url: job.url || applyUrl,
                                    raw_source_payload: job,
                                    status: 'ACTIVE',
                                    approval_status: 'PENDING',
                                    work_mode: job.remote ? 'remote' : null,
                                    industry: Array.isArray(job.company_industry) ? job.company_industry[0] : job.company_industry,
                                    professional_field: job.job_category || null
                                }).select('id').single();

                                if (ipErr) {
                                    recordsFailed++;
                                    errors.push(`Insert posting failed: ${ipErr.message}`);
                                    continue;
                                }

                                postingId = newPost.id;
                                finalDedupeStatus = 'inserted';
                                recordsInserted++;

                                await supabase.from('job_posting_content').insert({
                                    job_id: postingId,
                                    description_text: job.description || null,
                                    store_mode: 'FULL_TEXT'
                                });
                            }

                            await supabase.from('job_import_items').insert({
                                run_id: run.id,
                                source_id: source.id,
                                provider: 'theirstack',
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

                    // Circuit breaker: stop if >80% of page results were duplicates
                    if (jobs.length > 0) {
                        const dupeRatio = pageSkipped / jobs.length;
                        if (dupeRatio > 0.8) {
                            console.log(`High duplicate ratio (${(dupeRatio * 100).toFixed(0)}%) on page ${page}, stopping pagination for ${source.name}`);
                            hasMore = false;
                            break;
                        }
                    }

                    if (jobs.length < limit) {
                        hasMore = false;
                    } else {
                        page++;
                        await delay(2000);
                    }
                }

                // Don't overwrite if globalAbort already wrote the run status
                if (!globalAbort) {
                    await supabase.from("job_import_runs").update({
                        status: "completed",
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

                    results.push({ source: source.name, status: 'completed', inserted: recordsInserted, skipped: recordsSkippedDuplicate, failed: recordsFailed });
                }

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

            // Delay between sources to avoid rate limits
            if (!globalAbort && sources.indexOf(source) < sources.length - 1) {
                await delay(3000);
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
