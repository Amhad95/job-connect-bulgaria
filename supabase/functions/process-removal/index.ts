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
    const { removal_request_id } = await req.json();
    if (!removal_request_id) {
      return new Response(JSON.stringify({ error: "removal_request_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the removal request
    const { data: request, error: reqErr } = await supabase
      .from("removal_requests")
      .select("*")
      .eq("id", removal_request_id)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark matching job postings as INACTIVE
    const { data: affectedJobs } = await supabase
      .from("job_postings")
      .update({ status: "INACTIVE" })
      .eq("canonical_url", request.url)
      .select("id");

    // Add to blocked_urls
    let domain = "";
    try {
      domain = new URL(request.url).hostname.replace(/^www\./, "");
    } catch {}

    await supabase.from("blocked_urls").insert({
      url_pattern: request.url,
      domain,
      reason: `Removal request ${removal_request_id}: ${request.reason || "No reason given"}`,
    });

    // Update request status
    await supabase
      .from("removal_requests")
      .update({
        status: "ACTIONED",
        processed_at: new Date().toISOString(),
      })
      .eq("id", removal_request_id);

    return new Response(
      JSON.stringify({
        status: "ACTIONED",
        jobs_deactivated: affectedJobs?.length || 0,
        url_blocked: request.url,
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
