import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { mockSources } from "@/data/mockJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Sources() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="mb-2 font-display text-2xl font-bold md:text-3xl">{t("nav.sources")}</h1>
        <p className="mb-8 text-muted-foreground max-w-2xl">
          {t("sources.intro") || "Bachkam.com lists jobs from multiple sources. Each job shows its source and links to the original posting."}
        </p>

        {/* Sources table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.name") || "Source"}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.policy") || "Policy"}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("jobs.lastChecked")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.stored") || "What we store"}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {mockSources.map((src) => (
                  <tr key={src.name} className="border-b last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium">{src.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={src.policyMode === "public" ? "secondary" : "outline"}>{src.policyMode}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(src.lastChecked), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{src.stored}</td>
                    <td className="px-4 py-3">
                      <a href={src.removalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                        {t("sources.removal") || "Removal"}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Removal request form */}
        <div className="mt-12 max-w-lg">
          <h2 className="mb-4 font-display text-xl font-bold">{t("sources.requestRemoval") || "Request removal"}</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("sources.removalBody") || "If you own the posting or represent the employer, send us the URL and we will review and process the request."}
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("sources.postingUrl") || "Posting URL"}</Label>
              <Input placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.reason") || "Reason"}</Label>
              <Textarea placeholder="" />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.email") || "Your email"}</Label>
              <Input type="email" placeholder="you@company.com" />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.companyName") || "Company name (optional)"}</Label>
              <Input />
            </div>
            <Button>{t("sources.submit") || "Submit request"}</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
