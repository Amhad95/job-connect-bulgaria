import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Mail, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Prefs {
    email_enabled: boolean;
    notify_new_applications: boolean;
    notify_application_updates: boolean;
    notify_ai_scoring: boolean;
}

/**
 * NotificationSettings — /employer/settings/notifications
 *
 * Lets employers toggle:
 * - Email notifications on/off
 * - New application alerts
 * - AI scoring complete/failed alerts
 */
export default function NotificationSettings() {
    const { user } = useAuth();
    const { role } = useEmployer();

    const [prefs, setPrefs] = useState<Prefs | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        (supabase as any)
            .from("user_notification_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single()
            .then(({ data }: any) => {
                if (data) {
                    setPrefs({
                        email_enabled: data.email_enabled,
                        notify_new_applications: data.notify_new_applications,
                        notify_application_updates: data.notify_application_updates,
                        notify_ai_scoring: data.notify_ai_scoring,
                    });
                } else {
                    // Defaults
                    setPrefs({
                        email_enabled: true,
                        notify_new_applications: true,
                        notify_application_updates: true,
                        notify_ai_scoring: true,
                    });
                }
            });
    }, [user]);

    const save = async (updates: Partial<Prefs>) => {
        if (!user) return;
        setSaving(true);
        const merged = { ...prefs!, ...updates };
        setPrefs(merged);

        const { error } = await (supabase as any)
            .from("user_notification_preferences")
            .upsert({ user_id: user.id, ...merged, updated_at: new Date().toISOString() });

        if (error) toast.error("Failed to save preferences.");
        else toast.success("Preferences saved.");
        setSaving(false);
    };

    const isOwnerOrAdmin = role === "owner" || role === "admin";

    return (
        <div className="max-w-4xl animate-in fade-in duration-500">
            {/* Breadcrumb */}
            <Link to="/employer/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
            </Link>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-gray-900">Notification settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Control which emails and alerts you receive.</p>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>

            {!prefs ? (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Master email toggle */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email notifications</p>
                        </div>
                        <div className="px-5 py-4">
                            <Row
                                id="email_enabled"
                                label="Enable email notifications"
                                description="All email notifications for your account"
                                checked={prefs.email_enabled}
                                onToggle={v => save({ email_enabled: v })}
                            />
                        </div>
                    </div>

                    {/* Employer-specific */}
                    {isOwnerOrAdmin && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-gray-400" />
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Employer alerts</p>
                            </div>
                            <div className="px-5 py-4 space-y-5">
                                <Row
                                    id="notify_new_applications"
                                    label="New application received"
                                    description="Email + in-app alert when a candidate applies to your job"
                                    checked={prefs.notify_new_applications}
                                    disabled={!prefs.email_enabled}
                                    onToggle={v => save({ notify_new_applications: v })}
                                />
                                <Row
                                    id="notify_ai_scoring"
                                    label="AI scoring complete / failed"
                                    description="In-app alert when AI match score is ready or fails"
                                    checked={prefs.notify_ai_scoring}
                                    onToggle={v => save({ notify_ai_scoring: v })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Candidate preferences (visible to all roles) */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-gray-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Candidate alerts</p>
                        </div>
                        <div className="px-5 py-4">
                            <Row
                                id="notify_application_updates"
                                label="Application status updates"
                                description="Email when your application moves to a new stage"
                                checked={prefs.notify_application_updates}
                                disabled={!prefs.email_enabled}
                                onToggle={v => save({ notify_application_updates: v })}
                            />
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center">
                        Transactional emails (account actions, security) are always sent regardless of these settings.
                    </p>
                </div>
            )}
        </div>
    );
}

function Row({
    id, label, description, checked, disabled = false, onToggle,
}: {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onToggle: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <Label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">{label}</Label>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onToggle} disabled={disabled} />
        </div>
    );
}
