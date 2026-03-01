import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowLeft, User, ExternalLink, ChevronDown, Loader2,
    RefreshCw, AlertCircle, Sparkles, TrendingUp, Calendar, FileText
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
}

// ── Constants ──────────────────────────────────────────────────────────────
const COLUMNS: AppStatus[] = ["new", "reviewing", "interviewing", "offered", "rejected"];

const COLUMN_LABELS: Record<AppStatus, string> = {
    new: "New Applicants", reviewing: "In Review", interviewing: "Interviewing",
    offered: "Offered", rejected: "Rejected",
};

const COLUMN_COLORS: Record<AppStatus, string> = {
    new: "border-blue-200 bg-blue-50/50",
    reviewing: "border-amber-200 bg-amber-50/50",
    interviewing: "border-purple-200 bg-purple-50/50",
    offered: "border-emerald-200 bg-emerald-50/50",
    rejected: "border-slate-200 bg-slate-50/50",
};

const COLUMN_HEADER_COLORS: Record<AppStatus, string> = {
    new: "text-blue-700 bg-blue-100",
    reviewing: "text-amber-700 bg-amber-100",
    interviewing: "text-purple-700 bg-purple-100",
    offered: "text-emerald-700 bg-emerald-100",
    rejected: "text-slate-600 bg-slate-200",
};

// ── ScoreBadge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score, aiStatus }: { score: number | null; aiStatus: AiStatus }) {
    if (aiStatus === "unscored") {
        return null; // starter plan — no badge shown
    }
    if (aiStatus === "failed") {
        return (
            <Badge variant="outline" className="text-[10px] font-semibold bg-red-50 text-red-600 border-red-200 gap-1 px-1.5 py-0.5 rounded-md">
                <AlertCircle className="w-3 h-3" /> Failed
            </Badge>
        );
    }
    if (score === null || aiStatus === "pending" || aiStatus === "scoring") {
        return (
            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 gap-1 px-1.5 py-0.5 rounded-md border border-slate-200">
                <Loader2 className="w-3 h-3 animate-spin" /> Scoring…
            </Badge>
        );
    }
    const cls = score >= 80
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : score >= 50
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-600 border-red-200";

    const iconCls = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";

    return (
        <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md gap-1 ${cls}`}>
            <TrendingUp className={`w-3 h-3 ${iconCls}`} />
            {score}%
        </Badge>
    );
}

// ── CandidateCard ──────────────────────────────────────────────────────────
function CandidateCard({
    app, selected, onSelect, onClick,
}: {
    app: Applicant;
    selected: boolean;
    onSelect: (checked: boolean) => void;
    onClick: () => void;
}) {
    // Generate initials for avatar
    const initials = `${app.first_name?.[0] || ""}${app.last_name?.[0] || ""}`.toUpperCase();

    return (
        <div
            onClick={onClick}
            className={`group bg-white rounded-xl border p-3 cursor-pointer transition-all duration-200 relative ${selected ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'}`}
        >
            <div className={`absolute top-3 right-3 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                <Checkbox
                    checked={selected}
                    onCheckedChange={onSelect}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-sm"
                />
            </div>

            <div className="flex items-start gap-3 mb-3 pr-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0 shadow-inner">
                    {initials || <User className="w-5 h-5 opacity-50" />}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[13px] font-bold text-slate-900 truncate tracking-tight leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">
                        {app.first_name} {app.last_name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate font-medium">{app.email}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                </div>
                <ScoreBadge score={app.ai_match_score} aiStatus={app.ai_status} />
            </div>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function EmployerPipeline() {
    const { id: jobId } = useParams<{ id: string }>();
    const { employerId } = useEmployer();

    const [job, setJob] = useState<{ title: string } | null>(null);
    const [apps, setApps] = useState<Applicant[]>([]);
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<string>("starter");

    // Drawer
    const [drawer, setDrawer] = useState<Applicant | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [retrying, setRetrying] = useState(false);

    // Bulk selection
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        if (!jobId) return;
        setLoading(true);

        // Job title
        const { data: jobData } = await (supabase as any)
            .from("job_postings").select("title").eq("id", jobId).single();
        if (jobData) setJob({ title: jobData.title });

        // Employer plan
        const { data: subData } = await (supabase as any)
            .from("employer_subscriptions").select("plan_id").eq("employer_id", employerId).single();
        if (subData?.plan_id) setPlan(subData.plan_id);

        // Applications — include ai_status + ai_error
        const { data: appData } = await (supabase as any)
            .from("applications")
            .select("id, first_name, last_name, email, resume_url, status, applied_at, ai_match_score, ai_match_reasoning, ai_status, ai_error")
            .eq("job_id", jobId)
            .order("ai_match_score", { ascending: false, nullsFirst: false })
            .order("applied_at", { ascending: false });

        if (appData) setApps(appData as Applicant[]);
        setLoading(false);
    }, [jobId, employerId]);

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

    // ── Retry scoring ──
    const retryScoring = async (appId: string) => {
        setRetrying(true);
        const { data, error } = await (supabase as any)
            .rpc("retry_application_scoring", { p_application_id: appId });

        if (!error) {
            // Optimistically show scoring
            const newAiStatus: AiStatus = (data === "queued") ? "scoring"
                : (data === "unscored") ? "unscored"
                    : "failed";
            setApps(prev => prev.map(a => a.id === appId
                ? { ...a, ai_status: newAiStatus, ai_error: null, ai_match_score: null, ai_match_reasoning: null }
                : a
            ));
            if (drawer?.id === appId) {
                setDrawer(d => d ? { ...d, ai_status: newAiStatus, ai_error: null, ai_match_score: null, ai_match_reasoning: null } : d);
            }
        }
        setRetrying(false);
    };

    // ── Bulk actions ──
    const bulkMove = async (newStatus: AppStatus) => {
        const ids = Array.from(selected);
        await Promise.all(ids.map(id => updateStatus(id, newStatus)));
        setSelected(new Set());
    };

    const toggleSelect = (id: string, checked: boolean) => {
        setSelected(prev => {
            const next = new Set(prev);
            checked ? next.add(id) : next.delete(id);
            return next;
        });
    };

    const byStatus = (s: AppStatus) => {
        const col = apps.filter(a => a.status === s);
        if (s !== "new") {
            return col.sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
        }
        return col; // already sorted by ai_match_score desc from query
    };

    const isStarter = plan === "starter";

    return (
        <div className="flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="mb-6 shrink-0">
                <Link to="/employer/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            {loading ? <Skeleton className="w-48 h-7 inline-block" /> : job?.title ?? "Pipeline"}
                            {!loading && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                    {apps.length} Applicant{apps.length !== 1 ? "s" : ""}
                                </Badge>
                            )}
                        </h1>
                    </div>

                    {/* Bulk actions */}
                    {selected.size > 0 && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <span className="text-sm font-bold text-blue-700 px-3">{selected.size} selected</span>
                            <div className="h-5 w-px bg-slate-200" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 border-slate-200 hover:bg-slate-50 relative">
                                        Move Stage <ChevronDown className="w-3.5 h-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    {COLUMNS.filter(c => c !== "new").map(c => (
                                        <DropdownMenuItem key={c} onClick={() => bulkMove(c)} className="font-medium">
                                            {COLUMN_LABELS[c]}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="destructive" size="sm" onClick={() => bulkMove("rejected")} className="shadow-sm">
                                Reject
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Starter plan upgrade banner */}
            {isStarter && !loading && (
                <div className="mb-6 flex items-start gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm shrink-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[15px] font-bold text-amber-900 mb-0.5">Upgrade for AI Candidate Ranking</p>
                        <p className="text-sm text-amber-700">
                            Growth and Enterprise plans automatically analyze resumes and score candidates by match quality, saving you hours of manual review.
                        </p>
                    </div>
                    <Button size="sm" variant="default" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white shadow-sm" asChild>
                        <Link to="/employers#pricing">Explore Plans</Link>
                    </Button>
                </div>
            )}

            {/* Kanban Board Container */}
            <div className="flex-1 flex gap-5 overflow-x-auto overflow-y-hidden pb-4 snap-x">
                {loading ? (
                    COLUMNS.map(c => (
                        <div key={c} className="flex-shrink-0 w-[320px] flex flex-col snap-start">
                            <Skeleton className="h-10 w-full rounded-xl mb-4" />
                            <Skeleton className="h-32 w-full rounded-xl mb-3" />
                            <Skeleton className="h-32 w-full rounded-xl" />
                        </div>
                    ))
                ) : (
                    COLUMNS.map((col) => {
                        const colApps = byStatus(col);
                        return (
                            <div key={col} className={`flex-shrink-0 w-[320px] rounded-3xl border ${COLUMN_COLORS[col]} flex flex-col max-h-full snap-start`}>
                                {/* Column Header */}
                                <div className="p-3 border-b border-inherit bg-white/40 backdrop-blur-sm rounded-t-3xl flex items-center justify-between sticky top-0 z-10 shrink-0">
                                    <div className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${COLUMN_HEADER_COLORS[col]}`}>
                                        {COLUMN_LABELS[col]}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-0.5 shadow-sm">
                                        {colApps.length}
                                    </span>
                                </div>

                                {/* Column Content (Scrollable) */}
                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                                    {colApps.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-6 flex flex-col items-center justify-center text-center mt-2 h-32">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                                <User className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-400">Drag applicants here</p>
                                        </div>
                                    ) : (
                                        colApps.map(app => (
                                            <CandidateCard
                                                key={app.id}
                                                app={app}
                                                selected={selected.has(app.id)}
                                                onSelect={checked => toggleSelect(app.id, checked as boolean)}
                                                onClick={() => setDrawer(app)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Candidate drawer */}
            <Sheet open={!!drawer} onOpenChange={v => !v && setDrawer(null)}>
                <SheetContent className="w-full sm:max-w-md overflow-hidden p-0 border-l border-slate-200 shadow-2xl flex flex-col">
                    {drawer && (
                        <div className="flex flex-col h-full bg-slate-50/50 flex-1">
                            {/* Drawer Header */}
                            <div className="bg-white p-6 border-b border-slate-100 z-10 shrink-0 shadow-sm relative">
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
                                            {COLUMNS.map(s => (
                                                <SelectItem key={s} value={s} className="font-medium rounded-lg">{COLUMN_LABELS[s]}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Drawer Body - Scrollable */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                {/* AI Match section */}
                                <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
                                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">AI Match Analysis</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ScoreBadge score={drawer.ai_match_score} aiStatus={drawer.ai_status} />
                                        </div>
                                    </div>

                                    {/* Reasoning or error */}
                                    {drawer.ai_status === "failed" && drawer.ai_error ? (
                                        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                <p className="text-sm text-red-700 font-bold">Analysis Failed</p>
                                            </div>
                                            <p className="text-xs text-red-600 font-mono mt-1 bg-red-100/50 p-2 rounded-lg break-words">{drawer.ai_error}</p>

                                            {!isStarter && (
                                                <Button size="sm" variant="outline" className="w-full mt-3 bg-white hover:bg-red-50 text-red-600 border-red-200 rounded-xl" disabled={retrying} onClick={() => retryScoring(drawer.id)}>
                                                    {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />} Retry Analysis
                                                </Button>
                                            )}
                                        </div>
                                    ) : drawer.ai_status === "unscored" ? (
                                        <div className="text-center py-2">
                                            <p className="text-sm text-slate-600 mb-3">
                                                AI scoring is not available on the Starter plan.
                                            </p>
                                            <Button size="sm" asChild variant="outline" className="w-full rounded-xl">
                                                <Link to="/employers#pricing">Upgrade to enable ranking</Link>
                                            </Button>
                                        </div>
                                    ) : drawer.ai_match_reasoning ? (
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                            {drawer.ai_match_reasoning}
                                        </p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <Loader2 className="w-6 h-6 text-slate-300 animate-spin mb-3" />
                                            <p className="text-sm font-medium text-slate-500">
                                                {drawer.ai_status === "scoring" || drawer.ai_status === "pending"
                                                    ? "Analyzing resume against job requirements..."
                                                    : "Analysis details unavailable."}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Application Data */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Application Materials</h3>

                                    <a
                                        href={drawer.resume_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all mb-3 text-slate-700 hover:text-blue-700 font-medium text-sm"
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

                            {/* Drawer Footer */}
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
