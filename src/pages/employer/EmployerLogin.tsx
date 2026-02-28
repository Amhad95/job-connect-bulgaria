import { useState, useEffect } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, ArrowRight } from "lucide-react";

/**
 * EmployerLogin
 *
 * Reuses the same Supabase Auth as the candidate login.
 * After successful login:
 *   - employer_profiles row found  → redirect to /employer
 *   - no row                       → inline "no access" message + link to /employers pricing
 *
 * Candidate Sign in / Sign up buttons in Header are untouched.
 */
export default function EmployerLogin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [noAccess, setNoAccess] = useState(false);

    // If user is already logged in, check employer_profiles immediately
    useEffect(() => {
        if (!user) return;
        checkEmployerAccess(user.id);
    }, [user]);

    async function checkEmployerAccess(userId: string) {
        const { data } = await (supabase as any)
            .from("employer_profiles")
            .select("employer_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

        if (data) {
            navigate("/employer", { replace: true });
        } else {
            setNoAccess(true);
        }
    }

    // Already logged in and already checked
    if (user && !noAccess && !loading) {
        // Still checking — show spinner (handled by useEffect)
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNoAccess(false);

        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            return;
        }

        if (data.user) {
            await checkEmployerAccess(data.user.id);
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
                                You need an employer workspace to continue. Sign up from the pricing page to get started.
                            </p>
                            <Link
                                to="/employers#pricing"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
                            >
                                View employer pricing <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
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
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-password">Password</Label>
                                <Input
                                    id="emp-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                            <Link
                                to="/employers#pricing"
                                className="text-blue-600 font-semibold hover:underline"
                            >
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
