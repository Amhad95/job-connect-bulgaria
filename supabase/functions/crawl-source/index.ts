import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Kill switch: only proceed if ACTIVE
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
    const errors: string[] = [];

    try {
      // Use Firecrawl to scrape the jobs list page
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

      // Extract job links from the page
      const links: string[] = scrapeData.data?.links || scrapeData.links || [];
      const domain = source.employers?.website_domain || "";
      
      // Filter links that look like job postings (same domain, exclude static assets)
      const STATIC_EXTS = /\.(jpg|jpeg|png|gif|svg|webp|ico|pdf|css|js|woff|woff2|ttf|eot|mp4|mp3|zip|xml)$/i;
      const BLOCKED_PATH_SEGMENTS = ["/wp-content/", "/wp-includes/", "/assets/", "/static/", "/images/", "/img/", "/media/", "/uploads/", "/fonts/"];

      const jobLinks = links.filter((link: string) => {
        try {
          const u = new URL(link);
          const host = u.hostname.replace(/^www\./, "");
          // Must be same domain or subdomain
          if (host !== domain && !host.endsWith(`.${domain}`)) return false;
          const path = u.pathname.toLowerCase();
          // Exclude static files
          if (STATIC_EXTS.test(path)) return false;
          // Exclude known non-job paths
          if (BLOCKED_PATH_SEGMENTS.some(seg => path.includes(seg))) return false;
          // Exclude very short paths (homepage, section roots)
          if (path.split("/").filter(Boolean).length < 2) return false;
          // Must look like a job posting path
          return (
            path.includes("/job") ||
            path.includes("/position") ||
            path.includes("/vacancy") ||
            path.includes("/opening") ||
            path.includes("/karieri") ||
            path.includes("/rolle") ||
            path.includes("/apply") ||
            // Allow career subpages with an ID-like segment
            (path.includes("/career") && /\/[a-z0-9-]{4,}/.test(path))
          );
        } catch {
          return false;
        }
      }).slice(0, 50);

      jobsFound = jobLinks.length;

      // For each job link, create a job_posting record
      for (const jobUrl of jobLinks) {
        const { data: existing } = await supabase
          .from("job_postings")
          .select("id")
          .eq("canonical_url", jobUrl)
          .maybeSingle();

        if (existing) {
          // Update last_seen_at
          await supabase
            .from("job_postings")
            .update({ last_seen_at: new Date().toISOString(), status: "ACTIVE" })
            .eq("id", existing.id);
          jobsUpdated++;
        } else {
          // Extract a title from the URL path
          const pathParts = new URL(jobUrl).pathname.split("/").filter(Boolean);
          const titleGuess = pathParts[pathParts.length - 1]
            ?.replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled Position";

          const { error: insertErr } = await supabase.from("job_postings").insert({
            employer_id: source.employers?.id,
            employer_source_id,
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
            jobsAdded++;
          }
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
