import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EmployerProvider, EmployerContextValue } from "@/contexts/EmployerContext";
import { Clock, ArrowRight } from "lucide-react";

/**
 * EmployerRoute
 *
 * Guards all /employer/* routes. Checks employer_profiles.
 * Reads employers.approval_status and employer_subscriptions (plan, status, trial_ends_at)
 * and injects all into context.
 *
 * Approved employers: full workspace.
 * Pending/rejected/suspended employers: layout renders but a persistent restriction
 * banner is shown via EmployerLayout (read from context).
 */
export function EmployerRoute({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [employerCtx, setEmployerCtx] = useState<EmployerContextValue | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!user) {
            setChecking(false);
            return;
        }

        (async () => {
            const { data, error } = await (supabase as any)
                .from("employer_profiles")
                .select(`
          employer_id, role,
          employers ( name, approval_status ),
          employer_subscriptions: employers!inner ( employer_subscriptions ( plan_id, status, trial_ends_at ) )
        `)
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                // Flatten subscription — employers.employer_subscriptions[0]
                const sub = data.employers?.employer_subscriptions?.[0] ?? null;
                setEmployerCtx({
                    employerId: data.employer_id,
                    employerName: data.employers?.name ?? "My Company",
                    role: data.role as EmployerContextValue["role"],
                    approvalStatus: data.employers?.approval_status ?? "pending",
                    planId: sub?.plan_id ?? "starter",
                    subStatus: sub?.status ?? "active",
                    trialEndsAt: sub?.trial_ends_at ?? null,
                });
            } else {
                // Simpler fallback: fetch profile + employer + sub separately
                const { data: profile } = await (supabase as any)
                    .from("employer_profiles")
                    .select("employer_id, role")
                    .eq("user_id", user.id)
                    .limit(1)
                    .maybeSingle();

                if (profile) {
                    const { data: emp } = await (supabase as any)
                        .from("employers")
                        .select("name, approval_status")
                        .eq("id", profile.employer_id)
                        .single();

                    const { data: sub } = await (supabase as any)
                        .from("employer_subscriptions")
                        .select("plan_id, status, trial_ends_at")
                        .eq("employer_id", profile.employer_id)
                        .single();

                    setEmployerCtx({
                        employerId: profile.employer_id,
                        employerName: emp?.name ?? "My Company",
                        role: profile.role as EmployerContextValue["role"],
                        approvalStatus: emp?.approval_status ?? "pending",
                        planId: sub?.plan_id ?? "starter",
                        subStatus: sub?.status ?? "active",
                        trialEndsAt: sub?.trial_ends_at ?? null,
                    });
                }
            }
            setChecking(false);
        })();
    }, [user]);

    if (authLoading || checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!user) return <Navigate to="/employer/login" replace />;

    if (!employerCtx) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-center px-4">
                <p className="text-gray-900 font-semibold text-lg">Employer access required</p>
                <p className="text-gray-500 text-sm max-w-xs">
                    Your account is not linked to an employer workspace.
                </p>
                <Link
                    to="/employers#pricing"
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    View employer plans <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    return (
        <EmployerProvider value={employerCtx}>
            {children}
        </EmployerProvider>
    );
}

/**
 * PendingApprovalBanner
 * Non-dismissible banner for approval_status != 'approved'.
 */
export function PendingApprovalBanner({ status }: { status: string }) {
    if (status === "approved") return null;

    if (status === "rejected") {
        return (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900 mb-1">
                    Your employer application was not approved.
                </p>
                <p className="text-sm text-red-700 mb-3">
                    If you believe this is an error, please contact us.
                </p>
                <Link
                    to="/contact"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 hover:underline"
                >
                    Contact support <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        );
    }

    // pending / suspended
    return (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                        {status === "suspended" ? "Workspace suspended" : "Your workspace is pending review"}
                    </p>
                    <p className="text-sm text-amber-700 mb-3">
                        {status === "suspended"
                            ? "Your trial has ended or your subscription is inactive. Upgrade your plan to restore access."
                            : "We're reviewing your application — this usually takes 1–2 business days. While you wait, you can complete your profile and prepare job drafts."}
                    </p>
                    {status === "suspended" && (
                        <Link
                            to="/employers#pricing"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            View plans <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                    {status !== "suspended" && (
                        <div className="grid gap-1.5 text-xs text-amber-800">
                            <div className="flex items-center gap-1.5"><span className="text-green-600 font-semibold">✓</span> Complete company profile</div>
                            <div className="flex items-center gap-1.5"><span className="text-green-600 font-semibold">✓</span> Create job drafts</div>
                            <div className="flex items-center gap-1.5"><span className="text-amber-600 font-semibold">⏳</span> Publishing jobs — available after approval</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
