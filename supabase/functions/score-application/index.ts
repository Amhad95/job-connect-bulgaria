/**
 * score-application — Supabase Edge Function
 *
 * Triggered by: pg_net HTTP POST from queue_application_scoring()
 * Also callable directly for manual scoring.
 *
 * Flow:
 *  1. Parse application_id from body
 *  2. Fetch application + job description + requirements
 *  3. Fetch resume text (PDF via pdfco or raw text fallback)
 *  4. Build prompt and call OpenAI GPT-4o-mini
 *  5. Write score + reasoning via set_application_ai_score()
 *  6. Update ai_status = 'success' | 'failed'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const PDFCO_API_KEY = Deno.env.get("PDFCO_API_KEY") ?? null; // optional: PDF text extraction

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── helpers ────────────────────────────────────────────────────────────────

async function extractResumeText(resumeUrl: string): Promise<string> {
    // Try PDF.co text extraction if key available
    if (PDFCO_API_KEY && resumeUrl.toLowerCase().endsWith(".pdf")) {
        try {
            const res = await fetch("https://api.pdf.co/v1/pdf/convert/to/text", {
                method: "POST",
                headers: {
                    "x-api-key": PDFCO_API_KEY,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url: resumeUrl, inline: true }),
            });
            const data = await res.json();
            if (!data.error && data.body) return data.body.slice(0, 8000);
        } catch (e) {
            console.warn("PDF.co extraction failed, falling back:", e);
        }
    }

    // Fallback: raw fetch and return first 8000 chars (works for plain-text .txt/.docx partial)
    try {
        const res = await fetch(resumeUrl, { redirect: "follow" });
        const text = await res.text();
        return text.slice(0, 8000);
    } catch {
        return "(resume text unavailable)";
    }
}

function buildPrompt(jobTitle: string, jd: string, requirements: string, resumeText: string): string {
    return `You are an expert recruiter and skill-matching assistant.

Job Title: ${jobTitle}

Job Description:
${jd.slice(0, 3000)}

Requirements:
${requirements.slice(0, 1500)}

Candidate Resume (extracted text):
${resumeText.slice(0, 3500)}

Task:
1. Score the candidate's fit for this job on a scale of 0–100 (integer).
   Rubric: 0–29 poor fit, 30–49 weak, 50–69 moderate, 70–84 good, 85–100 excellent.
2. Write 2–4 sentences explaining the score: what matches well, what is missing, and any red flags.

Response format (JSON only, no markdown wrapper):
{
  "score": <integer 0-100>,
  "reasoning": "<2-4 sentence explanation>"
}`;
}

async function callOpenAI(prompt: string): Promise<{ score: number; reasoning: string }> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 400,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const score = Math.min(100, Math.max(0, parseInt(parsed.score, 10)));
    const reasoning = (parsed.reasoning ?? "").trim();

    if (isNaN(score)) throw new Error("OpenAI returned invalid score: " + content);

    return { score, reasoning };
}

// ── main ───────────────────────────────────────────────────────────────────

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

        // 3. Score via LLM
        const { score, reasoning } = await callOpenAI(
            buildPrompt(jobTitle, jd, requirements, resumeText)
        );

        // 4. Write results using the SECURITY DEFINER function
        const { error: scoreErr } = await supabase.rpc("set_application_ai_score", {
            p_application_id: applicationId,
            p_score: score,
            p_reasoning: reasoning,
        });

        if (scoreErr) throw new Error("set_application_ai_score failed: " + scoreErr.message);

        // 5. Update ai_status = success
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

        // Mark as failed with error message
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
