import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Recognized ATS domains ──────────────────────────────────────────
// Exact matches and suffix matches. Returns ats_type string or null.
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

// Explicitly blocked job aggregators — never follow these
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

    // Fetch source with employer
    const { data: source, error: srcErr } = await supabase
      .from("employer_sources")
      .select("*, employers(id, name, website_domain)")
      .eq("id", employer_source_id)
      .single();

    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const crawlUrl = source.jobs_list_url || source.careers_home_url;
    if (!crawlUrl) {
      return new Response(JSON.stringify({ error: "No URL configured for this source" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start crawl run
    const { data: crawlRun } = await supabase
      .from("crawl_runs")
      .insert({ employer_source_id, status: "RUNNING" })
      .select("id")
      .single();

    const crawlRunId = crawlRun?.id;
    let jobsFound = 0, jobsAdded = 0, jobsUpdated = 0;
    let atsSourcesDiscovered = 0;
    const errors: string[] = [];

    try {
      // Scrape the page
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: crawlUrl,
          formats: ["markdown", "html", "links"],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResp.json();
      if (!scrapeResp.ok) {
        throw new Error(`Firecrawl error: ${JSON.stringify(scrapeData)}`);
      }

      // Rate limit: wait after Firecrawl call
      await delay(500);

      const links: string[] = scrapeData.data?.links || scrapeData.links || [];
      const domain = source.employers?.website_domain || "";
      const employerId = source.employers?.id;

      console.log(`Scraped ${links.length} links from ${crawlUrl}`);

      // ── Partition links ─────────────────────────────────────────
      const sameDomainJobLinks: string[] = [];
      // Group cross-domain ATS links by their ATS board base URL
      const atsLinksByBoard: Map<string, { atsType: string; links: string[] }> = new Map();

      for (const link of links) {
        try {
          const u = new URL(link);
          const host = u.hostname.replace(/^www\./, "").toLowerCase();

          // Skip aggregators always
          if (isBlockedAggregator(host)) continue;

          // Basic filters (static assets, blocked path segments)
          if (!passesBasicFilters(u.pathname)) continue;

          const isSameDomain = host === domain || host.endsWith(`.${domain}`);

          if (isSameDomain) {
            // Same-domain: apply existing job-path heuristics
            if (looksLikeJobPath(u.pathname)) {
              sameDomainJobLinks.push(link);
            }
          } else {
            // Cross-domain: only accept recognized ATS
            const atsType = recognizeAts(host);
            if (!atsType) continue;

            // Build a board key from origin (e.g. "https://boards.greenhouse.io")
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

      for (const jobUrl of cappedSameDomain) {
        await upsertJobPosting(supabase, jobUrl, employerId, employer_source_id, errors);
      }

      // ── Process cross-domain ATS links ──────────────────────────
      for (const [boardOrigin, { atsType, links: atsLinks }] of atsLinksByBoard) {
        // Derive a careers_home_url for the ATS board
        const boardUrl = new URL(boardOrigin);
        // For greenhouse: boards.greenhouse.io/companyslug → use first link's path root
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

        // Look up existing employer_source for this employer + ATS board
        const { data: existingAtsSources } = await supabase
          .from("employer_sources")
          .select("id, policy_status, ats_type")
          .eq("employer_id", employerId)
          .eq("ats_type", atsType)
          .ilike("careers_home_url", `${boardOrigin}%`);

        let atsSource = existingAtsSources?.[0];

        if (!atsSource) {
          // Auto-create with PENDING status
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

        // Only process links if the ATS source is ACTIVE
        if (atsSource.policy_status !== "ACTIVE") {
          console.log(`ATS source ${atsType} is ${atsSource.policy_status}, skipping ${atsLinks.length} links`);
          continue;
        }

        // Process ATS links (cap at 50 per board)
        const cappedAtsLinks = atsLinks.slice(0, 50);
        jobsFound += cappedAtsLinks.length;

        for (const jobUrl of cappedAtsLinks) {
          await upsertJobPosting(supabase, jobUrl, employerId, atsSource.id, errors);
          await delay(100); // gentle rate limit between DB ops
        }
      }

      // Count results
      const allResults = await countResults(errors);
      jobsAdded = allResults.added;
      jobsUpdated = allResults.updated;

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
// Tracks added/updated via closure-free approach using errors array for error reporting
let _added = 0, _updated = 0;

async function upsertJobPosting(
  supabase: ReturnType<typeof createClient>,
  jobUrl: string,
  employerId: string,
  employerSourceId: string,
  errors: string[],
) {
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
    _updated++;
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
      extraction_method: "link_discovery",
    });

    if (insertErr) {
      errors.push(`Insert ${jobUrl}: ${insertErr.message}`);
    } else {
      _added++;
    }
  }
}

function countResults(_errors: string[]) {
  const result = { added: _added, updated: _updated };
  // Reset for next invocation (edge functions are long-lived)
  _added = 0;
  _updated = 0;
  return Promise.resolve(result);
}
