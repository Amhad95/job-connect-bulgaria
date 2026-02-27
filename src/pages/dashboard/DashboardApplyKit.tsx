import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, PenLine, Download, CheckCircle2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function DashboardApplyKit() {
    const { t } = useTranslation();
    const [consent, setConsent] = useState(false);

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("applyKit.title", "Apply Kit Workspace")}
                </h1>
                <p className="text-gray-500 mt-1">
                    {t("applyKit.subtitle", "Keep your CV versions, cover letters, and role notes heavily organized.")}
                </p>
            </div>

            <Tabs defaultValue="cv" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
                    <TabsTrigger value="cv">{t("applyKit.cvVersions", "CV Versions")}</TabsTrigger>
                    <TabsTrigger value="cover">{t("applyKit.coverLetter", "Cover Letters")}</TabsTrigger>
                </TabsList>

                <TabsContent value="cv" className="mt-0 space-y-8">
                    {/* Upload area */}
                    <div className="rounded-xl border border-gray-200 border-dashed bg-white p-12 text-center shadow-sm">
                        <Upload className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-800">{t("applyKit.uploadCV", "Upload CV")}</h3>
                        <p className="mt-1 text-sm text-gray-500">PDF or DOCX. Maximum size 5 MB.</p>

                        <div className="mt-8 flex items-center justify-center gap-3">
                            <Switch id="consent" checked={consent} onCheckedChange={setConsent} />
                            <Label htmlFor="consent" className="text-sm font-medium text-gray-600 cursor-pointer">
                                {t("applyKit.consent", "I consent to automatic resume parsing for ATS synchronization")}
                            </Label>
                        </div>

                        <Button disabled={!consent} size="lg" className="mt-6 gap-2 px-8">
                            <Upload className="h-4 w-4" />
                            Upload CV
                        </Button>

                        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-gray-400">
                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                            <span>{t("applyKit.doNotStore", "End-to-End Secure Processing")}</span>
                        </div>
                    </div>

                    {/* Mock CV versions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">{t("applyKit.cvVersions", "Your CV Repository")}</h3>
                        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">CV_General_2026.pdf</p>
                                    <p className="text-xs text-gray-500 font-medium">Uploaded Feb 20, 2026</p>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Primary</Badge>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-blue-600">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="cover" className="mt-0">
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                        <PenLine className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-800">{t("applyKit.coverLetter", "Cover Letter Generator")}</h3>
                        <p className="max-w-md mx-auto mt-2 text-sm text-gray-500 leading-relaxed">
                            Find a job on the board and click <span className="font-semibold text-gray-700">"Generate Application"</span> to instantly draft an AI-assisted cover letter customized to your synced ATS profile.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                            <Badge variant="outline" className="px-3 py-1 text-sm bg-gray-50">{t("applyKit.direct", "Direct & Concise")}</Badge>
                            <Badge variant="outline" className="px-3 py-1 text-sm bg-gray-50">{t("applyKit.warmProfessional", "Warm Professional")}</Badge>
                            <Badge variant="outline" className="px-3 py-1 text-sm bg-gray-50">{t("applyKit.minimal", "Minimal Data")}</Badge>
                        </div>

                        <div className="mt-10 rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-left max-w-md mx-auto">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-4">{t("applyKit.factCheck", "Pre-Flight Checks")}</h4>
                            <div className="space-y-3">
                                {["Company name is dynamically mapped", "Role mapping validated", "Experience matrix aligned", "Contact profile loaded"].map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
