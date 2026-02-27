import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Search, Plus, Play, RefreshCw, ChevronDown, ChevronUp,
    MoreHorizontal, Edit, Trash2, ExternalLink, Shield, AlertCircle,
    Building2, CheckCircle, Clock, AlertTriangle, X,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/* ─── Types ─── */
type PolicyStatus = "PENDING" | "ACTIVE" | "BLOCKED";
type PolicyMode = "OFF" | "METADATA_ONLY" | "FULL_TEXT_ALLOWED" | "FEED_ONLY";

type EmployerSource = {
    id: string;
    careers_home_url: string | null;
    jobs_list_url: string | null;
    policy_status: PolicyStatus;
    policy_mode: PolicyMode;
    robots_last_checked_at: string | null;
    last_crawl_at: string | null;
    ats_type: string | null;
};

type Company = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    website_domain: string | null;
    hq_city: string | null;
    industry_tags: string[] | null;
    is_featured: boolean;
    company_type: string;
    is_signed_up_active: boolean;
    ats_direct_access: boolean;
    plan_tier: string;
    employer_sources: EmployerSource[];
};

type Tab = "CRAWLED" | "SIGNED_UP";

/* ─── Policy helpers ─── */
function policyBadge(ps: PolicyStatus, pm: PolicyMode) {
    if (ps === "ACTIVE") return <Badge className="bg-green-50 text-green-700 border-green-200 border font-medium text-xs gap-1"><CheckCircle className="w-3 h-3" />Allowed</Badge>;
    if (ps === "BLOCKED") return <Badge className="bg-red-50 text-red-700 border-red-200 border font-medium text-xs gap-1"><X className="w-3 h-3" />Blocked</Badge>;
    return <Badge className="bg-gray-50 text-gray-500 border-gray-200 border font-medium text-xs gap-1"><AlertCircle className="w-3 h-3" />Unknown</Badge>;
}

function SkeletonRow({ cols }: { cols: number }) {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

/* ─── Default form values ─── */
const EMPTY_FORM = {
    name: "", logo_url: "", website_domain: "", careers_home_url: "",
    jobs_list_url: "", hq_city: "", company_type: "CRAWLED",
    is_signed_up_active: false, ats_direct_access: false,
    is_featured: false, plan_tier: "starter",
};

/* ─── Component ─── */
export default function AdminCompanies() {
    const [tab, setTab] = useState<Tab>("CRAWLED");
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scrapeWorking, setScrapeWorking] = useState(false);
    const [scrapeProgress, setScrapeProgress] = useState<Record<string, "idle" | "running" | "done" | "error">>({});
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formSaving, setFormSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("employers")
            .select("id, name, slug, logo_url, website_domain, hq_city, industry_tags, is_featured, company_type, is_signed_up_active, ats_direct_access, plan_tier, employer_sources(id, careers_home_url, jobs_list_url, policy_status, policy_mode, robots_last_checked_at, last_crawl_at, ats_type)")
            .order("name") as any;
        if (error) toast.error("Failed to load: " + error.message);
        else setCompanies(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchCompanies(); }, []);

    const visible = companies
        .filter(c => (c.company_type || "CRAWLED") === tab)
        .filter(c => {
            const q = search.toLowerCase();
            return !q || c.name.toLowerCase().includes(q) || (c.website_domain || "").toLowerCase().includes(q);
        });

    const toggleSelect = (id: string) =>
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleAll = () =>
        setSelected(prev => prev.size === visible.length ? new Set() : new Set(visible.map(c => c.id)));

    const scrapeCompany = async (company: Company) => {
        const sources = company.employer_sources?.filter(s => s.policy_status === "ACTIVE");
        if (!sources?.length) { toast.error("No active sources for " + company.name); return; }
        setScrapeProgress(p => ({ ...p, [company.id]: "running" }));
        let ok = 0;
        for (const src of sources) {
            const { error } = await supabase.functions.invoke("crawl-source", { body: { employer_source_id: src.id } });
            if (error) toast.error(`${company.name}: ${error.message}`);
            else ok++;
        }
        setScrapeProgress(p => ({ ...p, [company.id]: ok > 0 ? "done" : "error" }));
        if (ok > 0) toast.success(`Scraped ${ok} source(s) for ${company.name} — jobs queued as PENDING.`);
        setTimeout(() => setScrapeProgress(p => { const n = { ...p }; delete n[company.id]; return n; }), 4000);
    };

    const scrapeSelected = async () => {
        if (!selected.size) return;
        setScrapeWorking(true);
        const targets = companies.filter(c => selected.has(c.id));
        for (const company of targets) await scrapeCompany(company);
        setScrapeWorking(false);
        setSelected(new Set());
    };

    const scrapeAllAllowed = async () => {
        setScrapeWorking(true);
        const allowed = companies.filter(c => (c.employer_sources || []).some(s => s.policy_status === "ACTIVE"));
        for (const company of allowed) await scrapeCompany(company);
        setScrapeWorking(false);
        toast.success(`Scrape completed for ${allowed.length} allowed sources.`);
    };

    const recheckPolicy = async (company: Company) => {
        const src = company.employer_sources?.[0];
        if (!src) { toast.error("No source to check."); return; }
        toast.info(`Checking robots.txt for ${company.name}…`);
        const { error } = await supabase.functions.invoke("check-robots-policy", {
            body: { employer_source_id: src.id }
        });
        if (error) toast.error("Policy check failed: " + error.message);
        else { toast.success("Policy updated."); fetchCompanies(); }
    };

    const openAdd = () => {
        setEditingCompany(null);
        setForm({ ...EMPTY_FORM, company_type: tab });
        setShowDrawer(true);
    };

    const openEdit = (company: Company) => {
        setEditingCompany(company);
        const src = company.employer_sources?.[0];
        setForm({
            name: company.name,
            logo_url: company.logo_url || "",
            website_domain: company.website_domain || "",
            careers_home_url: src?.careers_home_url || "",
            jobs_list_url: src?.jobs_list_url || "",
            hq_city: company.hq_city || "",
            company_type: company.company_type || "CRAWLED",
            is_signed_up_active: company.is_signed_up_active || false,
            ats_direct_access: company.ats_direct_access || false,
            is_featured: company.is_featured || false,
            plan_tier: company.plan_tier || "starter",
        });
        setShowDrawer(true);
    };

    const saveCompany = async () => {
        if (!form.name.trim()) { toast.error("Company name is required."); return; }
        setFormSaving(true);
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        if (editingCompany) {
            // Update employer
            const { error: empErr } = await supabase.from("employers").update({
                name: form.name, logo_url: form.logo_url || null, website_domain: form.website_domain || null,
                hq_city: form.hq_city || null, company_type: form.company_type,
                is_featured: form.is_featured, is_signed_up_active: form.is_signed_up_active,
                ats_direct_access: form.ats_direct_access, plan_tier: form.plan_tier,
            } as any).eq("id", editingCompany.id);
            if (empErr) { toast.error("Save failed: " + empErr.message); setFormSaving(false); return; }

            // Update source
            const src = editingCompany.employer_sources?.[0];
            if (src) {
                await supabase.from("employer_sources").update({
                    careers_home_url: form.careers_home_url || null, jobs_list_url: form.jobs_list_url || null,
                }).eq("id", src.id);
            } else if (form.careers_home_url) {
                await supabase.from("employer_sources").insert({
                    employer_id: editingCompany.id, careers_home_url: form.careers_home_url, jobs_list_url: form.jobs_list_url || null,
                } as any);
            }
            toast.success("Company updated.");
        } else {
            // Create employer
            const { data: emp, error: empErr } = await supabase.from("employers").insert({
                name: form.name, slug, logo_url: form.logo_url || null, website_domain: form.website_domain || null,
                hq_city: form.hq_city || null, company_type: form.company_type,
                is_featured: form.is_featured, is_signed_up_active: form.is_signed_up_active,
                ats_direct_access: form.ats_direct_access, plan_tier: form.plan_tier,
            } as any).select().single();
            if (empErr || !emp) { toast.error("Create failed: " + empErr?.message); setFormSaving(false); return; }
            if (form.careers_home_url) {
                await supabase.from("employer_sources").insert({
                    employer_id: (emp as any).id, careers_home_url: form.careers_home_url, jobs_list_url: form.jobs_list_url || null,
                } as any);
            }
            toast.success("Company added!");
        }
        setShowDrawer(false);
        setFormSaving(false);
        fetchCompanies();
    };

    const deleteCompany = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from("employers").delete().eq("id", deleteTarget.id);
        if (error) toast.error("Delete failed: " + error.message);
        else { toast.success("Company deleted."); setDeleteTarget(null); fetchCompanies(); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Companies Repository</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage crawl sources, policy, and signed-up partners.</p>
                </div>
                <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4" /> Add Company</Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {(["CRAWLED", "SIGNED_UP"] as Tab[]).map(t => (
                    <button key={t} onClick={() => { setTab(t); setSelected(new Set()); }}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {t === "CRAWLED" ? "Crawled Sources" : "Signed-Up Partners"}
                        <span className="ml-2 text-xs rounded-full px-1.5 py-0.5 bg-gray-100 text-gray-500">
                            {companies.filter(c => (c.company_type || "CRAWLED") === t).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search companies…" className="pl-9 w-56 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {selected.size > 0 && (
                        <>
                            <span className="text-sm text-gray-500">{selected.size} selected</span>
                            <Button size="sm" variant="outline" onClick={scrapeSelected} disabled={scrapeWorking} className="gap-1.5">
                                <Play className="w-3.5 h-3.5" /> Scrape Selected
                            </Button>
                        </>
                    )}
                    <Button size="sm" variant="outline" onClick={scrapeAllAllowed} disabled={scrapeWorking} className="gap-1.5">
                        <Play className="w-3.5 h-3.5" /> Scrape All Allowed
                    </Button>
                    <Button size="sm" variant="outline" onClick={fetchCompanies} className="gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
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
                                <th className="px-4 py-3">General URL</th>
                                <th className="px-4 py-3">Careers URL</th>
                                {tab === "SIGNED_UP" && <th className="px-4 py-3">Plan</th>}
                                <th className="px-4 py-3">Policy</th>
                                <th className="px-4 py-3">Policy Checked</th>
                                <th className="px-4 py-3">Last Scraped</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={tab === "SIGNED_UP" ? 9 : 8} />)
                            ) : visible.length === 0 ? (
                                <tr>
                                    <td colSpan={tab === "SIGNED_UP" ? 9 : 8} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-3">
                                            <Building2 className="w-10 h-10 text-gray-200" />
                                            <div className="text-gray-500 font-medium">No companies here yet</div>
                                            <Button size="sm" onClick={openAdd} className="gap-1.5 mt-1"><Plus className="w-4 h-4" /> Add Company</Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                visible.map(company => {
                                    const src = company.employer_sources?.[0];
                                    const progress = scrapeProgress[company.id];
                                    return (
                                        <tr key={company.id} className={`hover:bg-gray-50 transition-colors ${selected.has(company.id) ? "bg-blue-50/50" : ""}`}>
                                            <td className="px-4 py-3">
                                                <input type="checkbox" className="rounded border-gray-300 w-4 h-4" checked={selected.has(company.id)} onChange={() => toggleSelect(company.id)} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    {company.logo_url
                                                        ? <img src={company.logo_url} className="w-8 h-8 rounded-lg object-contain border border-gray-100 bg-white" alt="" />
                                                        : <span className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">{company.name[0]}</span>
                                                    }
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{company.name}</div>
                                                        {company.hq_city && <div className="text-xs text-gray-400">{company.hq_city}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 max-w-[140px]">
                                                {company.website_domain
                                                    ? <a href={company.website_domain.startsWith("http") ? company.website_domain : `https://${company.website_domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-blue-600 truncate text-xs">{company.website_domain}<ExternalLink className="w-3 h-3 shrink-0" /></a>
                                                    : <span className="italic text-gray-300 text-xs">Not set</span>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                                                {src?.careers_home_url
                                                    ? <a href={src.careers_home_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-blue-600 truncate text-xs">{src.careers_home_url}<ExternalLink className="w-3 h-3 shrink-0" /></a>
                                                    : <span className="italic text-gray-300 text-xs">Not set</span>}
                                            </td>
                                            {tab === "SIGNED_UP" && (
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="capitalize text-xs">{company.plan_tier || "starter"}</Badge>
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                {src ? policyBadge(src.policy_status, src.policy_mode) : <Badge variant="outline" className="text-xs text-gray-400">No source</Badge>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {src?.robots_last_checked_at
                                                    ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(src.robots_last_checked_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {src?.last_crawl_at
                                                    ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(src.last_crawl_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    {progress === "running" && <span className="text-xs text-blue-500 animate-pulse">Scraping…</span>}
                                                    {progress === "done" && <span className="text-xs text-green-500">Done</span>}
                                                    {progress === "error" && <span className="text-xs text-red-500">Error</span>}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            {tab === "CRAWLED" && (
                                                                <DropdownMenuItem onClick={() => scrapeCompany(company)} className="gap-2 cursor-pointer">
                                                                    <Play className="w-4 h-4" /> Scrape now
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => openEdit(company)} className="gap-2 cursor-pointer">
                                                                <Edit className="w-4 h-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => recheckPolicy(company)} className="gap-2 cursor-pointer">
                                                                <Shield className="w-4 h-4" /> Re-check policy
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setDeleteTarget(company)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
                                                                <Trash2 className="w-4 h-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && visible.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                        {visible.length} {tab === "CRAWLED" ? "crawled source" : "signed-up partner"}{visible.length !== 1 ? "s" : ""}
                    </div>
                )}
            </div>

            {/* Add/Edit Drawer */}
            <Dialog open={showDrawer} onOpenChange={setShowDrawer}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Logo preview */}
                        {form.logo_url && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                <img src={form.logo_url} className="w-12 h-12 rounded object-contain border border-gray-200 bg-white" alt="logo preview" onError={e => (e.currentTarget.style.display = "none")} />
                                <span className="text-xs text-gray-400">Logo preview</span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Name *</Label>
                                <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Logo URL</Label>
                                <Input className="mt-1" placeholder="https://…" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">General URL</Label>
                                <Input className="mt-1" placeholder="https://company.bg" value={form.website_domain} onChange={e => setForm(f => ({ ...f, website_domain: e.target.value }))} />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">City</Label>
                                <Input className="mt-1" placeholder="Sofia" value={form.hq_city} onChange={e => setForm(f => ({ ...f, hq_city: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Careers URL (Scrape Target)</Label>
                                <Input className="mt-1" placeholder="https://company.bg/careers" value={form.careers_home_url} onChange={e => setForm(f => ({ ...f, careers_home_url: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Jobs List URL (specific listing page)</Label>
                                <Input className="mt-1" placeholder="https://company.bg/careers/jobs" value={form.jobs_list_url} onChange={e => setForm(f => ({ ...f, jobs_list_url: e.target.value }))} />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Company Type</Label>
                                <select className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.company_type} onChange={e => setForm(f => ({ ...f, company_type: e.target.value }))}>
                                    <option value="CRAWLED">Crawled Source</option>
                                    <option value="SIGNED_UP">Signed-Up Partner</option>
                                </select>
                            </div>
                            {form.company_type === "SIGNED_UP" && (
                                <>
                                    <div className="col-span-2">
                                        <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Plan Tier</Label>
                                        <select className="mt-1 w-full text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.plan_tier} onChange={e => setForm(f => ({ ...f, plan_tier: e.target.value }))}>
                                            <option value="starter">Starter (Free)</option>
                                            <option value="growth">Growth ($99/mo)</option>
                                            <option value="enterprise">Enterprise (Custom)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        {[
                                            { key: "is_signed_up_active" as const, label: "Active Subscription" },
                                            { key: "ats_direct_access" as const, label: "Direct ATS Access" },
                                            { key: "is_featured" as const, label: "Featured Employer" },
                                        ].map(({ key, label }) => (
                                            <div key={key} className="flex items-center justify-between py-1">
                                                <Label className="text-sm text-gray-700">{label}</Label>
                                                <Switch checked={!!(form as any)[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDrawer(false)}>Cancel</Button>
                        <Button onClick={saveCompany} disabled={formSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {formSaving ? "Saving…" : editingCompany ? "Save Changes" : "Add Company"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5" /> Delete Company
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">
                        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete all associated employer sources. This cannot be undone.
                    </p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button onClick={deleteCompany} className="bg-red-600 hover:bg-red-700 text-white">Delete permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
