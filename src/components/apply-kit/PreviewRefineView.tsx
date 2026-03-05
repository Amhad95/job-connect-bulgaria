import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, RefreshCw, Check, Loader2 } from "lucide-react";

interface PreviewRefineViewProps {
    previewMarkdown: string;
    isRefining: boolean;
    onRefine: (feedback: string) => void;
    onApprove: () => void;
    onBack: () => void;
}

export function PreviewRefineView({
    previewMarkdown,
    isRefining,
    onRefine,
    onApprove,
    onBack,
}: PreviewRefineViewProps) {
    const { t } = useTranslation();
    const [feedback, setFeedback] = useState("");

    const handleRefine = () => {
        if (!feedback.trim()) return;
        onRefine(feedback.trim());
        setFeedback("");
    };

    return (
        <div className="space-y-4">
            {/* Preview area */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900 text-sm">
                        {t("applyKit.previewTitle", "AI Draft Preview")}
                    </h3>
                    <span className="text-xs text-gray-500 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {t("applyKit.draftLabel", "Draft")}
                    </span>
                </div>
                <div className="p-6 prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-ul:text-gray-700 prose-li:text-gray-700">
                    {/* Simple markdown rendering */}
                    {previewMarkdown.split("\n").map((line, i) => {
                        if (line.startsWith("## ")) {
                            return (
                                <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">
                                    {line.replace("## ", "")}
                                </h2>
                            );
                        }
                        if (line.startsWith("### ")) {
                            return (
                                <h3 key={i} className="text-base font-semibold text-gray-800 mt-3 mb-1">
                                    {line.replace("### ", "")}
                                </h3>
                            );
                        }
                        if (line.startsWith("# ")) {
                            return (
                                <h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2">
                                    {line.replace("# ", "")}
                                </h1>
                            );
                        }
                        if (line.startsWith("- ") || line.startsWith("* ")) {
                            return (
                                <li key={i} className="ml-4 text-gray-700">
                                    {line.replace(/^[-*]\s/, "")}
                                </li>
                            );
                        }
                        if (line.trim() === "") {
                            return <br key={i} />;
                        }
                        return (
                            <p key={i} className="text-gray-700 leading-relaxed">
                                {line}
                            </p>
                        );
                    })}
                </div>
            </div>

            {/* Refinement input */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <Textarea
                    placeholder={t(
                        "applyKit.refinePlaceholder",
                        "Tell the AI what to change..."
                    )}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    disabled={isRefining}
                />
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={handleRefine}
                        disabled={!feedback.trim() || isRefining}
                        className="gap-2"
                    >
                        {isRefining ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {t("applyKit.refine", "Refine")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onBack}>
                        {t("applyKit.startOver", "Start over")}
                    </Button>
                </div>
            </div>

            {/* Disclaimer + Approve */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        {t(
                            "applyKit.reviewDisclaimer",
                            "Always review AI-generated content for accuracy before applying."
                        )}
                    </p>
                </div>
                <Button
                    onClick={onApprove}
                    disabled={isRefining}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                    <Check className="h-4 w-4" />
                    {t("applyKit.approveAndFinalize", "Approve and generate final document")}
                </Button>
            </div>
        </div>
    );
}
