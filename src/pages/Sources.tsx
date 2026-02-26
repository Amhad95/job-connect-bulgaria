import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface EmployerRow {
  id: string;
  name: string;
  website_domain: string | null;
  employer_sources: {
    id: string;
    careers_home_url: string | null;
    policy_status: string;
    policy_mode: string;
    robots_last_checked_at: string | null;
  }[];
}

export default function Sources() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: employers, isLoading } = useQuery({
    queryKey: ["employers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employers")
        .select("id, name, website_domain, employer_sources(id, careers_home_url, policy_status, policy_mode, robots_last_checked_at)")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as EmployerRow[];
    },
  });

  const handleSubmitRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setSubmitting(true);
    const { error } = await supabase.from("removal_requests").insert({
      url,
      reason: reason || null,
      requester_email: email || null,
      company_name: companyName || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Your removal request has been submitted." });
      setUrl(""); setReason(""); setEmail(""); setCompanyName("");
    }
  };

  const policyStatusVariant = (s: string) => {
    if (s === "ACTIVE") return "default";
    if (s === "BLOCKED") return "destructive";
    return "secondary";
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="mb-2 font-display text-2xl font-bold md:text-3xl">{t("nav.sources")}</h1>
        <p className="mb-8 text-muted-foreground max-w-2xl">
          {t("sources.intro")}
        </p>

        {/* Employers table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.name")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("employers.portal") || "Careers portal"}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.policy")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("sources.stored")}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">{t("employers.lastChecked") || "Last refreshed"}</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("common.loading")}</td></tr>
                ) : !employers?.length ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("common.noResults")}</td></tr>
                ) : (
                  employers.map((emp) => {
                    const src = emp.employer_sources?.[0];
                    return (
                      <tr key={emp.id} className="border-b last:border-0 hover:bg-surface/50">
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                          {emp.website_domain || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={policyStatusVariant(src?.policy_status || "PENDING")}>
                            {src?.policy_status || "PENDING"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{src?.policy_mode || "OFF"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {src?.robots_last_checked_at ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(src.robots_last_checked_at), { addSuffix: true })}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{t("sources.removal")}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Removal request form */}
        <div className="mt-12 max-w-lg">
          <h2 className="mb-4 font-display text-xl font-bold">{t("sources.requestRemoval")}</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {t("sources.removalBody")}
          </p>
          <form onSubmit={handleSubmitRemoval} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("sources.postingUrl")}</Label>
              <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.reason")}</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.email")}</Label>
              <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("sources.companyName")}</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <Button type="submit" disabled={submitting}>{submitting ? t("common.loading") : t("sources.submit")}</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
