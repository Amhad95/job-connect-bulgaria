import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface ManualSetupModalProps {
    open: boolean;
    onClose: () => void;
    docType: "cv" | "cover_letter";
    onSubmit: (targetJobTitle: string, customPrompt: string) => void;
}

export function ManualSetupModal({
    open,
    onClose,
    docType,
    onSubmit,
}: ManualSetupModalProps) {
    const { t } = useTranslation();
    const [targetJobTitle, setTargetJobTitle] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");

    const docLabel =
        docType === "cv" ? "CV" : t("applyKit.coverLetter", "cover letter");

    const handleSubmit = () => {
        if (!targetJobTitle.trim()) return;
        onSubmit(targetJobTitle.trim(), customPrompt.trim());
        setTargetJobTitle("");
        setCustomPrompt("");
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {docType === "cv"
                            ? t("applyKit.createTailoredCV", "Create tailored CV")
                            : t(
                                "applyKit.createTailoredCover",
                                "Create tailored cover letter"
                            )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="target-title" className="text-sm font-medium">
                            {t("applyKit.targetJobTitle", "Target job title")}
                            <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                            id="target-title"
                            placeholder={t(
                                "applyKit.targetTitlePlaceholder",
                                "e.g., Senior Software Engineer"
                            )}
                            value={targetJobTitle}
                            onChange={(e) => setTargetJobTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-prompt" className="text-sm font-medium">
                            {t("applyKit.customPromptLabel", "Custom instructions (optional)")}
                        </Label>
                        <Textarea
                            id="custom-prompt"
                            placeholder={t(
                                "applyKit.customPromptPlaceholder",
                                "e.g., Emphasize my leadership experience, focus on cloud technologies..."
                            )}
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {t("common.cancel", "Cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={!targetJobTitle.trim()}>
                        {t("applyKit.continue", "Continue")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
