import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, Lock, MapPin, CheckCircle2 } from "lucide-react";

const principleIcons = [Eye, Lock, MapPin];

export default function About() {
    const { t } = useTranslation();

    const expectItems = t("about.expect_items", { returnObjects: true }) as string[];
    const principles = t("about.principles_items", { returnObjects: true }) as {
        title: string;
        desc: string;
    }[];
    const trustPoints = t("about.trust_points", { returnObjects: true }) as {
        title: string;
        desc: string;
    }[];

    return (
        <Layout>
            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-to-r from-sky-50/60 via-background to-background py-20 border-b">
                <div className="container max-w-3xl text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Badge variant="secondary" className="mb-5 text-xs font-medium tracking-wide">
                        {t("about.hero_badge")}
                    </Badge>
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                        {t("about.hero_title")}
                    </h1>
                    <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                        {t("about.hero_subtitle")}
                    </p>
                </div>
            </section>

            <div className="container max-w-3xl py-16 space-y-16">

                {/* ── Origin ───────────────────────────────────────────────────────── */}
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="font-display text-xl font-bold text-foreground mb-5">
                        {t("about.origin_title")}
                    </h2>
                    <div className="rounded-xl bg-muted/30 border p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
                        <p>{t("about.origin_p1")}</p>
                        <p>{t("about.origin_p2")}</p>
                    </div>
                </section>

                <Separator />

                {/* ── Definition + Expect ──────────────────────────────────────────── */}
                <section>
                    <h2 className="font-display text-xl font-bold text-foreground mb-3">
                        {t("about.definition_title")}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        {t("about.definition_text")}
                    </p>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                {t("about.expect_title")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                            {expectItems.map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <CheckCircle2
                                        aria-hidden="true"
                                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                                    />
                                    <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>

                <Separator />

                {/* ── Principles ───────────────────────────────────────────────────── */}
                <section>
                    <h2 className="font-display text-xl font-bold text-foreground mb-6">
                        {t("about.principles_title")}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {principles.map((p, i) => {
                            const Icon = principleIcons[i];
                            return (
                                <Card
                                    key={i}
                                    className="h-full border transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                                >
                                    <CardHeader className="pb-2">
                                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                                        </div>
                                        <CardTitle className="font-display text-sm">{p.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                <Separator />

                {/* ── Trust & verification ─────────────────────────────────────────── */}
                <section>
                    <h2 className="font-display text-xl font-bold text-foreground mb-2">
                        {t("about.trust_title")}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">{t("about.trust_text")}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {trustPoints.map((tp, i) => (
                            <Card key={i} className="border">
                                <CardContent className="pt-5 space-y-2">
                                    <Badge variant={i === 0 ? "secondary" : "default"} className="text-xs">
                                        {tp.title}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{tp.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <Separator />

                {/* ── Contact CTA ──────────────────────────────────────────────────── */}
                <section>
                    <Card className="border text-center">
                        <CardContent className="py-10 px-8 space-y-5">
                            <h2 className="font-display text-xl font-bold text-foreground">
                                {t("about.contact_title")}
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                                {t("about.contact_text")}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link to="/contact">
                                    <Button className="w-full sm:w-auto">{t("about.contact_primary")}</Button>
                                </Link>
                                <Link to="/jobs">
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        {t("about.contact_secondary")}
                                    </Button>
                                </Link>
                            </div>
                            <p className="text-xs text-muted-foreground">{t("about.contact_note")}</p>
                        </CardContent>
                    </Card>
                </section>

            </div>
        </Layout>
    );
}
