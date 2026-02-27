import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Check, X, RefreshCw, Search, ChevronUp, ChevronDown,
    ExternalLink, CheckCircle, XCircle, Filter, Clock, AlertCircle,
} from "lucide-react";

type Job = {
    id: string;
    title: string;
    title_en: string | null;
    title_bg: string | null;
    first_seen_at: string;
    location_city: string | null;
    work_mode: string | null;
    canonical_url: string;
    approval_status: string;
    employers: { name: string; logo_url: string | null } | null;
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    PENDING: { label: "Pending", class: "bg-amber-100 text-amber-800 border-amber-200" },
    APPROVED: { label: "Approved", class: "bg-green-100 text-green-800 border-green-200" },
    REJECTED: { label: "Rejected", class: "bg-red-100 text-red-800 border-red-200" },
};

function LangBadge({ exists, lang }: { exists: boolean; lang: string }) {
    return (
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${exists ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-400 border-gray-200 opacity-60"}`}>
            {lang}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
                <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

export default function AdminDashboard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [sortField, setSortField] = useState<"first_seen_at" | "title">("first_seen_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [editJob, setEditJob] = useState<Job | null>(null);
    const [editForm, setEditForm] = useState({ title_en: "", title_bg: "", location_city: "", work_mode: "" });
    const [saving, setSaving] = useState(false);
    const [bulkWorking, setBulkWorking] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("job_postings")
            .select("id, title, title_en, title_bg, first_seen_at, location_city, work_mode, canonical_url, approval_status, employers(name, logo_url)")
            .eq("approval_status", "PENDING")
            .order(sortField, { ascending: sortDir === "asc" })
            .limit(200);
        if (error) toast.error("Failed to fetch queue: " + error.message);
        else setJobs((data || []) as unknown as Job[]);
        setLoading(false);
    };

    useEffect(() => { fetchJobs(); }, [sortField, sortDir]);

    const handleSort = (field: "first_seen_at" | "title") => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    const SortIcon = ({ field }: { field: string }) =>
        sortField === field
            ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />
            : <span className="w-3 h-3 inline-block opacity-20">↕</span>;

    const toggleSelect = (id: string) =>
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleAll = () =>
        setSelected(prev => prev.size === visible.length ? new Set() : new Set(visible.map(j => j.id)));

    const uniqueCompanies = Array.from(new Set(jobs.map(j => j.employers?.name || "Unknown"))).sort();

    const visible = jobs
        .filter(j => {
            const q = search.toLowerCase();
            const matchSearch = !q || j.title.toLowerCase().includes(q) || (j.employers?.name || "").toLowerCase().includes(q);
            const matchCompany = companyFilter === "all" || j.employers?.name === companyFilter;
            return matchSearch && matchCompany;
        });

    const bulkApprove = async () => {
        if (!selected.size) return;
        setBulkWorking(true);
        const ids = Array.from(selected);
        const { error } = await supabase
            .from("job_postings")
            .update({ approval_status: "APPROVED", status: "ACTIVE" } as any)
            .in("id", ids);
        if (error) toast.error("Approve failed: " + error.message);
        else {
            toast.success(`✓ ${ids.length} job${ids.length > 1 ? "s" : ""} approved and live.`);
            setSelected(new Set());
            setJobs(prev => prev.filter(j => !ids.includes(j.id)));
        }
        setBulkWorking(false);
    };

    const bulkReject = async () => {
        if (!selected.size) return;
        setBulkWorking(true);
        const ids = Array.from(selected);
        const { error } = await supabase
            .from("job_postings")
            .update({ approval_status: "REJECTED", status: "INACTIVE" } as any)
            .in("id", ids);
        if (error) toast.error("Reject failed: " + error.message);
        else {
            toast.info(`${ids.length} job${ids.length > 1 ? "s" : ""} rejected.`);
            setSelected(new Set());
            setJobs(prev => prev.filter(j => !ids.includes(j.id)));
        }
        setBulkWorking(false);
    };

    const openEdit = (job: Job) => {
        setEditJob(job);
        setEditForm({
            title_en: job.title_en || job.title,
            title_bg: job.title_bg || "",
            location_city: job.location_city || "",
            work_mode: job.work_mode || "",
        });
    };

    const saveEdit = async (approve = false) => {
        if (!editJob) return;
        setSaving(true);
        const patch: Record<string, unknown> = {
            title_en: editForm.title_en,
            title_bg: editForm.title_bg || null,
            location_city: editForm.location_city || null,
            work_mode: editForm.work_mode || null,
        };
        if (approve) { patch.approval_status = "APPROVED"; patch.status = "ACTIVE"; }
        const { error } = await supabase.from("job_postings").update(patch as any).eq("id", editJob.id);
        if (error) { toast.error("Save failed: " + error.message); setSaving(false); return; }
        toast.success(approve ? "Saved and approved." : "Saved.");
        setEditJob(null);
        fetchJobs();
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Moderation Queue</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Review scraped jobs before they go live. Only PENDING jobs appear here.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchJobs} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            {/* Filters + Bulk Actions */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search title or company…" className="pl-9 w-56 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select className="text-sm border rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
                        <option value="all">All companies</option>
                        {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {selected.size > 0 && (
                        <>
                            <span className="text-sm text-gray-500">{selected.size} selected</span>
                            <Button size="sm" variant="outline" onClick={bulkReject} disabled={bulkWorking} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                                <XCircle className="w-4 h-4" /> Reject
                            </Button>
                            <Button size="sm" onClick={bulkApprove} disabled={bulkWorking} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle className="w-4 h-4" /> Approve
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox" className="rounded border-gray-300 w-4 h-4" checked={visible.length > 0 && selected.size === visible.length} onChange={toggleAll} />
                                </th>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort("title")}>
                                    Title <SortIcon field="title" />
                                </th>
                                <th className="px-4 py-3">Translations</th>
                                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort("first_seen_at")}>
                                    Crawled <SortIcon field="first_seen_at" />
                                </th>
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <Check className="w-10 h-10 text-green-200" />
                                            <div className="text-gray-500 font-medium">Queue is empty</div>
                                            <div className="text-gray-400 text-xs">All pending jobs have been reviewed, or run a scrape to populate.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                visible.map(job => (
                                    <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${selected.has(job.id) ? "bg-blue-50/50" : ""}`}>
                                        <td className="px-4 py-3">
                                            <input type="checkbox" className="rounded border-gray-300 w-4 h-4" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {job.employers?.logo_url
                                                    ? <img src={job.employers.logo_url} className="w-7 h-7 rounded object-contain border border-gray-100" alt="" />
                                                    : <span className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-bold border border-gray-200 shrink-0">{job.employers?.name?.[0] || "?"}</span>
                                                }
                                                <span className="font-medium text-gray-800 truncate max-w-[120px]">{job.employers?.name || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 line-clamp-1">{job.title_en || job.title}</div>
                                            {job.title_bg && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{job.title_bg}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <LangBadge exists={!!job.title_en} lang="EN" />
                                                <LangBadge exists={!!job.title_bg} lang="BG" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(job.first_seen_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {job.location_city || "—"}{job.work_mode ? <span className="ml-1 text-xs opacity-60">· {job.work_mode}</span> : ""}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a href={job.canonical_url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="View source">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-600 hover:bg-gray-100" onClick={() => openEdit(job)}>Edit</Button>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => {
                                                    supabase.from("job_postings").update({ approval_status: "REJECTED", status: "INACTIVE" } as any).eq("id", job.id)
                                                        .then(({ error }) => {
                                                            if (error) toast.error("Failed"); else { toast.info("Rejected."); setJobs(prev => prev.filter(j => j.id !== job.id)); }
                                                        });
                                                }}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                                                    supabase.from("job_postings").update({ approval_status: "APPROVED", status: "ACTIVE" } as any).eq("id", job.id)
                                                        .then(({ error }) => {
                                                            if (error) toast.error("Failed"); else { toast.success("Approved!"); setJobs(prev => prev.filter(j => j.id !== job.id)); }
                                                        });
                                                }}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && visible.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
                        <span>{visible.length} pending job{visible.length !== 1 ? "s" : ""}</span>
                        {search || companyFilter !== "all" ? <span>Filtered from {jobs.length} total</span> : null}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Job</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="title_en" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Title (EN)</Label>
                            <Input id="title_en" className="mt-1" value={editForm.title_en} onChange={e => setEditForm(f => ({ ...f, title_en: e.target.value }))} />
                        </div>
                        <div>
                            <Label htmlFor="title_bg" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Title (BG)</Label>
                            <Input id="title_bg" className="mt-1" value={editForm.title_bg} onChange={e => setEditForm(f => ({ ...f, title_bg: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="loc" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">City</Label>
                                <Input id="loc" className="mt-1" value={editForm.location_city} onChange={e => setEditForm(f => ({ ...f, location_city: e.target.value }))} />
                            </div>
                            <div>
                                <Label htmlFor="wm" className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Work Mode</Label>
                                <select id="wm" className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.work_mode} onChange={e => setEditForm(f => ({ ...f, work_mode: e.target.value }))}>
                                    <option value="">Unknown</option>
                                    <option value="REMOTE">Remote</option>
                                    <option value="HYBRID">Hybrid</option>
                                    <option value="ONSITE">On-site</option>
                                </select>
                            </div>
                        </div>
                        {editJob && (
                            <a href={editJob.canonical_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="w-3 h-3" /> View original source
                            </a>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditJob(null)}>Cancel</Button>
                        <Button variant="outline" onClick={() => saveEdit(false)} disabled={saving}>Save draft</Button>
                        <Button onClick={() => saveEdit(true)} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                            <Check className="w-4 h-4" /> Save & Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
