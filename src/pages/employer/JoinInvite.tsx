import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Stage = "loading" | "success" | "error" | "unauthenticated";

/**
 * JoinInvite — /employer/join?token=...
 *
 * Flow:
 *  1. If not logged in → show "sign in first" with redirect back
 *  2. If logged in → call accept_employer_invite(token)
 *  3. On success → redirect to /employer
 *  4. On error   → show human-readable error
 */
export default function JoinInvite() {
    const { user, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token") ?? "";
    const [stage, setStage] = useState<Stage>(authLoading ? "loading" : "loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [employerName, setEmployerName] = useState("");

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setStage("unauthenticated");
            return;
        }

        if (!token) {
            setStage("error");
            setErrorMsg("No invite token found in the URL.");
            return;
        }

        (async () => {
            const { data, error } = await (supabase as any)
                .rpc("accept_employer_invite", { p_token: token });

            if (error || !data?.ok) {
                const raw = data?.error ?? error?.message ?? "unknown";
                const humanized: Record<string, string> = {
                    unauthenticated: "You must be signed in to accept this invitation.",
                    invalid_or_expired_token: "This invitation link is invalid or has already been used.",
                    token_expired: "This invitation has expired. Ask the team owner to resend it.",
                    seat_cap_reached: "The workspace is at its seat limit. Ask the owner to upgrade the plan.",
                };
                setErrorMsg(humanized[raw] ?? raw);
                setStage("error");
                return;
            }

            // Fetch employer name for the success message
            const { data: empData } = await (supabase as any)
                .from("employers").select("name").eq("id", data.employer_id).single();
            setEmployerName(empData?.name ?? "your team");
            setStage("success");

            setTimeout(() => navigate("/employer", { replace: true }), 2200);
        })();
    }, [user, authLoading, token, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                {stage === "loading" && (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="font-semibold text-gray-900">Accepting invitation…</p>
                    </>
                )}

                {stage === "unauthenticated" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-2">Sign in to accept your invite</p>
                        <p className="text-sm text-gray-500 mb-6">
                            You need to be signed in to join the team workspace.
                        </p>
                        <Button asChild className="w-full rounded-full">
                            <Link to={`/employer/login?redirect=/employer/join%3Ftoken%3D${token}`}>
                                Sign in
                            </Link>
                        </Button>
                    </>
                )}

                {stage === "success" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-1">Welcome to {employerName}!</p>
                        <p className="text-sm text-gray-500">Redirecting you to the workspace…</p>
                    </>
                )}

                {stage === "error" && (
                    <>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="font-semibold text-gray-900 mb-2">Couldn't accept invitation</p>
                        <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
                        <Button variant="outline" asChild className="w-full rounded-full">
                            <Link to="/employer/login">Go to employer login</Link>
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
