import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { JobCard } from "@/components/JobCard";
import { useJobs, DbJob } from "@/hooks/useJobs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Bookmark,
    History,
    Bell,
    Search,
    Trash2,
    X,
    Plus,
    Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
    useSavedJobs,
    useSavedJobIds,
    useToggleSaveJob,
    useViewHistory,
    useClearHistory,
    useInterestTags,
    useAddInterestTag,
    useRemoveInterestTag,
} from "@/hooks/useSavedJobs";
import { TypeaheadInput } from "@/components/profile/TypeaheadInput";
import { searchCatalog } from "@/services/profileService";
import type { CatalogItem } from "@/services/profileService";

export default function DashboardSavedJobs() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: allJobs = [] } = useJobs();

    // Hooks
    const { data: savedJobRecords = [] } = useSavedJobs();
    const { data: savedIds = new Set() } = useSavedJobIds();
    const toggleSave = useToggleSaveJob();
    const { data: viewHistoryEntries = [] } = useViewHistory();
    const clearHistory = useClearHistory();
    const { data: interestTags = [] } = useInterestTags();
    const addTag = useAddInterestTag();
    const removeTag = useRemoveInterestTag();

    // Build a map from job_id -> DbJob for fast lookup
    const jobMap = useMemo(() => {
        const m = new Map<string, DbJob>();
        allJobs.forEach((j) => m.set(j.id, j));
        return m;
    }, [allJobs]);

    // Saved jobs — resolved from saved_jobs records
    const savedJobs = useMemo(
        () =>
            savedJobRecords
                .map((r) => jobMap.get(r.job_id))
                .filter(Boolean) as DbJob[],
        [savedJobRecords, jobMap]
    );

    // History jobs — resolved from view_history
    const historyJobs = useMemo(
        () =>
            viewHistoryEntries
                .map((r) => jobMap.get(r.job_id))
                .filter(Boolean) as DbJob[],
        [viewHistoryEntries, jobMap]
    );

    // Filters for saved tab
    const [savedQuery, setSavedQuery] = useState("");
    const filteredSaved = useMemo(() => {
        if (!savedQuery) return savedJobs;
        const q = savedQuery.toLowerCase();
        return savedJobs.filter(
            (j) =>
                j.title.toLowerCase().includes(q) ||
                j.company.toLowerCase().includes(q)
        );
    }, [savedJobs, savedQuery]);

    // ── Tag builder state ───────────────────────────────────────────────────
    const [tagType, setTagType] = useState<"role" | "skill" | "location" | "keyword">("role");
    const [tagQuery, setTagQuery] = useState("");
    const [tagSuggestions, setTagSuggestions] = useState<CatalogItem[]>([]);

    const catalogMap: Record<string, any> = {
        role: "roles_catalog",
        skill: "skills_catalog",
        location: "skills_catalog", // no location catalog; user types freely
        keyword: "skills_catalog",
    };

    const handleTagSearch = async (q: string) => {
        setTagQuery(q);
        if (q.length < 2) { setTagSuggestions([]); return; }
        if (tagType === "location" || tagType === "keyword") { setTagSuggestions([]); return; }
        try {
            const r = await searchCatalog(catalogMap[tagType], q);
            setTagSuggestions(r);
        } catch { setTagSuggestions([]); }
    };

    const handleAddTag = async (value: string) => {
        if (!value.trim()) return;
        try {
            await addTag.mutateAsync({ tagType, value: value.trim() });
            setTagQuery("");
            setTagSuggestions([]);
        } catch (err: any) {
            toast.error(err.message || "Failed to add tag");
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("savedJobs.title", "Saved Jobs")}
                </h1>
                <p className="text-gray-500 mt-1">
                    {t("savedJobs.subtitle", "Your bookmarked opportunities, browsing history, and job alerts.")}
                </p>
            </div>

            <Tabs defaultValue="saved" className="space-y-4">
                <TabsList className="w-full max-w-lg grid grid-cols-3">
                    <TabsTrigger value="saved" className="gap-1.5">
                        <Bookmark className="h-4 w-4" />
                        {t("savedJobs.saved", "Saved")}
                        {savedJobs.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{savedJobs.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                        <History className="h-4 w-4" />
                        {t("savedJobs.history", "History")}
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="gap-1.5">
                        <Bell className="h-4 w-4" />
                        {t("savedJobs.alerts", "Alerts")}
                    </TabsTrigger>
                </TabsList>

                {/* ── SAVED TAB ──────────────────────────────────────────────────── */}
                <TabsContent value="saved" className="space-y-4">
                    {savedJobs.length > 3 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={savedQuery}
                                onChange={(e) => setSavedQuery(e.target.value)}
                                placeholder={t("savedJobs.searchSaved", "Search saved jobs...")}
                                className="pl-10"
                            />
                        </div>
                    )}
                    {filteredSaved.length === 0 ? (
                        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                            <Bookmark className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                            <p className="text-gray-500">
                                {savedQuery
                                    ? t("savedJobs.noResults", "No matching saved jobs.")
                                    : t("savedJobs.none", "You haven't saved any jobs yet.")}
                            </p>
                            {!savedQuery && (
                                <Link to="/jobs">
                                    <Button variant="outline" className="mt-4 text-primary border-primary hover:bg-primary/5">
                                        {t("savedJobs.browse", "Browse Jobs")}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSaved.map((job) => (
                                <Link key={job.id} to={`/jobs/${job.id}`} className="block">
                                    <JobCard
                                        job={job}
                                        isSaved={true}
                                        onSave={(e) => {
                                            e.preventDefault();
                                            toggleSave.mutate({ jobId: job.id, isSaved: true });
                                        }}
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
                <TabsContent value="history" className="space-y-4">
                    {historyJobs.length > 0 && (
                        <div className="flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 gap-1"
                                onClick={() => {
                                    if (confirm(t("savedJobs.confirmClearHistory", "Clear all viewing history?"))) {
                                        clearHistory.mutate();
                                    }
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t("savedJobs.clearHistory", "Clear history")}
                            </Button>
                        </div>
                    )}
                    {historyJobs.length === 0 ? (
                        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                            <History className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                            <p className="text-gray-500">
                                {t("savedJobs.noHistory", "No viewing history yet. Start browsing jobs!")}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {historyJobs.map((job) => (
                                <Link key={job.id} to={`/jobs/${job.id}`} className="block">
                                    <JobCard
                                        job={job}
                                        isSaved={savedIds.has(job.id)}
                                        onSave={(e) => {
                                            e.preventDefault();
                                            toggleSave.mutate({
                                                jobId: job.id,
                                                isSaved: savedIds.has(job.id),
                                            });
                                        }}
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── ALERTS TAB ─────────────────────────────────────────────────── */}
                <TabsContent value="alerts" className="space-y-6">
                    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {t("savedJobs.interestTags", "Job Interest Tags")}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {t(
                                    "savedJobs.interestTagsDesc",
                                    "Add roles, skills, locations, or keywords you're interested in. We'll use these to suggest jobs and send notifications."
                                )}
                            </p>
                        </div>

                        {/* Tag type selector + input */}
                        <div className="flex gap-2">
                            <Select value={tagType} onValueChange={(v: any) => setTagType(v)}>
                                <SelectTrigger className="w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="role">{t("savedJobs.tagRole", "Role")}</SelectItem>
                                    <SelectItem value="skill">{t("savedJobs.tagSkill", "Skill")}</SelectItem>
                                    <SelectItem value="location">{t("savedJobs.tagLocation", "Location")}</SelectItem>
                                    <SelectItem value="keyword">{t("savedJobs.tagKeyword", "Keyword")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex-1">
                                <TypeaheadInput
                                    placeholder={t("savedJobs.tagSearchPlaceholder", "Type and press Enter...")}
                                    suggestions={tagSuggestions}
                                    onSearch={handleTagSearch}
                                    onSelect={(item) => handleAddTag(item.name)}
                                    onCreateNew={handleAddTag}
                                    value={tagQuery}
                                    onChange={setTagQuery}
                                />
                            </div>
                        </div>

                        {/* Current tags */}
                        <div className="flex flex-wrap gap-2">
                            {interestTags.length === 0 && (
                                <p className="text-sm text-gray-400 italic">{t("savedJobs.noTags", "No interest tags added yet.")}</p>
                            )}
                            {interestTags.map((tag) => (
                                <span
                                    key={tag.id}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${tag.tag_type === "role"
                                            ? "bg-blue-50 text-blue-700"
                                            : tag.tag_type === "skill"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : tag.tag_type === "location"
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-purple-50 text-purple-700"
                                        }`}
                                >
                                    <Tag className="h-3 w-3" />
                                    <span className="text-[10px] uppercase font-bold opacity-60 mr-0.5">{tag.tag_type}</span>
                                    {tag.value}
                                    <button
                                        onClick={() => removeTag.mutate(tag.id)}
                                        className="opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <p className="text-xs text-gray-400 italic border-t pt-3">
                            {t("savedJobs.notifyNote", "🔔 Job suggestions and notifications based on your interests are coming soon.")}
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
