import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Building, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { useState } from "react";

interface TargetJobCardProps {
    jobTitle: string;
    company: string;
    sourceType: "EXTERNAL" | "DIRECT";
    description?: string;
}

export function TargetJobCard({
    jobTitle,
    company,
    sourceType,
    description,
}: TargetJobCardProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
                    {t("applyKit.targetJob", "Target Job")}
                </h3>
                <SourceBadge sourceType={sourceType} />
            </div>

            <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <Briefcase className="h-5 w-5 text-blue-700" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-lg leading-tight">
                        {jobTitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                        <Building className="h-3.5 w-3.5" />
                        <span>{company}</span>
                    </div>
                </div>
            </div>

            {description && (
                <div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
                    >
                        {expanded
                            ? t("applyKit.hideDescription", "Hide description")
                            : t("applyKit.showDescription", "Show description")}
                        {expanded ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </button>
                    {expanded && (
                        <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6 max-h-36 overflow-auto">
                            {description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
