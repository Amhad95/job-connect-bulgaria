import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    ArrowLeft, Building2, Users, Briefcase, CreditCard, Shield, Activity,
    CheckCircle, XCircle, MoreHorizontal, Plus, ChevronRight, ExternalLink,
    Star, Edit2, Save, RefreshCw, AlertTriangle, Clock,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Types ─── */
type Partner = {
    id: string; name: string; logo_url: string | null; website_domain: string | null;
    hq_city: string | null; about_text: string | null; admin_notes: string | null;
    is_featured: boolean; is_verified: boolean; is_signed_up_active: boolean; plan_tier: string;
    billing_status: string; renewal_date: string | null; max_active_roles: number; max_seats: number;
    feature_direct_apply: boolean; feature_ai_ranking: boolean; feature_ai_cv: boolean;
    feature_ai_cover: boolean; feature_ai_suggestions: boolean; ats_direct_access: boolean;
    created_at: string;
};
type Membership = { id: string; email: string; role: string; status: string; last_login_at: string | null; };
type Job = { id: string; title: string; status: string; first_seen_at: string; };
type Event = { id: string; event_type: string; metadata: any; created_at: string; };

const TABS = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "roles", label: "Roles", icon: Briefcase },
    { id: "billing", label: "Subscription & Billing", icon: CreditCard },
    { id: "auth", label: "Authorizations", icon: Shield },
    { id: "activity", label: "Activity Log", icon: Activity },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        </div>
    );
}

const ROLE_COLORS: Record<string, string> = {
    COMPANY_ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
    RECRUITER: "bg-purple-50 text-purple-700 border-purple-200",
    VIEWER: "bg-gray-50 text-gray-600 border-gray-200",
};

const MEMBER_STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700 border-green-200",
    INVITED: "bg-amber-50 text-amber-700 border-amber-200",
    DISABLED: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function AdminPartnerDetail() {
    const { id } = useParams<{ id: string }>();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [members, setMembers] = useState<Membership[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [tab, setTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notesEdit, setNotesEdit] = useState(false);
    const [notesVal, setNotesVal] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: "", role: "RECRUITER" });
    const [inviting, setInviting] = useState(false);
    const [billingForm, setBillingForm] = useState({ plan_tier: "starter", billing_status: "unset", renewal_date: "" });
    const [authForm, setAuthForm] = useState<Partial<Partner>>({});

    const fetchAll = async () => {
        if (!id) return;
        setLoading(true);
        const [pRes, mRes, jRes, eRes] = await Promise.all([
            supabase.from("employers").select("*").eq("id", id).single() as any,
            supabase.from("partner_memberships").select("*").eq("partner_id", id).order("created_at") as any,
            supabase.from("job_postings").select("id, title, status, first_seen_at").eq("employer_id", id).eq("source_type", "DIRECT").order("first_seen_at", { ascending: false }).limit(50) as any,
            supabase.from("partner_events").select("*").eq("partner_id", id).order("created_at", { ascending: false }).limit(30) as any,
        ]);
        if (pRes.error) toast.error("Partner not found");
        else {
            const p = pRes.data as Partner;
            setPartner(p);
            setNotesVal(p.admin_notes || "");
            setBillingForm({ plan_tier: p.plan_tier, billing_status: p.billing_status || "unset", renewal_date: p.renewal_date || "" });
            setAuthForm({
                feature_direct_apply: p.feature_direct_apply, feature_ai_ranking: p.feature_ai_ranking,
                feature_ai_cv: p.feature_ai_cv, feature_ai_cover: p.feature_ai_cover,
                feature_ai_suggestions: p.feature_ai_suggestions, ats_direct_access: p.ats_direct_access,
                is_featured: p.is_featured, is_verified: p.is_verified,
                max_active_roles: p.max_active_roles, max_seats: p.max_seats,
            });
        }
        setMembers(mRes.data || []);
        setJobs(jRes.data || []);
        setEvents(eRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, [id]);

    const patchPartner = async (patch: Partial<Partner>) => {
        if (!partner) return;
        setSaving(true);
        const { error } = await supabase.from("employers").update(patch as any).eq("id", partner.id);
        if (error) toast.error("Save failed: " + error.message);
        else { toast.success("Saved."); await fetchAll(); }
        setSaving(false);
    };

    const saveNotes = async () => { await patchPartner({ admin_notes: notesVal } as any); setNotesEdit(false); };

    const saveBilling = async () => {
        await patchPartner({ plan_tier: billingForm.plan_tier, billing_status: billingForm.billing_status, renewal_date: billingForm.renewal_date || null } as any);
        // Log event
        if (partner && billingForm.plan_tier !== partner.plan_tier) {
            await supabase.from("partner_events").insert({ partner_id: partner.id, event_type: "PLAN_CHANGED", metadata: { from: partner.plan_tier, to: billingForm.plan_tier } } as any);
        }
    };

    const saveAuth = async () => {
        await patchPartner(authForm as any);
    };

    const inviteUser = async () => {
        if (!inviteForm.email || !partner) return;
        setInviting(true);
        const { error } = await supabase.from("partner_memberships").insert({
            partner_id: partner.id, email: inviteForm.email, role: inviteForm.role, status: "INVITED",
        } as any);
        if (error) toast.error("Invite failed: " + error.message);
        else {
            toast.success(`Invite sent to ${inviteForm.email}`);
            await supabase.from("partner_events").insert({ partner_id: partner.id, event_type: "USER_INVITED", metadata: { email: inviteForm.email, role: inviteForm.role } } as any);
            setInviteOpen(false);
            setInviteForm({ email: "", role: "RECRUITER" });
            fetchAll();
        }
        setInviting(false);
    };

    const changeMemberStatus = async (memberId: string, status: string) => {
        await supabase.from("partner_memberships").update({ status } as any).eq("id", memberId);
        toast.success("Member updated.");
        fetchAll();
    };

    const changeMemberRole = async (memberId: string, role: string) => {
        await supabase.from("partner_memberships").update({ role } as any).eq("id", memberId);
        toast.success("Role updated.");
        fetchAll();
    };

    const removeMember = async (memberId: string) => {
        await supabase.from("partner_memberships").delete().eq("id", memberId);
        toast.info("Member removed.");
        fetchAll();
    };

    const toggleJobStatus = async (jobId: string, current: string) => {
        const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        await supabase.from("job_postings").update({ status: next } as any).eq("id", jobId);
        toast.success(`Job ${next === "ACTIVE" ? "published" : "unpublished"}.`);
        fetchAll();
    };

    if (loading) {
        return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
    }

    if (!partner) return <div className="text-center py-20 text-gray-400">Partner not found.</div>;

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div>
                <Link to="/admin/partners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
                    <ArrowLeft className="w-4 h-4" />Back to Partners
                </Link>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {partner.logo_url
                            ? <img src={partner.logo_url} className="w-14 h-14 rounded-xl object-contain border border-gray-200 bg-white" alt="" />
                            : <span className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl">{partner.name[0]}</span>
                        }
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                                {partner.is_verified && <CheckCircle className="w-5 h-5 text-green-500" title="Verified" />}
                                {partner.is_featured && <Star className="w-5 h-5 text-amber-400" title="Featured" />}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className={`text-xs border ${partner.is_signed_up_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                    {partner.is_signed_up_active ? "Active" : "Inactive"}
                                </Badge>
                                <Badge className="text-xs border bg-slate-50 text-slate-600 border-slate-200 capitalize">{partner.plan_tier}</Badge>
                                {partner.website_domain && (
                                    <a href={partner.website_domain.startsWith("http") ? partner.website_domain : `https://${partner.website_domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                        {partner.website_domain}<ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm" variant="outline"
                            onClick={() => patchPartner({ is_signed_up_active: !partner.is_signed_up_active } as any)}
                            className={partner.is_signed_up_active ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                        >
                            {partner.is_signed_up_active ? <><XCircle className="w-4 h-4 mr-1" />Suspend</> : <><CheckCircle className="w-4 h-4 mr-1" />Activate</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        <t.icon className="w-4 h-4" />{t.label}
                    </button>
                ))}
            </div>

            {/* ─── OVERVIEW ─── */}
            {tab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Users" value={members.length} sub={`of ${partner.max_seats} seats`} />
                        <StatCard label="Active Roles" value={jobs.filter(j => j.status === "ACTIVE").length} sub={`of ${partner.max_active_roles} allowed`} />
                        <StatCard label="Plan" value={partner.plan_tier} />
                        <StatCard label="Member since" value={new Date(partner.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} />
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Admin Notes</h3>
                            {!notesEdit
                                ? <Button size="sm" variant="ghost" onClick={() => setNotesEdit(true)} className="gap-1.5"><Edit2 className="w-3.5 h-3.5" />Edit</Button>
                                : <Button size="sm" onClick={saveNotes} disabled={saving} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-3.5 h-3.5" />Save</Button>
                            }
                        </div>
                        {notesEdit
                            ? <textarea className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} value={notesVal} onChange={e => setNotesVal(e.target.value)} placeholder="Internal notes about this partner…" />
                            : <p className="text-sm text-gray-600 whitespace-pre-wrap">{partner.admin_notes || <span className="italic text-gray-400">No notes</span>}</p>
                        }
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 mb-3">Company Profile</h3>
                        <dl className="grid grid-cols-2 gap-y-3 text-sm">
                            {[
                                ["Website", partner.website_domain || "—"],
                                ["City", partner.hq_city || "—"],
                                ["Created", new Date(partner.created_at).toLocaleDateString("en-GB")],
                                ["Billing", partner.billing_status || "unset"],
                            ].map(([k, v]) => (
                                <div key={k}><dt className="text-xs font-semibold text-gray-400 uppercase">{k}</dt><dd className="mt-0.5 text-gray-800">{v}</dd></div>
                            ))}
                            {partner.about_text && (
                                <div className="col-span-2"><dt className="text-xs font-semibold text-gray-400 uppercase">About</dt><dd className="mt-0.5 text-gray-700 text-xs leading-relaxed">{partner.about_text}</dd></div>
                            )}
                        </dl>
                    </div>
                </div>
            )}

            {/* ─── USERS ─── */}
            {tab === "users" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">Team Members</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{members.length} / {partner.max_seats} seats used</p>
                        </div>
                        <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4" />Invite User</Button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Last Login</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {members.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No users yet. Invite one to get started.</td></tr>
                                ) : members.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{m.email}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="text-xs border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={m.role}
                                                onChange={e => changeMemberRole(m.id, e.target.value)}
                                            >
                                                {["COMPANY_ADMIN", "RECRUITER", "VIEWER"].map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge className={`${MEMBER_STATUS_COLORS[m.status] || MEMBER_STATUS_COLORS.INVITED} border text-xs`}>{m.status}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">
                                            {m.last_login_at ? new Date(m.last_login_at).toLocaleDateString("en-GB") : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400"><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    {m.status !== "ACTIVE" && <DropdownMenuItem onClick={() => changeMemberStatus(m.id, "ACTIVE")} className="gap-2 cursor-pointer text-green-600"><CheckCircle className="w-4 h-4" />Activate</DropdownMenuItem>}
                                                    {m.status !== "DISABLED" && <DropdownMenuItem onClick={() => changeMemberStatus(m.id, "DISABLED")} className="gap-2 cursor-pointer text-amber-600"><XCircle className="w-4 h-4" />Disable</DropdownMenuItem>}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => removeMember(m.id)} className="gap-2 cursor-pointer text-red-600"><AlertTriangle className="w-4 h-4" />Remove</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Invite modal */}
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogContent className="max-w-sm">
                            <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
                            <div className="space-y-3 py-2">
                                <div><Label className="text-xs font-semibold text-gray-600 uppercase">Email</Label><Input className="mt-1" type="email" placeholder="user@company.bg" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} /></div>
                                <div>
                                    <Label className="text-xs font-semibold text-gray-600 uppercase">Role</Label>
                                    <select className="mt-1 w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                                        <option value="RECRUITER">Recruiter</option>
                                        <option value="COMPANY_ADMIN">Company Admin</option>
                                        <option value="VIEWER">Viewer</option>
                                    </select>
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                <Button onClick={inviteUser} disabled={inviting} className="bg-blue-600 hover:bg-blue-700 text-white">{inviting ? "Inviting…" : "Send Invite"}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* ─── ROLES ─── */}
            {tab === "roles" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">Posted Roles</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {jobs.filter(j => j.status === "ACTIVE").length} active / {partner.max_active_roles} allowed
                            </p>
                        </div>
                    </div>
                    {/* Plan limit bar */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span>Active roles used</span>
                            <span>{jobs.filter(j => j.status === "ACTIVE").length} / {partner.max_active_roles}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (jobs.filter(j => j.status === "ACTIVE").length / Math.max(1, partner.max_active_roles)) * 100)}%` }} />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Title</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Posted</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {jobs.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">No partner-posted roles yet.</td></tr>
                                ) : jobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-800">{job.title}</td>
                                        <td className="px-4 py-3">
                                            <Badge className={`text-xs border ${job.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>{job.status}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(job.first_seen_at).toLocaleDateString("en-GB")}</td>
                                        <td className="px-4 py-3">
                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => toggleJobStatus(job.id, job.status)}>
                                                {job.status === "ACTIVE" ? "Unpublish" : "Publish"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── BILLING ─── */}
            {tab === "billing" && (
                <div className="space-y-6 max-w-lg">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 font-semibold text-sm text-gray-800">Subscription</div>
                        <div className="divide-y divide-gray-100">
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <Label className="font-medium text-gray-800">Plan Tier</Label>
                                <select className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={billingForm.plan_tier} onChange={e => setBillingForm(f => ({ ...f, plan_tier: e.target.value }))}>
                                    <option value="starter">Starter (Free)</option>
                                    <option value="growth">Growth</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <Label className="font-medium text-gray-800">Billing Status</Label>
                                <select className="text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={billingForm.billing_status} onChange={e => setBillingForm(f => ({ ...f, billing_status: e.target.value }))}>
                                    <option value="unset">Not set</option>
                                    <option value="ok">OK</option>
                                    <option value="past_due">Past Due</option>
                                </select>
                            </div>
                            <div className="px-5 py-4 flex items-center justify-between gap-4">
                                <Label className="font-medium text-gray-800">Renewal Date</Label>
                                <Input type="date" className="w-40" value={billingForm.renewal_date} onChange={e => setBillingForm(f => ({ ...f, renewal_date: e.target.value }))} />
                            </div>
                            <div className="px-5 py-4">
                                <Button onClick={saveBilling} disabled={saving} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-4 h-4" />Save Billing</Button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 font-semibold text-sm text-gray-800">Invoice History</div>
                        <div className="px-5 py-10 text-center text-gray-400 text-sm italic">Invoice history — payment integration not yet implemented.</div>
                    </div>
                </div>
            )}

            {/* ─── AUTHORIZATIONS ─── */}
            {tab === "auth" && (
                <div className="space-y-6 max-w-lg">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 font-semibold text-sm text-gray-800">Feature Flags</div>
                        <div className="divide-y divide-gray-100">
                            {[
                                { key: "feature_direct_apply", label: "Direct Apply", desc: "Applicants apply directly via platform profile" },
                                { key: "feature_ai_ranking", label: "AI Ranking for Employers", desc: "AI-powered applicant ranking visible to employer" },
                                { key: "feature_ai_cv", label: "AI CV Tailoring", desc: "Applicant-side AI CV tailoring feature" },
                                { key: "feature_ai_cover", label: "AI Cover Letter", desc: "Applicant-side AI cover letter generation" },
                                { key: "feature_ai_suggestions", label: "AI Job Suggestions", desc: "AI-powered job recommendations for applicants" },
                                { key: "ats_direct_access", label: "ATS Direct Access", desc: "Partner can post jobs directly via ATS integration" },
                                { key: "is_featured", label: "Featured Employer", desc: "Company appears in featured employer sections" },
                                { key: "is_verified", label: "Verified Employer", desc: "Shows verified badge on job listings" },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="px-5 py-3.5 flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{label}</div>
                                        <div className="text-xs text-gray-400">{desc}</div>
                                    </div>
                                    <Switch
                                        checked={!!(authForm as any)[key]}
                                        onCheckedChange={v => setAuthForm(f => ({ ...f, [key]: v }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 font-semibold text-sm text-gray-800">Limits</div>
                        <div className="divide-y divide-gray-100">
                            {[
                                { key: "max_active_roles", label: "Max Active Roles", min: 1, max: 500 },
                                { key: "max_seats", label: "Max Users / Seats", min: 1, max: 100 },
                            ].map(({ key, label, min, max }) => (
                                <div key={key} className="px-5 py-3.5 flex items-center justify-between gap-4">
                                    <Label className="font-medium text-gray-800">{label}</Label>
                                    <Input type="number" min={min} max={max} className="w-20 text-right" value={(authForm as any)[key] ?? 5} onChange={e => setAuthForm(f => ({ ...f, [key]: parseInt(e.target.value) || min }))} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button onClick={saveAuth} disabled={saving} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-4 h-4" />Save Authorizations</Button>
                </div>
            )}

            {/* ─── ACTIVITY LOG ─── */}
            {tab === "activity" && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 font-semibold text-sm text-gray-800">Recent Activity</div>
                        {events.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-sm">No events recorded yet.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {events.map(ev => (
                                    <li key={ev.id} className="px-5 py-3.5 flex items-start gap-3">
                                        <Clock className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{ev.event_type.replace(/_/g, " ")}</span>
                                                {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                                    <span className="text-xs text-gray-400">{JSON.stringify(ev.metadata)}</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(ev.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
