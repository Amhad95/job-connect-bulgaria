import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [profileCheck, setProfileCheck] = useState<"loading" | "complete" | "incomplete">("loading");

  useEffect(() => {
    if (!user) { setProfileCheck("complete"); return; }
    supabase
      .from("profiles")
      .select("birth_date")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfileCheck(data?.birth_date ? "complete" : "incomplete");
      });
  }, [user]);

  if (loading || profileCheck === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileCheck === "incomplete") {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
