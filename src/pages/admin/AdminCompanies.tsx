import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Search, Plus, Play, RefreshCw,
    MoreHorizontal, Edit, Trash2, ExternalLink, Shield,
    Building2, CheckCircle, Clock, AlertTriangle, X, AlertCircle,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

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
    employer_sources: EmployerSource[];
};

/* ─── Policy helpers ─── */
function PolicyBadge({ ps }: { ps: PolicyStatus }) {
    if (ps === "ACTIVE") return <Badge className="bg-green-50 text-green-700 border-green-200 border text-xs gap-1"><CheckCircle className="w-3 h-3" />Allowed</Badge>;
    if (ps === "BLOCKED") return <Badge className="bg-red-50 text-red-700 border-red-200 border text-xs gap-1"><X className="w-3 h-3" />Blocked</Badge>;
    return <Badge className="bg-gray-50 text-gray-500 border-gray-200 border text-xs gap-1"><AlertCircle className="w-3 h-3" />Unknown</Badge>;
}

function SkeletonRow() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
                <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
            ))}
        </tr>
    );
}

const EMPTY_FORM = {
    name: "", logo_url: "", website_domain: "",
    careers_home_url: "", jobs_list_url: "", hq_city: "",
};

/* ─── Component ─── */
export default function AdminCompanies() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());
    const [scrapeWorking, setScrapeWorking] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formSaving, setFormSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("employers")
            .select("id, name, slug, logo_url, website_domain, hq_city, industry_tags, is_featured, company_type, employer_sources(id, careers_home_url, jobs_list_url, policy_status, policy_mode, robots_last_checked_at, last_crawl_at, ats_type)")
            .in("company_type", ["CRAWLED", null as any])
            .order("name") as any;
        if (error) toast.error("Failed to load: " + error.message);
        // Filter to crawled sources only (company_type = CRAWLED or legacy null)
        else setCompanies((data || []).filter((c: Company) => !c.company_type || c.company_type === "CRAWLED"));
        setLoading(false);
    };

    useEffect(() => { fetchCompanies(); }, []);

    const visible = companies.filter(c => {
        const q = search.toLowerCase();
        return !q || c.name.toLowerCase().includes(q) || (c.website_domain || "").toLowerCase().includes(q);
    });

    const toggleSelect = (id: string) =>
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleAll = () =>
        setSelected(prev => prev.size === visible.length ? new Set() : new Set(visible.map(c => c.id)));

    const fireBatchScrape = async (companyIds: string[]) => {
        if (!companyIds.length) return;
        setScrapeWorking(true);
        setScrapingIds(prev => new Set([...prev, ...companyIds]));
        try {
            const { data, error } = await supabase.functions.invoke("batch-scrape", {
                body: { company_ids: companyIds },
            });
            if (error) {
                toast.error("Scrape trigger failed: " + error.message);
                setScrapingIds(prev => { const n = new Set(prev); companyIds.forEach(id => n.delete(id)); return n; });
            } else {
                toast.success(`Scraping started in background for ${data?.sources_triggered || 0} source(s). You can close this page safely.`);
                // Auto-clear scraping indicators after 2 minutes
                setTimeout(() => {
                    setScrapingIds(prev => { const n = new Set(prev); companyIds.forEach(id => n.delete(id)); return n; });
                }, 120_000);
            }
        } catch (e: any) {
            toast.error("Scrape trigger failed: " + e.message);
            setScrapingIds(prev => { const n = new Set(prev); companyIds.forEach(id => n.delete(id)); return n; });
        }
        setScrapeWorking(false);
        setSelected(new Set());
    };

    const scrapeSelected = () => fireBatchScrape(Array.from(selected));

    const scrapeAllAllowed = () => {
        const allowed = companies.filter(c => (c.employer_sources || []).some(s => s.policy_status === "ACTIVE"));
        fireBatchScrape(allowed.map(c => c.id));
    };

    const recheckPolicy = async (company: Company) => {
        const src = company.employer_sources?.[0];
        if (!src) { toast.error("No source to check"); return; }
        toast.info(`Checking robots.txt for ${company.name}…`);
        const { error } = await supabase.functions.invoke("check-robots-policy", { body: { employer_source_id: src.id } });
        if (error) toast.error("Policy check failed: " + error.message);
        else { toast.success("Policy updated"); fetchCompanies(); }
    };

    const openAdd = () => { setEditingCompany(null); setForm(EMPTY_FORM); setShowDrawer(true); };
    const openEdit = (company: Company) => {
        setEditingCompany(company);
        const src = company.employer_sources?.[0];
        setForm({ name: company.name, logo_url: company.logo_url || "", website_domain: company.website_domain || "", careers_home_url: src?.careers_home_url || "", jobs_list_url: src?.jobs_list_url || "", hq_city: company.hq_city || "" });
        setShowDrawer(true);
    };

    const saveCompany = async () => {
        if (!form.name.trim()) { toast.error("Company name required"); return; }
        setFormSaving(true);
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (editingCompany) {
            const { error } = await supabase.from("employers").update({ name: form.name, logo_url: form.logo_url || null, website_domain: form.website_domain || null, hq_city: form.hq_city || null } as any).eq("id", editingCompany.id);
            if (error) { toast.error("Save failed: " + error.message); setFormSaving(false); return; }
            const src = editingCompany.employer_sources?.[0];
            if (src) await supabase.from("employer_sources").update({ careers_home_url: form.careers_home_url || null, jobs_list_url: form.jobs_list_url || null }).eq("id", src.id);
            else if (form.careers_home_url) await supabase.from("employer_sources").insert({ employer_id: editingCompany.id, careers_home_url: form.careers_home_url, jobs_list_url: form.jobs_list_url || null } as any);
            toast.success("Updated");
        } else {
            const { data: emp, error } = await supabase.from("employers").insert({ name: form.name, slug, company_type: "CRAWLED", logo_url: form.logo_url || null, website_domain: form.website_domain || null, hq_city: form.hq_city || null } as any).select().single();
            if (error || !emp) { toast.error("Failed: " + error?.message); setFormSaving(false); return; }
            if (form.careers_home_url) await supabase.from("employer_sources").insert({ employer_id: (emp as any).id, careers_home_url: form.careers_home_url, jobs_list_url: form.jobs_list_url || null } as any);
            toast.success("Company added");
        }
        setShowDrawer(false); setFormSaving(false); fetchCompanies();
    };

    const deleteCompany = async () => {
        if (!deleteTarget) return;
        const { error } = await supabase.from("employers").delete().eq("id", deleteTarget.id);
        if (error) toast.error("Delete failed: " + error.message);
        else { toast.success("Deleted"); setDeleteTarget(null); fetchCompanies(); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Crawled Sources</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage scraped employer sources, check robots policy, and trigger scrape runs.</p>
                </div>
                <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4" />Add Company</Button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search companies…" className="pl-9 w-56 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {selected.size > 0 && (
                        <Button size="sm" variant="outline" onClick={scrapeSelected} disabled={scrapeWorking} className="gap-1.5">
                            <Play className="w-3.5 h-3.5" />Scrape Selected ({selected.size})
                        </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={scrapeAllAllowed} disabled={scrapeWorking} className="gap-1.5">
                        <Play className="w-3.5 h-3.5" />Scrape All Allowed
                    </Button>
                    <Button size="sm" variant="ghost" onClick={fetchCompanies}><RefreshCw className="w-4 h-4" /></Button>
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
                                <th className="px-4 py-3">Jobs List URL</th>
                                <th className="px-4 py-3">Policy</th>
                                <th className="px-4 py-3">Checked</th>
                                <th className="px-4 py-3">Last Scraped</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <Building2 className="w-10 h-10 text-gray-200" />
                                        <div className="text-gray-500 font-medium">No crawled sources</div>
                                        <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" />Add Company</Button>
                                    </div>
                                </td></tr>
                            ) : (
                                visible.map(company => {
                                    const src = company.employer_sources?.[0];
                                    const isScraping = scrapingIds.has(company.id);
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
                                            {[company.website_domain, src?.careers_home_url, src?.jobs_list_url].map((url, i) => (
                                                <td key={i} className="px-4 py-3 max-w-[150px]">
                                                    {url
                                                        ? <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 truncate max-w-full"><span className="truncate">{url.replace(/^https?:\/\//, "")}</span><ExternalLink className="w-3 h-3 shrink-0" /></a>
                                                        : <span className="italic text-gray-300 text-xs">—</span>}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3">{src ? <PolicyBadge ps={src.policy_status} /> : <Badge variant="outline" className="text-xs text-gray-400">No source</Badge>}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {src?.robots_last_checked_at ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(src.robots_last_checked_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {src?.last_crawl_at ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(src.last_crawl_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span> : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    {isScraping && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium animate-pulse">
                                                            <RefreshCw className="w-3 h-3 animate-spin" />Scraping…
                                                        </span>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"><MoreHorizontal className="w-4 h-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40">
                                                            <DropdownMenuItem onClick={() => fireBatchScrape([company.id])} className="gap-2 cursor-pointer"><Play className="w-4 h-4" />Scrape now</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEdit(company)} className="gap-2 cursor-pointer"><Edit className="w-4 h-4" />Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => recheckPolicy(company)} className="gap-2 cursor-pointer"><Shield className="w-4 h-4" />Re-check policy</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setDeleteTarget(company)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4" />Delete</DropdownMenuItem>
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
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">{visible.length} crawled source{visible.length !== 1 ? "s" : ""}</div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showDrawer} onOpenChange={setShowDrawer}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingCompany ? "Edit Crawled Source" : "Add Crawled Source"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {form.logo_url && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                <img src={form.logo_url} className="w-12 h-12 rounded object-contain bg-white border" alt="preview" onError={e => (e.currentTarget.style.display = "none")} />
                                <span className="text-xs text-gray-400">Logo preview</span>
                            </div>
                        )}
                        {[
                            { key: "name", label: "Company Name *", placeholder: "Acme Corp" },
                            { key: "logo_url", label: "Logo URL", placeholder: "https://…" },
                            { key: "website_domain", label: "General / Homepage URL", placeholder: "https://acme.bg" },
                            { key: "careers_home_url", label: "Careers URL (scrape target)", placeholder: "https://acme.bg/careers" },
                            { key: "jobs_list_url", label: "Jobs List URL (specific listing)", placeholder: "https://acme.bg/careers/jobs" },
                            { key: "hq_city", label: "City", placeholder: "Sofia" },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</Label>
                                <Input className="mt-1" placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                            </div>
                        ))}
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
                    <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" />Delete Company</DialogTitle></DialogHeader>
                    <p className="text-sm text-gray-600 py-2">Delete <strong>{deleteTarget?.name}</strong> and all its sources? This cannot be undone.</p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button onClick={deleteCompany} className="bg-red-600 hover:bg-red-700 text-white">Delete permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
