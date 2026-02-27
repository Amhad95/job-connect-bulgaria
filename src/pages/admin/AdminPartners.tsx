import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Search, Plus, RefreshCw, ChevronRight, MoreHorizontal,
    Building2, Users, Briefcase, Star, CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

type Partner = {
    id: string;
    name: string;
    logo_url: string | null;
    website_domain: string | null;
    hq_city: string | null;
    is_featured: boolean;
    is_verified: boolean;
    is_signed_up_active: boolean;
    plan_tier: string;
    billing_status: string;
    max_active_roles: number;
    max_seats: number;
    created_at: string;
    feature_direct_apply: boolean;
    feature_ai_ranking: boolean;
};

type StatusFilter = "all" | "active" | "trial" | "suspended";

function StatusBadge({ active, billing }: { active: boolean; billing: string }) {
    if (!active) return <Badge className="bg-gray-100 text-gray-600 border-gray-200 border text-xs">Inactive</Badge>;
    if (billing === "past_due") return <Badge className="bg-red-50 text-red-700 border-red-200 border text-xs">Past due</Badge>;
    return <Badge className="bg-green-50 text-green-700 border-green-200 border text-xs">Active</Badge>;
}

function PlanBadge({ plan }: { plan: string }) {
    const colors: Record<string, string> = {
        starter: "bg-slate-50 text-slate-600 border-slate-200",
        growth: "bg-blue-50 text-blue-700 border-blue-200",
        enterprise: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return <Badge className={`${colors[plan] || colors.starter} border text-xs capitalize`}>{plan}</Badge>;
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

const EMPTY_FORM = { name: "", logo_url: "", website_domain: "", hq_city: "", plan_tier: "starter" };

export default function AdminPartners() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchPartners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("employers")
            .select("id, name, logo_url, website_domain, hq_city, is_featured, is_verified, is_signed_up_active, plan_tier, billing_status, max_active_roles, max_seats, created_at, feature_direct_apply, feature_ai_ranking")
            .eq("company_type", "SIGNED_UP")
            .order("name") as any;
        if (error) toast.error("Failed to load partners: " + error.message);
        else setPartners(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchPartners(); }, []);

    const visible = partners.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.website_domain || "").toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" ||
            (statusFilter === "active" && p.is_signed_up_active && p.billing_status !== "past_due") ||
            (statusFilter === "suspended" && !p.is_signed_up_active) ||
            (statusFilter === "trial" && p.plan_tier === "starter");
        const matchPlan = planFilter === "all" || p.plan_tier === planFilter;
        return matchSearch && matchStatus && matchPlan;
    });

    const suspend = async (id: string, suspend: boolean) => {
        await supabase.from("employers").update({ is_signed_up_active: !suspend } as any).eq("id", id);
        toast.success(suspend ? "Partner suspended." : "Partner activated.");
        fetchPartners();
    };

    const saveAdd = async () => {
        if (!form.name.trim()) { toast.error("Name required"); return; }
        setSaving(true);
        const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const { error } = await supabase.from("employers").insert({
            name: form.name, slug, company_type: "SIGNED_UP",
            logo_url: form.logo_url || null, website_domain: form.website_domain || null,
            hq_city: form.hq_city || null, plan_tier: form.plan_tier,
            is_signed_up_active: true,
        } as any);
        if (error) toast.error("Failed: " + error.message);
        else { toast.success("Partner added."); setShowAdd(false); fetchPartners(); }
        setSaving(false);
    };

    // Summary stats
    const totalActive = partners.filter(p => p.is_signed_up_active).length;
    const totalGrowth = partners.filter(p => p.plan_tier === "growth").length;
    const totalEnterprise = partners.filter(p => p.plan_tier === "enterprise").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Signed-up employer customers — manage subscriptions, users, roles, and feature access.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/admin/partners/requests">
                        <Button variant="outline" size="sm" className="gap-1.5"><Clock className="w-4 h-4" />Signup Requests</Button>
                    </Link>
                    <Button onClick={() => setShowAdd(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4" />Add Partner</Button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Partners", value: partners.length, icon: Building2, color: "text-gray-700" },
                    { label: "Active", value: totalActive, icon: CheckCircle, color: "text-green-600" },
                    { label: "Growth Plan", value: totalGrowth, icon: Star, color: "text-blue-600" },
                    { label: "Enterprise", value: totalEnterprise, icon: Star, color: "text-purple-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${color}`} />
                        <div>
                            <div className="text-xl font-bold text-gray-900">{value}</div>
                            <div className="text-xs text-gray-500">{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search partners…" className="pl-9 w-56 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="text-sm border rounded-lg px-3 py-2 bg-white h-9 focus:outline-none focus:ring-2 focus:ring-blue-500" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="trial">Starter/Trial</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select className="text-sm border rounded-lg px-3 py-2 bg-white h-9 focus:outline-none focus:ring-2 focus:ring-blue-500" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
                    <option value="all">All plans</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                </select>
                <Button size="sm" variant="ghost" onClick={fetchPartners}><RefreshCw className="w-4 h-4" /></Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Plan</th>
                                <th className="px-4 py-3">Features</th>
                                <th className="px-4 py-3">Billing</th>
                                <th className="px-4 py-3">Since</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <Building2 className="w-10 h-10 text-gray-200" />
                                        <p className="text-gray-500 font-medium">No partners found</p>
                                        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="w-4 h-4" />Add Partner</Button>
                                    </div>
                                </td></tr>
                            ) : (
                                visible.map(partner => (
                                    <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <Link to={`/admin/partners/${partner.id}`} className="flex items-center gap-2.5 group">
                                                {partner.logo_url
                                                    ? <img src={partner.logo_url} className="w-8 h-8 rounded-lg object-contain border border-gray-100 bg-white" alt="" />
                                                    : <span className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">{partner.name[0]}</span>
                                                }
                                                <div>
                                                    <div className="font-semibold text-gray-900 group-hover:text-blue-600 flex items-center gap-1.5">
                                                        {partner.name}
                                                        {partner.is_verified && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                                        {partner.is_featured && <Star className="w-3.5 h-3.5 text-amber-400" />}
                                                    </div>
                                                    {partner.website_domain && <div className="text-xs text-gray-400">{partner.website_domain}</div>}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-auto" />
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge active={partner.is_signed_up_active} billing={partner.billing_status} /></td>
                                        <td className="px-4 py-3"><PlanBadge plan={partner.plan_tier} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {partner.feature_direct_apply && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Direct Apply</span>}
                                                {partner.feature_ai_ranking && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">AI Rank</span>}
                                                {partner.is_featured && <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Featured</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {partner.billing_status === "ok" ? <span className="text-green-600 text-xs font-medium">OK</span>
                                                : partner.billing_status === "past_due" ? <span className="text-red-600 text-xs font-medium">Past Due</span>
                                                    : <span className="text-gray-400 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                            {new Date(partner.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem asChild><Link to={`/admin/partners/${partner.id}`} className="flex items-center gap-2 cursor-pointer"><ChevronRight className="w-4 h-4" />View</Link></DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => suspend(partner.id, partner.is_signed_up_active)} className={`gap-2 cursor-pointer ${partner.is_signed_up_active ? "text-amber-600 focus:text-amber-600" : "text-green-600 focus:text-green-600"}`}>
                                                        {partner.is_signed_up_active ? <><XCircle className="w-4 h-4" />Suspend</> : <><CheckCircle className="w-4 h-4" />Activate</>}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && visible.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">{visible.length} partner{visible.length !== 1 ? "s" : ""}</div>
                )}
            </div>

            {/* Add Partner Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Partner (Manual)</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        {[
                            { key: "name", label: "Company Name *", placeholder: "Acme Corp" },
                            { key: "logo_url", label: "Logo URL", placeholder: "https://…" },
                            { key: "website_domain", label: "Website", placeholder: "https://acme.bg" },
                            { key: "hq_city", label: "City", placeholder: "Sofia" },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <Label className="text-xs font-semibold text-gray-600 uppercase">{label}</Label>
                                <Input className="mt-1" placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                            </div>
                        ))}
                        <div>
                            <Label className="text-xs font-semibold text-gray-600 uppercase">Plan</Label>
                            <select className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.plan_tier} onChange={e => setForm(f => ({ ...f, plan_tier: e.target.value }))}>
                                <option value="starter">Starter</option>
                                <option value="growth">Growth</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={saveAdd} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">{saving ? "Saving…" : "Add Partner"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
