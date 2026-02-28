import { useState, useCallback, useEffect } from "react";
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
    XCircle, Briefcase, Users, TrendingUp,
} from "lucide-react";

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

const STATUS_BADGE: Record<JobStatus, { label: string; cls: string }> = {
    DRAFT: { label: "Draft", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    ACTIVE: { label: "Active", cls: "bg-green-50 text-green-700 border-green-200" },
    PAUSED: { label: "Paused", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    CLOSED: { label: "Closed", cls: "bg-red-50 text-red-600 border-red-200" },
};

export default function EmployerJobs() {
    const { employerId, approvalStatus } = useEmployer();
    const [jobs, setJobs] = useState<EmployerJob[]>([]);
    const [loading, setLoading] = useState(true);
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

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-gray-900">Job Postings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your open roles and applicant pipelines.</p>
                </div>
                <Button
                    onClick={() => openEditor()}
                    className="gap-2 rounded-full"
                    title={isPending ? "Workspace pending approval — you can still create drafts" : undefined}
                >
                    <Plus className="w-4 h-4" />
                    New Job
                </Button>
            </div>

            {/* Action error */}
            {actionError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                    <button className="ml-3 text-red-500 hover:text-red-700 font-semibold" onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            {/* Jobs table */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            ) : jobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                        <Briefcase className="w-7 h-7 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">No jobs posted yet</h2>
                    <p className="text-sm text-gray-500 max-w-xs mb-6">
                        Create your first job posting. Start with a draft — publishing will be available after workspace approval.
                    </p>
                    <Button onClick={() => openEditor()} className="gap-2 rounded-full">
                        <Plus className="w-4 h-4" /> Create first job
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
                                <th className="text-left px-5 py-3 font-semibold">Title</th>
                                <th className="text-left px-5 py-3 font-semibold">Status</th>
                                <th className="text-left px-5 py-3 font-semibold">
                                    <Users className="w-3.5 h-3.5 inline mr-1" />Applicants
                                </th>
                                <th className="text-left px-5 py-3 font-semibold">
                                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />Avg Score
                                </th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {jobs.map(job => {
                                const s = STATUS_BADGE[job.status];
                                return (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900">{job.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {[job.city, job.work_mode].filter(Boolean).join(" · ")}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant="outline" className={`text-[11px] font-semibold ${s.cls}`}>
                                                {s.label}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-gray-700 font-medium">{job.applicant_count}</td>
                                        <td className="px-5 py-4">
                                            {job.avg_score !== null ? (
                                                <span className={`font-semibold text-sm ${job.avg_score >= 80 ? "text-green-600" : job.avg_score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                                    {job.avg_score}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
                                                    <Link to={`/employer/jobs/${job.id}/pipeline`}>
                                                        <KanbanSquare className="w-3.5 h-3.5" />
                                                        Pipeline
                                                    </Link>
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openEditor(job)}>
                                                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                        </DropdownMenuItem>
                                                        {job.status === "DRAFT" || job.status === "PAUSED" ? (
                                                            <DropdownMenuItem onClick={() => changeStatus(job, "ACTIVE")}>
                                                                <Eye className="w-3.5 h-3.5 mr-2" /> Publish
                                                            </DropdownMenuItem>
                                                        ) : job.status === "ACTIVE" ? (
                                                            <DropdownMenuItem onClick={() => changeStatus(job, "PAUSED")}>
                                                                <EyeOff className="w-3.5 h-3.5 mr-2" /> Pause
                                                            </DropdownMenuItem>
                                                        ) : null}
                                                        {job.status !== "CLOSED" && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={() => setCloseTarget(job)}
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5 mr-2" /> Close job
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
