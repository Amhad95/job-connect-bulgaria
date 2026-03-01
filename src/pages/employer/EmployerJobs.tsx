import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { JobEditorDialog } from "@/components/employer/JobEditorDialog";
import {
    Plus, MoreHorizontal, KanbanSquare, Pencil, Eye, EyeOff,
    XCircle, Briefcase, Users, TrendingUp, Clock, MapPin, Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";

type JobStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";

interface EmployerJob {
    id: string;
    title: string;
    status: JobStatus;
    city: string | null;
    work_mode: string | null;
    posted_at: string | null;
    applicant_count: number;
    avg_score: number | null;
}

const STATUS_BADGE: Record<JobStatus, { label: string; cls: string; dot: string }> = {
    DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
    ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    PAUSED: { label: "Paused", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    CLOSED: { label: "Closed", cls: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-500" },
};

export default function EmployerJobs() {
    const { employerId, approvalStatus } = useEmployer();
    const [jobs, setJobs] = useState<EmployerJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Dialog / Modal states
    const [editorOpen, setEditorOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [closeTarget, setCloseTarget] = useState<EmployerJob | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        const { data, error } = await (supabase as any)
            .from("job_postings")
            .select(`
        id, title, status, location_city, work_mode, posted_at,
        applications ( id, ai_match_score )
      `)
            .eq("employer_id", employerId)
            .order("posted_at", { ascending: false, nullsFirst: false });

        if (!error && data) {
            setJobs(
                data.map((row: any) => {
                    const apps: any[] = row.applications ?? [];
                    const scores = apps.map((a: any) => a.ai_match_score).filter((s: any) => s !== null);
                    return {
                        id: row.id,
                        title: row.title,
                        status: row.status as JobStatus,
                        city: row.location_city,
                        work_mode: row.work_mode,
                        posted_at: row.posted_at,
                        applicant_count: apps.length,
                        avg_score: scores.length > 0
                            ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
                            : null,
                    };
                })
            );
        }
        setLoading(false);
    }, [employerId]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const changeStatus = async (job: EmployerJob, newStatus: JobStatus) => {
        setActionError(null);

        // Publish gate: check approval + cap
        if (newStatus === "ACTIVE") {
            const { data: cap } = await (supabase as any)
                .rpc("check_job_publish_allowed", { p_employer_id: employerId });

            if (!cap?.allowed) {
                setActionError(
                    cap?.reason === "pending_approval"
                        ? "Your workspace is pending approval. Publishing will be available after admin review."
                        : `Job cap reached (${cap?.current}/${cap?.cap} on ${cap?.plan} plan). Upgrade to publish more.`
                );
                return;
            }
        }

        const update: any = { status: newStatus };
        if (newStatus === "ACTIVE" && !job.posted_at) update.posted_at = new Date().toISOString();

        await (supabase as any).from("job_postings").update(update).eq("id", job.id);
        fetchJobs();
    };

    const openEditor = (job?: EmployerJob) => {
        setEditTarget(job ?? null);
        setEditorOpen(true);
    };

    const isPending = approvalStatus !== "approved";

    // Dashboard metrics
    const metrics = useMemo(() => {
        const active = jobs.filter(j => j.status === "ACTIVE").length;
        const drafts = jobs.filter(j => j.status === "DRAFT").length;
        const applicants = jobs.reduce((sum, j) => sum + j.applicant_count, 0);
        return { active, drafts, applicants, total: jobs.length };
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        if (!searchQuery.trim()) return jobs;
        return jobs.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [jobs, searchQuery]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Action error */}
            {actionError && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-50/80 backdrop-blur-sm px-4 py-3 text-sm text-red-700 shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{actionError}</span>
                    </div>
                    <button className="p-1 rounded-md text-red-400 hover:bg-red-100/50 hover:text-red-700 transition" onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            {/* Dashboard Headers & Metrics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage open roles and review your applicant pipelines.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Find a job..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 pl-9 rounded-full bg-white border-slate-200 focus-visible:ring-blue-500/20 shadow-sm"
                        />
                    </div>
                    <Button
                        onClick={() => openEditor()}
                        className="gap-2 rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        title={isPending ? "Workspace pending approval — you can still create drafts" : undefined}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Job</span>
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Jobs", value: metrics.total, icon: <Briefcase className="w-5 h-5 text-blue-600" />, bg: "bg-blue-50" },
                    { label: "Active Postings", value: metrics.active, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50" },
                    { label: "Drafts", value: metrics.drafts, icon: <Pencil className="w-5 h-5 text-slate-600" />, bg: "bg-slate-100" },
                    { label: "Total Applicants", value: metrics.applicants, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50" },
                ].map((m, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                                {m.icon}
                            </div>
                            <p className="text-sm font-medium text-slate-500">{m.label}</p>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 tracking-tight">{loading ? <Skeleton className="h-9 w-12" /> : m.value}</p>
                    </div>
                ))}
            </div>

            {/* Job Cards Layout */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                    ))}
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm p-16 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 shadow-inner">
                        <Briefcase className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No jobs posted yet</h2>
                    <p className="text-sm text-slate-500 max-w-sm mb-8">
                        Create your first job posting to start building your applicant pipeline.
                        {isPending && " You can start with drafts while your workspace is pending approval."}
                    </p>
                    <Button onClick={() => openEditor()} className="gap-2 rounded-full px-6 py-5 shadow-md">
                        <Plus className="w-5 h-5" /> Let's create a job
                    </Button>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                    No jobs found matching "{searchQuery}"
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredJobs.map(job => {
                        const s = STATUS_BADGE[job.status];
                        return (
                            <div key={job.id} className="group bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col">
                                {/* Card Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <Badge variant="outline" className={`text-xs font-medium px-2.5 py-0.5 gap-1.5 border ${s.cls}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                        {s.label}
                                    </Badge>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                            <DropdownMenuItem onClick={() => openEditor(job)} className="gap-2">
                                                <Pencil className="w-4 h-4 text-slate-400" /> Edit Details
                                            </DropdownMenuItem>
                                            {job.status === "DRAFT" || job.status === "PAUSED" ? (
                                                <DropdownMenuItem onClick={() => changeStatus(job, "ACTIVE")} className="gap-2">
                                                    <Eye className="w-4 h-4 text-slate-400" /> Publish Job
                                                </DropdownMenuItem>
                                            ) : job.status === "ACTIVE" ? (
                                                <DropdownMenuItem onClick={() => changeStatus(job, "PAUSED")} className="gap-2">
                                                    <EyeOff className="w-4 h-4 text-slate-400" /> Pause Hiring
                                                </DropdownMenuItem>
                                            ) : null}
                                            {job.status !== "CLOSED" && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 gap-2 focus:bg-red-50 focus:text-red-700"
                                                        onClick={() => setCloseTarget(job)}
                                                    >
                                                        <XCircle className="w-4 h-4" /> Close Posting
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Title & Location */}
                                <div className="mb-6 flex-1">
                                    <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        <Link to={`/employer/jobs/${job.id}/pipeline`}>{job.title}</Link>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                        {(job.city || job.work_mode) && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>{[job.city, job.work_mode].filter(Boolean).join(" · ")}</span>
                                            </div>
                                        )}
                                        {job.posted_at && (
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px w-full bg-slate-100 mb-4" />

                                {/* Footer Metrics & Primary Action */}
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Pipeline</span>
                                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                {job.applicant_count}
                                            </div>
                                        </div>
                                        {job.avg_score !== null && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Match</span>
                                                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                                                    <span className={`flex items-center gap-1 ${job.avg_score >= 80 ? "text-emerald-600" : job.avg_score >= 50 ? "text-amber-600" : "text-slate-500"}`}>
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        {job.avg_score}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button asChild size="sm" className="gap-2 rounded-xl bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white transition-all">
                                        <Link to={`/employer/jobs/${job.id}/pipeline`}>
                                            <KanbanSquare className="w-4 h-4" />
                                            <span className="hidden sm:inline">View Board</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Job editor dialog */}
            {editorOpen && (
                <JobEditorDialog
                    open={editorOpen}
                    initial={editTarget}
                    onClose={() => { setEditorOpen(false); setEditTarget(null); }}
                    onSaved={() => { setEditorOpen(false); setEditTarget(null); fetchJobs(); }}
                />
            )}

            {/* Close confirmation */}
            <AlertDialog open={!!closeTarget} onOpenChange={v => !v && setCloseTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Close job posting?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{closeTarget?.title}" will be removed from the public listing. This cannot be undone automatically.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => { closeTarget && changeStatus(closeTarget, "CLOSED"); setCloseTarget(null); }}
                        >
                            Close posting
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
