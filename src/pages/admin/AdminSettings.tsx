import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, RefreshCw, Settings2, AlertCircle } from "lucide-react";

type SettingsRow = {
    id: string;
    max_job_age_days: number;
    auto_crawl_schedule: string;
    scrape_unknown_policy: string;
    user_agent: string;
    max_concurrent_scrapes: number;
    rate_limit_ms: number;
    default_job_status: string;
};

export default function AdminSettings() {
    const [settings, setSettings] = useState<SettingsRow | null>(null);
    const [form, setForm] = useState<Partial<SettingsRow>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("system_settings").select("*").limit(1).single() as any;
        if (error) toast.error("Failed to load settings: " + error.message);
        else { setSettings(data); setForm(data); setDirty(false); }
        setLoading(false);
    };

    useEffect(() => { fetchSettings(); }, []);

    const update = (key: keyof SettingsRow, value: unknown) => {
        setForm(f => ({ ...f, [key]: value }));
        setDirty(true);
    };

    const save = async () => {
        if (!settings?.id) return;
        setSaving(true);
        const { error } = await supabase.from("system_settings").update(form as any).eq("id", settings.id);
        if (error) toast.error("Save failed: " + error.message);
        else { toast.success("Settings saved."); setDirty(false); }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Controls read and applied by the scraping pipeline at runtime.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSettings} className="gap-1.5"><RefreshCw className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={save} disabled={saving || !dirty} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                        <Save className="w-4 h-4" /> {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
                    </Button>
                </div>
            </div>

            {/* Section: Scraping behavior */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-400" />
                    <h2 className="font-semibold text-gray-800 text-sm">Scraping Behavior</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {/* Unknown policy */}
                    <div className="px-6 py-4 flex items-start justify-between gap-6">
                        <div>
                            <Label className="font-medium text-gray-900">Unknown Policy Behavior</Label>
                            <p className="text-xs text-gray-500 mt-0.5">When a source has no robots.txt evaluation yet, should the scraper skip or attempt scraping?</p>
                        </div>
                        <select
                            className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                            value={form.scrape_unknown_policy || "skip"}
                            onChange={e => update("scrape_unknown_policy", e.target.value)}
                        >
                            <option value="skip">Skip (safe default)</option>
                            <option value="allow">Allow (attempt scrape)</option>
                        </select>
                    </div>

                    {/* User agent */}
                    <div className="px-6 py-4 flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <Label className="font-medium text-gray-900">User Agent</Label>
                            <p className="text-xs text-gray-500 mt-0.5">Sent in HTTP headers when fetching robots.txt and job pages. Used for compliance identification.</p>
                            <Input
                                className="mt-2"
                                value={form.user_agent || ""}
                                onChange={e => update("user_agent", e.target.value)}
                                placeholder="Bachkam/1.0 (+https://bachkam.com/robots)"
                            />
                        </div>
                    </div>

                    {/* Max concurrent */}
                    <div className="px-6 py-4 flex items-center justify-between gap-6">
                        <div>
                            <Label className="font-medium text-gray-900">Max Concurrent Scrapes</Label>
                            <p className="text-xs text-gray-500 mt-0.5">Maximum number of companies scraped in parallel per batch run.</p>
                        </div>
                        <Input
                            type="number" min={1} max={10}
                            className="w-20 text-right"
                            value={form.max_concurrent_scrapes ?? 3}
                            onChange={e => update("max_concurrent_scrapes", parseInt(e.target.value) || 1)}
                        />
                    </div>

                    {/* Rate limit */}
                    <div className="px-6 py-4 flex items-center justify-between gap-6">
                        <div>
                            <Label className="font-medium text-gray-900">Rate Limit Delay (ms)</Label>
                            <p className="text-xs text-gray-500 mt-0.5">Delay between individual page requests to avoid overwhelming target servers.</p>
                        </div>
                        <Input
                            type="number" min={0} max={10000} step={100}
                            className="w-24 text-right"
                            value={form.rate_limit_ms ?? 1000}
                            onChange={e => update("rate_limit_ms", parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </section>

            {/* Section: Job ingestion */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-400" />
                    <h2 className="font-semibold text-gray-800 text-sm">Job Ingestion</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {/* Default status — locked to PENDING */}
                    <div className="px-6 py-4 flex items-center justify-between gap-6">
                        <div>
                            <Label className="font-medium text-gray-900">Default Job Status on Ingestion</Label>
                            <p className="text-xs text-gray-500 mt-0.5">All scraped jobs are staged as PENDING and do not appear publicly until approved in the Moderation Queue.</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">PENDING (locked)</span>
                    </div>

                    {/* Max job age */}
                    <div className="px-6 py-4 flex items-center justify-between gap-6">
                        <div>
                            <Label className="font-medium text-gray-900">Max Job Age (days)</Label>
                            <p className="text-xs text-gray-500 mt-0.5">Jobs older than this threshold are automatically archived by the cron job.</p>
                        </div>
                        <Input
                            type="number" min={1} max={365}
                            className="w-20 text-right"
                            value={form.max_job_age_days ?? 30}
                            onChange={e => update("max_job_age_days", parseInt(e.target.value) || 30)}
                        />
                    </div>

                    {/* Auto crawl schedule */}
                    <div className="px-6 py-4 flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <Label className="font-medium text-gray-900">Auto-Crawl Cron Schedule</Label>
                            <p className="text-xs text-gray-500 mt-0.5">Cron expression for the automatic scraping job. Uses standard 5-field cron syntax.</p>
                            <Input
                                className="mt-2 font-mono text-sm"
                                value={form.auto_crawl_schedule || "0 0 * * *"}
                                onChange={e => update("auto_crawl_schedule", e.target.value)}
                                placeholder="0 0 * * *"
                            />
                            <p className="text-xs text-gray-400 mt-1 font-mono">
                                {form.auto_crawl_schedule === "0 0 * * *" ? "Every day at midnight UTC" :
                                    form.auto_crawl_schedule === "0 */6 * * *" ? "Every 6 hours" :
                                        form.auto_crawl_schedule || "Custom schedule"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p>Settings are stored in the <code className="font-mono bg-blue-100 px-1 rounded text-xs">system_settings</code> table and read by the Supabase Edge Functions that power scraping. Changes take effect on the next scrape run.</p>
            </div>
        </div>
    );
}
