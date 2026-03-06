import { useTranslation } from "react-i18next";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveIndicatorProps {
    status: SaveStatus;
    className?: string;
}

export function AutosaveIndicator({ status, className }: AutosaveIndicatorProps) {
    const { t } = useTranslation();

    if (status === "idle") return null;

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all",
                status === "saving" && "text-blue-600 bg-blue-50",
                status === "saved" && "text-green-600 bg-green-50",
                status === "error" && "text-red-600 bg-red-50",
                className
            )}
        >
            {status === "saving" && (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("profile.saving", "Saving...")}
                </>
            )}
            {status === "saved" && (
                <>
                    <Check className="h-3 w-3" />
                    {t("profile.saved", "Saved")}
                </>
            )}
            {status === "error" && (
                <>
                    <AlertCircle className="h-3 w-3" />
                    {t("profile.saveError", "Error saving")}
                </>
            )}
        </div>
    );
}
