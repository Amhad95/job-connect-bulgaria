import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as trackerSvc from "@/services/trackerService";

const TRACKER_KEY = "tracker-items";

export function useTrackerItems() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [TRACKER_KEY, user?.id],
        queryFn: () => trackerSvc.getAllTrackerItems(user!.id),
        enabled: !!user,
        refetchInterval: 30_000, // Poll for platform status updates
    });
}

export function useCreateExternalItem() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (item: Parameters<typeof trackerSvc.createExternalTrackerItem>[1]) =>
            trackerSvc.createExternalTrackerItem(user!.id, item),
        onSuccess: () => qc.invalidateQueries({ queryKey: [TRACKER_KEY] }),
    });
}

export function useUpdateExternalItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            updates,
        }: {
            id: string;
            updates: Parameters<typeof trackerSvc.updateExternalTrackerItem>[1];
        }) => trackerSvc.updateExternalTrackerItem(id, updates),
        onSuccess: () => qc.invalidateQueries({ queryKey: [TRACKER_KEY] }),
    });
}

export function useDeleteExternalItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: trackerSvc.deleteExternalTrackerItem,
        onSuccess: () => qc.invalidateQueries({ queryKey: [TRACKER_KEY] }),
    });
}

export function useUpdateTrackerStage() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, stage }: { id: string; stage: trackerSvc.TrackerStage }) =>
            trackerSvc.updateTrackerStage(id, stage),
        // Optimistic update for smooth drag-and-drop
        onMutate: async ({ id, stage }) => {
            await qc.cancelQueries({ queryKey: [TRACKER_KEY] });
            const prev = qc.getQueryData<trackerSvc.TrackerItem[]>([TRACKER_KEY]);
            qc.setQueryData<trackerSvc.TrackerItem[] | undefined>(
                [TRACKER_KEY],
                (old) =>
                    old?.map((item) =>
                        item.id === id ? { ...item, stage } : item
                    )
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            // Revert on error
            if (ctx?.prev) {
                qc.setQueryData([TRACKER_KEY], ctx.prev);
            }
        },
        onSettled: () => qc.invalidateQueries({ queryKey: [TRACKER_KEY] }),
    });
}
