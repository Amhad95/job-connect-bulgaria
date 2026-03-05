/**
 * apply-kit-finalize-generation — Supabase Edge Function
 *
 * Takes an approved draft and creates the final documents (PDF + DOCX).
 * Parses markdown into structured sections, generates professionally
 * formatted documents, and saves to the vault.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Packer,
    BorderStyle,
    SectionType,
    TabStopPosition,
    TabStopType,
} from "https://esm.sh/docx@9.5.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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
    contactLine: string | null;
    nameHeading: string | null;
} {
    const lines = markdown.split("\n");
    const sections: StructuredSection[] = [];
    let currentSection: StructuredSection | null = null;
    let nameHeading: string | null = null;
    let contactLine: string | null = null;

    for (const line of lines) {
        // Top-level heading = candidate name
        const h1Match = line.match(/^#\s+(.+)/);
        if (h1Match && !nameHeading) {
            nameHeading = h1Match[1].trim();
            continue;
        }

        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        if (headingMatch) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = { heading: headingMatch[1].trim(), items: [] };
        } else if (line.match(/^[-*]\s+/) && currentSection) {
            currentSection.items.push(line.replace(/^[-*]\s+/, "").trim());
        } else if (line.trim() && currentSection) {
            currentSection.items.push(line.trim());
        } else if (line.trim() && !currentSection && !contactLine) {
            // First non-heading non-empty line before any section = contact info
            contactLine = line.trim();
        }
    }

    if (currentSection) {
        sections.push(currentSection);
    }

    const rawText = sections
        .map((s) => `${s.heading}\n${s.items.map((i) => `• ${i}`).join("\n")}`)
        .join("\n\n");

    return { sections, rawText, contactLine, nameHeading };
}

// ── Generate DOCX ────────────────────────────────────────────────────────────

async function generateDocx(
    nameHeading: string | null,
    contactLine: string | null,
    sections: StructuredSection[]
): Promise<Uint8Array> {
    const children: Paragraph[] = [];

    // Name heading
    if (nameHeading) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: nameHeading,
                        bold: true,
                        size: 36, // 18pt
                        font: "Calibri",
                        color: "1a1a1a",
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
            })
        );
    }

    // Contact line
    if (contactLine) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: contactLine,
                        size: 18, // 9pt
                        font: "Calibri",
                        color: "555555",
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
            })
        );
    }

    // Horizontal rule after header
    children.push(
        new Paragraph({
            border: {
                bottom: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: "cccccc",
                },
            },
            spacing: { after: 200 },
        })
    );

    // Sections
    for (const section of sections) {
        // Section heading
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: section.heading.toUpperCase(),
                        bold: true,
                        size: 22, // 11pt
                        font: "Calibri",
                        color: "2b2b2b",
                    }),
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 80 },
                border: {
                    bottom: {
                        style: BorderStyle.SINGLE,
                        size: 2,
                        color: "dddddd",
                    },
                },
            })
        );

        // Section items
        for (const item of section.items) {
            // Detect bold prefix patterns like "Company Name | Role"
            const boldMatch = item.match(/^\*\*(.+?)\*\*(.*)$/);
            if (boldMatch) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: boldMatch[1],
                                bold: true,
                                size: 20,
                                font: "Calibri",
                            }),
                            new TextRun({
                                text: boldMatch[2],
                                size: 20,
                                font: "Calibri",
                            }),
                        ],
                        spacing: { after: 40 },
                    })
                );
            } else {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `• ${item}`,
                                size: 20, // 10pt
                                font: "Calibri",
                            }),
                        ],
                        spacing: { after: 40 },
                        indent: { left: 360 }, // 0.25 inch
                    })
                );
            }
        }
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 720,    // 0.5 inch
                            bottom: 720,
                            left: 1080,  // 0.75 inch
                            right: 1080,
                        },
                    },
                },
                children,
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Uint8Array(buffer);
}

// ── Generate PDF ─────────────────────────────────────────────────────────────

async function generatePdf(
    nameHeading: string | null,
    contactLine: string | null,
    sections: StructuredSection[]
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_WIDTH = 595.28; // A4
    const PAGE_HEIGHT = 841.89;
    const MARGIN_LEFT = 54;
    const MARGIN_RIGHT = 54;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    const COLOR_BLACK = rgb(0.1, 0.1, 0.1);
    const COLOR_GRAY = rgb(0.33, 0.33, 0.33);
    const COLOR_LIGHT = rgb(0.75, 0.75, 0.75);
    const COLOR_HEADING = rgb(0.17, 0.17, 0.17);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    function ensureSpace(needed: number) {
        if (y - needed < MARGIN_BOTTOM) {
            page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN_TOP;
        }
    }

    // Word-wrap helper
    function wrapText(
        text: string,
        font: typeof helvetica,
        fontSize: number,
        maxWidth: number
    ): string[] {
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // Name
    if (nameHeading) {
        const nameSize = 18;
        const nameWidth = helveticaBold.widthOfTextAtSize(nameHeading, nameSize);
        const nameX = MARGIN_LEFT + (CONTENT_WIDTH - nameWidth) / 2;
        page.drawText(nameHeading, {
            x: Math.max(MARGIN_LEFT, nameX),
            y,
            size: nameSize,
            font: helveticaBold,
            color: COLOR_BLACK,
        });
        y -= 24;
    }

    // Contact
    if (contactLine) {
        const contactSize = 8.5;
        const contactWidth = helvetica.widthOfTextAtSize(contactLine, contactSize);
        const contactX = MARGIN_LEFT + (CONTENT_WIDTH - contactWidth) / 2;
        page.drawText(contactLine, {
            x: Math.max(MARGIN_LEFT, contactX),
            y,
            size: contactSize,
            font: helvetica,
            color: COLOR_GRAY,
        });
        y -= 18;
    }

    // Horizontal rule
    y -= 4;
    page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
        thickness: 0.75,
        color: COLOR_LIGHT,
    });
    y -= 16;

    // Sections
    for (const section of sections) {
        ensureSpace(40);

        // Section heading
        const headingText = section.heading.toUpperCase();
        const headingSize = 10;
        page.drawText(headingText, {
            x: MARGIN_LEFT,
            y,
            size: headingSize,
            font: helveticaBold,
            color: COLOR_HEADING,
        });
        y -= 3;

        // Thin line under heading
        page.drawLine({
            start: { x: MARGIN_LEFT, y },
            end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
            thickness: 0.5,
            color: rgb(0.85, 0.85, 0.85),
        });
        y -= 12;

        // Items
        for (const item of section.items) {
            // Strip markdown bold
            const cleanItem = item.replace(/\*\*/g, "");
            const isBoldLine = item.startsWith("**");

            const itemFont = isBoldLine ? helveticaBold : helvetica;
            const itemSize = 9.5;
            const bulletPrefix = isBoldLine ? "" : "•  ";
            const indent = isBoldLine ? 0 : 12;
            const itemMaxWidth = CONTENT_WIDTH - indent;

            const wrappedLines = wrapText(
                bulletPrefix + cleanItem,
                itemFont,
                itemSize,
                itemMaxWidth
            );

            for (let li = 0; li < wrappedLines.length; li++) {
                ensureSpace(14);
                page.drawText(wrappedLines[li], {
                    x: MARGIN_LEFT + indent,
                    y,
                    size: itemSize,
                    font: itemFont,
                    color: COLOR_BLACK,
                });
                y -= 13;
            }
            y -= 2; // small gap between items
        }

        y -= 8; // gap between sections
    }

    return pdfDoc.save();
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
        const finalMarkdown = approved_markdown || gen.latest_preview_markdown;

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
        const { sections, rawText, contactLine, nameHeading } =
            parseMarkdownToStructured(finalMarkdown);

        // Generate auto-name
        const autoName = generateAutoName(
            gen.doc_type,
            gen.mode,
            gen.target_company,
            gen.target_job_title
        );

        const documentId = crypto.randomUUID();
        const basePath = `${user.id}/generated/${documentId}`;

        // Generate both documents in parallel
        const [pdfBytes, docxBytes] = await Promise.all([
            generatePdf(nameHeading, contactLine, sections),
            generateDocx(nameHeading, contactLine, sections),
        ]);

        // Upload both files in parallel
        const pdfPath = `${basePath}/${autoName}.pdf`;
        const docxPath = `${basePath}/${autoName}.docx`;

        const [pdfUpload, docxUpload] = await Promise.all([
            supabase.storage
                .from("apply-kit")
                .upload(pdfPath, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: true,
                }),
            supabase.storage
                .from("apply-kit")
                .upload(docxPath, docxBytes, {
                    contentType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    upsert: true,
                }),
        ]);

        if (pdfUpload.error) {
            throw new Error("Failed to upload PDF: " + pdfUpload.error.message);
        }
        if (docxUpload.error) {
            throw new Error("Failed to upload DOCX: " + docxUpload.error.message);
        }

        // Create document record in vault (use PDF as primary storage_path)
        const { data: doc, error: docError } = await supabase
            .from("apply_kit_documents")
            .insert({
                id: documentId,
                user_id: user.id,
                doc_type: gen.doc_type,
                source: "generated",
                file_name: autoName,
                storage_path: pdfPath,
                mime_type: "application/pdf",
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
            throw new Error(
                "Failed to create document record: " + docError.message
            );
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
            await supabase
                .from("apply_kit_generations")
                .update({
                    base_document_extracted_text: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", generation_id);

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
                    storage_path: pdfPath,
                    docx_storage_path: docxPath,
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
