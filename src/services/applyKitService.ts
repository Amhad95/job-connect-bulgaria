/**
 * Apply Kit Service
 *
 * Client-side service layer for the Apply Kit features:
 * - File text extraction (PDF/DOCX) using client-side libraries
 * - File upload to Supabase Storage
 * - Edge function calls for generation workflow
 * - Download URL generation
 * - Client-side PDF generation for ATS-friendly output
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApplyKitDocument {
    id: string;
    user_id: string;
    doc_type: "cv" | "cover_letter";
    source: "uploaded" | "generated";
    file_name: string;
    storage_path: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
    linked_job_id: string | null;
    target_company: string | null;
    target_job_title: string | null;
    target_job_url: string | null;
    custom_prompt: string | null;
    approved_markdown: string | null;
    approved_structured_json: any | null;
    template_version: string | null;
    privacy_mode: "store" | "no_store_base";
    base_document_id: string | null;
}

export interface ApplyKitGeneration {
    id: string;
    user_id: string;
    doc_type: "cv" | "cover_letter";
    mode: "job_specific" | "manual";
    status: "processing" | "draft_ready" | "finalized" | "failed";
    privacy_mode: "store" | "no_store_base";
    linked_job_id: string | null;
    target_company: string | null;
    target_job_title: string | null;
    latest_preview_markdown: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

export interface StartGenerationParams {
    doc_type: "cv" | "cover_letter";
    mode: "job_specific" | "manual";
    job_id?: string;
    target_job_title?: string;
    custom_prompt?: string;
    extracted_text: string;
    base_document_id?: string;
    base_document_storage_path?: string;
    privacy_mode: "store" | "no_store_base";
}

export interface StartGenerationResult {
    ok: boolean;
    generation_id: string;
    status: string;
    preview_markdown: string;
    error?: string;
}

export interface RefineResult {
    ok: boolean;
    generation_id: string;
    status: string;
    preview_markdown: string;
    error?: string;
}

export interface FinalizeResult {
    ok: boolean;
    generation_id: string;
    document: {
        id: string;
        file_name: string;
        storage_path: string;
        docx_storage_path: string;
        created_at: string;
        structured_json: any;
        raw_text: string;
    };
    error?: string;
}

// ── File Validation ──────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MIN_EXTRACTED_TEXT_LENGTH = 100;

export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: "Invalid file format. Please upload a PDF or DOCX file.",
        };
    }
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: "File is too large. Maximum size is 5 MB.",
        };
    }
    return { valid: true };
}

export function validateExtractedText(text: string): {
    valid: boolean;
    error?: string;
} {
    if (!text || text.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
        return {
            valid: false,
            error:
                "We couldn't detect enough CV content. Please upload a valid CV or cover letter.",
        };
    }
    return { valid: true };
}

// ── Text Extraction ──────────────────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
    if (file.type === "application/pdf") {
        return extractTextFromPDF(file);
    } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        return extractTextFromDOCX(file);
    }
    throw new Error("Unsupported file type: " + file.type);
}

async function extractTextFromPDF(file: File): Promise<string> {
    // Dynamic import of pdf.js
    const pdfjsLib = await import("pdfjs-dist");
    // Set worker source to CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
        textParts.push(pageText);
    }

    return textParts.join("\n\n");
}

async function extractTextFromDOCX(file: File): Promise<string> {
    // Dynamic import of mammoth
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

// ── Storage Operations ───────────────────────────────────────────────────────

export async function uploadBaseDocument(
    file: File,
    userId: string,
    documentId: string
): Promise<string> {
    const storagePath = `${userId}/base/${documentId}/${file.name}`;
    const { error } = await supabase.storage
        .from("apply-kit")
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: true,
        });

    if (error) {
        throw new Error("Failed to upload file: " + error.message);
    }

    return storagePath;
}

export async function getSignedDownloadUrl(
    storagePath: string
): Promise<string> {
    const { data, error } = await supabase.storage
        .from("apply-kit")
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
        throw new Error("Failed to create download link: " + (error?.message || "unknown"));
    }

    return data.signedUrl;
}

// ── Edge Function Calls ──────────────────────────────────────────────────────

async function callEdgeFunction<T>(
    functionName: string,
    body: Record<string, any>
): Promise<T> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        throw new Error("Not authenticated. Please log in.");
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: {
            Authorization: `Bearer ${session.access_token}`,
        },
    });

    if (error) {
        throw new Error(error.message || `Edge function ${functionName} failed`);
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data as T;
}

export async function startGeneration(
    params: StartGenerationParams
): Promise<StartGenerationResult> {
    return callEdgeFunction<StartGenerationResult>(
        "apply-kit-start-generation",
        params
    );
}

export async function refineGeneration(
    generationId: string,
    userFeedback: string
): Promise<RefineResult> {
    return callEdgeFunction<RefineResult>("apply-kit-refine-generation", {
        generation_id: generationId,
        user_feedback: userFeedback,
    });
}

export async function finalizeGeneration(
    generationId: string,
    approvedMarkdown?: string
): Promise<FinalizeResult> {
    return callEdgeFunction<FinalizeResult>("apply-kit-finalize-generation", {
        generation_id: generationId,
        approved_markdown: approvedMarkdown,
    });
}

// ── Document CRUD ────────────────────────────────────────────────────────────

export async function fetchDocuments(
    docType: "cv" | "cover_letter"
): Promise<ApplyKitDocument[]> {
    const { data, error } = await (supabase as any)
        .from("apply_kit_documents")
        .select("*")
        .eq("doc_type", docType)
        .order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch documents: " + error.message);
    return (data || []) as ApplyKitDocument[];
}

export async function fetchGenerations(): Promise<ApplyKitGeneration[]> {
    const { data, error } = await (supabase as any)
        .from("apply_kit_generations")
        .select("*")
        .in("status", ["processing", "draft_ready"])
        .order("created_at", { ascending: false });

    if (error) throw new Error("Failed to fetch generations: " + error.message);
    return (data || []) as ApplyKitGeneration[];
}

export async function fetchGeneration(
    generationId: string
): Promise<ApplyKitGeneration | null> {
    const { data, error } = await (supabase as any)
        .from("apply_kit_generations")
        .select("*")
        .eq("id", generationId)
        .single();

    if (error) return null;
    return data as ApplyKitGeneration;
}

export async function createUploadedDocumentRecord(
    userId: string,
    docType: "cv" | "cover_letter",
    fileName: string,
    storagePath: string,
    file: File
): Promise<ApplyKitDocument> {
    const { data, error } = await (supabase as any)
        .from("apply_kit_documents")
        .insert({
            user_id: userId,
            doc_type: docType,
            source: "uploaded",
            file_name: fileName,
            storage_path: storagePath,
            mime_type: file.type,
            file_size_bytes: file.size,
        })
        .select("*")
        .single();

    if (error) throw new Error("Failed to save document record: " + error.message);
    return data as ApplyKitDocument;
}

export async function renameDocument(
    documentId: string,
    newName: string
): Promise<void> {
    const { error } = await (supabase as any)
        .from("apply_kit_documents")
        .update({ file_name: newName, updated_at: new Date().toISOString() })
        .eq("id", documentId);

    if (error) throw new Error("Failed to rename: " + error.message);
}

export async function deleteDocument(documentId: string): Promise<void> {
    // First get the storage path to delete the file
    const { data: doc } = await (supabase as any)
        .from("apply_kit_documents")
        .select("storage_path")
        .eq("id", documentId)
        .single();

    if (doc?.storage_path) {
        await supabase.storage.from("apply-kit").remove([doc.storage_path]);
    }

    const { error } = await (supabase as any)
        .from("apply_kit_documents")
        .delete()
        .eq("id", documentId);

    if (error) throw new Error("Failed to delete: " + error.message);
}

export async function setPrimaryDocument(
    documentId: string,
    userId: string,
    docType: "cv" | "cover_letter"
): Promise<void> {
    const { error } = await (supabase as any).rpc(
        "set_apply_kit_document_primary",
        {
            p_document_id: documentId,
            p_user_id: userId,
            p_doc_type: docType,
        }
    );

    if (error) throw new Error("Failed to set primary: " + error.message);
}
