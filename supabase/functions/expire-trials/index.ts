/**
 * expire-trials — Supabase Edge Function (Cron target)
 *
 * Scheduled: runs daily at 02:00 UTC via Supabase cron.
 *
 * What it does:
 *  1. Finds employer_subscriptions where status='trialing'
 *     and trial_ends_at < now()
 *  2. Sets status='trial_expired'
 *  3. Updates employers.approval_status to 'suspended' so workspace
 *     is locked (pending upgrade / payment)
 *
 * To schedule this via Supabase dashboard:
 *   Dashboard → Database → Extensions → Enable pg_cron
 *   SQL Editor:
 *     select cron.schedule(
 *       'expire-trials',
 *       '0 2 * * *',  -- 02:00 UTC daily
 *       $$
 *         select net.http_post(
 *           url := current_setting('app.supabase_url') || '/functions/v1/expire-trials',
 *           headers := jsonb_build_object(
 *             'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
 *             'Content-Type', 'application/json'
 *           ),
 *           body := '{}'
 *         );
 *       $$
 *     );
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Find expired trials
        const { data: expired, error: fetchErr } = await supabase
            .from("employer_subscriptions")
            .select("id, employer_id, trial_ends_at")
            .eq("status", "trialing")
            .lt("trial_ends_at", new Date().toISOString());

        if (fetchErr) throw fetchErr;
        if (!expired || expired.length === 0) {
            return new Response(
                JSON.stringify({ ok: true, expired_count: 0 }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const employerIds = expired.map((s: any) => s.employer_id);
        const subIds = expired.map((s: any) => s.id);

        // 2. Mark subscriptions as trial_expired
        const { error: subErr } = await supabase
            .from("employer_subscriptions")
            .update({ status: "trial_expired" })
            .in("id", subIds);

        if (subErr) throw subErr;

        // 3. Lock workspaces — set approval_status = 'suspended'
        //    This makes PendingApprovalBanner show the restriction banner
        const { error: lockErr } = await supabase
            .from("employers")
            .update({ approval_status: "suspended" })
            .in("id", employerIds);

        if (lockErr) throw lockErr;

        console.log(`expire-trials: expired ${expired.length} trial(s)`, employerIds);

        return new Response(
            JSON.stringify({ ok: true, expired_count: expired.length, employer_ids: employerIds }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("expire-trials error:", msg);
        return new Response(
            JSON.stringify({ error: msg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
