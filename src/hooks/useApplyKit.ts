/**
 * useApplyKit — React Query hooks for the Apply Kit
 *
 * Provides hooks for document vault CRUD, generation lifecycle,
 * and polling for async generation status.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
    fetchDocuments,
    fetchGenerations,
    fetchGeneration,
    renameDocument,
    deleteDocument,
    setPrimaryDocument,
    type ApplyKitDocument,
    type ApplyKitGeneration,
} from "@/services/applyKitService";

// ── Document Vault Hooks ─────────────────────────────────────────────────────

export function useApplyKitDocuments(docType: "cv" | "cover_letter") {
    return useQuery<ApplyKitDocument[]>({
        queryKey: ["apply-kit-documents", docType],
        queryFn: () => fetchDocuments(docType),
        staleTime: 30_000,
    });
}

export function useActiveGenerations() {
    return useQuery<ApplyKitGeneration[]>({
        queryKey: ["apply-kit-active-generations"],
        queryFn: fetchGenerations,
        staleTime: 10_000,
    });
}

export function useGeneration(generationId: string | null) {
    return useQuery<ApplyKitGeneration | null>({
        queryKey: ["apply-kit-generation", generationId],
        queryFn: () =>
            generationId ? fetchGeneration(generationId) : Promise.resolve(null),
        enabled: !!generationId,
        refetchInterval: (query) => {
            // Poll every 3s while processing, stop when draft_ready or finalized/failed
            const data = query.state.data;
            if (data && (data as any)?.status === "processing") return 3000;
            return false;
        },
    });
}

// ── Mutation Hooks ───────────────────────────────────────────────────────────

export function useRenameDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            documentId,
            newName,
        }: {
            documentId: string;
            newName: string;
        }) => renameDocument(documentId, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["apply-kit-documents"] });
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (documentId: string) => deleteDocument(documentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["apply-kit-documents"] });
        },
    });
}

export function useSetPrimary() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    return useMutation({
        mutationFn: ({
            documentId,
            docType,
        }: {
            documentId: string;
            docType: "cv" | "cover_letter";
        }) => {
            if (!user) throw new Error("Not authenticated");
            return setPrimaryDocument(documentId, user.id, docType);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["apply-kit-documents"] });
        },
    });
}

export function useInvalidateApplyKit() {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: ["apply-kit-documents"] });
        queryClient.invalidateQueries({
            queryKey: ["apply-kit-active-generations"],
        });
    };
}
