import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Eye, Lock, MapPin, CheckCircle, ArrowRight } from "lucide-react";

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

            {/* ── HERO ───────────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden py-16 md:py-20" aria-labelledby="about-hero-heading">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-sky-200/80 via-sky-100/40 to-transparent" />
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_right,rgba(56,189,248,0.30),rgba(56,189,248,0.00)_60%)]" />

                <div className="max-w-6xl mx-auto px-4">
                    <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">
                        {t("about.hero_badge")}
                    </span>
                    <h1 id="about-hero-heading" className="font-display text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl mb-5 drop-shadow-sm max-w-2xl">
                        {t("about.hero_title")}
                    </h1>
                    <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                        {t("about.hero_subtitle")}
                    </p>
                </div>
            </section>

            {/* ── ORIGIN ─────────────────────────────────────────────────────── */}
            <section className="bg-white py-20" aria-labelledby="about-origin-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                        <div>
                            <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">
                                {t("about.origin_title")}
                            </span>
                            <p className="text-gray-600 leading-relaxed mb-4">{t("about.origin_p1")}</p>
                            <p className="text-gray-600 leading-relaxed">{t("about.origin_p2")}</p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-gray-200 p-8">
                            <h2 id="about-origin-heading" className="text-xl font-semibold text-gray-900 mb-4">
                                {t("about.definition_title")}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-6">{t("about.definition_text")}</p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                                {t("about.expect_title")}
                            </p>
                            <ul className="space-y-3">
                                {expectItems.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-600 text-sm">
                                        <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── PRINCIPLES ─────────────────────────────────────────────────── */}
            <section className="bg-sky-50 border-y border-sky-100 py-20" aria-labelledby="about-principles-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center">
                        {t("about.principles_title")}
                    </span>
                    <h2 id="about-principles-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
                        {t("about.principles_title")}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {principles.map((p, i) => {
                            const Icon = principleIcons[i];
                            return (
                                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <Icon className="w-10 h-10 text-blue-600 mb-6" aria-hidden="true" />
                                    <h3 className="text-xl font-semibold mb-3 text-gray-900">{p.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{p.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── TRUST ──────────────────────────────────────────────────────── */}
            <section className="bg-slate-50 border-y border-slate-200 py-20" aria-labelledby="about-trust-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 id="about-trust-heading" className="text-3xl font-bold text-center mb-4 text-gray-900">
                        {t("about.trust_title")}
                    </h2>
                    <p className="text-center text-gray-500 mb-12">{t("about.trust_text")}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {trustPoints.map((tp, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
                                <div className="mb-4">
                                    {i === 0 ? (
                                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                                            {tp.title}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700">
                                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                                            {tp.title}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 leading-relaxed">{tp.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CONTACT CTA ────────────────────────────────────────────────── */}
            <section className="py-16 px-4" aria-labelledby="about-contact-heading">
                <div className="bg-blue-600 rounded-3xl max-w-6xl mx-auto px-6 py-16 md:py-20 text-center text-white shadow-xl">
                    <h2 id="about-contact-heading" className="text-3xl md:text-4xl font-extrabold mb-6">
                        {t("about.contact_title")}
                    </h2>
                    <p className="text-blue-100 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                        {t("about.contact_text")}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/contact"
                            className="inline-flex justify-center items-center rounded-full bg-white text-blue-600 font-bold text-lg px-8 py-4 hover:bg-gray-50 transition-colors shadow-lg"
                        >
                            {t("about.contact_primary")}
                        </Link>
                        <Link
                            to="/jobs"
                            className="inline-flex justify-center items-center gap-2 rounded-full border border-white/40 bg-white/10 text-white font-semibold text-lg px-8 py-4 hover:bg-white/20 transition-colors"
                        >
                            {t("about.contact_secondary")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-blue-200">{t("about.contact_note")}</p>
                </div>
            </section>

        </Layout>
    );
}
