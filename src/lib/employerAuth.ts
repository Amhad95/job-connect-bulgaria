import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlanId = "starter" | "growth" | "enterprise";
export type BillingInterval = "monthly" | "quarterly" | "annual" | "free";

export interface EmployerContext {
    hasEmployerProfile: boolean;
    employerId: string | null;
    role: "owner" | "admin" | "member" | null;
}

export interface PlanInfo {
    planId: PlanId;
    interval: BillingInterval;
    label: string;
    price: string;
    isValid: boolean;
}

// ─── Plan configs ────────────────────────────────────────────────────────────

export const PLAN_MAP: Record<PlanId, { label: string; prices: Record<BillingInterval, string> }> = {
    starter: {
        label: "Early Adopter (Starter)",
        prices: { free: "Free", monthly: "Free", quarterly: "Free", annual: "Free" },
    },
    growth: {
        label: "Growth",
        prices: { free: "49 €/mo", monthly: "49 €/mo", quarterly: "99 €/qtr", annual: "299 €/yr" },
    },
    enterprise: {
        label: "Enterprise / Agency",
        prices: { free: "129 €/mo", monthly: "129 €/mo", quarterly: "249 €/qtr", annual: "799 €/yr" },
    },
};

export function parsePlanInfo(
    planParam: string | null,
    intervalParam: string | null,
): PlanInfo {
    const validPlans: PlanId[] = ["starter", "growth", "enterprise"];
    const validIntervals: BillingInterval[] = ["monthly", "quarterly", "annual", "free"];

    const planId = validPlans.includes(planParam as PlanId)
        ? (planParam as PlanId)
        : null;

    const interval = validIntervals.includes(intervalParam as BillingInterval)
        ? (intervalParam as BillingInterval)
        : "monthly";

    if (!planId) {
        return { planId: "starter", interval: "free", label: "", price: "", isValid: false };
    }

    const plan = PLAN_MAP[planId];
    return {
        planId,
        interval,
        label: plan.label,
        price: plan.prices[interval] ?? plan.prices.monthly,
        isValid: true,
    };
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Check if a user has an employer_profiles row.
 * Returns employer context for redirect decisions.
 */
export async function getUserEmployerContext(userId: string): Promise<EmployerContext> {
    const { data, error } = await (supabase as any)
        .from("employer_profiles")
        .select("employer_id, role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        return { hasEmployerProfile: false, employerId: null, role: null };
    }

    return {
        hasEmployerProfile: true,
        employerId: data.employer_id,
        role: data.role,
    };
}

/**
 * Provision a new employer workspace (atomic: employer + profile + subscription).
 * Calls the SECURITY DEFINER function created in the Phase 2 migration.
 */
export async function provisionEmployerWorkspace(
    userId: string,
    companyName: string,
    planId: PlanId,
    billingInterval: BillingInterval,
): Promise<{ employer_id: string; status: string; error?: string }> {
    const { data, error } = await (supabase as any).rpc("provision_employer_workspace", {
        p_user_id: userId,
        p_company_name: companyName,
        p_plan_id: planId,
        p_billing_interval: billingInterval,
    });

    if (error) {
        return { employer_id: "", status: "", error: error.message };
    }

    return { employer_id: data.employer_id, status: data.status };
}

/**
 * Normalize Supabase auth errors into human-readable messages.
 */
export function humanizeAuthError(message: string): {
    text: string;
    isAlreadyExists: boolean;
    isRateLimit: boolean;
} {
    const lower = message.toLowerCase();

    if (
        lower.includes("already registered") ||
        lower.includes("user already exists") ||
        lower.includes("email address is already") ||
        lower.includes("email already")
    ) {
        return {
            text: "This email already has an account. Please sign in instead.",
            isAlreadyExists: true,
            isRateLimit: false,
        };
    }

    if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("429")) {
        return {
            text: "Too many attempts. Please wait a minute and try again.",
            isAlreadyExists: false,
            isRateLimit: true,
        };
    }

    if (lower.includes("invalid email") || lower.includes("valid email")) {
        return {
            text: "Please enter a valid email address.",
            isAlreadyExists: false,
            isRateLimit: false,
        };
    }

    if (lower.includes("weak password") || lower.includes("password should")) {
        return {
            text: "Password is too weak. Use at least 8 characters.",
            isAlreadyExists: false,
            isRateLimit: false,
        };
    }

    return { text: message, isAlreadyExists: false, isRateLimit: false };
}

/**
 * Navigate to employer signup with correct plan + interval params.
 * Use this from ALL pricing CTAs so the URL format is always consistent.
 */
export function buildSignupUrl(planId: PlanId, interval: BillingInterval): string {
    return `/employer/signup?plan=${planId}&interval=${interval}`;
}
