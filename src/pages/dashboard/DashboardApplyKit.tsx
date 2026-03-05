import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, PenLine, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useJob } from "@/hooks/useJobs";
import {
    useApplyKitDocuments,
    useActiveGenerations,
    useRenameDocument,
    useDeleteDocument,
    useSetPrimary,
    useInvalidateApplyKit,
} from "@/hooks/useApplyKit";
import {
    validateFile,
    validateExtractedText,
    extractTextFromFile,
    uploadBaseDocument,
    createUploadedDocumentRecord,
    startGeneration,
    refineGeneration,
    finalizeGeneration,
    getSignedDownloadUrl,
    type ApplyKitDocument,
    type StartGenerationParams,
} from "@/services/applyKitService";

import { TargetJobCard } from "@/components/apply-kit/TargetJobCard";
import { VaultDocumentList } from "@/components/apply-kit/VaultDocumentList";
import { DocumentSelectModal } from "@/components/apply-kit/DocumentSelectModal";
import { ManualSetupModal } from "@/components/apply-kit/ManualSetupModal";
import { GenerationProgress } from "@/components/apply-kit/GenerationProgress";
import { PreviewRefineView } from "@/components/apply-kit/PreviewRefineView";
import { FinalizationSuccess } from "@/components/apply-kit/FinalizationSuccess";

// ── Flow State Machine ───────────────────────────────────────────────────────

type FlowState =
    | "idle"
    | "setup"         // manual setup modal (target title)
    | "select_doc"    // document selection modal
    | "extracting"    // extracting text from file
    | "generating"    // AI processing
    | "preview"       // draft ready for review/refine
    | "finalizing"    // creating final document
    | "success";      // finalization complete

export default function DashboardApplyKit() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user } = useAuth();
    const invalidateApplyKit = useInvalidateApplyKit();
    const [searchParams] = useSearchParams();

    // URL params
    const urlTab = searchParams.get("tab") || "cv";
    const jobId = searchParams.get("jobId") || null;

    // State
    const [activeTab, setActiveTab] = useState<string>(
        urlTab === "cover" ? "cover" : "cv"
    );
    const [flowState, setFlowState] = useState<FlowState>("idle");
    const [consent, setConsent] = useState(false);
    const [privacyMode, setPrivacyMode] = useState<"store" | "no_store_base">(
        "store"
    );
    const [fileError, setFileError] = useState<string | null>(null);
    const [docSelectOpen, setDocSelectOpen] = useState(false);
    const [manualSetupOpen, setManualSetupOpen] = useState(false);

    // Generation context
    const [targetJobTitle, setTargetJobTitle] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [previewMarkdown, setPreviewMarkdown] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [finalizedDoc, setFinalizedDoc] = useState<{
        id: string;
        file_name: string;
        storage_path: string;
        docx_storage_path: string;
    } | null>(null);

    // Data hooks
    const docType = activeTab === "cover" ? "cover_letter" : "cv";
    const { data: cvDocs = [], isLoading: cvLoading } =
        useApplyKitDocuments("cv");
    const { data: coverDocs = [], isLoading: coverLoading } =
        useApplyKitDocuments("cover_letter");
    const { data: activeGens = [] } = useActiveGenerations();
    const renameMutation = useRenameDocument();
    const deleteMutation = useDeleteDocument();
    const setPrimaryMutation = useSetPrimary();

    // Job data (if jobId present)
    const { data: jobData } = useJob(jobId || undefined);

    // Current tab documents
    const currentDocs = activeTab === "cover" ? coverDocs : cvDocs;
    const isLoading = activeTab === "cover" ? coverLoading : cvLoading;

    // Check for active generations for current doc type
    const activeGeneration = activeGens.find(
        (g) => g.doc_type === docType && g.status === "draft_ready"
    );

    // Auto-open generation flow if there's a jobId and we're idle
    useEffect(() => {
        if (jobId && jobData && flowState === "idle") {
            // Job-specific mode: go directly to doc selection
            setDocSelectOpen(true);
        }
    }, [jobId, jobData, flowState]);

    // Resume active draft if returning
    useEffect(() => {
        if (activeGeneration && flowState === "idle") {
            setGenerationId(activeGeneration.id);
            setPreviewMarkdown(activeGeneration.latest_preview_markdown || "");
            setFlowState("preview");
        }
    }, [activeGeneration, flowState]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleStartTailoring = () => {
        if (jobId && jobData) {
            // Job-specific: go directly to doc selection
            setDocSelectOpen(true);
        } else {
            // Manual: show setup modal first
            setManualSetupOpen(true);
        }
    };

    const handleManualSetupSubmit = (title: string, prompt: string) => {
        setTargetJobTitle(title);
        setCustomPrompt(prompt);
        setManualSetupOpen(false);
        setDocSelectOpen(true);
    };

    const handleSelectExistingDoc = async (doc: ApplyKitDocument) => {
        setDocSelectOpen(false);
        setFlowState("extracting");

        try {
            // Get signed URL and download file to extract text
            const url = await getSignedDownloadUrl(doc.storage_path);
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], doc.file_name, {
                type: doc.mime_type || "application/pdf",
            });

            const text = await extractTextFromFile(file);
            const validation = validateExtractedText(text);
            if (!validation.valid) {
                setFileError(validation.error || null);
                setFlowState("idle");
                setDocSelectOpen(true);
                return;
            }

            await startGenerationFlow(text, doc.id, doc.storage_path);
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description: err.message || t("applyKit.extractionFailed", "Failed to process document"),
                variant: "destructive",
            });
            setFlowState("idle");
        }
    };

    const handleUploadFile = async (file: File) => {
        setFileError(null);

        // Validate file
        const fileValidation = validateFile(file);
        if (!fileValidation.valid) {
            setFileError(fileValidation.error || null);
            return;
        }

        if (!consent) {
            setFileError(
                t("applyKit.consentRequired", "Please consent to AI processing before uploading.")
            );
            return;
        }

        setDocSelectOpen(false);
        setFlowState("extracting");

        try {
            // Extract text
            const text = await extractTextFromFile(file);
            const validation = validateExtractedText(text);
            if (!validation.valid) {
                setFileError(validation.error || null);
                setFlowState("idle");
                setDocSelectOpen(true);
                return;
            }

            // Upload to storage
            if (!user) throw new Error("Not authenticated");
            const docId = crypto.randomUUID();
            const storagePath = await uploadBaseDocument(file, user.id, docId);

            // Create document record
            await createUploadedDocumentRecord(
                user.id,
                docType as "cv" | "cover_letter",
                file.name.replace(/\.[^.]+$/, ""),
                storagePath,
                file
            );

            invalidateApplyKit();

            await startGenerationFlow(text, docId, storagePath);
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description: err.message || t("applyKit.uploadFailed", "Failed to upload file"),
                variant: "destructive",
            });
            setFlowState("idle");
        }
    };

    const startGenerationFlow = async (
        extractedText: string,
        baseDocumentId?: string,
        baseDocumentStoragePath?: string
    ) => {
        setFlowState("generating");

        try {
            const params: StartGenerationParams = {
                doc_type: docType as "cv" | "cover_letter",
                mode: jobId ? "job_specific" : "manual",
                extracted_text: extractedText,
                privacy_mode: privacyMode,
                ...(jobId && { job_id: jobId }),
                ...(!jobId && { target_job_title: targetJobTitle }),
                ...(customPrompt && { custom_prompt: customPrompt }),
                ...(baseDocumentId && { base_document_id: baseDocumentId }),
                ...(baseDocumentStoragePath && {
                    base_document_storage_path: baseDocumentStoragePath,
                }),
            };

            const result = await startGeneration(params);

            if (result.ok) {
                setGenerationId(result.generation_id);
                setPreviewMarkdown(result.preview_markdown);
                setFlowState("preview");
                invalidateApplyKit();
            } else {
                throw new Error(result.error || "Generation failed");
            }
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description:
                    err.message || t("applyKit.generationFailed", "AI generation failed. Please try again."),
                variant: "destructive",
            });
            setFlowState("idle");
        }
    };

    const handleRefine = async (feedback: string) => {
        if (!generationId) return;
        setIsRefining(true);

        try {
            const result = await refineGeneration(generationId, feedback);
            if (result.ok) {
                setPreviewMarkdown(result.preview_markdown);
            } else {
                throw new Error(result.error || "Refinement failed");
            }
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description: err.message || t("applyKit.refineFailed", "Refinement failed"),
                variant: "destructive",
            });
        } finally {
            setIsRefining(false);
        }
    };

    const handleApprove = async () => {
        if (!generationId) return;
        setFlowState("finalizing");

        try {
            const result = await finalizeGeneration(generationId, previewMarkdown);
            if (result.ok) {
                setFinalizedDoc({
                    id: result.document.id,
                    file_name: result.document.file_name,
                    storage_path: result.document.storage_path,
                    docx_storage_path: result.document.docx_storage_path,
                });
                setFlowState("success");
                invalidateApplyKit();
            } else {
                throw new Error(result.error || "Finalization failed");
            }
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description: err.message || t("applyKit.finalizeFailed", "Failed to finalize document"),
                variant: "destructive",
            });
            setFlowState("preview");
        }
    };

    const handleDownloadDoc = async (doc: ApplyKitDocument | null = null, format: "pdf" | "docx" = "pdf") => {
        try {
            let path: string | undefined;
            if (doc) {
                path = doc.storage_path;
            } else if (finalizedDoc) {
                path = format === "docx" ? finalizedDoc.docx_storage_path : finalizedDoc.storage_path;
            }
            if (!path) return;
            const url = await getSignedDownloadUrl(path);
            window.open(url, "_blank");
        } catch (err: any) {
            toast({
                title: t("applyKit.errorTitle", "Error"),
                description: t("applyKit.downloadFailed", "Failed to generate download link"),
                variant: "destructive",
            });
        }
    };

    const handleReset = () => {
        setFlowState("idle");
        setGenerationId(null);
        setPreviewMarkdown("");
        setFinalizedDoc(null);
        setTargetJobTitle("");
        setCustomPrompt("");
        setConsent(false);
        setFileError(null);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    const renderFlowContent = () => {
        switch (flowState) {
            case "extracting":
                return (
                    <GenerationProgress currentStep="preparing" />
                );
            case "generating":
                return <GenerationProgress currentStep="drafting" />;
            case "preview":
                return (
                    <PreviewRefineView
                        previewMarkdown={previewMarkdown}
                        isRefining={isRefining}
                        onRefine={handleRefine}
                        onApprove={handleApprove}
                        onBack={handleReset}
                    />
                );
            case "finalizing":
                return <GenerationProgress currentStep="ready" />;
            case "success":
                return finalizedDoc ? (
                    <FinalizationSuccess
                        fileName={finalizedDoc.file_name}
                        onDownloadPdf={() => handleDownloadDoc(null, "pdf")}
                        onDownloadDocx={() => handleDownloadDoc(null, "docx")}
                        onUseAsBase={() => {
                            handleReset();
                            handleStartTailoring();
                        }}
                        onBackToVault={handleReset}
                    />
                ) : null;
            default:
                return null;
        }
    };

    const renderTabContent = (tabType: "cv" | "cover") => {
        const tabDocType = tabType === "cover" ? "cover_letter" : "cv";
        const docs = tabType === "cover" ? coverDocs : cvDocs;
        const loading = tabType === "cover" ? coverLoading : cvLoading;

        return (
            <div className="space-y-6">
                {/* Job target card (if jobId present) */}
                {jobId && jobData && (
                    <TargetJobCard
                        jobTitle={jobData.title}
                        company={jobData.company}
                        sourceType={jobData.sourceType}
                        description={jobData.description}
                    />
                )}

                {/* Flow content (replaces idle state when active) */}
                {flowState !== "idle" ? (
                    renderFlowContent()
                ) : (
                    <>
                        {/* Primary action button */}
                        <Button
                            onClick={handleStartTailoring}
                            size="lg"
                            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                        >
                            <Sparkles className="h-4 w-4" />
                            {jobId
                                ? t("applyKit.tailorToJob", "Tailor to this job")
                                : tabType === "cv"
                                    ? t("applyKit.createTailoredCV", "Create tailored CV")
                                    : t(
                                        "applyKit.createTailoredCover",
                                        "Create tailored cover letter"
                                    )}
                        </Button>

                        {/* Active draft notice */}
                        {activeGeneration && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-800">
                                        {t("applyKit.draftReady", "You have a draft ready for review")}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setGenerationId(activeGeneration.id);
                                        setPreviewMarkdown(
                                            activeGeneration.latest_preview_markdown || ""
                                        );
                                        setFlowState("preview");
                                    }}
                                >
                                    {t("applyKit.reviewDraft", "Review draft")}
                                </Button>
                            </div>
                        )}

                        {/* Vault document list */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                {tabType === "cv"
                                    ? t("applyKit.yourCVs", "Your CV documents")
                                    : t("applyKit.yourCoverLetters", "Your cover letters")}
                            </h3>
                            <VaultDocumentList
                                documents={docs}
                                docType={tabDocType}
                                isLoading={loading}
                                onDownload={(doc) => handleDownloadDoc(doc)}
                                onDelete={(doc) => {
                                    deleteMutation.mutate(doc.id, {
                                        onSuccess: () => {
                                            toast({
                                                title: t("applyKit.deleted", "Document deleted"),
                                            });
                                        },
                                        onError: (err: any) => {
                                            toast({
                                                title: t("applyKit.errorTitle", "Error"),
                                                description: err.message,
                                                variant: "destructive",
                                            });
                                        },
                                    });
                                }}
                                onRename={(doc, newName) => {
                                    renameMutation.mutate(
                                        { documentId: doc.id, newName },
                                        {
                                            onSuccess: () => {
                                                toast({
                                                    title: t("applyKit.renamed", "Document renamed"),
                                                });
                                            },
                                        }
                                    );
                                }}
                                onSetPrimary={(doc) => {
                                    setPrimaryMutation.mutate(
                                        { documentId: doc.id, docType: tabDocType },
                                        {
                                            onSuccess: () => {
                                                toast({
                                                    title: t("applyKit.primarySet", "Primary document updated"),
                                                });
                                            },
                                        }
                                    );
                                }}
                                onUseAsBase={(doc) => {
                                    // Start generation with this doc as base
                                    if (jobId && jobData) {
                                        handleSelectExistingDoc(doc);
                                    } else {
                                        setManualSetupOpen(true);
                                    }
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("applyKit.title", "Apply Kit")}
                </h1>
                <p className="text-gray-500 mt-1">
                    {t(
                        "applyKit.subtitle",
                        "Keep your CV versions, cover letters, and role notes in one place."
                    )}
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(v) => {
                    setActiveTab(v);
                    if (flowState !== "idle") handleReset();
                }}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
                    <TabsTrigger value="cv">
                        <FileText className="h-4 w-4 mr-1.5" />
                        {t("applyKit.cvVersions", "CV Versions")}
                    </TabsTrigger>
                    <TabsTrigger value="cover">
                        <PenLine className="h-4 w-4 mr-1.5" />
                        {t("applyKit.coverLetters", "Cover Letters")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cv" className="mt-0">
                    {renderTabContent("cv")}
                </TabsContent>

                <TabsContent value="cover" className="mt-0">
                    {renderTabContent("cover")}
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <ManualSetupModal
                open={manualSetupOpen}
                onClose={() => setManualSetupOpen(false)}
                docType={docType as "cv" | "cover_letter"}
                onSubmit={handleManualSetupSubmit}
            />
            <DocumentSelectModal
                open={docSelectOpen}
                onClose={() => {
                    setDocSelectOpen(false);
                    if (flowState === "idle") setFileError(null);
                }}
                docType={docType as "cv" | "cover_letter"}
                existingDocs={currentDocs}
                privacyMode={privacyMode}
                onPrivacyModeChange={setPrivacyMode}
                onSelectExisting={handleSelectExistingDoc}
                onUploadFile={handleUploadFile}
                consent={consent}
                onConsentChange={setConsent}
                fileError={fileError}
            />
        </div>
    );
}
