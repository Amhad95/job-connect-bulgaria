import { useState } from "react";
import { useTranslation } from "react-i18next";
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

export default function AdminSources() {
  const { t } = useTranslation();
  const { toast } = useToast();

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



  const policyStatusVariant = (s: string) => {
    if (s === "ACTIVE") return "default";
    if (s === "BLOCKED") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Source Domains</h1>
          <p className="text-gray-500 mt-1">Review aggregated footprint arrays and target schemas.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
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
    </div>
  );
}
