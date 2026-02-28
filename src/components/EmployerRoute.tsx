import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { EmployerProvider, EmployerContextValue } from "@/contexts/EmployerContext";

/**
 * EmployerRoute
 *
 * Guards all /employer/* routes. Checks that the authenticated user has
 * a row in employer_profiles. If not, redirects to /auth.
 * On success, populates EmployerContext so child pages get employer data
 * without re-querying.
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
                .select("employer_id, role, employers(name)")
                .eq("user_id", user.id)
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                setEmployerCtx({
                    employerId: data.employer_id,
                    employerName: data.employers?.name ?? "My Company",
                    role: data.role as EmployerContextValue["role"],
                });
            }
            setChecking(false);
        })();
    }, [user]);

    // Still resolving auth or employer check
    if (authLoading || checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    // Not logged in
    if (!user) return <Navigate to="/auth" replace />;

    // Logged in but not an employer
    if (!employerCtx) {
        return (
            <div className="flex min-h-screen items-center justify-center flex-col gap-4 text-center px-4">
                <p className="text-gray-900 font-semibold text-lg">Employer access required</p>
                <p className="text-gray-500 text-sm max-w-xs">
                    Your account is not linked to an employer workspace. Contact your administrator or
                    sign up as an employer.
                </p>
            </div>
        );
    }

    return (
        <EmployerProvider value={employerCtx}>
            {children}
        </EmployerProvider>
    );
}
