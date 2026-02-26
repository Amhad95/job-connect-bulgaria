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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the employer source
    const { data: source, error: srcErr } = await supabase
      .from("employer_sources")
      .select("*, employers(name, website_domain)")
      .eq("id", employer_source_id)
      .single();

    if (srcErr || !source) {
      return new Response(JSON.stringify({ error: "Source not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const robotsUrl = source.robots_url || `https://${source.employers?.website_domain}/robots.txt`;
    let robotsAllowed = true;
    let robotsHash = "";
    let allowedPaths: string[] = [];
    let blockedPaths: string[] = [];
    let notes = "";

    try {
      const resp = await fetch(robotsUrl, {
        headers: { "User-Agent": "BachkamBot/1.0 (+https://bachkam.com)" },
        signal: AbortSignal.timeout(10000),
      });

      if (resp.ok) {
        const text = await resp.text();
        // Simple hash
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        robotsHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

        // Parse robots.txt for our user agent and *
        const lines = text.split("\n");
        let inRelevantBlock = false;

        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          if (trimmed.startsWith("user-agent:")) {
            const agent = trimmed.replace("user-agent:", "").trim();
            inRelevantBlock = agent === "*" || agent.includes("bachkam");
          } else if (inRelevantBlock) {
            if (trimmed.startsWith("disallow:")) {
              const path = trimmed.replace("disallow:", "").trim();
              if (path === "/" || path === "/*") {
                robotsAllowed = false;
                blockedPaths.push(path);
              } else if (path) {
                blockedPaths.push(path);
                // Check if careers paths are blocked
                const careersUrl = source.careers_home_url || "";
                try {
                  const careersPath = new URL(careersUrl).pathname;
                  if (careersPath.startsWith(path)) {
                    robotsAllowed = false;
                  }
                } catch {}
              }
            } else if (trimmed.startsWith("allow:")) {
              const path = trimmed.replace("allow:", "").trim();
              if (path) allowedPaths.push(path);
            }
          }
        }
        notes = `Fetched robots.txt successfully. ${blockedPaths.length} disallow rules found.`;
      } else if (resp.status === 404) {
        // No robots.txt = allowed
        robotsAllowed = true;
        notes = "No robots.txt found (404). Access assumed allowed.";
      } else {
        notes = `robots.txt returned HTTP ${resp.status}`;
        robotsAllowed = false;
      }
    } catch (fetchErr) {
      notes = `Failed to fetch robots.txt: ${fetchErr instanceof Error ? fetchErr.message : "unknown"}`;
      // Conservative: mark as blocked if we can't check
      robotsAllowed = false;
    }

    const result = robotsAllowed ? "PASS" : "FAIL";
    const newStatus = robotsAllowed ? "ACTIVE" : "BLOCKED";
    const policyReason = robotsAllowed ? "robots.txt allows access" : "robots.txt blocks access";

    // Insert policy check record
    await supabase.from("policy_checks").insert({
      employer_source_id,
      robots_snapshot_hash: robotsHash,
      allowed_paths_json: allowedPaths,
      blocked_paths_json: blockedPaths,
      result,
      notes,
    });

    // Update employer source status
    await supabase
      .from("employer_sources")
      .update({
        policy_status: newStatus,
        policy_reason: policyReason,
        robots_last_checked_at: new Date().toISOString(),
      })
      .eq("id", employer_source_id);

    return new Response(
      JSON.stringify({
        employer: source.employers?.name,
        result,
        status: newStatus,
        notes,
        allowed_paths: allowedPaths,
        blocked_paths: blockedPaths,
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
