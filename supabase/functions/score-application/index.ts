/**
 * score-application — Supabase Edge Function
 *
 * Uses Supabase's built-in AI inference (Supabase.ai.Session).
 * No OPENAI_API_KEY needed — AI is provided by the Lovable/Supabase platform.
 *
 * Flow:
 *  1. Parse application_id from body
 *  2. Fetch application + job description + requirements
 *  3. Fetch resume text (PDF via pdfco or raw text fallback)
 *  4. Build prompt and call Supabase built-in AI
 *  5. Write score + reasoning via set_application_ai_score()
 *  6. Update ai_status = 'success' | 'failed'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY") ?? null; // optional: better PDF extraction

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Resume text extraction ─────────────────────────────────────────────────
async function extractResumeText(resumeUrl: string): Promise<string> {
    if (PDFCO_API_KEY && resumeUrl.toLowerCase().endsWith(".pdf")) {
        try {
            const res = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
                method: "POST",
                headers: { "x-api-key": PDFCO_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ url: resumeUrl, inline: true }),
            });
            const data = await res.json();
            if (!data.error && data.body) return data.body.slice(0, 8000);
        } catch (e) {
            console.warn("PDF.co extraction failed, falling back:", e);
        }
    }

    try {
        const res = await fetch(resumeUrl, { redirect: "follow" });
        const text = await res.text();
        return text.slice(0, 8000);
    } catch {
        return "(resume text unavailable)";
    }
}

// ── Build scoring prompt ──────────────────────────────────────────────────
function buildPrompt(
    jobTitle: string,
    jd: string,
    requirements: string,
    resumeText: string
): string {
    return `You are an expert recruiter scoring a candidate's fit for a job.

Job Title: ${jobTitle}

Job Description:
${jd.slice(0, 3000)}

Requirements:
${requirements.slice(0, 1500)}

Candidate Resume:
${resumeText.slice(0, 3500)}

Task: Score this candidate 0-100 and explain why in 2-4 sentences.
Rubric: 0-29 poor, 30-49 weak, 50-69 moderate, 70-84 good, 85-100 excellent.

Respond with ONLY valid JSON (no markdown):
{"score": <integer 0-100>, "reasoning": "<2-4 sentences>"}`;
}

// ── Call Supabase built-in AI ─────────────────────────────────────────────
async function scoreWithBuiltInAI(
    prompt: string
): Promise<{ score: number; reasoning: string }> {
    // @ts-ignore — Supabase.ai is available in the Supabase/Lovable edge runtime
    const session = new Supabase.ai.Session("gte-small");

    // Use the chat-completion style interface built into the Supabase runtime
    // @ts-ignore
    const response = await session.run(prompt, {
        mode: "text",
        stream: false,
    });

    // Extract the text and parse JSON from the model response
    const rawText: string = typeof response === "string"
        ? response
        : response?.choices?.[0]?.message?.content
        ?? response?.output
        ?? JSON.stringify(response);

    // Find JSON in the response (model may include extra text)
    const jsonMatch = rawText.match(/\{[\s\S]*"score"[\s\S]*"reasoning"[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("AI response did not contain valid JSON: " + rawText.slice(0, 200));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = Math.min(100, Math.max(0, parseInt(parsed.score, 10)));
    const reasoning = (parsed.reasoning ?? "").trim();

    if (isNaN(score)) throw new Error("AI returned invalid score: " + rawText.slice(0, 200));

    return { score, reasoning };
}

// ── Main ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    let applicationId: string | null = null;

    try {
        const body = await req.json();
        applicationId = body.application_id ?? null;

        if (!applicationId) {
            return new Response(JSON.stringify({ error: "application_id required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Fetch application + job content
        const { data: app, error: appErr } = await supabase
            .from("applications")
            .select(`
        id, first_name, last_name, resume_url, job_id,
        job_postings!inner (
          title, employer_id,
          job_posting_content ( description_text, requirements_text )
        )
      `)
            .eq("id", applicationId)
            .single();

        if (appErr || !app) {
            throw new Error(`Application fetch failed: ${appErr?.message ?? "not found"}`);
        }

        const posting = (app as any).job_postings;
        const content = Array.isArray(posting.job_posting_content)
            ? posting.job_posting_content[0]
            : posting.job_posting_content;

        const jobTitle = posting.title ?? "Unknown Role";
        const jd = content?.description_text ?? "";
        const requirements = content?.requirements_text ?? "";

        // 2. Extract resume text
        const resumeText = await extractResumeText((app as any).resume_url);

        // 3. Score via Supabase built-in AI
        const { score, reasoning } = await scoreWithBuiltInAI(
            buildPrompt(jobTitle, jd, requirements, resumeText)
        );

        // 4. Write results via SECURITY DEFINER function
        const { error: scoreErr } = await supabase.rpc("set_application_ai_score", {
            p_application_id: applicationId,
            p_score: score,
            p_reasoning: reasoning,
        });

        if (scoreErr) throw new Error("set_application_ai_score failed: " + scoreErr.message);

        // 5. Mark success
        await supabase.from("applications")
            .update({ ai_status: "success" })
            .eq("id", applicationId);

        console.log(`Scored application ${applicationId}: ${score}`);

        return new Response(
            JSON.stringify({ ok: true, application_id: applicationId, score, reasoning }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("score-application error:", msg);

        if (applicationId) {
            await supabase.from("applications")
                .update({ ai_status: "failed", ai_error: msg.slice(0, 500) })
                .eq("id", applicationId);
        }

        return new Response(
            JSON.stringify({ error: msg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
