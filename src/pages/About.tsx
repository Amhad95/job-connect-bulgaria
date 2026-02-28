import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Sparkles, MapPin, BadgeCheck } from "lucide-react";

const pillars = [
    {
        icon: Sparkles,
        titleKey: "about.pillar1Title",
        bodyKey: "about.pillar1Body",
        accent: "text-violet-500",
        bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
        icon: MapPin,
        titleKey: "about.pillar2Title",
        bodyKey: "about.pillar2Body",
        accent: "text-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
        icon: BadgeCheck,
        titleKey: "about.pillar3Title",
        bodyKey: "about.pillar3Body",
        accent: "text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-950/30",
    },
];

export default function About() {
    const { t } = useTranslation();

    return (
        <Layout>
            {/* ── Hero ─────────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-background py-20">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
                />
                <div className="container relative max-w-3xl text-center">
                    <span className="mb-4 inline-block rounded-full border bg-background px-4 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                        бачкам
                    </span>
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                        {t("about.heroTitle")}
                    </h1>
                    <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                        {t("about.heroSubtitle")}
                    </p>
                </div>
            </section>

            {/* ── Mission pillars ──────────────────────────────────────────────── */}
            <section className="container max-w-5xl py-20">
                <h2 className="mb-10 text-center font-display text-2xl font-bold text-foreground">
                    {t("about.missionTitle")}
                </h2>
                <div className="grid gap-6 sm:grid-cols-3">
                    {pillars.map(({ icon: Icon, titleKey, bodyKey, accent, bg }) => (
                        <Card
                            key={titleKey}
                            className="group relative overflow-hidden border transition-shadow duration-300 hover:shadow-md"
                        >
                            <CardHeader className="pb-2">
                                <div
                                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${bg} transition-transform duration-300 group-hover:scale-110`}
                                >
                                    <Icon className={`h-5 w-5 ${accent}`} />
                                </div>
                                <CardTitle className="font-display text-base">{t(titleKey)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ── Bottom CTA strip ─────────────────────────────────────────────── */}
            <section className="border-t bg-muted/40 py-14">
                <div className="container max-w-2xl text-center">
                    <p className="text-muted-foreground">
                        Built in Bulgaria 🇧🇬 · Privacy-first by design · Always free for job seekers
                    </p>
                </div>
            </section>
        </Layout>
    );
}
