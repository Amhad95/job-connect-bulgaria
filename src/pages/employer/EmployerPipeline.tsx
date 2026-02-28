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
    RefreshCw, AlertCircle, Sparkles, TrendingUp,
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
    new: "New", reviewing: "Reviewing", interviewing: "Interviewing",
    offered: "Offered", rejected: "Rejected",
};

const COLUMN_COLORS: Record<AppStatus, string> = {
    new: "border-blue-200 bg-blue-50",
    reviewing: "border-amber-200 bg-amber-50",
    interviewing: "border-purple-200 bg-purple-50",
    offered: "border-green-200 bg-green-50",
    rejected: "border-gray-200 bg-gray-50",
};

// ── ScoreBadge ─────────────────────────────────────────────────────────────
function ScoreBadge({ score, aiStatus }: { score: number | null; aiStatus: AiStatus }) {
    if (aiStatus === "unscored") {
        return null; // starter plan — no badge shown
    }
    if (aiStatus === "failed") {
        return (
            <Badge variant="outline" className="text-[10px] font-semibold bg-red-50 text-red-600 border-red-200 gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" /> Failed
            </Badge>
        );
    }
    if (score === null || aiStatus === "pending" || aiStatus === "scoring") {
        return (
            <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-400 gap-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Scoring…
            </Badge>
        );
    }
    const cls = score >= 80
        ? "bg-green-50 text-green-700 border-green-200"
        : score >= 50
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-red-50 text-red-600 border-red-200";
    return (
        <Badge variant="outline" className={`text-[10px] font-bold ${cls}`}>
            {score}
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
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-2 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-start gap-2">
                <Checkbox
                    checked={selected}
                    onCheckedChange={onSelect}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0" onClick={onClick}>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                        {app.first_name} {app.last_name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{app.email}</p>
                </div>
                <ScoreBadge score={app.ai_match_score} aiStatus={app.ai_status} />
            </div>
            <div className="pl-5 text-[10px] text-gray-400">
                Applied {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
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
        <div className="flex flex-col min-h-0">
            {/* Header */}
            <div className="mb-6">
                <Link to="/employer/jobs" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Job Postings
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-bold text-gray-900">
                            {loading ? <Skeleton className="w-48 h-7 inline-block" /> : job?.title ?? "Pipeline"}
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">{apps.length} applicant{apps.length !== 1 ? "s" : ""}</p>
                    </div>

                    {/* Bulk actions */}
                    {selected.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{selected.size} selected</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        Move to <ChevronDown className="w-3.5 h-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {COLUMNS.filter(c => c !== "new").map(c => (
                                        <DropdownMenuItem key={c} onClick={() => bulkMove(c)}>
                                            {COLUMN_LABELS[c]}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="destructive" size="sm" onClick={() => bulkMove("rejected")}>
                                Reject
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Starter plan upgrade banner */}
            {isStarter && !loading && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">Upgrade to enable AI ranking</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Growth and Enterprise plans automatically score and rank candidates by match quality.
                            Starter plan shows applicants without AI scoring.
                        </p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100" asChild>
                        <Link to="/employers#pricing">Upgrade</Link>
                    </Button>
                </div>
            )}

            {/* Kanban */}
            {loading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map(c => (
                        <div key={c} className="flex-shrink-0 w-64">
                            <Skeleton className="h-8 w-full rounded-lg mb-3" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-6 flex-1">
                    {COLUMNS.map(col => {
                        const colApps = byStatus(col);
                        return (
                            <div key={col} className={`flex-shrink-0 w-64 rounded-2xl border ${COLUMN_COLORS[col]} p-3 flex flex-col gap-2`}>
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{COLUMN_LABELS[col]}</p>
                                    <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                                        {colApps.length}
                                    </span>
                                </div>
                                {colApps.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 bg-white/50 p-4 text-center">
                                        <p className="text-xs text-gray-400">No applicants</p>
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
                        );
                    })}
                </div>
            )}

            {/* Candidate drawer */}
            <Sheet open={!!drawer} onOpenChange={v => !v && setDrawer(null)}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    {drawer && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold">{drawer.first_name} {drawer.last_name}</p>
                                        <p className="text-xs text-gray-400 font-normal">{drawer.email}</p>
                                    </div>
                                </SheetTitle>
                            </SheetHeader>

                            {/* AI Match section */}
                            <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Match</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ScoreBadge score={drawer.ai_match_score} aiStatus={drawer.ai_status} />

                                        {/* Retry button — visible for failed + pending (stuck) */}
                                        {(drawer.ai_status === "failed" || drawer.ai_status === "pending") && !isStarter && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 text-[11px] gap-1 border-red-200 text-red-600 hover:bg-red-50"
                                                disabled={retrying}
                                                onClick={() => retryScoring(drawer.id)}
                                            >
                                                {retrying
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <RefreshCw className="w-3 h-3" />
                                                }
                                                Retry
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Reasoning or error */}
                                {drawer.ai_status === "failed" && drawer.ai_error ? (
                                    <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                                        <p className="text-xs text-red-600 font-semibold mb-1">Scoring failed</p>
                                        <p className="text-xs text-red-500 font-mono">{drawer.ai_error}</p>
                                    </div>
                                ) : drawer.ai_status === "unscored" ? (
                                    <p className="text-sm text-gray-400 italic">
                                        AI scoring is not available on the Starter plan.{" "}
                                        <Link to="/employers#pricing" className="text-blue-500 hover:underline">Upgrade</Link> to enable ranking.
                                    </p>
                                ) : drawer.ai_match_reasoning ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {drawer.ai_match_reasoning}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">
                                        {drawer.ai_status === "scoring" || drawer.ai_status === "pending"
                                            ? "AI scoring is in progress. Check back shortly."
                                            : "No reasoning provided."}
                                    </p>
                                )}
                            </div>

                            {/* Resume */}
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resume</p>
                                <a
                                    href={drawer.resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open resume
                                </a>
                            </div>

                            {/* Stage select */}
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stage</p>
                                <Select
                                    value={drawer.status}
                                    onValueChange={v => updateStatus(drawer.id, v as AppStatus)}
                                    disabled={updatingStatus}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                        {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2" />}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLUMNS.map(s => (
                                            <SelectItem key={s} value={s}>{COLUMN_LABELS[s]}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-xs text-gray-400">
                                Applied {formatDistanceToNow(new Date(drawer.applied_at), { addSuffix: true })}
                            </p>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
