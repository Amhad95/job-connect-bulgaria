import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_ids } = await req.json();
    if (!Array.isArray(company_ids) || company_ids.length === 0) {
      return new Response(JSON.stringify({ error: "company_ids[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up all active sources for the given companies
    const { data: sources, error: srcErr } = await supabase
      .from("employer_sources")
      .select("id, employer_id, policy_status")
      .in("employer_id", company_ids)
      .eq("policy_status", "ACTIVE");

    if (srcErr) {
      return new Response(JSON.stringify({ error: srcErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activeSources = sources || [];

    // Fire-and-forget: trigger crawl-source for each active source without awaiting
    const functionsUrl = `${supabaseUrl}/functions/v1`;
    let fired = 0;

    for (const source of activeSources) {
      // Non-blocking fetch — we don't await the result
      fetch(`${functionsUrl}/crawl-source`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employer_source_id: source.id }),
      }).catch((err) => {
        console.error(`Fire-and-forget crawl-source failed for ${source.id}:`, err);
      });
      fired++;
    }

    // Return immediately
    return new Response(
      JSON.stringify({
        started: true,
        sources_triggered: fired,
        company_ids_received: company_ids.length,
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
