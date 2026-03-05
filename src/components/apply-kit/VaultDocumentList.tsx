import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Download,
    Trash2,
    Star,
    Edit2,
    Sparkles,
    FileText,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ApplyKitDocument } from "@/services/applyKitService";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface VaultDocumentRowProps {
    doc: ApplyKitDocument;
    onDownload: (doc: ApplyKitDocument) => void;
    onDelete: (doc: ApplyKitDocument) => void;
    onRename: (doc: ApplyKitDocument, newName: string) => void;
    onSetPrimary: (doc: ApplyKitDocument) => void;
    onUseAsBase: (doc: ApplyKitDocument) => void;
}

export function VaultDocumentRow({
    doc,
    onDownload,
    onDelete,
    onRename,
    onSetPrimary,
    onUseAsBase,
}: VaultDocumentRowProps) {
    const { t } = useTranslation();
    const [isRenaming, setIsRenaming] = useState(false);
    const [nameInput, setNameInput] = useState(doc.file_name);

    const handleRenameSubmit = () => {
        if (nameInput.trim() && nameInput !== doc.file_name) {
            onRename(doc, nameInput.trim());
        }
        setIsRenaming(false);
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <div
                    className={`p-3 rounded-lg shrink-0 ${doc.source === "generated"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                >
                    {doc.source === "generated" ? (
                        <Sparkles className="h-5 w-5" />
                    ) : (
                        <FileText className="h-5 w-5" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    {isRenaming ? (
                        <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameSubmit();
                                if (e.key === "Escape") {
                                    setNameInput(doc.file_name);
                                    setIsRenaming(false);
                                }
                            }}
                            className="text-sm font-bold text-gray-900 border-b border-blue-400 outline-none bg-transparent w-full"
                            autoFocus
                        />
                    ) : (
                        <p className="text-sm font-bold text-gray-900 truncate">
                            {doc.file_name}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">
                            {formatDistanceToNow(new Date(doc.created_at), {
                                addSuffix: true,
                            })}
                        </span>
                        {doc.source === "generated" && (
                            <Badge
                                variant="outline"
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                            >
                                {t("applyKit.aiGenerated", "AI Generated")}
                            </Badge>
                        )}
                        {doc.target_company && (
                            <Badge variant="secondary" className="text-xs">
                                {doc.target_company}
                            </Badge>
                        )}
                        {doc.target_job_title && (
                            <Badge variant="secondary" className="text-xs">
                                {doc.target_job_title}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-1 items-center shrink-0 ml-2">
                {doc.is_primary && (
                    <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 border-amber-200"
                    >
                        {t("applyKit.primary", "Primary")}
                    </Badge>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-blue-600"
                    onClick={() => onDownload(doc)}
                    title={t("applyKit.download", "Download")}
                >
                    <Download className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            {t("applyKit.rename", "Rename")}
                        </DropdownMenuItem>
                        {!doc.is_primary && (
                            <DropdownMenuItem onClick={() => onSetPrimary(doc)}>
                                <Star className="h-4 w-4 mr-2" />
                                {t("applyKit.setAsPrimary", "Set as primary")}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onUseAsBase(doc)}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {t("applyKit.useAsBase", "Use as base for tailoring")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(doc)}
                            className="text-red-600"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("applyKit.deleteDoc", "Delete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

interface VaultDocumentListProps {
    documents: ApplyKitDocument[];
    docType: "cv" | "cover_letter";
    isLoading: boolean;
    onDownload: (doc: ApplyKitDocument) => void;
    onDelete: (doc: ApplyKitDocument) => void;
    onRename: (doc: ApplyKitDocument, newName: string) => void;
    onSetPrimary: (doc: ApplyKitDocument) => void;
    onUseAsBase: (doc: ApplyKitDocument) => void;
}

export function VaultDocumentList({
    documents,
    docType,
    isLoading,
    onDownload,
    onDelete,
    onRename,
    onSetPrimary,
    onUseAsBase,
}: VaultDocumentListProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gray-200 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-gray-200 rounded w-2/3" />
                                <div className="h-3 bg-gray-200 rounded w-1/3" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                    {docType === "cv"
                        ? t("applyKit.noCVs", "No CV documents yet")
                        : t(
                            "applyKit.noCoverLetters",
                            "No cover letters yet"
                        )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    {t(
                        "applyKit.uploadOrGenerate",
                        "Upload a document or generate one with AI"
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc) => (
                <VaultDocumentRow
                    key={doc.id}
                    doc={doc}
                    onDownload={onDownload}
                    onDelete={onDelete}
                    onRename={onRename}
                    onSetPrimary={onSetPrimary}
                    onUseAsBase={onUseAsBase}
                />
            ))}
        </div>
    );
}
