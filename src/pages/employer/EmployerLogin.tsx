import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, ArrowRight } from "lucide-react";
import { getUserEmployerContext, humanizeAuthError } from "@/lib/employerAuth";

/**
 * EmployerLogin
 *
 * Same Supabase auth as candidate login — different post-login redirect.
 * On success:
 *   employer_profiles row exists → /employer
 *   no row                      → inline no-access banner + pricing link
 *
 * Candidate Sign in / Sign up in Header: untouched.
 */
export default function EmployerLogin() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [noAccess, setNoAccess] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    // If already logged in, immediately resolve employer access
    useEffect(() => {
        if (authLoading || !user) return;
        setChecking(true);
        getUserEmployerContext(user.id).then((ctx) => {
            setChecking(false);
            if (ctx.hasEmployerProfile) {
                navigate("/employer", { replace: true });
            } else {
                setNoAccess(true);
            }
        });
    }, [user, authLoading]);

    // Show spinner while resolving auth and employer check
    if (authLoading || checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError(null);
        setNoAccess(false);
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            const { text } = humanizeAuthError(error.message);
            setGeneralError(text);
            return;
        }

        if (!data.user) {
            setGeneralError("Sign in failed. Please try again.");
            return;
        }

        const ctx = await getUserEmployerContext(data.user.id);
        if (ctx.hasEmployerProfile) {
            toast({ title: "Welcome back!", description: "Redirecting to your workspace…" });
            navigate("/employer", { replace: true });
        } else {
            setNoAccess(true);
        }
    };

    return (
        <Layout>
            <div className="container flex items-center justify-center py-16 md:py-24">
                <div className="w-full max-w-md">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="font-display text-xl font-bold text-gray-900">Employer login</h1>
                            <p className="text-sm text-gray-500">Access your hiring workspace</p>
                        </div>
                    </div>

                    {/* No-access banner */}
                    {noAccess && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-900 mb-1">
                                This account does not have employer access.
                            </p>
                            <p className="text-sm text-amber-700 mb-3">
                                You need an employer workspace. Sign up from the pricing page to get started.
                            </p>
                            <Link
                                to="/employers#pricing"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
                            >
                                View employer plans <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* General error */}
                    {generalError && (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm text-red-700">{generalError}</p>
                        </div>
                    )}

                    {/* Login form */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="emp-email">Work email</Label>
                                <Input
                                    id="emp-email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setGeneralError(null); }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-password">Password</Label>
                                <Input
                                    id="emp-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setGeneralError(null); }}
                                    required
                                />
                            </div>
                            <Button
                                className="w-full h-10 font-semibold"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Signing in…" : "Sign in to workspace"}
                            </Button>
                        </form>

                        <hr className="my-5 border-gray-100" />

                        <p className="text-center text-sm text-gray-500">
                            Don't have an employer account?{" "}
                            <Link to="/employers#pricing" className="text-blue-600 font-semibold hover:underline">
                                View plans
                            </Link>
                        </p>
                        <p className="text-center text-sm text-gray-400 mt-2">
                            Looking for a job?{" "}
                            <Link to="/auth" className="text-gray-600 hover:underline">
                                Candidate sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
