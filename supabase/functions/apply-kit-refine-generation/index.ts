/**
 * apply-kit-refine-generation — Supabase Edge Function
 *
 * Takes user feedback on a draft and regenerates the preview
 * using the full conversation history (stateful refinement loop).
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

// ── AI Call (same as start-generation) ───────────────────────────────────────

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
        const { generation_id, user_feedback } = body;

        if (!generation_id) {
            return new Response(
                JSON.stringify({ error: "generation_id is required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }
        if (!user_feedback || user_feedback.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "user_feedback is required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verify generation belongs to user and is in draft_ready status
        const { data: generation, error: genError } = await supabase
            .from("apply_kit_generations")
            .select("id, user_id, status")
            .eq("id", generation_id)
            .single();

        if (genError || !generation) {
            return new Response(
                JSON.stringify({ error: "Generation not found" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if ((generation as any).user_id !== user.id) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if ((generation as any).status !== "draft_ready") {
            return new Response(
                JSON.stringify({
                    error: "Generation must be in draft_ready status to refine",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Fetch full conversation history
        const { data: existingMessages, error: msgError } = await supabase
            .from("apply_kit_generation_messages")
            .select("role, content")
            .eq("generation_id", generation_id)
            .order("created_at", { ascending: true });

        if (msgError) {
            throw new Error("Failed to fetch messages: " + msgError.message);
        }

        // Build conversation: existing messages + new user feedback
        const conversationMessages = (existingMessages || []).map((m: any) => ({
            role: m.role as string,
            content: m.content as string,
        }));

        // Add user feedback
        const feedbackMessage = {
            role: "user",
            content: `Please revise the document based on this feedback. Remember to maintain the Truth Anchor — do not add any information not present in the original base document.\n\nFeedback: ${user_feedback}`,
        };
        conversationMessages.push(feedbackMessage);

        // Store user feedback message
        await supabase.from("apply_kit_generation_messages").insert({
            generation_id,
            role: "user",
            content: feedbackMessage.content,
        });

        // Update status to processing
        await supabase
            .from("apply_kit_generations")
            .update({
                status: "processing",
                updated_at: new Date().toISOString(),
            })
            .eq("id", generation_id);

        // Call AI with full history
        let aiOutput: string;
        try {
            aiOutput = await callAI(conversationMessages);
        } catch (aiError: any) {
            await supabase
                .from("apply_kit_generations")
                .update({
                    status: "draft_ready", // revert to draft_ready so user can retry
                    error_message: aiError.message?.slice(0, 500) || "AI call failed",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", generation_id);

            throw aiError;
        }

        // Store assistant response
        await supabase.from("apply_kit_generation_messages").insert({
            generation_id,
            role: "assistant",
            content: aiOutput,
        });

        // Update generation with new preview
        await supabase
            .from("apply_kit_generations")
            .update({
                status: "draft_ready",
                latest_preview_markdown: aiOutput,
                updated_at: new Date().toISOString(),
                retry_count: (generation as any).retry_count
                    ? (generation as any).retry_count + 1
                    : 1,
            })
            .eq("id", generation_id);

        return new Response(
            JSON.stringify({
                ok: true,
                generation_id,
                status: "draft_ready",
                preview_markdown: aiOutput,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("apply-kit-refine-generation error:", msg);

        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
