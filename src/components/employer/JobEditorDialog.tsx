import { useState } from "react";
import { useEmployer } from "@/contexts/EmployerContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface JobFormData {
    title: string;
    city: string;
    work_mode: string;
    employment_type: string;
    category: string;
    salary_min: string;
    salary_max: string;
    currency: string;
    description_text: string;
    requirements_text: string;
    benefits_text: string;
}

const EMPTY_FORM: JobFormData = {
    title: "", city: "", work_mode: "hybrid", employment_type: "full-time",
    category: "", salary_min: "", salary_max: "", currency: "BGN",
    description_text: "", requirements_text: "", benefits_text: "",
};

interface JobEditorDialogProps {
    open: boolean;
    initial?: { id: string } & Partial<JobFormData>;
    onClose: () => void;
    onSaved: () => void;
}

export function JobEditorDialog({ open, initial, onClose, onSaved }: JobEditorDialogProps) {
    const { employerId } = useEmployer();
    const isEdit = !!initial?.id;
    const [form, setForm] = useState<JobFormData>({ ...EMPTY_FORM, ...initial });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof JobFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (publish: boolean) => {
        if (!form.title.trim()) { setError("Title is required."); return; }
        setSaving(true); setError(null);

        try {
            let jobId = initial?.id;

            const jobRow: any = {
                title: form.title.trim(),
                location_city: form.city || null,
                work_mode: form.work_mode || null,
                employment_type: form.employment_type || null,
                category: form.category || null,
                salary_min: form.salary_min ? parseInt(form.salary_min) : null,
                salary_max: form.salary_max ? parseInt(form.salary_max) : null,
                currency: form.currency || "BGN",
                source_type: "DIRECT",
                employer_id: employerId,
                status: publish ? "ACTIVE" : "DRAFT",
                posted_at: publish ? new Date().toISOString() : null,
            };

            if (isEdit && jobId) {
                const { error: ue } = await (supabase as any)
                    .from("job_postings").update(jobRow).eq("id", jobId);
                if (ue) throw ue;
            } else {
                // Check cap before creating
                const { data: capCheck } = await (supabase as any)
                    .rpc("check_job_publish_allowed", { p_employer_id: employerId });
                if (!capCheck?.allowed) {
                    setError(
                        capCheck?.reason === "pending_approval"
                            ? "Your workspace is pending approval. You can save drafts but cannot publish yet."
                            : `Job cap reached (${capCheck?.current}/${capCheck?.cap} on ${capCheck?.plan} plan).`
                    );
                    setSaving(false); return;
                }

                const { data: inserted, error: ie } = await (supabase as any)
                    .from("job_postings").insert(jobRow).select("id").single();
                if (ie) throw ie;
                jobId = inserted.id;
            }

            // Upsert content
            const { error: ce } = await (supabase as any).from("job_posting_content")
                .upsert({
                    job_id: jobId,
                    description_text: form.description_text || null,
                    requirements_text: form.requirements_text || null,
                    benefits_text: form.benefits_text || null,
                }, { onConflict: "job_id" });
            if (ce) throw ce;

            onSaved();
        } catch (e: any) {
            setError(e.message ?? "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Job" : "Create Job"}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Job Title *</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Senior Frontend Engineer"
                            value={form.title}
                            onChange={e => set("title", e.target.value)}
                        />
                    </div>

                    {/* Location + work mode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" placeholder="Sofia" value={form.city} onChange={e => set("city", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Work Mode</Label>
                            <Select value={form.work_mode} onValueChange={v => set("work_mode", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="onsite">On-site</SelectItem>
                                    <SelectItem value="hybrid">Hybrid</SelectItem>
                                    <SelectItem value="remote">Remote</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Employment type + category */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Employment Type</Label>
                            <Select value={form.employment_type} onValueChange={v => set("employment_type", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full-time">Full-time</SelectItem>
                                    <SelectItem value="part-time">Part-time</SelectItem>
                                    <SelectItem value="contract">Contract</SelectItem>
                                    <SelectItem value="internship">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" placeholder="Engineering" value={form.category} onChange={e => set("category", e.target.value)} />
                        </div>
                    </div>

                    {/* Salary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="sal_min">Min Salary</Label>
                            <Input id="sal_min" type="number" placeholder="2000" value={form.salary_min} onChange={e => set("salary_min", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sal_max">Max Salary</Label>
                            <Input id="sal_max" type="number" placeholder="4000" value={form.salary_max} onChange={e => set("salary_max", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Currency</Label>
                            <Select value={form.currency} onValueChange={v => set("currency", v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BGN">BGN</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                            id="desc" rows={5}
                            placeholder="Describe the role, responsibilities, and what success looks like."
                            value={form.description_text}
                            onChange={e => set("description_text", e.target.value)}
                        />
                    </div>

                    {/* Requirements */}
                    <div className="space-y-1.5">
                        <Label htmlFor="req">Requirements</Label>
                        <Textarea
                            id="req" rows={4}
                            placeholder="Skills, experience, education..."
                            value={form.requirements_text}
                            onChange={e => set("requirements_text", e.target.value)}
                        />
                    </div>

                    {/* Benefits */}
                    <div className="space-y-1.5">
                        <Label htmlFor="ben">Benefits</Label>
                        <Textarea
                            id="ben" rows={3}
                            placeholder="What you offer: equity, remote, health insurance..."
                            value={form.benefits_text}
                            onChange={e => set("benefits_text", e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">{error}</p>
                    )}
                </div>

                <DialogFooter className="gap-2 flex-wrap">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={saving}>
                        {saving ? "Saving…" : "Save as Draft"}
                    </Button>
                    <Button onClick={() => handleSubmit(true)} disabled={saving}>
                        {saving ? "Publishing…" : "Publish"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
