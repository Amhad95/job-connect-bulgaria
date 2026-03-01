import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import {
    parsePlanInfo,
    provisionEmployerWorkspace,
    humanizeAuthError,
    PLAN_MAP,
} from "@/lib/employerAuth";

/**
 * EmployerSignup
 *
 * Entry point from all pricing CTA buttons on /employers.
 * Reads plan + interval from URL params — always set by buildSignupUrl().
 *
 * Flow:
 * 1. Display selected plan summary (block if params invalid).
 * 2. Sign up via Supabase auth.
 * 3. On success → call provision_employer_workspace() RPC.
 * 4. Redirect to /employer.
 *
 * Candidate signup (/auth) is NOT affected.
 */
export default function EmployerSignup() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const planInfo = parsePlanInfo(
        searchParams.get("plan"),
        searchParams.get("interval"),
    );

    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Distinct error states
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [alreadyExists, setAlreadyExists] = useState(false);

    const clearErrors = () => {
        setGeneralError(null);
        setAlreadyExists(false);
    };

    // Guard: invalid plan params → show error and link back
    if (!planInfo.isValid) {
        return (
            <div className="container flex items-center justify-center py-24">
                <div className="container flex items-center justify-center py-24">
                    <div className="w-full max-w-md text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <h1 className="font-display text-xl font-bold text-gray-900 mb-2">
                            Missing plan selection
                        </h1>
                        <p className="text-sm text-gray-500 mb-6">
                            Please choose a plan from the Employers page to continue.
                        </p>
                        <Link
                            to="/employers#pricing"
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                        >
                            View employer plans <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        if (!companyName.trim()) {
            setGeneralError("Please enter your company name.");
            return;
        }

        if (password !== confirmPassword) {
            setGeneralError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setGeneralError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        // Step 1: Supabase signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: companyName, signup_type: "employer" },
                emailRedirectTo: `${window.location.origin}/employer`,
            },
        });

        if (authError) {
            setLoading(false);
            const { text, isAlreadyExists } = humanizeAuthError(authError.message);
            if (isAlreadyExists) {
                setAlreadyExists(true);
            } else {
                setGeneralError(text);
            }
            return;
        }

        // Supabase may return a user with identities=[] if email already exists
        // (it returns 200 but with no real new user). Detect this edge case.
        if (
            authData.user &&
            Array.isArray(authData.user.identities) &&
            authData.user.identities.length === 0
        ) {
            setLoading(false);
            setAlreadyExists(true);
            return;
        }

        const userId = authData.user?.id;
        if (!userId) {
            setLoading(false);
            setGeneralError("Signup failed. Please try again.");
            return;
        }

        const result = await provisionEmployerWorkspace(
            userId,
            companyName.trim(),
            planInfo.planId,
            planInfo.interval,
            email,       // for signup_requests.submitted_by_email
        );

        setLoading(false);

        if (result.error) {
            setGeneralError(`Account created but workspace setup failed: ${result.error}. Please contact support.`);
            return;
        }

        // Step 3: Success — workspace is PENDING APPROVAL
        toast({
            title: "Application submitted! 🎉",
            description: "We'll review your account within 1–2 business days. You can explore your workspace while you wait.",
        });

        navigate("/employer", { replace: true });
    };

    return (
        <div className="container flex items-center justify-center py-16 md:py-24">
            <div className="container flex items-center justify-center py-16 md:py-24">
                <div className="w-full max-w-md">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="font-display text-xl font-bold text-gray-900">
                                Create employer account
                            </h1>
                            <p className="text-sm text-gray-500">Set up your hiring workspace</p>
                        </div>
                    </div>

                    {/* Selected plan summary */}
                    <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">
                                Selected plan: {planInfo.label}
                            </p>
                            <p className="text-sm text-blue-700">
                                {planInfo.interval === "free" || planInfo.planId === "starter"
                                    ? "Free forever"
                                    : `${planInfo.price} · ${planInfo.interval}`}
                                {planInfo.planId === "growth" && " · 30-day free trial"}
                            </p>
                        </div>
                        <Link
                            to="/employers#pricing"
                            className="ml-auto text-xs text-blue-600 hover:underline whitespace-nowrap"
                        >
                            Change
                        </Link>
                    </div>

                    {/* Already-exists error */}
                    {alreadyExists && (
                        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-900 mb-1">
                                This email already has an account.
                            </p>
                            <p className="text-sm text-amber-700 mb-3">Please sign in instead.</p>
                            <Link
                                to="/employer/login"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
                            >
                                Sign in as employer <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* General error */}
                    {generalError && (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm text-red-700">{generalError}</p>
                        </div>
                    )}

                    {/* Signup form */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="company-name">Company name</Label>
                                <Input
                                    id="company-name"
                                    type="text"
                                    placeholder="Acme Corp"
                                    value={companyName}
                                    onChange={(e) => { setCompanyName(e.target.value); clearErrors(); }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-signup-email">Work email</Label>
                                <Input
                                    id="emp-signup-email"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-signup-password">Password</Label>
                                <Input
                                    id="emp-signup-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="emp-signup-confirm">Confirm password</Label>
                                <Input
                                    id="emp-signup-confirm"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); clearErrors(); }}
                                    required
                                />
                            </div>
                            <Button
                                className="w-full h-10 font-semibold"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Setting up workspace…" : "Create workspace"}
                            </Button>
                        </form>

                        <hr className="my-5 border-gray-100" />

                        <p className="text-center text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link to="/employer/login" className="text-blue-600 font-semibold hover:underline">
                                Sign in
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
        </div>
    );
}
