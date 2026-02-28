import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Eye, Lock, MapPin, CheckCircle2, ExternalLink } from "lucide-react";

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
            <div className="container py-12 md:py-16 max-w-3xl">

                {/* ── Header ─────────────────────────────────────────────────────── */}
                <div className="mb-10">
                    <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-blue-600">
                        {t("about.hero_badge")}
                    </span>
                    <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("about.hero_title")}
                    </h1>
                    <p className="mt-3 text-sm text-gray-500 leading-relaxed max-w-xl">
                        {t("about.hero_subtitle")}
                    </p>
                </div>

                <div className="space-y-8">

                    {/* ── Origin ─────────────────────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                        <h2 className="font-display text-base font-bold text-gray-900 mb-4">
                            {t("about.origin_title")}
                        </h2>
                        <div className="space-y-3 text-sm text-gray-500 leading-relaxed">
                            <p>{t("about.origin_p1")}</p>
                            <p>{t("about.origin_p2")}</p>
                        </div>
                    </div>

                    {/* ── Definition ─────────────────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                        <h2 className="font-display text-base font-bold text-gray-900 mb-3">
                            {t("about.definition_title")}
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-5">
                            {t("about.definition_text")}
                        </p>
                        <div className="border-t pt-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                {t("about.expect_title")}
                            </p>
                            <ul className="space-y-2">
                                {expectItems.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <CheckCircle2
                                            aria-hidden="true"
                                            className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                                        />
                                        <span className="text-sm text-gray-600">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* ── Principles ─────────────────────────────────────────────────── */}
                    <div>
                        <h2 className="font-display text-base font-bold text-gray-900 mb-4">
                            {t("about.principles_title")}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {principles.map((p, i) => {
                                const Icon = principleIcons[i];
                                return (
                                    <div
                                        key={i}
                                        className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow"
                                    >
                                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                                            <Icon aria-hidden="true" className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <p className="font-semibold text-sm text-gray-800 mb-1">{p.title}</p>
                                        <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Trust & verification ───────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                        <h2 className="font-display text-base font-bold text-gray-900 mb-1">
                            {t("about.trust_title")}
                        </h2>
                        <p className="text-sm text-gray-500 mb-5">{t("about.trust_text")}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {trustPoints.map((tp, i) => (
                                <div
                                    key={i}
                                    className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-1.5"
                                >
                                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${i === 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-blue-600 text-white"
                                        }`}>
                                        {tp.title}
                                    </span>
                                    <p className="text-sm text-gray-500 leading-relaxed">{tp.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Contact CTA ────────────────────────────────────────────────── */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 text-center">
                        <h2 className="font-display text-base font-bold text-gray-900 mb-2">
                            {t("about.contact_title")}
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
                            {t("about.contact_text")}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link to="/contact">
                                <Button className="w-full sm:w-auto h-10 px-6 font-semibold">
                                    {t("about.contact_primary")}
                                </Button>
                            </Link>
                            <Link to="/jobs">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto h-10 px-6 font-semibold text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                    <ExternalLink className="mr-1.5 h-4 w-4" />
                                    {t("about.contact_secondary")}
                                </Button>
                            </Link>
                        </div>
                        <p className="mt-4 text-xs text-gray-400">{t("about.contact_note")}</p>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
