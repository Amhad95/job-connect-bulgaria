import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Mail, ShieldCheck, Eye, User, MoreHorizontal, Trash2 } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────
type MemberRole = "owner" | "admin" | "member" | "viewer";

interface TeamMember {
    id: string;
    user_id: string;
    role: MemberRole;
    email?: string;
    created_at: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    status: string;
}

const ROLE_ICON: Record<MemberRole, React.ReactNode> = {
    owner: <ShieldCheck className="w-3 h-3 text-blue-600" />,
    admin: <ShieldCheck className="w-3 h-3 text-purple-500" />,
    member: <User className="w-3 h-3 text-gray-500" />,
    viewer: <Eye className="w-3 h-3 text-gray-400" />,
};

const ROLE_BADGE: Record<MemberRole, string> = {
    owner: "bg-blue-50 text-blue-700 border-blue-200",
    admin: "bg-purple-50 text-purple-700 border-purple-200",
    member: "bg-gray-50 text-gray-600 border-gray-200",
    viewer: "bg-gray-50 text-gray-400 border-gray-100",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
    admin: "Can manage jobs and pipeline",
    member: "Can view and manage pipeline",
    viewer: "Read-only access",
};

// ── Component ──────────────────────────────────────────────────────────────
export default function TeamSettings() {
    const { employerId, role } = useEmployer();
    const canManage = role === "owner" || role === "admin";

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<string>("starter");
    const [seatCap, setSeatCap] = useState<number>(3);

    // Invite dialog
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<string>("member");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    // Revoke confirmation
    const [revokeTarget, setRevokeTarget] = useState<PendingInvite | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);

        // Plan info
        const { data: sub } = await (supabase as any)
            .from("employer_subscriptions").select("plan_id").eq("employer_id", employerId).single();
        const p = sub?.plan_id ?? "starter";
        setPlan(p);
        setSeatCap(p === "starter" ? 3 : p === "growth" ? 10 : 9999);

        // Members — join with auth.users is not possible from client directly;
        // use employer_profiles + user email via a separate query
        const { data: profileData } = await (supabase as any)
            .from("employer_profiles")
            .select("id, user_id, role, created_at")
            .eq("employer_id", employerId)
            .order("created_at", { ascending: true });
        setMembers(profileData ?? []);

        // Pending invites
        const { data: inviteData } = await (supabase as any)
            .from("employer_invites")
            .select("id, email, role, expires_at, status")
            .eq("employer_id", employerId)
            .eq("status", "pending")
            .order("created_at", { ascending: false });
        setInvites(inviteData ?? []);

        setLoading(false);
    }, [employerId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleInvite = async () => {
        if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
            setInviteError("Enter a valid email address."); return;
        }
        setInviting(true); setInviteError(null);

        const { data, error } = await (supabase as any)
            .rpc("create_employer_invite", {
                p_employer_id: employerId,
                p_email: inviteEmail.trim().toLowerCase(),
                p_role: inviteRole,
            });

        if (error) {
            const msg = error.message ?? "Invite failed.";
            if (msg.includes("Seat cap reached")) {
                setInviteError(`Seat cap reached (${members.length + invites.length}/${seatCap} on ${plan} plan). Upgrade to add more members.`);
            } else {
                setInviteError(msg);
            }
            setInviting(false); return;
        }

        if (!data?.ok) {
            setInviteError(data?.error ?? "Invite failed.");
            setInviting(false); return;
        }

        // Fire email via send-invite edge function (non-blocking)
        supabase.functions.invoke("send-invite", {
            body: { invite_id: data.invite_id },
        }).catch(console.warn);

        setInviting(false);
        setInviteSuccess(true);
        setTimeout(() => {
            setInviteSuccess(false);
            setInviteOpen(false);
            setInviteEmail(""); setInviteRole("member");
            fetchData();
        }, 1800);
    };

    const revokeInvite = async (invite: PendingInvite) => {
        await (supabase as any)
            .rpc("revoke_employer_invite", { p_invite_id: invite.id });
        setRevokeTarget(null);
        fetchData();
    };

    return (
        <div className="max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-gray-900">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {members.length} / {seatCap === 9999 ? "∞" : seatCap} seats used
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => setInviteOpen(true)} className="gap-2 rounded-full">
                        <UserPlus className="w-4 h-4" />
                        Invite member
                    </Button>
                )}
            </div>

            {/* Seat cap info banner */}
            {plan === "starter" && members.length >= 3 && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Seat cap reached on Starter plan (3 seats).{" "}
                    <Link to="/employers#pricing" className="font-semibold underline underline-offset-2">Upgrade</Link> to add more members.
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
            ) : (
                <>
                    {/* Active members */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active members</p>
                        </div>
                        <ul className="divide-y divide-gray-50">
                            {members.map(m => (
                                <li key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{m.user_id}</p>
                                        <p className="text-xs text-gray-400">
                                            Joined {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className={`text-[11px] gap-1 ${ROLE_BADGE[m.role]}`}>
                                        {ROLE_ICON[m.role]}
                                        {m.role}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Pending invites */}
                    {invites.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pending invitations</p>
                            </div>
                            <ul className="divide-y divide-gray-50">
                                {invites.map(inv => (
                                    <li key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                            <Mail className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                                            <p className="text-xs text-gray-400">
                                                Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-200 bg-amber-50">
                                            {inv.role}
                                        </Badge>
                                        {canManage && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => setRevokeTarget(inv)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Revoke invite
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}

            {/* RBAC reference */}
            <div className="mt-8 rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Role permissions</p>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-gray-400">
                            <th className="text-left pb-2 font-medium">Role</th>
                            <th className="text-center pb-2 font-medium">Jobs</th>
                            <th className="text-center pb-2 font-medium">Pipeline</th>
                            <th className="text-center pb-2 font-medium">Team</th>
                            <th className="text-center pb-2 font-medium">Billing</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-600 divide-y divide-gray-100">
                        {[
                            { r: "owner", jobs: "✓", pipeline: "✓", team: "✓", billing: "✓" },
                            { r: "admin", jobs: "✓", pipeline: "✓", team: "✓", billing: "—" },
                            { r: "member", jobs: "✓", pipeline: "✓", team: "—", billing: "—" },
                            { r: "viewer", jobs: "👁", pipeline: "👁", team: "—", billing: "—" },
                        ].map(row => (
                            <tr key={row.r} className="border-t border-gray-100">
                                <td className="py-1.5 font-semibold capitalize">{row.r}</td>
                                <td className="py-1.5 text-center">{row.jobs}</td>
                                <td className="py-1.5 text-center">{row.pipeline}</td>
                                <td className="py-1.5 text-center">{row.team}</td>
                                <td className="py-1.5 text-center">{row.billing}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite dialog */}
            <Dialog open={inviteOpen} onOpenChange={v => { if (!v) { setInviteOpen(false); setInviteError(null); setInviteSuccess(false); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Invite team member</DialogTitle>
                    </DialogHeader>
                    {inviteSuccess ? (
                        <div className="py-6 flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-green-500" />
                            </div>
                            <p className="font-semibold text-gray-900">Invite sent!</p>
                            <p className="text-sm text-gray-500">An email has been sent to {inviteEmail}.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 py-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="inv-email">Email</Label>
                                    <Input id="inv-email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin — {ROLE_DESCRIPTIONS.admin}</SelectItem>
                                            <SelectItem value="member">Member — {ROLE_DESCRIPTIONS.member}</SelectItem>
                                            <SelectItem value="viewer">Viewer — {ROLE_DESCRIPTIONS.viewer}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {inviteError && (
                                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</Button>
                                <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                                    {inviting ? "Sending…" : <><UserPlus className="w-4 h-4" />Send invite</>}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Revoke confirmation */}
            <AlertDialog open={!!revokeTarget} onOpenChange={v => !v && setRevokeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The invite sent to <strong>{revokeTarget?.email}</strong> will be invalidated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => revokeTarget && revokeInvite(revokeTarget)}>
                            Revoke
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
