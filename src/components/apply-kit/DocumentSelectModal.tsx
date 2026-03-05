import { useTranslation } from "react-i18next";
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, Shield, X, Check } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ApplyKitDocument } from "@/services/applyKitService";

interface DocumentSelectModalProps {
    open: boolean;
    onClose: () => void;
    docType: "cv" | "cover_letter";
    existingDocs: ApplyKitDocument[];
    privacyMode: "store" | "no_store_base";
    onPrivacyModeChange: (mode: "store" | "no_store_base") => void;
    onSelectExisting: (doc: ApplyKitDocument) => void;
    onUploadFile: (file: File) => void;
    consent: boolean;
    onConsentChange: (v: boolean) => void;
    fileError: string | null;
}

export function DocumentSelectModal({
    open,
    onClose,
    docType,
    existingDocs,
    privacyMode,
    onPrivacyModeChange,
    onSelectExisting,
    onUploadFile,
    consent,
    onConsentChange,
    fileError,
}: DocumentSelectModalProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const docLabel = docType === "cv" ? "CV" : t("applyKit.coverLetter", "cover letter");

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onUploadFile(file);
        },
        [onUploadFile]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) onUploadFile(file);
            // Reset input so same file can be re-selected
            e.target.value = "";
        },
        [onUploadFile]
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-xl overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        {t("applyKit.selectDocument", "Select base document")}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue={existingDocs.length > 0 ? "existing" : "upload"}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="existing">
                            {t("applyKit.fromVault", "From vault")} ({existingDocs.length})
                        </TabsTrigger>
                        <TabsTrigger value="upload">
                            {t("applyKit.uploadNew", "Upload new")}
                        </TabsTrigger>
                    </TabsList>

                    {/* Existing documents panel */}
                    <TabsContent value="existing">
                        {existingDocs.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500">
                                    {t(
                                        "applyKit.noExistingDocs",
                                        "No existing documents. Upload one instead."
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain">
                                {existingDocs.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => onSelectExisting(doc)}
                                        className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center gap-3 overflow-hidden"
                                    >
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {doc.file_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {doc.source === "generated"
                                                    ? t("applyKit.aiGenerated", "AI Generated")
                                                    : t("applyKit.uploaded", "Uploaded")}
                                            </p>
                                        </div>
                                        {doc.is_primary && (
                                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                {t("applyKit.primary", "Primary")}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Upload panel */}
                    <TabsContent value="upload" className="space-y-4">
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragActive
                                ? "border-blue-400 bg-blue-50"
                                : "border-gray-200 bg-gray-50/50"
                                }`}
                        >
                            <Upload className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                            <p className="font-medium text-gray-700">
                                {t("applyKit.dragDrop", "Drag and drop your file here")}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                {t(
                                    "applyKit.fileFormats",
                                    "PDF or DOCX. Maximum size 5 MB."
                                )}
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {t("applyKit.browseFiles", "Browse files")}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {fileError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{fileError}</span>
                            </div>
                        )}

                        {/* Consent */}
                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                            <Switch
                                id="doc-consent"
                                checked={consent}
                                onCheckedChange={onConsentChange}
                            />
                            <Label
                                htmlFor="doc-consent"
                                className="text-sm text-gray-700 cursor-pointer leading-snug"
                            >
                                {t(
                                    "applyKit.consentLabel",
                                    "I consent to AI processing of this document for tailoring"
                                )}
                            </Label>
                        </div>

                        {/* Privacy toggle */}
                        <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                            <Switch
                                id="privacy-toggle"
                                checked={privacyMode === "no_store_base"}
                                onCheckedChange={(checked) =>
                                    onPrivacyModeChange(checked ? "no_store_base" : "store")
                                }
                            />
                            <div>
                                <Label
                                    htmlFor="privacy-toggle"
                                    className="text-sm font-medium text-gray-700 cursor-pointer"
                                >
                                    {t("applyKit.doNotStoreBase", "Do not store my base document")}
                                </Label>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {t(
                                        "applyKit.doNotStoreExplain",
                                        "Your original file will be deleted after generation. The AI-generated output will still be saved."
                                    )}
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
