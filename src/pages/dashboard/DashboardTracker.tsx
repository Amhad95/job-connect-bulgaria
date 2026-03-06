import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    GripVertical,
    Plus,
    ExternalLink,
    Pencil,
    Trash2,
    Briefcase,
    Globe,
    StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
    useTrackerItems,
    useCreateExternalItem,
    useUpdateExternalItem,
    useDeleteExternalItem,
    useUpdateTrackerStage,
} from "@/hooks/useTracker";
import type { TrackerItem, TrackerStage } from "@/services/trackerService";

const STAGES: { key: TrackerStage; color: string; headerBg: string }[] = [
    { key: "saved", color: "border-gray-300", headerBg: "bg-gray-100" },
    { key: "applied", color: "border-blue-300", headerBg: "bg-blue-50" },
    { key: "interviewing", color: "border-amber-300", headerBg: "bg-amber-50" },
    { key: "offer", color: "border-emerald-300", headerBg: "bg-emerald-50" },
    { key: "rejected", color: "border-red-300", headerBg: "bg-red-50" },
];

export default function DashboardTracker() {
    const { t } = useTranslation();
    const { data: items = [], isLoading } = useTrackerItems();
    const createItem = useCreateExternalItem();
    const updateItem = useUpdateExternalItem();
    const deleteItem = useDeleteExternalItem();
    const updateStage = useUpdateTrackerStage();

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<TrackerItem | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Group items by stage
    const grouped = useMemo(() => {
        const map = new Map<TrackerStage, TrackerItem[]>();
        STAGES.forEach((s) => map.set(s.key, []));
        items.forEach((item) => {
            const arr = map.get(item.stage) || [];
            arr.push(item);
            map.set(item.stage, arr);
        });
        return map;
    }, [items]);

    const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveId(null);
            const { active, over } = event;
            if (!over) return;

            const itemId = active.id as string;
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            // Don't allow drag for platform items
            if (item.source_type === "platform") return;

            const newStage = over.id as TrackerStage;
            if (item.stage === newStage) return;

            updateStage.mutate(
                { id: itemId, stage: newStage },
                {
                    onError: () =>
                        toast.error(t("tracker.stageUpdateError", "Failed to update stage.")),
                }
            );
        },
        [items, updateStage, t]
    );

    return (
        <div className="py-4 md:py-8 space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("tracker.title", "Application Tracker")}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t("tracker.subtitle", "Track your applications across all platforms.")}
                    </p>
                </div>
                <Button className="gap-1" onClick={() => setAddModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t("tracker.addExternal", "Add external")}
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
                    {STAGES.map((stage) => {
                        const stageItems = grouped.get(stage.key) || [];
                        return (
                            <KanbanColumn
                                key={stage.key}
                                stage={stage.key}
                                headerBg={stage.headerBg}
                                items={stageItems}
                                t={t}
                                onEdit={setEditingItem}
                                onDelete={(id) => {
                                    if (confirm(t("tracker.confirmDelete", "Delete this item?"))) {
                                        deleteItem.mutate(id);
                                    }
                                }}
                            />
                        );
                    })}
                </div>
                <DragOverlay>
                    {activeItem && <TrackerCardContent item={activeItem} t={t} isDragOverlay />}
                </DragOverlay>
            </DndContext>

            {/* Add External Modal */}
            <ExternalItemModal
                open={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                item={null}
                onSave={async (data) => {
                    await createItem.mutateAsync(data);
                    setAddModalOpen(false);
                }}
                t={t}
            />

            {/* Edit External Modal */}
            <ExternalItemModal
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                item={editingItem}
                onSave={async (data) => {
                    if (!editingItem) return;
                    await updateItem.mutateAsync({ id: editingItem.id, updates: data });
                    setEditingItem(null);
                }}
                t={t}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KANBAN COLUMN (droppable)
// ═══════════════════════════════════════════════════════════════════════════════

function KanbanColumn({
    stage,
    headerBg,
    items,
    t,
    onEdit,
    onDelete,
}: {
    stage: TrackerStage;
    headerBg: string;
    items: TrackerItem[];
    t: any;
    onEdit: (item: TrackerItem) => void;
    onDelete: (id: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: stage });

    return (
        <div className="min-w-[280px] w-72 flex-shrink-0 flex flex-col max-h-[75vh]">
            <div className={`rounded-t-xl px-4 py-3 ${headerBg} border border-b-0 border-gray-200 flex-shrink-0`}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        {t(`tracker.stage_${stage}`, stage)}
                    </h3>
                    <Badge variant="secondary" className="bg-white/60 text-gray-700">
                        {items.length}
                    </Badge>
                </div>
            </div>
            <div
                ref={setNodeRef}
                className={`flex-1 rounded-b-xl border border-gray-200 p-2 space-y-2 overflow-y-auto min-h-[150px] transition-colors ${isOver ? "bg-blue-50/50 border-blue-300" : "bg-gray-50/50"
                    }`}
            >
                {items.map((item) => (
                    <DraggableCard
                        key={item.id}
                        item={item}
                        t={t}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
                {items.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400 italic">
                        {t("tracker.dropHere", "Drop applications here")}
                    </p>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE CARD
// ═══════════════════════════════════════════════════════════════════════════════

function DraggableCard({
    item,
    t,
    onEdit,
    onDelete,
}: {
    item: TrackerItem;
    t: any;
    onEdit: (item: TrackerItem) => void;
    onDelete: (id: string) => void;
}) {
    const isPlatform = item.source_type === "platform";

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: item.id,
        disabled: isPlatform, // platform items are NOT draggable
    });

    const style = transform
        ? {
            transform: CSS.Translate.toString(transform),
            opacity: isDragging ? 0.3 : 1,
        }
        : undefined;

    return (
        <div ref={setNodeRef} style={style}>
            <TrackerCardContent
                item={item}
                t={t}
                dragHandleProps={isPlatform ? undefined : { ...attributes, ...listeners }}
                onEdit={isPlatform ? undefined : () => onEdit(item)}
                onDelete={isPlatform ? undefined : () => onDelete(item.id)}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER CARD CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function TrackerCardContent({
    item,
    t,
    dragHandleProps,
    onEdit,
    onDelete,
    isDragOverlay,
}: {
    item: TrackerItem;
    t: any;
    dragHandleProps?: any;
    onEdit?: () => void;
    onDelete?: () => void;
    isDragOverlay?: boolean;
}) {
    const isPlatform = item.source_type === "platform";

    return (
        <div
            className={`rounded-lg border bg-white p-3 shadow-sm transition-shadow ${isDragOverlay ? "shadow-lg ring-2 ring-blue-200" : "hover:shadow-md"
                } ${isPlatform ? "border-l-4 border-l-blue-500" : ""}`}
        >
            <div className="flex items-start gap-2">
                {dragHandleProps && (
                    <div {...dragHandleProps} className="mt-0.5 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4 text-gray-300" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
                            {item.job_title}
                        </p>
                        {isPlatform && (
                            <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200 shrink-0">
                                <Briefcase className="h-2.5 w-2.5 mr-0.5" />
                                {t("tracker.platform", "Platform")}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-primary mt-0.5">{item.company_name}</p>
                    {item.location && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.location}</p>
                    )}
                    {item.applied_date && (
                        <p className="mt-1 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                            {item.applied_date}
                        </p>
                    )}
                    {isPlatform && item.employer_status && (
                        <p className="mt-1 text-[10px] text-blue-500 font-medium">
                            {t("tracker.employerStatus", "Employer status")}: {item.employer_status}
                        </p>
                    )}
                    {item.notes && (
                        <div className="mt-1.5 flex items-start gap-1 text-[11px] text-gray-500">
                            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{item.notes}</span>
                        </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1">
                        {item.job_url && (
                            <a href={item.job_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                            </a>
                        )}
                        {onEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50" onClick={onEdit}>
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50" onClick={onDelete}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD / EDIT EXTERNAL ITEM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ExternalItemModal({
    open,
    onClose,
    item,
    onSave,
    t,
}: {
    open: boolean;
    onClose: () => void;
    item: TrackerItem | null;
    onSave: (data: {
        job_title: string;
        company_name: string;
        job_url?: string;
        location?: string;
        notes?: string;
        stage?: TrackerStage;
        applied_date?: string;
    }) => Promise<void>;
    t: any;
}) {
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [url, setUrl] = useState("");
    const [loc, setLoc] = useState("");
    const [notes, setNotes] = useState("");
    const [stage, setStage] = useState<TrackerStage>("saved");
    const [appliedDate, setAppliedDate] = useState("");

    // Populate on open
    useState(() => {
        // Effect-like via setState initializer won't re-run, so use useEffect approach
    });

    // Reset/populate when modal opens
    const handleOpen = useCallback(() => {
        if (item) {
            setTitle(item.job_title);
            setCompany(item.company_name);
            setUrl(item.job_url || "");
            setLoc(item.location || "");
            setNotes(item.notes || "");
            setStage(item.stage);
            setAppliedDate(item.applied_date || "");
        } else {
            setTitle(""); setCompany(""); setUrl("");
            setLoc(""); setNotes(""); setStage("saved"); setAppliedDate("");
        }
    }, [item]);

    // Call handleOpen when open changes to true
    // Using a ref-based approach to avoid stale closures
    if (open) {
        // This is fine since the dialog content only renders when open is true
    }

    // We'll use a simpler approach: reset fields when the modal transitions to open
    const [wasOpen, setWasOpen] = useState(false);
    if (open && !wasOpen) {
        setWasOpen(true);
        if (item) {
            setTitle(item.job_title);
            setCompany(item.company_name);
            setUrl(item.job_url || "");
            setLoc(item.location || "");
            setNotes(item.notes || "");
            setStage(item.stage);
            setAppliedDate(item.applied_date || "");
        } else {
            setTitle(""); setCompany(""); setUrl("");
            setLoc(""); setNotes(""); setStage("saved"); setAppliedDate("");
        }
    }
    if (!open && wasOpen) setWasOpen(false);

    const handleSubmit = async () => {
        if (!title.trim() || !company.trim()) return;
        setSaving(true);
        try {
            await onSave({
                job_title: title.trim(),
                company_name: company.trim(),
                job_url: url.trim() || undefined,
                location: loc.trim() || undefined,
                notes: notes.trim() || undefined,
                stage,
                applied_date: appliedDate || undefined,
            });
            toast.success(item ? t("tracker.updated", "Updated") : t("tracker.added", "Added"));
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {item
                            ? t("tracker.editExternal", "Edit external application")
                            : t("tracker.addExternal", "Add external application")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>{t("tracker.jobTitle", "Job title")} *</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("tracker.company", "Company")} *</Label>
                            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("tracker.jobUrl", "Job URL")}</Label>
                        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>{t("tracker.location", "Location")}</Label>
                            <Input value={loc} onChange={(e) => setLoc(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("tracker.appliedDate", "Applied date")}</Label>
                            <Input type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("tracker.stage", "Stage")}</Label>
                        <Select value={stage} onValueChange={(v) => setStage(v as TrackerStage)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {STAGES.map((s) => (
                                    <SelectItem key={s.key} value={s.key}>
                                        {t(`tracker.stage_${s.key}`, s.key)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("tracker.notes", "Notes")}</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={saving || !title.trim() || !company.trim()}>
                        {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
