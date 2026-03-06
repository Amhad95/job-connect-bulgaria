import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as savedSvc from "@/services/savedJobsService";

const SAVED_KEY = "saved-jobs";
const SAVED_IDS_KEY = "saved-job-ids";
const HISTORY_KEY = "view-history";
const TAGS_KEY = "interest-tags";

// ── Saved Jobs ───────────────────────────────────────────────────────────────

export function useSavedJobs() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [SAVED_KEY, user?.id],
        queryFn: () => savedSvc.getSavedJobs(user!.id),
        enabled: !!user,
    });
}

export function useSavedJobIds() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [SAVED_IDS_KEY, user?.id],
        queryFn: () => savedSvc.getSavedJobIds(user!.id),
        enabled: !!user,
        staleTime: 10_000,
    });
}

export function useToggleSaveJob() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            jobId,
            isSaved,
        }: {
            jobId: string;
            isSaved: boolean;
        }) => savedSvc.toggleSaveJob(user!.id, jobId, isSaved),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [SAVED_KEY] });
            qc.invalidateQueries({ queryKey: [SAVED_IDS_KEY] });
        },
    });
}

// ── View History ─────────────────────────────────────────────────────────────

export function useViewHistory() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [HISTORY_KEY, user?.id],
        queryFn: () => savedSvc.getViewHistory(user!.id),
        enabled: !!user,
    });
}

export function useRecordJobView() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (jobId: string) => savedSvc.recordJobView(user!.id, jobId),
        onSuccess: () => qc.invalidateQueries({ queryKey: [HISTORY_KEY] }),
    });
}

export function useClearHistory() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => savedSvc.clearViewHistory(user!.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [HISTORY_KEY] }),
    });
}

// ── Interest Tags ────────────────────────────────────────────────────────────

export function useInterestTags() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [TAGS_KEY, user?.id],
        queryFn: () => savedSvc.getInterestTags(user!.id),
        enabled: !!user,
    });
}

export function useAddInterestTag() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            tagType,
            value,
        }: {
            tagType: savedSvc.InterestTag["tag_type"];
            value: string;
        }) => savedSvc.addInterestTag(user!.id, tagType, value),
        onSuccess: () => qc.invalidateQueries({ queryKey: [TAGS_KEY] }),
    });
}

export function useRemoveInterestTag() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: savedSvc.removeInterestTag,
        onSuccess: () => qc.invalidateQueries({ queryKey: [TAGS_KEY] }),
    });
}
