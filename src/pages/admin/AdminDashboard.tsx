import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Check, X, RefreshCw, Search, ChevronUp, ChevronDown,
    ExternalLink, CheckCircle, XCircle, Filter, Clock, Save,
} from "lucide-react";
import { CANONICAL_CITIES } from "@/lib/cities";

type Job = {
    id: string;
    title: string;
    title_en: string | null;
    title_bg: string | null;
    first_seen_at: string;
    posted_at: string | null;
    location_city: string | null;
    location_slug: string | null;
    work_mode: string | null;
    canonical_url: string;
    approval_status: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_period: string | null;
    currency: string | null;
    employment_type: string | null;
    seniority: string | null;
    category: string | null;
    department: string | null;
    employers: { name: string; logo_url: string | null } | null;
    job_posting_content: Array<{ description_text: string | null; requirements_text: string | null; benefits_text: string | null }> | { description_text: string | null; requirements_text: string | null; benefits_text: string | null } | null;
};

type EditForm = {
    title_en: string;
    title_bg: string;
    posted_at: string;
    location_city: string;
    work_mode: string;
    salary_min: string;
    salary_max: string;
    salary_period: string;
    currency: string;
    seniority: string;
    employment_type: string;
    category: string;
    department: string;
    description: string;
    requirements: string;
    benefits: string;
};

function jobToForm(job: Job): EditForm {
    const content = Array.isArray(job.job_posting_content)
        ? job.job_posting_content[0]
        : job.job_posting_content;
    const cityMatch = CANONICAL_CITIES.find(c =>
        c.name_en.toLowerCase() === (job.location_city || "").toLowerCase()
        || c.slug === (job.location_slug || "")
    );
    return {
        title_en: job.title_en || job.title || "",
        title_bg: job.title_bg || "",
        posted_at: job.posted_at ? job.posted_at.slice(0, 10) : "",
        location_city: cityMatch?.name_en || job.location_city || "",
        work_mode: job.work_mode || "",
        salary_min: job.salary_min?.toString() || "",
        salary_max: job.salary_max?.toString() || "",
        salary_period: job.salary_period || "",
        currency: job.currency || "BGN",
        seniority: job.seniority || "",
        employment_type: job.employment_type || "",
        category: job.category || "",
        department: job.department || "",
        description: content?.description_text || "",
        requirements: content?.requirements_text || "",
        benefits: content?.benefits_text || "",
    };
}

function formToUpdate(form: EditForm) {
    const city = CANONICAL_CITIES.find(c => c.name_en === form.location_city);
    return {
        title: form.title_en || form.title_bg || null,
        title_en: form.title_en || null,
        title_bg: form.title_bg || null,
        posted_at: form.posted_at ? new Date(form.posted_at + "T00:00:00Z").toISOString() : null,
        location_city: form.location_city || null,
        location_slug: city?.slug || null,
        work_mode: form.work_mode || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_period: form.salary_period || null,
        currency: form.currency || null,
        seniority: form.seniority || null,
        employment_type: form.employment_type || null,
        category: form.category || null,
        department: form.department || null,
    };
}

async function upsertContent(jobId: string, form: EditForm) {
    const { error } = await supabase.from("job_posting_content").upsert({
        job_id: jobId,
        description_text: form.description || null,
        requirements_text: form.requirements || null,
        benefits_text: form.benefits || null,
    } as any, { onConflict: "job_id" });
    return error;
}

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

const WORK_MODES = ["", "On-site", "Remote", "Hybrid"];
const SENIORITY_OPTIONS = ["", "Junior", "Mid", "Senior", "Lead", "Principal", "Executive"];
const EMPLOYMENT_TYPES = ["", "Full-time", "Part-time", "Contract", "Internship", "Freelance"];
const SALARY_PERIODS = ["", "month", "year", "hour"];

type ApprovalTab = "PENDING" | "APPROVED" | "REJECTED";

export default function AdminDashboard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [sortField, setSortField] = useState<"first_seen_at" | "title">("first_seen_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [reviewJob, setReviewJob] = useState<Job | null>(null);
    const [editForm, setEditForm] = useState<EditForm | null>(null);
    const [bulkWorking, setBulkWorking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<ApprovalTab>("PENDING");

    const fetchJobs = async () => {
        setLoading(true);
        let query = supabase
            .from("job_postings")
            .select("id, title, title_en, title_bg, first_seen_at, posted_at, location_city, location_slug, work_mode, canonical_url, approval_status, salary_min, salary_max, salary_period, currency, employment_type, seniority, category, department, extraction_method, last_scraped_at, employers(name, logo_url), job_posting_content(description_text, requirements_text, benefits_text)")
            .eq("approval_status", activeTab)
            .order(sortField, { ascending: sortDir === "asc" })
            .limit(200);
        if (activeTab === "PENDING") {
            query = query.not("last_scraped_at", "is", null);
        }
        const { data, error } = await query;
        if (error) toast.error("Failed to fetch queue: " + error.message);
        else setJobs((data || []) as unknown as Job[]);
        setLoading(false);
    };

    useEffect(() => { fetchJobs(); }, [sortField, sortDir, activeTab]);

    const openReview = (job: Job) => {
        setReviewJob(job);
        setEditForm(jobToForm(job));
    };

    const closeReview = () => {
        setReviewJob(null);
        setEditForm(null);
    };

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

    const jobHasMinimumData = (job: Job): boolean => {
        const content = Array.isArray(job.job_posting_content) ? job.job_posting_content[0] : job.job_posting_content;
        const title = job.title_en || job.title || "";
        const desc = content?.description_text || "";
        return title.length >= 5 && desc.length >= 50;
    };

    const bulkApprove = async () => {
        if (!selected.size) return;
        const ids = Array.from(selected);
        const emptyJobs = ids.filter(id => { const j = jobs.find(j => j.id === id); return j && !jobHasMinimumData(j); });
        if (emptyJobs.length > 0) {
            toast.error(`${emptyJobs.length} selected job(s) lack title or description. Review & edit them first, or deselect.`);
            return;
        }
        setBulkWorking(true);
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

    const saveDraft = async () => {
        if (!reviewJob || !editForm) return;
        setSaving(true);
        const { error } = await supabase.from("job_postings").update(formToUpdate(editForm) as any).eq("id", reviewJob.id);
        if (error) { toast.error("Save failed: " + error.message); setSaving(false); return; }
        const contentErr = await upsertContent(reviewJob.id, editForm);
        if (contentErr) toast.error("Content save failed: " + contentErr.message);
        else toast.success("Draft saved.");
        setSaving(false);
    };

    const saveAndApprove = async () => {
        if (!reviewJob || !editForm) return;
        if (!editForm.title_en || editForm.title_en.length < 5) {
            toast.error("Title (EN) must be at least 5 characters to approve.");
            return;
        }
        if (!editForm.description || editForm.description.length < 50) {
            toast.error("Description must be at least 50 characters to approve.");
            return;
        }
        setSaving(true);
        const { error } = await supabase.from("job_postings").update({
            ...formToUpdate(editForm),
            approval_status: "APPROVED",
            status: "ACTIVE",
        } as any).eq("id", reviewJob.id);
        if (error) { toast.error("Approve failed: " + error.message); setSaving(false); return; }
        const contentErr = await upsertContent(reviewJob.id, editForm);
        if (contentErr) toast.error("Content save failed: " + contentErr.message);
        else {
            toast.success("Approved!");
            setJobs(prev => prev.filter(j => j.id !== reviewJob.id));
            closeReview();
        }
        setSaving(false);
    };

    const reviewReject = async () => {
        if (!reviewJob) return;
        setSaving(true);
        const { error } = await supabase.from("job_postings").update({ approval_status: "REJECTED", status: "INACTIVE" } as any).eq("id", reviewJob.id);
        if (error) toast.error("Reject failed: " + error.message);
        else { toast.info("Rejected."); setJobs(prev => prev.filter(j => j.id !== reviewJob.id)); closeReview(); }
        setSaving(false);
    };

    const updateField = (field: keyof EditForm, value: string) => {
        setEditForm(prev => prev ? { ...prev, [field]: value } : prev);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Review, edit, and manage all job postings.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchJobs} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {(["PENDING", "APPROVED", "REJECTED"] as ApprovalTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSelected(new Set()); }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"}`}
                    >
                        {tab === "PENDING" ? "Pending" : tab === "APPROVED" ? "Approved" : "Rejected"}
                    </button>
                ))}
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
                                            {job.location_city || (job.location_slug ? CANONICAL_CITIES.find(c => c.slug === job.location_slug)?.name_en : null) || "—"}{job.work_mode ? <span className="ml-1 text-xs opacity-60">· {job.work_mode}</span> : ""}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a href={job.canonical_url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="View source">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-600 hover:bg-gray-100" onClick={() => openReview(job)}>Review</Button>
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

            {/* Review & Edit Modal */}
            <Dialog open={!!reviewJob} onOpenChange={() => closeReview()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Review & Edit Job</DialogTitle>
                    </DialogHeader>
                    {reviewJob && editForm && (
                        <div className="space-y-5 py-2">
                            {/* Company header */}
                            <div className="flex items-center gap-2 mb-2">
                                {reviewJob.employers?.logo_url
                                    ? <img src={reviewJob.employers.logo_url} className="w-8 h-8 rounded object-contain border border-gray-100" alt="" />
                                    : <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold border border-gray-200">{reviewJob.employers?.name?.[0] || "?"}</span>
                                }
                                <span className="font-semibold text-gray-800">{reviewJob.employers?.name || "—"}</span>
                                <span className="text-xs text-gray-400 ml-auto">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {new Date(reviewJob.first_seen_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                            </div>

                            {/* Titles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title (EN)</Label>
                                    <Input className="mt-1" value={editForm.title_en} onChange={e => updateField("title_en", e.target.value)} placeholder="English title" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title (BG)</Label>
                                    <Input className="mt-1" value={editForm.title_bg} onChange={e => updateField("title_bg", e.target.value)} placeholder="Bulgarian title" />
                                </div>
                            </div>

                            {/* Location + Work Mode */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</Label>
                                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.location_city} onChange={e => updateField("location_city", e.target.value)}>
                                        <option value="">— Not set —</option>
                                        {CANONICAL_CITIES.map(c => (
                                            <option key={c.slug} value={c.name_en}>{c.name_en} ({c.name_bg})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Mode</Label>
                                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.work_mode} onChange={e => updateField("work_mode", e.target.value)}>
                                        {WORK_MODES.map(m => <option key={m} value={m}>{m || "— Not set —"}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Salary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary Min</Label>
                                    <Input className="mt-1" type="number" value={editForm.salary_min} onChange={e => updateField("salary_min", e.target.value)} placeholder="0" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Salary Max</Label>
                                    <Input className="mt-1" type="number" value={editForm.salary_max} onChange={e => updateField("salary_max", e.target.value)} placeholder="0" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</Label>
                                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.salary_period} onChange={e => updateField("salary_period", e.target.value)}>
                                        {SALARY_PERIODS.map(p => <option key={p} value={p}>{p || "— Not set —"}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</Label>
                                    <Input className="mt-1" value={editForm.currency} onChange={e => updateField("currency", e.target.value)} placeholder="BGN" />
                                </div>
                            </div>

                            {/* Seniority + Employment Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seniority</Label>
                                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.seniority} onChange={e => updateField("seniority", e.target.value)}>
                                        {SENIORITY_OPTIONS.map(s => <option key={s} value={s}>{s || "— Not set —"}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employment Type</Label>
                                    <select className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.employment_type} onChange={e => updateField("employment_type", e.target.value)}>
                                        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t || "— Not set —"}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Category + Department */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</Label>
                                    <Input className="mt-1" value={editForm.category} onChange={e => updateField("category", e.target.value)} placeholder="e.g. Engineering" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</Label>
                                    <Input className="mt-1" value={editForm.department} onChange={e => updateField("department", e.target.value)} placeholder="e.g. Product" />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</Label>
                                <Textarea className="mt-1 min-h-[120px]" value={editForm.description} onChange={e => updateField("description", e.target.value)} placeholder="Job description…" />
                            </div>

                            {/* Requirements */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requirements</Label>
                                <Textarea className="mt-1 min-h-[100px]" value={editForm.requirements} onChange={e => updateField("requirements", e.target.value)} placeholder="Job requirements…" />
                            </div>

                            {/* Benefits */}
                            <div>
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Benefits</Label>
                                <Textarea className="mt-1 min-h-[100px]" value={editForm.benefits} onChange={e => updateField("benefits", e.target.value)} placeholder="Job benefits…" />
                            </div>

                            <a href={reviewJob.canonical_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                <ExternalLink className="w-3 h-3" /> View original source
                            </a>
                        </div>
                    )}
                    <DialogFooter className="gap-2 flex-wrap">
                        <Button variant="outline" onClick={closeReview} disabled={saving}>Cancel</Button>
                        {reviewJob?.approval_status !== "REJECTED" && (
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={reviewReject} disabled={saving}>
                                <X className="w-4 h-4" /> Reject
                            </Button>
                        )}
                        <Button variant="outline" className="gap-1.5" onClick={saveDraft} disabled={saving}>
                            <Save className="w-4 h-4" /> Save
                        </Button>
                        {reviewJob?.approval_status !== "APPROVED" && (
                            <Button onClick={saveAndApprove} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                                <Check className="w-4 h-4" /> Save & Approve
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
