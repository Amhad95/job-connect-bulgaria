import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSEO } from "@/hooks/useSEO";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function OptOut() {
    const { t } = useTranslation();
    const { toast } = useToast();

    useSEO({
        title: "Премахване на обява — бачкам",
        description: "Заявка за премахване на обява за работа от бачкам. Изпратете заявка и ние ще я обработим.",
        canonical: "/opt-out",
    });
    const [url, setUrl] = useState("");
    const [reason, setReason] = useState("");
    const [email, setEmail] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitRemoval = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        setSubmitting(true);
        // Submit to our tracking table
        const { error } = await supabase.from("removal_requests").insert({
            url,
            reason: reason || null,
            requester_email: email || null,
            company_name: companyName || null,
        });

        setSubmitting(false);
        if (error) {
            toast({ title: t("common.error", "Error"), description: error.message, variant: "destructive" });
        } else {
            toast({ title: t("common.success", "Submitted"), description: t("sources.submitSuccess", "Your removal request has been submitted. We will process it within 24 hours.") });
            setUrl(""); setReason(""); setEmail(""); setCompanyName("");
        }
    };

    return (
        <div className="container py-12 md:py-24 max-w-2xl flex justify-center">
                <div className="w-full bg-white border border-gray-200 shadow-sm rounded-xl p-8">
                    <h1 className="mb-4 font-display text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("sources.requestRemoval", "Opt-Out / Remove Listing")}
                    </h1>
                    <p className="mb-8 text-sm text-gray-500 leading-relaxed">
                        {t("sources.removalBody", "If you are the employer and wish to remove a specific job listing or completely opt-out your domain from our Job Hub, please provide the details below. Our moderation team processes requests within 24 hours.")}
                    </p>

                    <form onSubmit={handleSubmitRemoval} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">{t("sources.postingUrl", "Job URL or Company Domain")}</Label>
                            <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} required className="h-10" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">{t("sources.companyName", "Company Name")}</Label>
                                <Input placeholder="Acme Corp" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-10" required />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">{t("sources.email", "Official Work Email")}</Label>
                                <Input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">{t("sources.reason", "Reason or Details")}</Label>
                            <Textarea
                                placeholder="Briefly state your relationship to the company and request details..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="min-h-[120px] resize-y"
                            />
                        </div>

                        <Button type="submit" disabled={submitting} className="w-full h-11 text-base font-semibold mt-4">
                            {submitting ? t("common.loading", "Processing...") : t("sources.submit", "Submit Removal Request")}
                        </Button>
                    </form>
                </div>
            </div>
    );
}
