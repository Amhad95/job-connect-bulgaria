/**
 * send-invite — Supabase Edge Function
 *
 * Called from TeamSettings.tsx after create_employer_invite() returns a token.
 * Sends an invite email to the new team member.
 *
 * Requires env vars:
 *   RESEND_API_KEY   — or use SMTP via Supabase auth.email settings
 *   SITE_URL         — e.g. https://job-connect-bulgaria.vercel.app
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? null;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://job-connect-bulgaria.lovable.app";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "no-reply@bachkam.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { invite_id } = await req.json();
        if (!invite_id) {
            return new Response(JSON.stringify({ error: "invite_id required" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fetch invite + employer name
        const { data: invite, error: fetchErr } = await supabase
            .from("employer_invites")
            .select("email, role, token, employer_id, employers!inner(name)")
            .eq("id", invite_id)
            .eq("status", "pending")
            .single();

        if (fetchErr || !invite) {
            return new Response(JSON.stringify({ error: "invite not found" }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const employerName = (invite as any).employers?.name ?? "a company";
        const joinUrl = `${SITE_URL}/employer/join?token=${invite.token}`;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;border:1px solid #e5e7eb;padding:40px;">
    <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">You've been invited to join ${employerName}</h1>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
      You've been added as a <strong>${invite.role}</strong> on the ${employerName} employer workspace on Bacham Job Board.
    </p>
    <a href="${joinUrl}"
       style="display:inline-block;background:#2563eb;color:white;font-weight:600;font-size:14px;
              padding:12px 24px;border-radius:8px;text-decoration:none;">
      Accept invitation
    </a>
    <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;">
      This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.
    </p>
    <p style="font-size:12px;color:#d1d5db;margin:8px 0 0;">
      Or copy this link: ${joinUrl}
    </p>
  </div>
</body>
</html>`;

        // Send via Resend if key available, else log
        if (RESEND_API_KEY) {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: `Bacham Job Board <${FROM_EMAIL}>`,
                    to: invite.email,
                    subject: `You've been invited to join ${employerName} on Bacham`,
                    html: emailHtml,
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error("Resend API error: " + err);
            }
        } else {
            // Fallback: log (works in dev without Resend)
            console.log(`[send-invite] Would send to ${invite.email}: ${joinUrl}`);
        }

        return new Response(
            JSON.stringify({ ok: true, sent_to: invite.email }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("send-invite error:", msg);
        return new Response(
            JSON.stringify({ error: msg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
