import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Recognized ATS domains ──────────────────────────────────────────
const EXACT_ATS: Record<string, string> = {
  "boards.greenhouse.io": "greenhouse",
  "jobs.lever.co": "lever",
  "jobs.smartrecruiters.com": "smartrecruiters",
  "apply.workable.com": "workable",
  "jobs.ashbyhq.com": "ashby",
};

const SUFFIX_ATS: [string, string][] = [
  [".myworkdayjobs.com", "workday"],
  [".recruitee.com", "recruitee"],
  [".breezy.hr", "breezy"],
  [".icims.com", "icims"],
  [".taleo.net", "taleo"],
  [".jobvite.com", "jobvite"],
  [".bamboohr.com", "bamboohr"],
  [".personio.de", "personio"],
  [".greenhouse.io", "greenhouse"],
  [".lever.co", "lever"],
];

const BLOCKED_AGGREGATORS = [
  "indeed.com", "linkedin.com", "glassdoor.com",
  "zaplata.bg", "jobs.bg", "jobtiger.bg",
  "facebook.com", "twitter.com", "instagram.com",
];

function recognizeAts(hostname: string): string | null {
  const h = hostname.replace(/^www\./, "").toLowerCase();
  if (EXACT_ATS[h]) return EXACT_ATS[h];
  for (const [suffix, atsType] of SUFFIX_ATS) {
    if (h.endsWith(suffix)) return atsType;
  }
  return null;
}

function isBlockedAggregator(hostname: string): boolean {
  const h = hostname.replace(/^www\./, "").toLowerCase();
  return BLOCKED_AGGREGATORS.some(d => h === d || h.endsWith(`.${d}`));
}

// ── Shared link filters ─────────────────────────────────────────────
const STATIC_EXTS = /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|css|js|woff|woff2|ttf|eot|mp4|mp3|zip|xml)$/i;
const BLOCKED_PATH_SEGMENTS = [
  "/wp-content/", "/wp-includes/", "/assets/", "/static/",
  "/images/", "/img/", "/media/", "/uploads/", "/fonts/",
];

function passesBasicFilters(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (STATIC_EXTS.test(p)) return false;
  if (BLOCKED_PATH_SEGMENTS.some(seg => p.includes(seg))) return false;
  return true;
}

function looksLikeJobPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.split("/").filter(Boolean).length < 2) return false;
  return (
    p.includes("/job") ||
    p.includes("/position") ||
    p.includes("/vacancy") ||
    p.includes("/opening") ||
    p.includes("/karieri") ||
    p.includes("/rolle") ||
    p.includes("/apply") ||
    (p.includes("/career") && /\/[a-z0-9-]{4,}/.test(p))
  );
}

// ── Rate-limit helper ───────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Job extraction schema for Firecrawl JSON extraction ─────────────
const JOB_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Job title" },
    description: { type: "string", description: "Full job description text" },
    requirements: { type: "string", description: "Job requirements, qualifications, skills needed" },
    benefits: { type: "string", description: "Benefits, perks offered" },
    location_city: { type: "string", description: "City where the job is located" },
    work_mode: { type: "string", enum: ["remote", "hybrid", "onsite"], description: "Work arrangement" },
    employment_type: { type: "string", enum: ["full-time", "part-time", "contract", "internship"], description: "Type of employment" },
    posted_date: { type: "string", description: "Date the job was posted, in ISO 8601 or any parseable date format" },
    deadline_date: { type: "string", description: "Application deadline date" },
    salary_min: { type: "number", description: "Minimum salary" },
    salary_max: { type: "number", description: "Maximum salary" },
    currency: { type: "string", description: "Salary currency code (e.g. BGN, EUR, USD)" },
    department: { type: "string", description: "Department or team" },
    seniority: { type: "string", description: "Seniority level (junior, mid, senior, lead)" },
  },
  required: ["title"],
};

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employer_source_id } = await req.json();
    if (!employer_source_id) {
      return new Response(JSON.stringify({ error: "employer_source_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: source, error: srcErr } = await supabase
      .from("employer_sources")
      .select("*, employers(id, name, website_domain)")
      .eq("id", employer_source_id)
      .single();

    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (source.policy_status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Source is not ACTIVE", status: source.policy_status }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const crawlUrl = source.jobs_list_url || source.careers_home_url;
    if (!crawlUrl) {
      return new Response(JSON.stringify({ error: "No URL configured for this source" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start crawl run
    const { data: crawlRun } = await supabase
      .from("crawl_runs")
      .insert({ employer_source_id, status: "RUNNING" })
      .select("id")
      .single();

    const crawlRunId = crawlRun?.id;
    let jobsFound = 0, jobsAdded = 0, jobsUpdated = 0, jobsExtracted = 0;
    let atsSourcesDiscovered = 0;
    const errors: string[] = [];
    const domain = source.employers?.website_domain || "";
    const employerId = source.employers?.id;

    try {
      // ══════════════════════════════════════════════════════════════
      // PHASE 1: DISCOVER — Use Firecrawl Map API
      // ══════════════════════════════════════════════════════════════
      console.log(`Phase 1: Mapping ${crawlUrl}`);

      const mapResp = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: crawlUrl,
          search: "job position career opening vacancy apply",
          limit: 200,
          includeSubdomains: true,
        }),
      });

      const mapData = await mapResp.json();
      if (!mapResp.ok) {
        throw new Error(`Firecrawl Map error: ${JSON.stringify(mapData)}`);
      }

      await delay(1000); // rate limit after Map call

      const links: string[] = mapData.links || [];
      console.log(`Map discovered ${links.length} URLs from ${crawlUrl}`);

      // ── Partition links ─────────────────────────────────────────
      const sameDomainJobLinks: string[] = [];
      const atsLinksByBoard: Map<string, { atsType: string; links: string[] }> = new Map();

      for (const link of links) {
        try {
          const u = new URL(link);
          const host = u.hostname.replace(/^www\./, "").toLowerCase();

          if (isBlockedAggregator(host)) continue;
          if (!passesBasicFilters(u.pathname)) continue;

          const isSameDomain = host === domain || host.endsWith(`.${domain}`);

          if (isSameDomain) {
            if (looksLikeJobPath(u.pathname)) {
              sameDomainJobLinks.push(link);
            }
          } else {
            const atsType = recognizeAts(host);
            if (!atsType) continue;

            const boardKey = u.origin;
            if (!atsLinksByBoard.has(boardKey)) {
              atsLinksByBoard.set(boardKey, { atsType, links: [] });
            }
            atsLinksByBoard.get(boardKey)!.links.push(link);
          }
        } catch {
          // invalid URL, skip
        }
      }

      // ── Process same-domain links ───────────────────────────────
      const cappedSameDomain = sameDomainJobLinks.slice(0, 50);
      jobsFound += cappedSameDomain.length;

      const newJobIds: string[] = [];

      for (const jobUrl of cappedSameDomain) {
        const result = await upsertJobPosting(supabase, jobUrl, employerId, employer_source_id, errors);
        if (result === "added") { jobsAdded++; newJobIds.push(jobUrl); }
        else if (result === "updated") jobsUpdated++;
      }

      // ── Process cross-domain ATS links ──────────────────────────
      for (const [boardOrigin, { atsType, links: atsLinks }] of atsLinksByBoard) {
        const boardUrl = new URL(boardOrigin);
        let atsCareersUrl = boardOrigin;
        if (atsLinks.length > 0) {
          try {
            const firstUrl = new URL(atsLinks[0]);
            const pathParts = firstUrl.pathname.split("/").filter(Boolean);
            if (pathParts.length > 0) {
              atsCareersUrl = `${boardOrigin}/${pathParts[0]}`;
            }
          } catch {}
        }

        const { data: existingAtsSources } = await supabase
          .from("employer_sources")
          .select("id, policy_status, ats_type")
          .eq("employer_id", employerId)
          .eq("ats_type", atsType)
          .ilike("careers_home_url", `${boardOrigin}%`);

        let atsSource = existingAtsSources?.[0];

        if (!atsSource) {
          const robotsUrl = `${boardUrl.origin}/robots.txt`;
          const { data: newSource, error: insertErr } = await supabase
            .from("employer_sources")
            .insert({
              employer_id: employerId,
              parent_source_id: employer_source_id,
              ats_type: atsType,
              careers_home_url: atsCareersUrl,
              robots_url: robotsUrl,
              policy_status: "PENDING",
              policy_reason: "Auto-discovered ATS board, pending robots.txt check",
            })
            .select("id, policy_status")
            .single();

          if (insertErr) {
            errors.push(`Auto-create ATS source (${atsType}): ${insertErr.message}`);
            continue;
          }

          atsSource = newSource;
          atsSourcesDiscovered++;
          console.log(`Discovered ATS source: ${atsType} at ${atsCareersUrl} (PENDING)`);
        }

        if (atsSource.policy_status !== "ACTIVE") {
          console.log(`ATS source ${atsType} is ${atsSource.policy_status}, skipping ${atsLinks.length} links`);
          continue;
        }

        const cappedAtsLinks = atsLinks.slice(0, 50);
        jobsFound += cappedAtsLinks.length;

        for (const jobUrl of cappedAtsLinks) {
          const result = await upsertJobPosting(supabase, jobUrl, employerId, atsSource.id, errors);
          if (result === "added") { jobsAdded++; newJobIds.push(jobUrl); }
          else if (result === "updated") jobsUpdated++;
          await delay(100);
        }
      }

      // ══════════════════════════════════════════════════════════════
      // PHASE 2: EXTRACT — Scrape job details with JSON extraction
      // ══════════════════════════════════════════════════════════════
      console.log(`Phase 2: Extracting details for jobs without metadata`);

      // Get jobs that need extraction (no last_scraped_at, or newly added)
      const { data: jobsNeedingExtraction } = await supabase
        .from("job_postings")
        .select("id, canonical_url")
        .eq("employer_id", employerId)
        .eq("status", "ACTIVE")
        .is("last_scraped_at", null)
        .limit(20);

      const toExtract = jobsNeedingExtraction || [];
      console.log(`Found ${toExtract.length} jobs needing extraction`);

      for (const job of toExtract) {
        try {
          await delay(1000); // rate limit: 1s between scrape calls

          console.log(`Extracting: ${job.canonical_url}`);
          const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: job.canonical_url,
              formats: ["extract"],
              extract: {
                schema: JOB_EXTRACTION_SCHEMA,
              },
            }),
          });

          const scrapeData = await scrapeResp.json();
          if (!scrapeResp.ok) {
            errors.push(`Scrape ${job.canonical_url}: ${scrapeData.error || scrapeResp.status}`);
            continue;
          }

          const extracted = scrapeData.data?.extract || scrapeData.extract || {};

          if (!extracted.title) {
            console.log(`No data extracted from ${job.canonical_url}`);
            // Still mark as scraped to avoid retrying
            await supabase.from("job_postings").update({
              last_scraped_at: new Date().toISOString(),
              extraction_method: "firecrawl_extract_empty",
            }).eq("id", job.id);
            continue;
          }

          // Parse posted_date
          let postedAt: string | null = null;
          if (extracted.posted_date) {
            try {
              const d = new Date(extracted.posted_date);
              if (!isNaN(d.getTime())) postedAt = d.toISOString();
            } catch {}
          }

          // Update job_postings metadata
          await supabase.from("job_postings").update({
            title: extracted.title,
            location_city: extracted.location_city || null,
            work_mode: extracted.work_mode || null,
            employment_type: extracted.employment_type || null,
            salary_min: extracted.salary_min || null,
            salary_max: extracted.salary_max || null,
            currency: extracted.currency || null,
            department: extracted.department || null,
            seniority: extracted.seniority || null,
            posted_at: postedAt,
            last_scraped_at: new Date().toISOString(),
            extraction_method: "firecrawl_extract",
          }).eq("id", job.id);

          // Upsert job_posting_content
          const contentData = {
            job_id: job.id,
            description_text: extracted.description || null,
            requirements_text: extracted.requirements || null,
            benefits_text: extracted.benefits || null,
            store_mode: (source.policy_mode === "FULL_TEXT_ALLOWED" ? "FULL_TEXT" : "METADATA_ONLY") as "FULL_TEXT" | "METADATA_ONLY",
          };

          const { data: existingContent } = await supabase
            .from("job_posting_content")
            .select("id")
            .eq("job_id", job.id)
            .maybeSingle();

          if (existingContent) {
            await supabase.from("job_posting_content").update(contentData).eq("id", existingContent.id);
          } else {
            await supabase.from("job_posting_content").insert(contentData);
          }

          jobsExtracted++;
          console.log(`Extracted: ${extracted.title} (${extracted.location_city || "no city"}, ${extracted.work_mode || "no mode"})`);

        } catch (extractErr) {
          const msg = extractErr instanceof Error ? extractErr.message : "Extract error";
          errors.push(`Extract ${job.canonical_url}: ${msg}`);
        }
      }

      // Update crawl run
      if (crawlRunId) {
        await supabase.from("crawl_runs").update({
          finished_at: new Date().toISOString(),
          jobs_found: jobsFound,
          jobs_added: jobsAdded,
          jobs_updated: jobsUpdated,
          errors_json: errors.length ? errors : null,
          status: "COMPLETED",
        }).eq("id", crawlRunId);
      }

      // Update source last_crawl_at
      await supabase
        .from("employer_sources")
        .update({ last_crawl_at: new Date().toISOString() })
        .eq("id", employer_source_id);

    } catch (crawlErr) {
      const errMsg = crawlErr instanceof Error ? crawlErr.message : "Unknown crawl error";
      errors.push(errMsg);
      if (crawlRunId) {
        await supabase.from("crawl_runs").update({
          finished_at: new Date().toISOString(),
          errors_json: errors,
          status: "FAILED",
        }).eq("id", crawlRunId);
      }
    }

    return new Response(
      JSON.stringify({
        employer: source.employers?.name,
        jobs_found: jobsFound,
        jobs_added: jobsAdded,
        jobs_updated: jobsUpdated,
        jobs_extracted: jobsExtracted,
        ats_sources_discovered: atsSourcesDiscovered,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helper: upsert a job posting ────────────────────────────────────
async function upsertJobPosting(
  supabase: ReturnType<typeof createClient>,
  jobUrl: string,
  employerId: string,
  employerSourceId: string,
  errors: string[],
): Promise<"added" | "updated" | "error"> {
  const { data: existing } = await supabase
    .from("job_postings")
    .select("id")
    .eq("canonical_url", jobUrl)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("job_postings")
      .update({ last_seen_at: new Date().toISOString(), status: "ACTIVE" })
      .eq("id", existing.id);
    return "updated";
  } else {
    const pathParts = new URL(jobUrl).pathname.split("/").filter(Boolean);
    const titleGuess = pathParts[pathParts.length - 1]
      ?.replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled Position";

    const { error: insertErr } = await supabase.from("job_postings").insert({
      employer_id: employerId,
      employer_source_id: employerSourceId,
      canonical_url: jobUrl,
      apply_url: jobUrl,
      title: titleGuess,
      location_country: "Bulgaria",
      status: "ACTIVE",
      extraction_method: "map_discovery",
    });

    if (insertErr) {
      errors.push(`Insert ${jobUrl}: ${insertErr.message}`);
      return "error";
    }
    return "added";
  }
}
