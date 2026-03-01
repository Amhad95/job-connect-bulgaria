/**
 * dispatch-notification — Supabase Edge Function
 *
 * Processes a single notification_event:
 *  - Sends email via Resend (if channel includes email and recipient_email set)
 *  - Creates in-app notification row (if channel includes in_app and recipient_user_id set)
 *  - Marks event status = sent | failed
 *  - Idempotent: skips events already marked sent
 *
 * Also handles admin.new_employer_request via ADMIN_EMAILS env var.
 *
 * Required env vars:
 *   RESEND_API_KEY    — email delivery
 *   SITE_URL          — e.g. https://job-connect-bulgaria.lovable.app
 *   FROM_EMAIL        — e.g. noreply@bacham.bg
 *   ADMIN_EMAILS      — comma-separated admin emails for 6.4 events
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? null;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://job-connect-bulgaria.lovable.app";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@bacham.bg";
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map(e => e.trim()).filter(Boolean);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Email sender ───────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!to) throw new Error("recipient email is empty");

    if (!RESEND_API_KEY) {
        // Dev fallback: log
        console.log(`[dispatch-notification] DEV: would send to ${to}\nSubject: ${subject}\n${text}`);
        return;
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `Bacham Job Board <${FROM_EMAIL}>`, to, subject, html, text }),
    });

    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

// ── In-app notification creator ────────────────────────────────────────────
async function createInAppNotification(userId: string, title: string, body: string, link?: string) {
    await supabase.from("notifications").insert({ user_id: userId, title, body, link });
}

// ── Template registry ──────────────────────────────────────────────────────
// Returns { subject, html, text, inAppTitle, inAppBody, link } for a given event

interface Rendered {
    subject?: string;
    html?: string;
    text?: string;
    inAppTitle?: string;
    inAppBody?: string;
    link?: string;
}

function btn(url: string, label: string) {
    return `<a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">${label}</a>`;
}

function layout(content: string) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Inter,Arial,sans-serif;background:#f9fafb;margin:0;padding:30px 20px}
.card{max-width:500px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:36px}
h1{font-size:20px;font-weight:700;color:#111827;margin:0 0 8px}
p{font-size:14px;color:#6b7280;margin:0 0 12px;line-height:1.6}
.muted{font-size:12px;color:#9ca3af;margin-top:24px}</style>
</head><body><div class="card">${content}</div></body></html>`;
}

function renderTemplate(eventType: string, p: Record<string, any>): Rendered {
    const r: Rendered = {};

    switch (eventType) {
        // ── 6.1 Employer lifecycle ──
        case "employer.signup_pending":
            r.subject = `We received your application — ${p.company_name}`;
            r.html = layout(`
        <h1>Application received ✓</h1>
        <p>Hi ${p.owner_name ?? "there"},</p>
        <p>We've received your employer signup request for <strong>${p.company_name}</strong> on the <strong>${p.plan_label ?? p.plan_id}</strong> plan.</p>
        <p>Our team manually reviews every employer. This usually takes <strong>1–2 business days</strong>. We'll email you as soon as a decision is made.</p>
        <p><strong>While you wait, you can:</strong><br>
        ✓ Complete your workspace profile<br>
        ✓ Create draft job postings (not yet public)<br>
        ⏳ Publishing jobs is available after approval</p>
        ${btn(`${SITE_URL}/employer`, "Go to your workspace")}
        <p class="muted">You selected: ${p.plan_label ?? p.plan_id}${p.billing_interval ? ` (${p.billing_interval})` : ""}. No payment has been taken yet.</p>
      `);
            r.text = `Application received for ${p.company_name}. Plan: ${p.plan_label ?? p.plan_id}. We'll review within 1–2 business days.`;
            break;

        case "employer.approved":
            r.subject = `Your employer account is approved 🎉 — ${p.company_name}`;
            r.html = layout(`
        <h1>You're approved!</h1>
        <p>Hi ${p.owner_name ?? "there"},</p>
        <p>Your employer account for <strong>${p.company_name}</strong> has been approved. You can now publish jobs and access all features.</p>
        <p><strong>Next steps:</strong><br>
        1. Complete your company profile<br>
        2. Publish your first job posting<br>
        3. Review candidates in your pipeline</p>
        ${btn(`${SITE_URL}/employer/jobs`, "Publish your first job")}
        <p class="muted">Your ${p.plan_label ?? p.plan_id} trial starts now. Visit Settings to manage billing.</p>
      `);
            r.text = `Your employer account for ${p.company_name} is approved. Log in to start posting jobs.`;
            r.inAppTitle = "Account approved";
            r.inAppBody = `${p.company_name} is now approved. Start publishing jobs.`;
            r.link = "/employer/jobs";
            break;

        case "employer.rejected":
            r.subject = `Update on your employer application — ${p.company_name}`;
            r.html = layout(`
        <h1>Application not approved</h1>
        <p>Hi ${p.owner_name ?? "there"},</p>
        <p>Thank you for your interest in Bacham. After review, we're unable to approve the application for <strong>${p.company_name}</strong> at this time.</p>
        <p>No payment has been taken. If you believe this is an error or would like to discuss your application, please contact our support team.</p>
        ${btn(`${SITE_URL}/contact`, "Contact support")}
        <p class="muted">${p.review_notes ? `Note from reviewer: ${p.review_notes}` : ""}</p>
      `);
            r.text = `Your employer application for ${p.company_name} was not approved. Contact support for more information.`;
            r.inAppTitle = "Application not approved";
            r.inAppBody = "Contact support if you have questions.";
            r.link = "/contact";
            break;

        case "employer.suspended":
            r.subject = `Your account has been suspended — ${p.company_name}`;
            r.html = layout(`
        <h1>Account suspended</h1>
        <p>Hi ${p.owner_name ?? "there"},</p>
        <p>Your employer account for <strong>${p.company_name}</strong> has been suspended. This may be due to a trial expiry, payment issue, or a policy violation.</p>
        <p>To restore access, please upgrade your plan or contact our support team.</p>
        ${btn(`${SITE_URL}/employers#pricing`, "Upgrade plan")}
        ${btn(`${SITE_URL}/contact`, "Contact support")}
      `);
            r.text = `Your employer account for ${p.company_name} has been suspended. Upgrade or contact support to restore access.`;
            break;

        // ── 6.2 Application events ──
        case "candidate.application_received":
            r.subject = `Application received — ${p.job_title} at ${p.company_name}`;
            r.html = layout(`
        <h1>Application submitted ✓</h1>
        <p>Hi ${p.first_name},</p>
        <p>Your application for <strong>${p.job_title}</strong> at <strong>${p.company_name}</strong> has been received.</p>
        <p>The employer will review your application and may contact you directly. We'll notify you of any updates.</p>
        ${btn(`${SITE_URL}/jobs/${p.job_id}`, "View job posting")}
        <p class="muted">Your resume and personal data are processed in accordance with our privacy policy.</p>
      `);
            r.text = `Application received for ${p.job_title} at ${p.company_name}.`;
            break;

        case "employer.new_application_received":
            r.subject = `New application: ${p.first_name} ${p.last_name} for ${p.job_title}`;
            r.html = layout(`
        <h1>New application received</h1>
        <p><strong>${p.first_name} ${p.last_name}</strong> applied for <strong>${p.job_title}</strong>.</p>
        ${p.ai_score != null
                    ? `<p>AI Match Score: <strong>${p.ai_score}/100</strong></p>`
                    : `<p>AI scoring is in progress — check the pipeline for the score.</p>`}
        ${btn(`${SITE_URL}/employer/jobs/${p.job_id}/pipeline`, "View in pipeline")}
      `);
            r.text = `${p.first_name} ${p.last_name} applied for ${p.job_title}. Score: ${p.ai_score ?? "pending"}.`;
            r.inAppTitle = `New application — ${p.job_title}`;
            r.inAppBody = `${p.first_name} ${p.last_name} applied${p.ai_score != null ? ` (score: ${p.ai_score})` : " — scoring in progress"}.`;
            r.link = `/employer/jobs/${p.job_id}/pipeline`;
            break;

        case "candidate.application_status_updated": {
            const STATUS_LABEL: Record<string, string> = {
                reviewing: "under review",
                interviewing: "moved to the interview stage",
                offered: "received an offer",
                rejected: "not moving forward at this time",
            };
            const label = STATUS_LABEL[p.new_status] ?? p.new_status;
            r.subject = `Update on your application — ${p.job_title}`;
            r.html = layout(`
        <h1>Application update</h1>
        <p>Hi ${p.first_name},</p>
        <p>Your application for <strong>${p.job_title}</strong> at <strong>${p.company_name}</strong> is <strong>${label}</strong>.</p>
        ${p.new_status === "rejected"
                    ? `<p>We appreciate your interest and encourage you to keep exploring opportunities on our platform.</p>`
                    : `<p>The employer may reach out to you directly with next steps.</p>`}
        ${btn(`${SITE_URL}/jobs/${p.job_id}`, "View job")}
      `);
            r.text = `Your application for ${p.job_title} at ${p.company_name} status: ${label}.`;
            break;
        }

        // ── 6.3 AI scoring events (in-app only) ──
        case "employer.ai_scoring_completed":
            r.inAppTitle = `AI score ready — ${p.job_title}`;
            r.inAppBody = `${p.first_name} ${p.last_name} scored ${p.ai_score}/100.`;
            r.link = `/employer/jobs/${p.job_id}/pipeline`;
            break;

        case "employer.ai_scoring_failed":
            r.inAppTitle = `AI scoring failed — ${p.job_title}`;
            r.inAppBody = `Scoring for ${p.first_name} ${p.last_name} failed. Open pipeline to retry.`;
            r.link = `/employer/jobs/${p.job_id}/pipeline`;
            break;

        // ── 6.4 Admin events ──
        case "admin.new_employer_request":
            r.subject = `[Admin] New employer signup — ${p.company_name}`;
            r.html = layout(`
        <h1>New employer signup request</h1>
        <p><strong>${p.company_name}</strong> signed up on the <strong>${p.plan_label ?? p.plan_id}</strong> plan.</p>
        <p>Submitted by: ${p.submitted_by_email ?? "unknown"}</p>
        ${btn(`${SITE_URL}/admin/partner-requests`, "Review request")}
      `);
            r.text = `New employer signup: ${p.company_name} (${p.plan_id}). Review at /admin/partner-requests.`;
            break;

        default:
            console.warn("dispatch-notification: unknown event_type:", eventType);
    }

    return r;
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    let eventId: string | null = null;

    try {
        const body = await req.json();
        eventId = body.event_id ?? null;
        if (!eventId) {
            return new Response(JSON.stringify({ error: "event_id required" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fetch the event
        const { data: evt, error: evtErr } = await supabase
            .from("notification_events")
            .select("*")
            .eq("id", eventId)
            .single();

        if (evtErr || !evt) throw new Error("event not found: " + evtErr?.message);

        // Skip already processed
        if (evt.status === "sent" || evt.status === "skipped") {
            return new Response(JSON.stringify({ ok: true, skipped: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const payload = evt.payload ?? {};
        const rendered = renderTemplate(evt.event_type, payload);

        let sent = false;

        // ── Email ──
        const needsEmail = evt.channel === "email" || evt.channel === "both";
        if (needsEmail && rendered.subject && rendered.html) {
            // Admin events route to ADMIN_EMAILS
            let to = evt.recipient_email;
            if (evt.event_type.startsWith("admin.") && ADMIN_EMAILS.length > 0) {
                to = ADMIN_EMAILS[0]; // primary admin
            }
            if (to) {
                await sendEmail(to, rendered.subject, rendered.html, rendered.text ?? "");
                sent = true;
            }
        }

        // ── In-app ──
        const needsInApp = evt.channel === "in_app" || evt.channel === "both";
        if (needsInApp && rendered.inAppTitle && evt.recipient_user_id) {
            await createInAppNotification(
                evt.recipient_user_id,
                rendered.inAppTitle,
                rendered.inAppBody ?? "",
                rendered.link
            );
            sent = true;
        } else if (needsInApp && rendered.inAppTitle && !evt.recipient_user_id && evt.employer_id) {
            // Fan-out to all employer owners/admins
            const { data: profiles } = await supabase
                .from("employer_profiles")
                .select("user_id")
                .eq("employer_id", evt.employer_id)
                .in("role", ["owner", "admin"]);

            for (const p of profiles ?? []) {
                await createInAppNotification(p.user_id, rendered.inAppTitle, rendered.inAppBody ?? "", rendered.link);
            }
            sent = true;
        }

        // ── Mark sent ──
        await supabase.from("notification_events").update({
            status: sent ? "sent" : "skipped",
            sent_at: new Date().toISOString(),
        }).eq("id", eventId);

        return new Response(
            JSON.stringify({ ok: true, event_id: eventId, sent }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("dispatch-notification error:", msg);

        if (eventId) {
            await supabase.from("notification_events").update({
                status: "failed", error_message: msg.slice(0, 500),
            }).eq("id", eventId);
        }

        return new Response(
            JSON.stringify({ error: msg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
