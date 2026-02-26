import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Briefcase, GripVertical, Plus, StickyNote, Bell } from "lucide-react";

const columns = [
  { key: "saved", color: "bg-muted" },
  { key: "applying", color: "bg-info/10" },
  { key: "applied", color: "bg-primary/10" },
  { key: "interview", color: "bg-warning/10" },
  { key: "offer", color: "bg-success/10" },
  { key: "rejected", color: "bg-destructive/10" },
];

const mockTrackerItems = [
  { id: "1", title: "Senior Frontend Developer", company: "TechCorp Bulgaria", stage: "applied", date: "2026-02-24", reminder: "2026-03-01" },
  { id: "2", title: "Data Analyst", company: "DataWave", stage: "interview", date: "2026-02-20", reminder: "2026-02-28" },
  { id: "3", title: "Project Manager", company: "BuildIt", stage: "saved", date: "2026-02-25" },
  { id: "4", title: "UX/UI Designer", company: "CreativeHub", stage: "applying", date: "2026-02-23" },
  { id: "5", title: "Marketing Manager", company: "DigiAds", stage: "offer", date: "2026-02-15" },
];

export default function Tracker() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t("tracker.title")}</h1>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const items = mockTrackerItems.filter((i) => i.stage === col.key);
            return (
              <div key={col.key} className="min-w-[260px] flex-1">
                <div className={`rounded-t-lg px-3 py-2 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{t(`tracker.${col.key}`)}</h3>
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </div>
                </div>
                <div className="min-h-[200px] rounded-b-lg border border-t-0 bg-card p-2 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-md border bg-background p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.company}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.date}</p>
                          <div className="mt-2 flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <StickyNote className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Bell className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">{t("tracker.emptyState")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
