import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Sparkles, FileText, FileType } from "lucide-react";

interface FinalizationSuccessProps {
    fileName: string;
    onDownloadPdf: () => void;
    onDownloadDocx: () => void;
    onUseAsBase: () => void;
    onBackToVault: () => void;
}

export function FinalizationSuccess({
    fileName,
    onDownloadPdf,
    onDownloadDocx,
    onUseAsBase,
    onBackToVault,
}: FinalizationSuccessProps) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-foreground">
                {t("applyKit.finalizationSuccess", "Document ready!")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                {t(
                    "applyKit.savedToVault",
                    "Your tailored document has been saved to your Apply Kit."
                )}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{fileName}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                    onClick={onDownloadPdf}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <FileText className="h-4 w-4" />
                    {t("applyKit.downloadPdf", "Download PDF")}
                </Button>
                <Button
                    onClick={onDownloadDocx}
                    variant="outline"
                    className="gap-2"
                >
                    <FileType className="h-4 w-4" />
                    {t("applyKit.downloadDocx", "Download DOCX")}
                </Button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={onUseAsBase} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t("applyKit.useAsBase", "Use as base for tailoring")}
                </Button>
            </div>

            <Button
                variant="link"
                onClick={onBackToVault}
                className="mt-4 text-muted-foreground"
            >
                {t("applyKit.backToVault", "Back to Apply Kit")}
            </Button>
        </div>
    );
}
