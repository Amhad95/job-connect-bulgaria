import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ExternalLink } from "lucide-react";

/**
 * SourceBadge
 *
 * Single source of truth for source-type badge rendering.
 * Driven purely by sourceType prop — no hardcoded strings.
 *
 * DIRECT  → "Verified Employer" (primary badge, blue)
 * EXTERNAL → "External Listing" (muted secondary badge)
 *
 * Uses badges.verifiedEmployer / badges.externalListing i18n keys.
 * Import and use this in JobCard, JobDetail, and any other UI that shows source labels.
 */
export function SourceBadge({ sourceType }: { sourceType: 'DIRECT' | 'EXTERNAL' | undefined }) {
    const { t } = useTranslation();

    if (sourceType === 'DIRECT') {
        return (
            <Badge className="bg-primary text-primary-foreground gap-1 shrink-0">
                <CheckCircle className="w-3 h-3" />
                {t("badges.verifiedEmployer")}
            </Badge>
        );
    }

    return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted shrink-0 gap-1">
            <ExternalLink className="w-3 h-3" />
            {t("badges.externalListing")}
        </Badge>
    );
}
