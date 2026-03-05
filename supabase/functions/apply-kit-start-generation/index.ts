/**
 * apply-kit-start-generation — Supabase Edge Function
 *
 * Creates a generation record, builds system prompt, calls AI,
 * and returns the initial draft preview.
 *
 * Uses Supabase built-in AI (Supabase.ai.Session) for text generation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

// ── System Prompts ───────────────────────────────────────────────────────────

function buildJobSpecificSystemPrompt(
    documentType: string,
    jobTitle: string,
    companyName: string,
    jobDescription: string
): string {
    const docLabel = documentType === "cv" ? "CV" : "Cover Letter";
    return `You are a professional ${docLabel} tailoring specialist. Your task is to tailor the candidate's existing ${docLabel} for a specific job posting.

## TRUTH ANCHOR (NON-NEGOTIABLE)
- The candidate's base document is the SOLE source of truth for all factual claims.
- You MUST NOT invent, fabricate, or hallucinate any: skills, degrees, job titles, employers, years of experience, tools, certifications, metrics, or achievements.
- If the job description requires a skill the candidate does not have, DO NOT add it. Instead, identify and highlight the nearest adjacent skill from the base document ("Bridge Rule").

## TARGET ROLE
- Job Title: ${jobTitle}
- Company: ${companyName}

## JOB DESCRIPTION & REQUIREMENTS
${jobDescription}

## TAILORING RULES
1. **Title Alignment**: The ${docLabel} summary/header must prominently feature the target title "${jobTitle}" exactly.
2. **Contextual Keyword Injection**: Weave relevant keywords from the job description naturally into the content. Do NOT keyword-dump.
3. **Terminology Normalization**: Mirror the job description's terminology. Example: if JD says "Customer Relationship Management (CRM)", use that form on first mention.
4. **XYZ/Action-Context-Result Structure**: Every bullet point must start with a strong action verb and follow the pattern: Action + Context + Measurable Result.
5. **Metric Density**: Maximize quantified achievements. Convert vague statements to specific metrics where the base document provides data.
6. **Brevity**: Each bullet point must be max 20-25 words, max 2 lines. Prune fluff.
7. **Subjectivity Eradication**: Remove subjective adjectives like "hard worker", "synergy", "passionate", "dynamic". Replace with evidence.
8. **ATS Structure**: Use standard section headings only: Summary, Experience, Education, Skills, Projects, Certifications. No tables, no multi-column layouts.
9. **Content Pruning**: Remove or minimize experiences and skills irrelevant to the target role. Keep the hierarchy clean and focused.

${documentType === "cover_letter"
            ? `## COVER LETTER SPECIFIC RULES
- "Why This Company": Include a specific reason based on the job description or company context.
- Pain-Point Mapping: Connect candidate experience to specific challenges implied by the JD.
- Hook: Avoid cliché openers ("I am writing to apply..."). Start with a compelling, specific hook.
- Brevity: 3-4 paragraphs, under 300 words total.
- Confident CTA: End with a clear, confident call to action.
- Narrative Keywords: Weave job description keywords into natural narrative flow.`
            : ""
        }

## OUTPUT FORMAT
Return the tailored ${docLabel} in clean Markdown format. Use standard headings (##), bullet points (-), and bold (**) for emphasis. Do not include any commentary outside the document itself.`;
}

function buildManualSystemPrompt(
    documentType: string,
    targetJobTitle: string,
    customPrompt?: string
): string {
    const docLabel = documentType === "cv" ? "CV" : "Cover Letter";
    return `You are a professional ${docLabel} tailoring specialist. Your task is to tailor the candidate's existing ${docLabel} for a target role.

## TRUTH ANCHOR (NON-NEGOTIABLE)
- The candidate's base document is the SOLE source of truth for all factual claims.
- You MUST NOT invent, fabricate, or hallucinate any: skills, degrees, job titles, employers, years of experience, tools, certifications, metrics, or achievements.
- If a skill seems relevant but is not in the base document, DO NOT add it. Highlight the nearest adjacent skill instead ("Bridge Rule").

## TARGET ROLE
- Target Job Title: ${targetJobTitle}

## TAILORING RULES
1. **Title Alignment**: The ${docLabel} summary/header must prominently feature the target title "${targetJobTitle}" exactly.
2. **XYZ/Action-Context-Result Structure**: Every bullet point must start with a strong action verb and follow: Action + Context + Measurable Result.
3. **Metric Density**: Maximize quantified achievements from the base document.
4. **Brevity**: Each bullet point max 20-25 words, max 2 lines. Prune fluff.
5. **Subjectivity Eradication**: Remove subjective adjectives. Replace with evidence.
6. **ATS Structure**: Use standard section headings: Summary, Experience, Education, Skills, Projects, Certifications. No tables, no multi-column layouts.
7. **Content Pruning**: Prioritize experiences and skills relevant to "${targetJobTitle}". Minimize irrelevant content.

${customPrompt ? `## ADDITIONAL INSTRUCTIONS FROM USER\n${customPrompt}` : ""}

${documentType === "cover_letter"
            ? `## COVER LETTER SPECIFIC RULES
- Hook: Avoid cliché openers. Start with a compelling, specific hook.
- Brevity: 3-4 paragraphs, under 300 words total.
- Confident CTA: End with a clear, confident call to action.
- Focus on how candidate's experience maps to the target role.`
            : ""
        }

## OUTPUT FORMAT
Return the tailored ${docLabel} in clean Markdown format. Use standard headings (##), bullet points (-), and bold (**) for emphasis. Do not include any commentary outside the document itself.`;
}

// ── AI Call ───────────────────────────────────────────────────────────────────

async function callAI(
    messages: Array<{ role: string; content: string }>
): Promise<string> {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            temperature: 0.2,
            max_tokens: 4000,
        }),
    });

    if (res.status === 429) throw new Error("Rate limited. Please try again later.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    if (!res.ok) {
        const t = await res.text();
        throw new Error("AI gateway error: " + t);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned no content");
    return content;
}

// ── Main ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Auth: extract user from JWT
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const {
            doc_type,
            mode,
            job_id,
            target_job_title,
            custom_prompt,
            extracted_text,
            base_document_id,
            base_document_storage_path,
            privacy_mode = "store",
        } = body;

        // Validate required fields
        if (!doc_type || !["cv", "cover_letter"].includes(doc_type)) {
            return new Response(
                JSON.stringify({ error: "doc_type must be 'cv' or 'cover_letter'" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        if (!mode || !["job_specific", "manual"].includes(mode)) {
            return new Response(
                JSON.stringify({
                    error: "mode must be 'job_specific' or 'manual'",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        if (!extracted_text || extracted_text.trim().length < 100) {
            return new Response(
                JSON.stringify({
                    error:
                        "Extracted text is too short. Please upload a valid CV or cover letter.",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Resolve job context if job_specific mode
        let jobTitle = target_job_title || "";
        let companyName = "";
        let jobDescription = "";
        let resolvedJobId = job_id || null;

        if (mode === "job_specific" && job_id) {
            const { data: jobData, error: jobError } = await supabase
                .from("job_postings")
                .select(
                    `
          id, title,
          employers!inner ( name ),
          job_posting_content ( description_text, requirements_text )
        `
                )
                .eq("id", job_id)
                .single();

            if (jobError || !jobData) {
                return new Response(
                    JSON.stringify({ error: "Job not found: " + (jobError?.message || "unknown") }),
                    {
                        status: 404,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            jobTitle = (jobData as any).title;
            companyName = (jobData as any).employers?.name || "";
            const content = Array.isArray((jobData as any).job_posting_content)
                ? (jobData as any).job_posting_content[0]
                : (jobData as any).job_posting_content;
            const descText = content?.description_text || "";
            const reqText = content?.requirements_text || "";
            jobDescription = `${descText}\n\nRequirements:\n${reqText}`;
        } else if (mode === "manual") {
            if (!target_job_title || target_job_title.trim().length === 0) {
                return new Response(
                    JSON.stringify({
                        error: "target_job_title is required for manual mode",
                    }),
                    {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }
        }

        // Create generation record
        const { data: generation, error: genError } = await supabase
            .from("apply_kit_generations")
            .insert({
                user_id: user.id,
                doc_type,
                mode,
                status: "processing",
                privacy_mode,
                linked_job_id: resolvedJobId,
                target_company: companyName || null,
                target_job_title: jobTitle,
                target_job_description:
                    mode === "job_specific" ? jobDescription : null,
                custom_prompt: custom_prompt || null,
                base_document_id: base_document_id || null,
                base_document_storage_path: base_document_storage_path || null,
                base_document_extracted_text:
                    privacy_mode === "store" ? extracted_text : null,
            })
            .select("id")
            .single();

        if (genError || !generation) {
            throw new Error(
                "Failed to create generation: " + (genError?.message || "unknown")
            );
        }

        const generationId = generation.id;

        // Build system prompt
        const systemPrompt =
            mode === "job_specific"
                ? buildJobSpecificSystemPrompt(
                    doc_type,
                    jobTitle,
                    companyName,
                    jobDescription
                )
                : buildManualSystemPrompt(doc_type, jobTitle, custom_prompt);

        const docLabel = doc_type === "cv" ? "CV" : "cover letter";
        const userMessage =
            mode === "job_specific"
                ? `Here is my base ${docLabel}. Please tailor it for the ${jobTitle} position at ${companyName}.\n\n--- BASE DOCUMENT ---\n${extracted_text}`
                : `Here is my base ${docLabel}. Please tailor it for a "${jobTitle}" role.${custom_prompt ? `\n\nAdditional instructions: ${custom_prompt}` : ""}\n\n--- BASE DOCUMENT ---\n${extracted_text}`;

        // Store messages
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ];

        await supabase.from("apply_kit_generation_messages").insert(
            messages.map((m) => ({
                generation_id: generationId,
                role: m.role,
                content: m.content,
            }))
        );

        // Call AI
        let aiOutput: string;
        try {
            aiOutput = await callAI(messages);
        } catch (aiError: any) {
            // Mark as failed
            await supabase
                .from("apply_kit_generations")
                .update({
                    status: "failed",
                    error_message: aiError.message?.slice(0, 500) || "AI call failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", generationId);

            throw aiError;
        }

        // Store assistant response
        await supabase.from("apply_kit_generation_messages").insert({
            generation_id: generationId,
            role: "assistant",
            content: aiOutput,
        });

        // Update generation with preview
        await supabase
            .from("apply_kit_generations")
            .update({
                status: "draft_ready",
                latest_preview_markdown: aiOutput,
                updated_at: new Date().toISOString(),
            })
            .eq("id", generationId);

        return new Response(
            JSON.stringify({
                ok: true,
                generation_id: generationId,
                status: "draft_ready",
                preview_markdown: aiOutput,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("apply-kit-start-generation error:", msg);

        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
