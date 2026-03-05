/**
 * apply-kit-finalize-generation — Supabase Edge Function
 *
 * Takes an approved draft and creates the final document record.
 * Parses markdown into structured JSON, saves to vault,
 * and handles privacy mode cleanup.
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

// ── Parse markdown into structured JSON ──────────────────────────────────────

interface StructuredSection {
    heading: string;
    items: string[];
}

function parseMarkdownToStructured(markdown: string): {
    sections: StructuredSection[];
    rawText: string;
} {
    const lines = markdown.split("\n");
    const sections: StructuredSection[] = [];
    let currentSection: StructuredSection | null = null;

    for (const line of lines) {
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = { heading: headingMatch[1].trim(), items: [] };
        } else if (line.match(/^[-*]\s+/) && currentSection) {
            currentSection.items.push(line.replace(/^[-*]\s+/, "").trim());
        } else if (line.trim() && currentSection) {
            // Non-bullet, non-heading text — add as item
            currentSection.items.push(line.trim());
        }
    }

    if (currentSection) {
        sections.push(currentSection);
    }

    // Generate plain text for ATS
    const rawText = sections
        .map(
            (s) =>
                `${s.heading}\n${s.items.map((i) => `• ${i}`).join("\n")}`
        )
        .join("\n\n");

    return { sections, rawText };
}

// ── Generate auto-name ───────────────────────────────────────────────────────

function generateAutoName(
    docType: string,
    mode: string,
    targetCompany: string | null,
    targetJobTitle: string | null
): string {
    const typeLabel = docType === "cv" ? "CV" : "Cover Letter";
    const date = new Date();
    const monthYear = `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (mode === "job_specific" && targetCompany && targetJobTitle) {
        return `${typeLabel} - ${targetCompany} - ${targetJobTitle} - ${monthYear}`;
    } else if (targetJobTitle) {
        return `${typeLabel} - ${targetJobTitle} - ${monthYear}`;
    }
    return `${typeLabel} - Tailored - ${monthYear}`;
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
        const { generation_id, approved_markdown } = body;

        if (!generation_id) {
            return new Response(
                JSON.stringify({ error: "generation_id is required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Fetch generation and verify ownership + status
        const { data: generation, error: genError } = await supabase
            .from("apply_kit_generations")
            .select("*")
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

        const gen = generation as any;

        if (gen.user_id !== user.id) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (gen.status !== "draft_ready") {
            return new Response(
                JSON.stringify({
                    error: "Generation must be in draft_ready status to finalize",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Use approved_markdown from request or fall back to latest preview
        const finalMarkdown =
            approved_markdown || gen.latest_preview_markdown;

        if (!finalMarkdown) {
            return new Response(
                JSON.stringify({ error: "No preview content to finalize" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Parse markdown into structured format
        const { sections, rawText } =
            parseMarkdownToStructured(finalMarkdown);

        // Generate auto-name for the file
        const autoName = generateAutoName(
            gen.doc_type,
            gen.mode,
            gen.target_company,
            gen.target_job_title
        );
        const fileName = `${autoName}.md`;

        // Store the finalized markdown content in storage
        const documentId = crypto.randomUUID();
        const storagePath = `${user.id}/generated/${documentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("apply-kit")
            .upload(storagePath, new TextEncoder().encode(finalMarkdown), {
                contentType: "text/plain",
                upsert: true,
            });

        if (uploadError) {
            throw new Error("Failed to upload generated document: " + uploadError.message);
        }

        // Create document record in vault
        const { data: doc, error: docError } = await supabase
            .from("apply_kit_documents")
            .insert({
                id: documentId,
                user_id: user.id,
                doc_type: gen.doc_type,
                source: "generated",
                file_name: autoName,
                storage_path: storagePath,
                mime_type: "text/markdown",
                linked_job_id: gen.linked_job_id,
                target_company: gen.target_company,
                target_job_title: gen.target_job_title,
                custom_prompt: gen.custom_prompt,
                approved_markdown: finalMarkdown,
                approved_structured_json: { sections },
                template_version: "v1",
                privacy_mode: gen.privacy_mode,
                base_document_id: gen.base_document_id,
            })
            .select("id, file_name, storage_path, created_at")
            .single();

        if (docError) {
            throw new Error("Failed to create document record: " + docError.message);
        }

        // Update generation status to finalized
        await supabase
            .from("apply_kit_generations")
            .update({
                status: "finalized",
                latest_preview_markdown: finalMarkdown,
                latest_preview_structured_json: { sections },
                updated_at: new Date().toISOString(),
            })
            .eq("id", generation_id);

        // Handle privacy mode: delete base file if no_store_base
        if (gen.privacy_mode === "no_store_base") {
            // Clear extracted text from generation record
            await supabase
                .from("apply_kit_generations")
                .update({
                    base_document_extracted_text: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", generation_id);

            // Delete base file from storage if it exists
            if (gen.base_document_storage_path) {
                await supabase.storage
                    .from("apply-kit")
                    .remove([gen.base_document_storage_path]);
            }
        }

        return new Response(
            JSON.stringify({
                ok: true,
                generation_id,
                document: {
                    id: (doc as any).id,
                    file_name: (doc as any).file_name,
                    storage_path: (doc as any).storage_path,
                    created_at: (doc as any).created_at,
                    structured_json: { sections },
                    raw_text: rawText,
                },
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("apply-kit-finalize-generation error:", msg);

        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
