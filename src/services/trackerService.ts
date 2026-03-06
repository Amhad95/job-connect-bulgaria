import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export type TrackerStage = "saved" | "applied" | "interviewing" | "offer" | "rejected";

export interface TrackerItem {
    id: string;
    user_id: string;
    source_type: "external" | "platform";
    job_title: string;
    company_name: string;
    job_url: string | null;
    location: string | null;
    notes: string | null;
    stage: TrackerStage;
    applied_date: string | null;
    created_at: string;
    updated_at: string;
    // Platform-only fields
    application_id?: string;
    employer_status?: string;
}

// Map employer application_status_enum → candidate tracker stage
const STATUS_TO_STAGE: Record<string, TrackerStage> = {
    new: "applied",
    reviewing: "applied",
    interviewing: "interviewing",
    offered: "offer",
    rejected: "rejected",
};

// ── External (manual) tracker items ──────────────────────────────────────────

export async function getExternalTrackerItems(
    userId: string
): Promise<TrackerItem[]> {
    const { data, error } = await (supabase as any)
        .from("application_tracker_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((d: any) => ({ ...d, source_type: "external" as const }));
}

export async function createExternalTrackerItem(
    userId: string,
    item: {
        job_title: string;
        company_name: string;
        job_url?: string;
        location?: string;
        notes?: string;
        stage?: TrackerStage;
        applied_date?: string;
    }
): Promise<TrackerItem> {
    const { data, error } = await (supabase as any)
        .from("application_tracker_items")
        .insert({
            user_id: userId,
            source_type: "external",
            job_title: item.job_title,
            company_name: item.company_name,
            job_url: item.job_url || null,
            location: item.location || null,
            notes: item.notes || null,
            stage: item.stage || "saved",
            applied_date: item.applied_date || null,
        })
        .select()
        .single();
    if (error) throw error;
    return { ...data, source_type: "external" } as TrackerItem;
}

export async function updateExternalTrackerItem(
    id: string,
    updates: Partial<{
        job_title: string;
        company_name: string;
        job_url: string;
        location: string;
        notes: string;
        stage: TrackerStage;
        applied_date: string;
    }>
): Promise<TrackerItem> {
    const { data, error } = await (supabase as any)
        .from("application_tracker_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return { ...data, source_type: "external" } as TrackerItem;
}

export async function deleteExternalTrackerItem(id: string) {
    const { error } = await (supabase as any)
        .from("application_tracker_items")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

export async function updateTrackerStage(id: string, stage: TrackerStage) {
    const { error } = await (supabase as any)
        .from("application_tracker_items")
        .update({ stage })
        .eq("id", id);
    if (error) throw error;
}

// ── Platform applications (read-only for tracker display) ────────────────────

export async function getPlatformTrackerItems(
    userId: string
): Promise<TrackerItem[]> {
    const { data, error } = await (supabase as any)
        .from("applications")
        .select(`
      id, job_id, status, applied_at,
      job_postings!inner ( title, source_type,
        employers!inner ( name )
      )
    `)
        .eq("user_id", userId)
        .not("user_id", "is", null);

    if (error) throw error;
    if (!data) return [];

    // Only include DIRECT (platform) applications
    return data
        .filter((a: any) => a.job_postings?.source_type === "DIRECT")
        .map((a: any) => ({
            id: `platform-${a.id}`,
            application_id: a.id,
            user_id: userId,
            source_type: "platform" as const,
            job_title: a.job_postings.title,
            company_name: a.job_postings.employers?.name || "Unknown",
            job_url: null,
            location: null,
            notes: null,
            stage: STATUS_TO_STAGE[a.status] || "applied",
            employer_status: a.status,
            applied_date: a.applied_at,
            created_at: a.applied_at,
            updated_at: a.applied_at,
        }));
}

// ── Unified tracker data ─────────────────────────────────────────────────────

export async function getAllTrackerItems(
    userId: string
): Promise<TrackerItem[]> {
    const [external, platform] = await Promise.all([
        getExternalTrackerItems(userId),
        getPlatformTrackerItems(userId),
    ]);
    return [...platform, ...external];
}
