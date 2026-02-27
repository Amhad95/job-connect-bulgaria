import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, StickyNote, Bell, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const columns = [
    { key: "saved", color: "bg-gray-100" },
    { key: "applying", color: "bg-blue-50" },
    { key: "applied", color: "bg-indigo-50" },
    { key: "interview", color: "bg-amber-50" },
    { key: "offer", color: "bg-emerald-50" },
    { key: "rejected", color: "bg-red-50" },
];

const mockTrackerItems = [
    { id: "1", title: "Senior Frontend Developer", company: "TechCorp Bulgaria", stage: "applied", date: "2026-02-24", reminder: "2026-03-01" },
    { id: "2", title: "Data Analyst", company: "DataWave", stage: "interview", date: "2026-02-20", reminder: "2026-02-28" },
    { id: "3", title: "Project Manager", company: "BuildIt", stage: "saved", date: "2026-02-25" },
    { id: "4", title: "UX/UI Designer", company: "CreativeHub", stage: "applying", date: "2026-02-23" },
    { id: "5", title: "Marketing Manager", company: "DigiAds", stage: "offer", date: "2026-02-15" },
];

export default function DashboardTracker() {
    const { t } = useTranslation();

    return (
        <div className="mx-auto py-4 md:py-8 space-y-8 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("tracker.title", "Application Tracker")}
                </h1>
                <p className="text-gray-500 mt-1">Manage and sequence your active opportunities across platforms.</p>
            </div>

            <Tabs defaultValue="external" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mb-6 w-full max-w-md grid grid-cols-2">
                    <TabsTrigger value="platform">Platform Applications</TabsTrigger>
                    <TabsTrigger value="external">External Applications</TabsTrigger>
                </TabsList>

                <TabsContent value="platform" className="flex-1 mt-0">
                    <div className="h-64 flex flex-col items-center justify-center text-center bg-white border border-gray-200 border-dashed rounded-xl p-8">
                        <Briefcase className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Platform ATS Coming Soon</h3>
                        <p className="text-gray-500 max-w-md mt-2">
                            Jobs you apply to directly through our verified employers (Phase 2) will automatically sync their statuses here in real-time.
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="external" className="flex-1 flex flex-col min-h-0 overflow-hidden mt-0">
                    <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start h-full">
                        {columns.map((col) => {
                            const items = mockTrackerItems.filter((i) => i.stage === col.key);
                            return (
                                <div key={col.key} className="min-w-[280px] w-72 flex-shrink-0 flex flex-col h-full max-h-[70vh]">
                                    <div className={`rounded-t-xl px-4 py-3 ${col.color} border border-b-0 border-gray-200 flex-shrink-0`}>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{t(`tracker.${col.key}`, col.key)}</h3>
                                            <Badge variant="secondary" className="bg-white/60 text-gray-700">{items.length}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex-1 rounded-b-xl border border-gray-200 bg-gray-50/50 p-2 space-y-3 overflow-y-auto min-h-[200px]">
                                        {items.map((item) => (
                                            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                                                <div className="flex items-start gap-3">
                                                    <GripVertical className="mt-0.5 h-4 w-4 text-gray-300 shrink-0 cursor-grab" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</p>
                                                        <p className="text-xs text-primary mt-1">{item.company}</p>
                                                        <p className="mt-2 text-[11px] text-gray-400 font-medium tracking-wide uppercase">{item.date}</p>
                                                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50">
                                                                <StickyNote className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-600 bg-gray-50 hover:bg-amber-50">
                                                                <Bell className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {items.length === 0 && (
                                            <p className="py-12 text-center text-sm text-gray-400 italic">Drop applications here</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
