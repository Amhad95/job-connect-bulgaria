import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Search, User, Users, ExternalLink, ChevronDown, Loader2,
    RefreshCw, AlertCircle, Sparkles, TrendingUp, Calendar, FileText,
    ArrowUpDown, ArrowUp, ArrowDown, Filter, X, KanbanSquare,
    StickyNote, MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

type AppStatus = "new" | "reviewing" | "interviewing" | "offered" | "rejected";
type AiStatus = "pending" | "scoring" | "success" | "failed" | "unscored";

interface Applicant {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    resume_url: string;
    status: AppStatus;
    applied_at: string;
    ai_match_score: number | null;
    ai_match_reasoning: string | null;
    ai_status: AiStatus;
    ai_error: string | null;
    profile_strength_score: number | null;
    job_id: string;
    job_title: string;
}

interface JobOption {
    id: string;
    title: string;
}

const STAGE_LABELS: Record<AppStatus, string> = {
    new: "New", reviewing: "In Review", interviewing: "Interviewing",
    offered: "Offered", rejected: "Rejected",
};

const STAGE_COLORS: Record<AppStatus, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewing: "bg-amber-100 text-amber-700",
    interviewing: "bg-purple-100 text-purple-700",
    offered: "bg-emerald-100 text-emerald-700",
    rejected: "bg-slate-200 text-slate-600",
};

type SortCol = "name" | "score" | "applied_at" | "composite" | "job";
type SortDir = "asc" | "desc";

// ── Composite score helper ─────────────────────────────────────────────────

function compositeScore(ai: number | null, profile: number | null): number | null {
    if (ai === null) return profile;
    if (profile === null) return ai;
    return Math.round(0.75 * ai + 0.25 * profile);
}

// ── ScoreBadge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
    if (score === null) return <span className="text-xs text-slate-400">—</span>;
    const cls = score >= 80
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : score >= 50
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-600 border-red-200";
    return (
        <Badge variant="outline" className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md gap-1 ${cls}`}>
            <TrendingUp className="w-3 h-3" />
            {score}%
        </Badge>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function EmployerApplicants() {
    const { employerId } = useEmployer();
    const [apps, setApps] = useState<Applicant[]>([]);
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [jobFilter, setJobFilter] = useState("all");
    const [stageFilter, setStageFilter] = useState("all");
    const [minScore, setMinScore] = useState(0);

    // Sort
    const [sortCol, setSortCol] = useState<SortCol>("applied_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Drawer
    const [drawer, setDrawer] = useState<Applicant | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // ── Fetch data ──
    const fetchData = useCallback(async () => {
        setLoading(true);

        // Fetch all jobs for filter dropdown
        const { data: jobData } = await (supabase as any)
            .from("job_postings")
            .select("id, title")
            .eq("employer_id", employerId)
            .order("title");
        if (jobData) setJobs(jobData);

        // Fetch all applications across all employer jobs
        const { data: appData } = await (supabase as any)
            .from("applications")
            .select(`
                id, first_name, last_name, email, resume_url, status, applied_at,
                ai_match_score, ai_match_reasoning, ai_status, ai_error,
                profile_strength_score,
                job_id,
                job_postings!inner ( title, employer_id )
            `)
            .eq("job_postings.employer_id", employerId)
            .order("applied_at", { ascending: false });

        if (appData) {
            setApps(appData.map((row: any) => ({
                ...row,
                job_title: row.job_postings?.title || "Unknown Job",
            })));
        }
        setLoading(false);
    }, [employerId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Status update ──
    const updateStatus = async (appId: string, newStatus: AppStatus) => {
        setUpdatingStatus(true);
        await (supabase as any)
            .from("applications").update({ status: newStatus }).eq("id", appId);
        setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
        if (drawer?.id === appId) setDrawer(d => d ? { ...d, status: newStatus } : d);
        setUpdatingStatus(false);
    };

    // ── Sort handler ──
    const toggleSort = (col: SortCol) => {
        if (sortCol === col) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortCol(col);
            setSortDir("desc");
        }
    };

    const SortIcon = ({ col }: { col: SortCol }) => {
        if (sortCol !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 ml-1" />;
        return sortDir === "asc"
            ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 ml-1" />
            : <ArrowDown className="w-3.5 h-3.5 text-blue-600 ml-1" />;
    };

    // ── Filtered + sorted list ──
    const filteredApps = useMemo(() => {
        let result = [...apps];

        if (jobFilter !== "all") {
            result = result.filter(a => a.job_id === jobFilter);
        }
        if (stageFilter !== "all") {
            result = result.filter(a => a.status === stageFilter);
        }
        if (minScore > 0) {
            result = result.filter(a => (a.ai_match_score || 0) >= minScore);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                `${a.first_name} ${a.last_name}`.toLowerCase().includes(q)
                || a.email.toLowerCase().includes(q)
                || a.job_title.toLowerCase().includes(q)
            );
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortCol) {
                case "name":
                    cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
                    break;
                case "score":
                    cmp = (a.ai_match_score || 0) - (b.ai_match_score || 0);
                    break;
                case "composite":
                    cmp = (compositeScore(a.ai_match_score, a.profile_strength_score) || 0) -
                        (compositeScore(b.ai_match_score, b.profile_strength_score) || 0);
                    break;
                case "applied_at":
                    cmp = new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
                    break;
                case "job":
                    cmp = a.job_title.localeCompare(b.job_title);
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [apps, jobFilter, stageFilter, minScore, searchQuery, sortCol, sortDir]);

    const activeFilters = (jobFilter !== "all" ? 1 : 0) + (stageFilter !== "all" ? 1 : 0) + (minScore > 0 ? 1 : 0);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        All Applicants
                        {!loading && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                {filteredApps.length} of {apps.length}
                            </Badge>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">View and manage candidates across all your job postings.</p>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or job..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 rounded-lg bg-slate-50 border-slate-200 h-9 text-sm"
                    />
                </div>

                {/* Job filter */}
                <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-sm rounded-lg">
                        <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        {jobs.map(j => (
                            <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Stage filter */}
                <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm rounded-lg">
                        <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {(Object.keys(STAGE_LABELS) as AppStatus[]).map(s => (
                            <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Min score */}
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 h-9">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Min Score</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={minScore}
                        onChange={e => setMinScore(Number(e.target.value))}
                        className="w-20 accent-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-700 w-8 text-right">{minScore}%</span>
                </div>

                {activeFilters > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-500 hover:text-slate-700 gap-1"
                        onClick={() => { setJobFilter("all"); setStageFilter("all"); setMinScore(0); setSearchQuery(""); }}
                    >
                        <X className="w-3.5 h-3.5" /> Clear ({activeFilters})
                    </Button>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Users className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No applicants found</h3>
                        <p className="text-sm text-slate-500">
                            {apps.length === 0 ? "No applications have been submitted yet." : "Try adjusting your filters."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-4 py-3">
                                        <button onClick={() => toggleSort("name")} className="flex items-center text-[11px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors">
                                            Candidate <SortIcon col="name" />
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        <button onClick={() => toggleSort("job")} className="flex items-center text-[11px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors">
                                            Job <SortIcon col="job" />
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Stage</span>
                                    </th>
                                    <th className="text-center px-4 py-3">
                                        <button onClick={() => toggleSort("score")} className="flex items-center text-[11px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors mx-auto">
                                            AI Score <SortIcon col="score" />
                                        </button>
                                    </th>
                                    <th className="text-center px-4 py-3">
                                        <button onClick={() => toggleSort("composite")} className="flex items-center text-[11px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors mx-auto">
                                            Composite <SortIcon col="composite" />
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-3">
                                        <button onClick={() => toggleSort("applied_at")} className="flex items-center text-[11px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-900 transition-colors">
                                            Applied <SortIcon col="applied_at" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredApps.map(app => {
                                    const initials = `${app.first_name?.[0] || ""}${app.last_name?.[0] || ""}`.toUpperCase();
                                    const comp = compositeScore(app.ai_match_score, app.profile_strength_score);

                                    return (
                                        <tr
                                            key={app.id}
                                            className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                                            onClick={() => setDrawer(app)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                                        {initials || <User className="w-4 h-4 opacity-50" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                            {app.first_name} {app.last_name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 truncate">{app.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    to={`/employer/jobs/${app.job_id}/pipeline`}
                                                    className="text-sm text-slate-700 hover:text-blue-600 font-medium truncate block max-w-[200px]"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {app.job_title}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${STAGE_COLORS[app.status]}`}>
                                                    {STAGE_LABELS[app.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <ScoreBadge score={app.ai_match_score} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <ScoreBadge score={comp} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 text-xs gap-1.5"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <Link to={`/employer/jobs/${app.job_id}/pipeline`}>
                                                        <KanbanSquare className="w-3.5 h-3.5" /> Pipeline
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Candidate Drawer ── */}
            <Sheet open={!!drawer} onOpenChange={v => !v && setDrawer(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-hidden p-0 border-l border-slate-200 shadow-2xl flex flex-col">
                    {drawer && (
                        <div className="flex flex-col h-full bg-slate-50/50 flex-1">
                            {/* Header */}
                            <div className="bg-white p-6 border-b border-slate-100 z-10 shrink-0 shadow-sm">
                                <div className="flex items-start gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center shrink-0 shadow-inner">
                                        <span className="text-xl font-bold text-blue-700">
                                            {`${drawer.first_name?.[0] || ""}${drawer.last_name?.[0] || ""}`.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="pt-1 pr-6">
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1.5 break-words">
                                            {drawer.first_name} {drawer.last_name}
                                        </h2>
                                        <p className="text-sm font-medium text-slate-500 break-words">{drawer.email}</p>
                                        <Link
                                            to={`/employer/jobs/${drawer.job_id}/pipeline`}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 inline-flex items-center gap-1"
                                        >
                                            <KanbanSquare className="w-3 h-3" /> {drawer.job_title}
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={drawer.status}
                                        onValueChange={v => updateStatus(drawer.id, v as AppStatus)}
                                        disabled={updatingStatus}
                                    >
                                        <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 text-sm font-semibold focus:ring-blue-500 rounded-xl">
                                            <SelectValue />
                                            {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2 text-slate-400" />}
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {(Object.keys(STAGE_LABELS) as AppStatus[]).map(s => (
                                                <SelectItem key={s} value={s} className="font-medium rounded-lg">{STAGE_LABELS[s]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                {/* AI Score */}
                                <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">AI Match Analysis</h3>
                                        </div>
                                        <ScoreBadge score={drawer.ai_match_score} />
                                    </div>
                                    {drawer.ai_match_reasoning ? (
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{drawer.ai_match_reasoning}</p>
                                    ) : drawer.ai_status === "failed" && drawer.ai_error ? (
                                        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                <p className="text-sm text-red-700 font-bold">Analysis Failed</p>
                                            </div>
                                            <p className="text-xs text-red-600 font-mono mt-1">{drawer.ai_error}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 text-center">
                                            <Loader2 className="w-5 h-5 text-slate-300 animate-spin mb-2" />
                                            <p className="text-sm font-medium text-slate-500">
                                                {drawer.ai_status === "scoring" || drawer.ai_status === "pending"
                                                    ? "Analyzing resume..." : "Analysis not available."}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Composite score */}
                                {(drawer.ai_match_score !== null || drawer.profile_strength_score !== null) && (
                                    <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</h3>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{drawer.ai_match_score ?? "—"}<span className="text-sm text-slate-400">%</span></p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">AI Match</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{drawer.profile_strength_score ?? "—"}<span className="text-sm text-slate-400">%</span></p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Profile</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-blue-700">{compositeScore(drawer.ai_match_score, drawer.profile_strength_score) ?? "—"}<span className="text-sm text-blue-400">%</span></p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-500 mt-1">Composite</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Resume link */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Application Materials</h3>
                                    <a
                                        href={drawer.resume_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all text-slate-700 hover:text-blue-700 font-medium text-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold">Candidate Resume</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </a>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-100 border-t border-slate-200 text-center shrink-0">
                                <p className="text-xs font-medium text-slate-500 flex items-center justify-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Applied on {new Date(drawer.applied_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
