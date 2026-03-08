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

// Ensure an employer exists or create it
async function getOrCreateEmployer(supabase: any, companyName: string, companyDomain?: string): Promise<string | null> {
    if (!companyName) return null;

    // Try by exact name first
    const { data: existing } = await supabase
        .from('employers')
        .select('id')
        .ilike('name', companyName)
        .limit(1)
        .maybeSingle();

    if (existing) return existing.id;

    // Try by domain if provided
    if (companyDomain) {
        const { data: existingDomain } = await supabase
            .from('employers')
            .select('id')
            .ilike('website_domain', companyDomain)
            .limit(1)
            .maybeSingle();
        if (existingDomain) return existingDomain.id;
    }

    // Create new employer
    const baseSlug = generateSlug(companyName) || 'company';
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const { data: slugCheck } = await supabase.from('employers').select('id').eq('slug', slug).maybeSingle();
        if (!slugCheck) break;
        slug = `${baseSlug}-${counter++}`;
        if (counter > 50) return null; // safety hatch
    }

    const { data: newEmp, error } = await supabase.from('employers').insert({
        name: companyName,
        slug: slug,
        website_domain: companyDomain || null,
        approval_status: 'approved' // auto-approve so jobs show up 
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
        const { source_id } = body; // If provided, run only this source. Else run all active

        // 1. Fetch sources to run
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

        // 2. Iterate each source
        for (const source of sources) {
            console.log(`Starting import for ${source.name}...`);

            // Create run row
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
                const limit = source.config_json?.limit || 100;
                let hasMore = true;

                while (hasMore && pagesFetched < 10) { // Safety cap: max 10 pages per invocation
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

                    if (!tsResp.ok) {
                        const errText = await tsResp.text();
                        throw new Error(`TheirStack API error ${tsResp.status}: ${errText}`);
                    }

                    const tsData = await tsResp.json();
                    const jobs = tsData.data || tsData.jobs || []; // Adapt based on exact shape if needed. TheirStack typically returns a flat list in a data/jobs array

                    if (jobs.length === 0) {
                        hasMore = false;
                        break;
                    }

                    pagesFetched++;
                    recordsReceived += jobs.length;

                    // Process jobs
                    for (const job of jobs) {
                        try {
                            const jobId = job.id || job.job_id;
                            if (!jobId) {
                                recordsFailed++;
                                continue;
                            }

                            // Provider-level dedupe check
                            const { data: existingItem } = await supabase
                                .from('job_import_items')
                                .select('id, status, job_posting_id')
                                .eq('provider', 'theirstack')
                                .eq('source_id', source.id)
                                .eq('external_source_job_id', jobId)
                                .maybeSingle();

                            if (existingItem && existingItem.status === 'inserted') {
                                recordsSkippedDuplicate++;
                                continue;
                            }

                            const title = job.job_title || job.title || "Untitled";
                            const applyUrl = job.final_url || job.url;
                            if (!applyUrl) {
                                recordsFailed++;
                                errors.push(`Job ${jobId} missing URL`);
                                continue;
                            }

                            // Normalization logic
                            const cityRaw = Array.isArray(job.job_location) ? job.job_location[0] : (job.job_location || job.location);
                            const companyName = job.company || job.company_name || 'Unknown Company';

                            const empId = await getOrCreateEmployer(supabase, companyName, job.company_domain);
                            if (!empId) {
                                recordsFailed++;
                                errors.push(`Failed to resolve employer for ${companyName}`);
                                continue;
                            }

                            // Deduplicate across public pool by canonical_url or apply_url
                            let finalDedupeStatus = 'inserted';
                            const canonicalUrlStr = applyUrl.split('?')[0].replace(/\/$/, "");

                            const { data: publicDup } = await supabase
                                .from('job_postings')
                                .select('id')
                                .eq('canonical_url', canonicalUrlStr)
                                .maybeSingle();

                            let postingId = publicDup?.id;

                            if (publicDup) {
                                // Update existing
                                await supabase.from('job_postings').update({
                                    last_seen_at: new Date().toISOString(),
                                    status: 'ACTIVE',
                                    external_source_job_id: jobId,
                                    // Don't overwrite properties like description if it already exists, or we could. Safest is minimal update.
                                }).eq('id', publicDup.id);
                                finalDedupeStatus = 'duplicate_skipped';
                                recordsSkippedDuplicate++;
                            } else {
                                // Insert new
                                let postedAt = null;
                                if (job.date_posted) {
                                    try { postedAt = new Date(job.date_posted).toISOString(); } catch (e) { }
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

                                // Add content row
                                await supabase.from('job_posting_content').insert({
                                    job_id: postingId,
                                    description_text: job.description || null,
                                    store_mode: 'FULL_TEXT'
                                });
                            }

                            // Audit recording
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

                    if (jobs.length < limit) {
                        hasMore = false;
                    } else {
                        page++;
                        // add a small 2s delay between pages
                        await delay(2000);
                    }
                }

                // Mark run completed
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
