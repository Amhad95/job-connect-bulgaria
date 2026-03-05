import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";

type Step = "preparing" | "analyzing" | "drafting" | "ready";

interface GenerationProgressProps {
    currentStep: Step;
}

const STEPS: Step[] = ["preparing", "analyzing", "drafting", "ready"];

export function GenerationProgress({ currentStep }: GenerationProgressProps) {
    const { t } = useTranslation();
    const currentIndex = STEPS.indexOf(currentStep);

    const stepLabels: Record<Step, string> = {
        preparing: t("applyKit.stepPreparing", "Preparing"),
        analyzing: t("applyKit.stepAnalyzing", "Analyzing document"),
        drafting: t("applyKit.stepDrafting", "Drafting content"),
        ready: t("applyKit.stepReady", "Ready to review"),
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="max-w-md mx-auto">
                <h3 className="text-center text-lg font-bold text-gray-900 mb-6">
                    {t("applyKit.generating", "Generating your document...")}
                </h3>

                <div className="space-y-4">
                    {STEPS.map((step, index) => {
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                            <div key={step} className="flex items-center gap-3">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isCompleted
                                            ? "bg-green-500 text-white"
                                            : isCurrent
                                                ? "bg-blue-500 text-white"
                                                : "bg-gray-200 text-gray-400"
                                        }`}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4" />
                                    ) : isCurrent ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                </div>
                                <span
                                    className={`text-sm font-medium ${isCompleted
                                            ? "text-green-700"
                                            : isCurrent
                                                ? "text-blue-700"
                                                : "text-gray-400"
                                        }`}
                                >
                                    {stepLabels[step]}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    {t(
                        "applyKit.generatingNote",
                        "This may take 15-30 seconds. You can leave this page — your draft will be ready when you return."
                    )}
                </p>
            </div>
        </div>
    );
}
