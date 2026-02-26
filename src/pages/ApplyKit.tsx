import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, PenLine, Download, CheckCircle2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ApplyKit() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState(false);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="mb-2 font-display text-2xl font-bold md:text-3xl">{t("applyKit.title")}</h1>
        <p className="mb-8 text-muted-foreground">
          {t("applyKit.subtitle") || "Keep your CV versions, cover letters, and role notes in one place."}
        </p>

        <Tabs defaultValue="cv">
          <TabsList>
            <TabsTrigger value="cv">{t("applyKit.cvVersions")}</TabsTrigger>
            <TabsTrigger value="cover">{t("applyKit.coverLetter")}</TabsTrigger>
          </TabsList>

          <TabsContent value="cv" className="mt-6">
            {/* Upload area */}
            <div className="rounded-lg border-2 border-dashed border-border bg-surface p-12 text-center">
              <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">{t("applyKit.uploadCV")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX. Max 5 MB.</p>

              <div className="mt-6 flex items-center justify-center gap-2">
                <Switch id="consent" checked={consent} onCheckedChange={setConsent} />
                <Label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer">
                  {t("applyKit.consent")}
                </Label>
              </div>

              <Button disabled={!consent} className="mt-4 gap-2">
                <Upload className="h-4 w-4" />
                {t("applyKit.uploadCV")}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>{t("applyKit.doNotStore")}</span>
              </div>
            </div>

            {/* Mock CV versions */}
            <div className="mt-8 space-y-3">
              <h3 className="font-display text-lg font-semibold">{t("applyKit.cvVersions")}</h3>
              <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">CV_General_2026.pdf</p>
                    <p className="text-xs text-muted-foreground">Uploaded Feb 20, 2026</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Primary</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cover" className="mt-6">
            <div className="rounded-lg border bg-card p-8 text-center">
              <PenLine className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold">{t("applyKit.coverLetter")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a job and click "Generate cover letter" to create a tailored draft.
              </p>

              <div className="mt-6 flex justify-center gap-2">
                <Badge variant="outline">{t("applyKit.direct")}</Badge>
                <Badge variant="outline">{t("applyKit.warmProfessional")}</Badge>
                <Badge variant="outline">{t("applyKit.minimal")}</Badge>
              </div>

              <div className="mt-6 rounded-lg border bg-surface p-4 text-left max-w-md mx-auto">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("applyKit.factCheck")}</h4>
                <div className="space-y-2">
                  {["Company name is correct", "Role title matches", "Experience dates accurate", "Contact details correct"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
