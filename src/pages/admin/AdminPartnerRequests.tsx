import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    RefreshCw, Clock, CheckCircle, XCircle, ExternalLink, ChevronDown,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Request = {
    id: string;
    employer_id: string | null;  // set after provision_employer_workspace() runs
    company_name: string;
    domain: string | null;
    careers_url: string | null;
    logo_url: string | null;
    about: string | null;
    proposed_plan: string;
    submitted_by_email: string | null;
    status: string;
    review_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-green-50 text-green-700 border-green-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function StatusBadge({ status }: { status: string }) {
    return <Badge className={`${STATUS_STYLES[status] || STATUS_STYLES.PENDING} border text-xs`}>{status}</Badge>;
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>)}
        </tr>
    );
}

export default function AdminPartnerRequests() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("PENDING");
    const [reviewTarget, setReviewTarget] = useState<Request | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [working, setWorking] = useState(false);

    const fetch = async () => {
        setLoading(true);
        const query = (supabase as any).from("signup_requests").select("*").order("created_at", { ascending: false });
        const { data, error } = statusFilter === "all" ? await query : await query.eq("status", statusFilter);
        if (error) toast.error("Failed: " + error.message);
        else setRequests(data || []);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, [statusFilter]);

    const openReview = (req: Request) => { setReviewTarget(req); setReviewNotes(req.review_notes || ""); };

    const approveRequest = async () => {
        if (!reviewTarget) return;
        setWorking(true);

        // Approve via SECURITY DEFINER RPC:
        // sets approval_status=approved, transitions subscription, logs event, updates signup_request
        const { error } = await (supabase as any).rpc("approve_employer_workspace", {
            p_employer_id: reviewTarget.employer_id,
            p_reviewer_uid: null, // service-role context; admin user id not available client-side
            p_review_notes: reviewNotes || null,
        });

        if (error) {
            toast.error("Approval failed: " + error.message);
        } else {
            toast.success(`${reviewTarget.company_name} approved.`);
        }

        setReviewTarget(null);
        setWorking(false);
        fetch();
    };

    const rejectRequest = async () => {
        if (!reviewTarget) return;
        setWorking(true);

        const { error } = await (supabase as any).rpc("reject_employer_workspace", {
            p_employer_id: reviewTarget.employer_id,
            p_reviewer_uid: null,
            p_review_notes: reviewNotes || null,
        });

        if (error) {
            toast.error("Rejection failed: " + error.message);
        } else {
            toast.info("Request rejected.");
        }

        setReviewTarget(null);
        setWorking(false);
        fetch();
    };

    const pendingCount = requests.filter(r => r.status === "PENDING").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Signup Requests</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Review and approve employer partner applications.</p>
                </div>
                <div className="flex items-center gap-2">
                    {pendingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">{pendingCount} pending</span>}
                    <Button size="sm" variant="ghost" onClick={fetch}><RefreshCw className="w-4 h-4" /></Button>
                </div>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2">
                {["PENDING", "APPROVED", "REJECTED", "all"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                        {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3">Submitted by</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Submitted</th>
                                <th className="px-4 py-3">Notes</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                    {statusFilter === "PENDING" ? "No pending requests — you're all caught up." : "No requests found."}
                                </td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                {req.logo_url
                                                    ? <img src={req.logo_url} className="w-7 h-7 rounded object-contain border border-gray-100" alt="" />
                                                    : <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">{req.company_name[0]}</span>
                                                }
                                                <div>
                                                    <div className="font-semibold text-gray-900">{req.company_name}</div>
                                                    {req.domain && <div className="text-xs text-gray-400">{req.domain}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{req.submitted_by_email || "—"}</td>
                                        <td className="px-4 py-3"><span className="capitalize text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5">{req.proposed_plan || "starter"}</span></td>
                                        <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                            {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{req.review_notes || "—"}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="sm" variant="outline" onClick={() => openReview(req)} className="gap-1.5 h-7 px-2.5">
                                                Review
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Review: {reviewTarget?.company_name}</DialogTitle>
                    </DialogHeader>
                    {reviewTarget && (
                        <div className="space-y-4 py-2 text-sm">
                            {/* Company info */}
                            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div><span className="text-xs font-semibold text-gray-400 uppercase">Domain</span><div className="mt-0.5 text-gray-800">{reviewTarget.domain || "—"}</div></div>
                                <div><span className="text-xs font-semibold text-gray-400 uppercase">Plan requested</span><div className="mt-0.5 capitalize">{reviewTarget.proposed_plan || "starter"}</div></div>
                                <div className="col-span-2"><span className="text-xs font-semibold text-gray-400 uppercase">Submitted by</span><div className="mt-0.5 text-gray-800">{reviewTarget.submitted_by_email || "—"}</div></div>
                                {reviewTarget.about && (
                                    <div className="col-span-2"><span className="text-xs font-semibold text-gray-400 uppercase">About</span><div className="mt-0.5 text-gray-700 text-xs leading-relaxed">{reviewTarget.about}</div></div>
                                )}
                                {reviewTarget.careers_url && (
                                    <div className="col-span-2"><span className="text-xs font-semibold text-gray-400 uppercase">Careers URL</span>
                                        <a href={reviewTarget.careers_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs mt-0.5">{reviewTarget.careers_url}<ExternalLink className="w-3 h-3" /></a>
                                    </div>
                                )}
                            </div>
                            {/* current status badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Current status:</span>
                                <StatusBadge status={reviewTarget.status} />
                            </div>
                            {/* Notes */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Review Notes</Label>
                                <textarea
                                    className="mt-1 w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows={3}
                                    placeholder="Optional internal notes…"
                                    value={reviewNotes}
                                    onChange={e => setReviewNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => setReviewTarget(null)} className="mr-auto">Close</Button>
                        <Button
                            variant="outline"
                            onClick={rejectRequest}
                            disabled={working || reviewTarget?.status === "REJECTED"}
                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <XCircle className="w-4 h-4" />Reject
                        </Button>
                        <Button
                            onClick={approveRequest}
                            disabled={working || reviewTarget?.status === "APPROVED"}
                            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="w-4 h-4" />{working ? "Processing…" : "Approve & Activate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
