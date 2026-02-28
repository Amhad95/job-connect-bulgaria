import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, Upload, Loader2, FileText } from "lucide-react";

interface EasyApplyModalProps {
    open: boolean;
    jobId: string;
    jobTitle: string;
    companyName: string;
    onClose: () => void;
}

type Stage = "form" | "uploading" | "success";

export function EasyApplyModal({ open, jobId, jobTitle, companyName, onClose }: EasyApplyModalProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const [stage, setStage] = useState<Stage>("form");
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: user?.email ?? "",
    });

    const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
        setFile(null);
        setFile(f);
        setError(null);
    };

    const handleSubmit = async () => {
        setError(null);
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError("First name and last name are required."); return;
        }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError("A valid email address is required."); return;
        }
        if (!file) { setError("Please attach your CV/resume."); return; }

        setStage("uploading");

        try {
            // 1. Upload resume to storage
            const folder = user ? user.id : "guest";
            const ext = file.name.split(".").pop();
            const path = `${folder}/${jobId}-${Date.now()}.${ext}`;

            const { error: uploadError } = await (supabase as any).storage
                .from("resumes").upload(path, file, { upsert: false });

            if (uploadError) throw new Error("Resume upload failed: " + uploadError.message);

            const { data: urlData } = (supabase as any).storage.from("resumes").getPublicUrl(path);
            const resumeUrl = urlData?.publicUrl ?? path;

            // 2. Insert application row
            const appRow: any = {
                job_id: jobId,
                user_id: user?.id ?? null,
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                email: form.email.trim().toLowerCase(),
                resume_url: resumeUrl,
                status: "new",
            };

            const { error: appError } = await (supabase as any)
                .from("applications").insert(appRow);

            if (appError) {
                // 23505 = unique violation: already applied
                if (appError.code === "23505") {
                    throw new Error("You've already applied to this job with this email address.");
                }
                throw new Error(appError.message);
            }

            setStage("success");
        } catch (e: any) {
            setError(e.message ?? "Something went wrong. Please try again.");
            setStage("form");
        }
    };

    const handleClose = () => {
        setStage("form");
        setError(null);
        setFile(null);
        setForm({ firstName: "", lastName: "", email: user?.email ?? "" });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && handleClose()}>
            <DialogContent className="max-w-md">
                {stage === "success" ? (
                    <div className="py-8 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900">Application submitted!</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {companyName} will review your application and may reach out via {form.email}.
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleClose} className="mt-2">Close</Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-base">
                                Apply to <span className="font-bold">{jobTitle}</span>
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">at {companyName}</p>
                        </DialogHeader>

                        <div className="grid gap-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ea-first">First name *</Label>
                                    <Input
                                        id="ea-first"
                                        value={form.firstName}
                                        onChange={e => set("firstName", e.target.value)}
                                        placeholder="Ana"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ea-last">Last name *</Label>
                                    <Input
                                        id="ea-last"
                                        value={form.lastName}
                                        onChange={e => set("lastName", e.target.value)}
                                        placeholder="Georgieva"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="ea-email">Email *</Label>
                                <Input
                                    id="ea-email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => set("email", e.target.value)}
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Resume / CV *</Label>
                                <div
                                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 cursor-pointer hover:border-blue-400 transition-colors"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    {file ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                            <span className="truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-gray-400" />
                                            <p className="text-sm text-gray-500">Click to upload PDF or DOCX</p>
                                            <p className="text-xs text-gray-400">Max 10 MB</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                                    {error}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={stage === "uploading"}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={stage === "uploading"} className="gap-2">
                                {stage === "uploading" && <Loader2 className="w-4 h-4 animate-spin" />}
                                {stage === "uploading" ? "Submitting…" : t("jobs.easyApply")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
