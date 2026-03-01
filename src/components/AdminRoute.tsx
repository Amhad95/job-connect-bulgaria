import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        if (user) {
            supabase.rpc("has_role", { _user_id: user.id, _role: "admin" } as any)
                .then(({ data, error }) => {
                    if (error) { setIsAdmin(false); return; }
                    setIsAdmin(!!data);
                });
        } else if (!loading) {
            setIsAdmin(false);
        }
    }, [user, loading]);

    if (loading || (user && isAdmin === null)) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user || isAdmin === false) {
        return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
}
