import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft, User, Mail, Shield, Key, Save, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function EmployerAccount() {
    const { employerName, role } = useEmployer();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);

    useEffect(() => {
        if (user) {
            setEmail(user.email || "");
            setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
            setLoading(false);
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: displayName.trim() },
            });
            if (error) throw error;
            toast.success("Profile updated successfully.");
        } catch (e: any) {
            toast.error(e.message || "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/employer`,
            });
            if (error) throw error;
            setResetSent(true);
            toast.success("Password reset email sent.");
        } catch (e: any) {
            toast.error(e.message || "Failed to send reset email.");
        }
    };

    return (
        <div className="max-w-2xl animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <Link to="/employer/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
                </Link>
                <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">My Account</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your personal profile and security settings.</p>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Profile section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Profile</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                    {displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                                    <p className="text-xs text-slate-500">{email}</p>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                                        {role} at {employerName}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="display_name">Display Name</Label>
                                <Input
                                    id="display_name"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    className="bg-slate-50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="account_email">Email</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <p className="text-sm text-slate-600 font-medium">{email}</p>
                                </div>
                                <p className="text-[11px] text-slate-400">Email cannot be changed here. Contact support if needed.</p>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl mt-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>

                    {/* Security section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-amber-600" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900">Security</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Password</p>
                                        <p className="text-[11px] text-slate-400">Reset via email link</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl h-8 text-xs"
                                    disabled={resetSent}
                                    onClick={handlePasswordReset}
                                >
                                    {resetSent ? "Email Sent ✓" : "Send Reset Link"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
