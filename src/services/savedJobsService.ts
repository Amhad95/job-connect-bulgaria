import { supabase } from "@/integrations/supabase/client";
import type { DbJob } from "@/hooks/useJobs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SavedJob {
    id: string;
    user_id: string;
    job_id: string;
    saved_at: string;
}

export interface ViewHistoryEntry {
    job_id: string;
    viewed_at: string;
}

export interface InterestTag {
    id: string;
    user_id: string;
    tag_type: "role" | "skill" | "industry" | "location" | "keyword";
    value: string;
    created_at: string;
}

// ── Saved Jobs ───────────────────────────────────────────────────────────────

export async function getSavedJobs(userId: string): Promise<SavedJob[]> {
    const { data, error } = await (supabase as any)
        .from("saved_jobs")
        .select("*")
        .eq("user_id", userId)
        .order("saved_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function getSavedJobIds(userId: string): Promise<Set<string>> {
    const { data, error } = await (supabase as any)
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", userId);
    if (error) throw error;
    return new Set((data || []).map((r: any) => r.job_id));
}

export async function saveJob(userId: string, jobId: string) {
    const { error } = await (supabase as any)
        .from("saved_jobs")
        .insert({ user_id: userId, job_id: jobId });
    if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function unsaveJob(userId: string, jobId: string) {
    const { error } = await (supabase as any)
        .from("saved_jobs")
        .delete()
        .eq("user_id", userId)
        .eq("job_id", jobId);
    if (error) throw error;
}

export async function toggleSaveJob(
    userId: string,
    jobId: string,
    isSaved: boolean
) {
    if (isSaved) {
        await unsaveJob(userId, jobId);
    } else {
        await saveJob(userId, jobId);
    }
}

// ── View History ─────────────────────────────────────────────────────────────

export async function recordJobView(userId: string, jobId: string) {
    const { error } = await (supabase as any)
        .from("job_view_history")
        .insert({ user_id: userId, job_id: jobId });
    if (error) throw error;
}

export async function getViewHistory(
    userId: string,
    limit = 50
): Promise<ViewHistoryEntry[]> {
    // Get distinct jobs with most recent view time
    const { data, error } = await (supabase as any)
        .from("job_view_history")
        .select("job_id, viewed_at")
        .eq("user_id", userId)
        .order("viewed_at", { ascending: false })
        .limit(limit * 3); // over-fetch to compensate for dedup

    if (error) throw error;
    if (!data) return [];

    // Deduplicate: keep most recent view per job_id
    const seen = new Map<string, string>();
    for (const row of data) {
        if (!seen.has(row.job_id)) {
            seen.set(row.job_id, row.viewed_at);
        }
    }

    return Array.from(seen.entries())
        .map(([job_id, viewed_at]) => ({ job_id, viewed_at }))
        .slice(0, limit);
}

export async function clearViewHistory(userId: string) {
    const { error } = await (supabase as any)
        .from("job_view_history")
        .delete()
        .eq("user_id", userId);
    if (error) throw error;
}

// ── Interest Tags ────────────────────────────────────────────────────────────

export async function getInterestTags(userId: string): Promise<InterestTag[]> {
    const { data, error } = await (supabase as any)
        .from("job_interest_tags")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function addInterestTag(
    userId: string,
    tagType: InterestTag["tag_type"],
    value: string
) {
    const { data, error } = await (supabase as any)
        .from("job_interest_tags")
        .insert({ user_id: userId, tag_type: tagType, value })
        .select()
        .single();
    if (error && error.code !== "23505") throw error; // ignore duplicate
    return data as InterestTag;
}

export async function removeInterestTag(id: string) {
    const { error } = await (supabase as any)
        .from("job_interest_tags")
        .delete()
        .eq("id", id);
    if (error) throw error;
}
