import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";
import {
    ArrowRight, Sparkles, LayoutGrid, BadgeCheck,
    Filter, CheckCircle, Users, Target, PenLine,
} from "lucide-react";

export default function Employers() {
    const { i18n } = useTranslation();
    const isBg = i18n.language === "bg";

    return (
        <Layout>
            {/* ── SECTION 1: Hero ── */}
            <section className="relative overflow-hidden py-16 md:py-20" aria-labelledby="employers-hero-heading">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-sky-200/80 via-sky-100/40 to-transparent" />
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_right,rgba(56,189,248,0.30),rgba(56,189,248,0.00)_60%)]" />

                <div className="max-w-6xl mx-auto px-4">
                    {/* Eyebrow chips */}
                    <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                        {["Verified Employers", "AI Match Score", "Built-in ATS"].map((chip) => (
                            <span key={chip} className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-700">
                                {chip}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div>
                            <h1 id="employers-hero-heading" className="font-display text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl lg:text-6xl mb-5 drop-shadow-sm">
                                <span className="block">{isBg ? "Наемайте с ясни сигнали," : "Hire with signal,"}</span>
                                <span className="block">{isBg ? "не с шум от CV-та." : "not resume noise."}</span>
                            </h1>
                            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
                                {isBg
                                    ? "Публикувайте позиции, класирайте кандидатите по съвпадение, филтрирайте бързо и управлявайте процеса в едно пространство. Работодателите се включват чрез избор на пакет. Ако компанията ви вече присъства в Bachkam, можете да я заявите и да поискате верификация."
                                    : "Post roles, rank applicants by match, filter fast, and manage the pipeline in one workspace. Employers can onboard by choosing a package. If your company already appears on Bachkam, you can also claim it and request verification."}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    to="/pricing"
                                    aria-label={isBg ? "Вижте пакетите за работодатели" : "View employer packages"}
                                    className="inline-flex justify-center items-center rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    <span className="block">{isBg ? "Вижте пакетите" : "View employer packages"}</span>
                                </Link>
                                <Link
                                    to="/contact"
                                    aria-label={isBg ? "Запазете демо" : "Book a demo"}
                                    className="inline-flex justify-center items-center rounded-full border border-gray-300 bg-white px-8 py-4 text-gray-900 font-semibold text-lg hover:bg-gray-50 transition-colors"
                                >
                                    <span className="block">{isBg ? "Запазете демо" : "Book a demo"}</span>
                                </Link>
                            </div>
                        </div>

                        {/* Mini ATS preview teaser in hero */}
                        <div className="hidden md:block">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold text-gray-900 text-sm">Pipeline — Backend Engineer</span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700 font-medium">
                                        <CheckCircle className="w-3 h-3" aria-hidden="true" /> Verified Employer
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "New", color: "bg-slate-100", candidates: [{ name: "A.M.", score: 91 }, { name: "D.K.", score: 78 }] },
                                        { label: "Shortlist", color: "bg-blue-50", candidates: [{ name: "S.P.", score: 88 }, { name: "T.N.", score: 82 }] },
                                        { label: "Interview", color: "bg-sky-50", candidates: [{ name: "M.B.", score: 95 }] },
                                    ].map((col) => (
                                        <div key={col.label}>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{col.label}</p>
                                            <div className="space-y-2">
                                                {col.candidates.map((c) => (
                                                    <div key={c.name} className={`${col.color} rounded-lg p-2`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-gray-800">{c.name}</span>
                                                            <span className="text-xs font-bold text-blue-600">{c.score}%</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <span className="rounded-full bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">React</span>
                                                            <span className="rounded-full bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">TS</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTION 2: Outcomes ── */}
            <section className="bg-white py-20" aria-labelledby="outcomes-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 id="outcomes-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
                        <span className="block">{isBg ? "Какво получавате" : "What you get"}</span>
                        <span className="block text-blue-600">{isBg ? "още през първата седмица" : "in the first week"}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Sparkles className="w-8 h-8 text-blue-600" aria-hidden="true" />,
                                en: { title: "Faster shortlists", bullets: ["AI ranks candidates by match score automatically", "Top profiles surface first, not by date applied"] },
                                bg: { title: "По-бърза селекция", bullets: ["AI класира кандидати по съвпадение автоматично", "Топ профилите изплуват напред, не по дата"] },
                            },
                            {
                                icon: <LayoutGrid className="w-8 h-8 text-blue-600" aria-hidden="true" />,
                                en: { title: "Cleaner pipeline", bullets: ["Custom stages: screen, assess, interview, offer", "Add notes and decisions at each stage"] },
                                bg: { title: "По-изчистен процес", bullets: ["Персонализиран ATS: скрийнинг, оценка, интервю", "Бележки и решение на всеки етап"] },
                            },
                            {
                                icon: <BadgeCheck className="w-8 h-8 text-blue-600" aria-hidden="true" />,
                                en: { title: "Higher quality applies", bullets: ["Verified channel signals intent clearly", "Profile-based apply means complete data, not PDFs"] },
                                bg: { title: "По-качествени кандидатури", bullets: ["Verified канал показва ясна мотивация", "Профилно кандидатстване – пълни данни, не PDF"] },
                            },
                        ].map((card) => {
                            const c = isBg ? card.bg : card.en;
                            return (
                                <div key={c.title} className="bg-slate-50 p-8 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="mb-5">{card.icon}</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{c.title}</h3>
                                    <ul className="space-y-2">
                                        {c.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-2 text-gray-600 text-sm">
                                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── SECTION 3 + 4: Product Deep Dive + ATS UI Preview ── */}
            <section className="bg-slate-50 border-y border-slate-200 py-20" aria-labelledby="product-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                        {/* Left: Feature narrative */}
                        <div>
                            <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">
                                {isBg ? "Платформата" : "The platform"}
                            </span>
                            <h2 id="product-heading" className="text-3xl font-bold text-gray-900 mb-6">
                                {isBg ? "Пълноценен ATS, не само публикуване." : "A full ATS. Not just job posting."}
                            </h2>

                            <div className="space-y-8">
                                {/* AI Match & Ranking */}
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                                        <h3 className="font-semibold text-gray-900">{isBg ? "AI съвпадение и класиране" : "AI Match and Ranking"}</h3>
                                    </div>
                                    <ul className="space-y-2 pl-8">
                                        {(isBg
                                            ? ["Оценка за съвпадение за всеки кандидат", "Обяснение защо кандидатът съвпада с изискванията", "Подравняване на ключовите думи с позицията"]
                                            : ["Match score for every applicant", "Explainability: why a candidate fits the requirements", "Keyword alignment mapped to your requirements"]
                                        ).map((b) => (
                                            <li key={b} className="flex items-start gap-2 text-gray-600 text-sm">
                                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Filters & Shortlists */}
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Filter className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                                        <h3 className="font-semibold text-gray-900">{isBg ? "Филтри и кратки списъци" : "Filters and Shortlists"}</h3>
                                    </div>
                                    <ul className="space-y-2 pl-8">
                                        {(isBg
                                            ? ["Твърди филтри по умения, ниво, локация", "Запазени филтри за повтарящи се търсения", "Именувани кратки списъци за всяка позиция"]
                                            : ["Hard filters by skill, seniority, location", "Saved filters for recurring searches", "Named shortlist sets per role"]
                                        ).map((b) => (
                                            <li key={b} className="flex items-start gap-2 text-gray-600 text-sm">
                                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Pipeline Workflow */}
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <LayoutGrid className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                                        <h3 className="font-semibold text-gray-900">{isBg ? "Работен поток на процеса" : "Pipeline Workflow"}</h3>
                                    </div>
                                    <ul className="space-y-2 pl-8">
                                        {(isBg
                                            ? ["Конфигурируеми етапи за всяка позиция", "Бележки за сътрудничество и история на решенията", "Движение на кандидати между етапи с едно действие"]
                                            : ["Configurable stages per role", "Collaboration notes and decision history", "Move candidates through stages with one action"]
                                        ).map((b) => (
                                            <li key={b} className="flex items-start gap-2 text-gray-600 text-sm">
                                                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Right: ATS UI Preview */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" role="img" aria-label="ATS pipeline preview">
                            {/* Top app bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                                <span className="font-semibold text-gray-900">Pipeline</span>
                                <div className="flex flex-wrap gap-2">
                                    {["Role: Backend", "Match: 70%+", "Location: Sofia"].map((f) => (
                                        <span key={f} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                                <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-slate-50 transition-colors">
                                    + Create stage
                                </button>
                            </div>

                            {/* Pipeline columns */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: "New", bg: "bg-slate-50", candidates: [{ name: "Candidate A", score: 86, tags: ["React", "TypeScript"] }, { name: "Candidate B", score: 74, tags: ["Node.js", "SQL"] }] },
                                    { label: "Shortlist", bg: "bg-blue-50", candidates: [{ name: "Candidate C", score: 91, tags: ["Python", "AWS"] }, { name: "Candidate D", score: 88, tags: ["Go", "Docker"] }] },
                                    { label: "Interview", bg: "bg-sky-50", candidates: [{ name: "Candidate E", score: 95, tags: ["TypeScript", "React"] }, { name: "Candidate F", score: 83, tags: ["Node.js", "Redis"] }] },
                                ].map((col) => (
                                    <div key={col.label}>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{col.label}</p>
                                        <div className="space-y-2">
                                            {col.candidates.map((c) => (
                                                <div key={c.name} className={`${col.bg} rounded-xl p-3 border border-white`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-gray-800 truncate">{c.name}</span>
                                                        <span className="text-xs font-bold text-blue-600 flex-shrink-0 ml-1">{c.score}%</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {c.tags.map((tag) => (
                                                            <span key={tag} className="rounded-full bg-white border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Match breakdown panel */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-xs font-semibold text-gray-700 mb-3">Match breakdown — Candidate E</p>
                                <div className="space-y-1.5 mb-4">
                                    {["TypeScript ✓", "React ✓", "REST API ✓"].map((s) => (
                                        <div key={s} className="flex items-center gap-2 text-xs text-green-700">
                                            <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" aria-hidden="true" />
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2 text-xs text-orange-700 mt-1">
                                        <span className="w-3 h-3 flex items-center justify-center flex-shrink-0 text-orange-500 font-bold">!</span>
                                        <span>Missing: PostgreSQL (must-have)</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {["Shortlist", "Reject", "Message"].map((action) => (
                                        <button key={action} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-slate-100 transition-colors">
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── SECTION 5: Onboarding paths ── */}
            <section className="bg-white py-20" aria-labelledby="onboarding-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 id="onboarding-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
                        <span className="block">{isBg ? "Два начина да започнете" : "Two ways to get started"}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Card A – primary */}
                        <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="mb-3">
                                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider">
                                    {isBg ? "Препоръчан" : "Recommended"}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-3">
                                <span className="block">{isBg ? "Изберете пакет" : "Choose a package"}</span>
                                <span className="block">{isBg ? "и се регистрирайте" : "and sign up"}</span>
                            </h3>
                            <p className="text-blue-100 leading-relaxed mb-6 text-sm">
                                {isBg
                                    ? "Започнете да публикувате и управлявате кандидатури веднага. Верификация може да се заяви след настройка."
                                    : "Start posting and managing applicants immediately. Verification can be requested after setup."}
                            </p>
                            <Link
                                to="/pricing"
                                className="inline-flex items-center gap-2 rounded-full bg-white text-blue-600 font-bold px-6 py-3 text-sm hover:bg-gray-50 transition-colors shadow"
                            >
                                {isBg ? "Вижте пакетите" : "View packages"} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </Link>
                        </div>

                        {/* Card B – secondary */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 hover:shadow-md transition-shadow">
                            <div className="mb-3">
                                <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    {isBg ? "Алтернативен път" : "Alternative path"}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                <span className="block">{isBg ? "Вече присъствате?" : "Already listed?"}</span>
                                <span className="block">{isBg ? "Заявете компанията си" : "Claim your company"}</span>
                            </h3>
                            <p className="text-gray-600 leading-relaxed mb-6 text-sm">
                                {isBg
                                    ? "Ако профилът ви вече съществува, заявете го, за да управлявате брандинг, позиции и Verified статус."
                                    : "If your company profile already exists, claim it to manage branding, roles, and request Verified status."}
                            </p>
                            <Link
                                to="/contact"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white text-gray-900 font-semibold px-6 py-3 text-sm hover:bg-slate-100 transition-colors"
                            >
                                {isBg ? "Заявете компания" : "Claim company"} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTION 6: Pricing ── */}
            <section className="bg-slate-50 border-y border-slate-200 py-20" aria-labelledby="pricing-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center">
                        {isBg ? "Ценообразуване" : "Pricing"}
                    </span>
                    <h2 id="pricing-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
                        {isBg ? "Ясни планове за реални екипи по подбор" : "Clear plans for real hiring teams"}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        {/* Starter */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{isBg ? "Базов" : "Starter"}</h3>
                            <p className="text-gray-500 text-sm mb-4">{isBg ? "Идеален за начало." : "Perfect for getting started."}</p>
                            <div className="text-4xl font-extrabold text-gray-900 mb-6">$0<span className="text-lg font-normal text-gray-400">/mo</span></div>
                            <ul className="space-y-3 mb-8">
                                {(isBg
                                    ? ["1 активна позиция", "Базов процес (pipeline)", "Ограничен преглед на AI класирането", "Email поддръжка"]
                                    : ["1 active role", "Basic pipeline", "Limited match scoring preview", "Email support"]
                                ).map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-gray-700 text-sm">
                                        <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                                {isBg ? "Започнете" : "Get started"}
                            </Link>
                        </div>

                        {/* Growth – highlighted */}
                        <div className="bg-blue-600 rounded-2xl shadow-xl p-8 text-white relative md:-translate-y-3">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white text-blue-600 text-xs font-bold uppercase px-3 py-1 shadow">
                                {isBg ? "Най-популярен" : "Most popular"}
                            </span>
                            <h3 className="text-lg font-semibold mb-1">{isBg ? "Растеж" : "Growth"}</h3>
                            <p className="text-blue-200 text-sm mb-4">{isBg ? "За мащабиращи екипи." : "For scaling teams."}</p>
                            <div className="text-4xl font-extrabold mb-6">$99<span className="text-lg font-normal text-blue-300">/mo</span></div>
                            <ul className="space-y-3 mb-8">
                                {(isBg
                                    ? ["До 10 активни позиции", "Пълно AI класиране и оценка за съвпадение", "Филтри и кратки списъци", "Бележки за сътрудничество в екип"]
                                    : ["Up to 10 active roles", "Full AI ranking and match score", "Filters + shortlists", "Team collaboration notes"]
                                ).map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-blue-100 text-sm">
                                        <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/pricing" className="inline-flex w-full justify-center rounded-full bg-white text-blue-600 px-6 py-3 text-sm font-bold hover:bg-gray-50 transition-colors shadow">
                                {isBg ? "Започнете" : "Get started"}
                            </Link>
                        </div>

                        {/* Enterprise */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{isBg ? "Enterprise" : "Enterprise"}</h3>
                            <p className="text-gray-500 text-sm mb-4">{isBg ? "За неограничени екипи." : "For large hiring operations."}</p>
                            <div className="text-4xl font-extrabold text-gray-900 mb-6">{isBg ? "По заявка" : "Custom"}</div>
                            <ul className="space-y-3 mb-8">
                                {(isBg
                                    ? ["Неограничени позиции", "Разширен работен поток и права", "Интеграции с вашите системи", "Дедикирана поддръжка"]
                                    : ["Unlimited roles", "Advanced workflow and permissions", "Integrations", "Dedicated support"]
                                ).map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-gray-700 text-sm">
                                        <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/contact" className="inline-flex w-full justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
                                {isBg ? "Свържете се с нас" : "Contact sales"}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECTION 7: FAQ ── */}
            <section className="bg-white py-20" aria-labelledby="faq-employers-heading">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 id="faq-employers-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
                        {isBg ? "Въпроси от работодатели" : "Questions employers ask"}
                    </h2>
                    <dl className="max-w-3xl mx-auto space-y-3">
                        {employerFaqs(isBg).map((faq, i) => (
                            <EmployerFaqItem key={i} question={faq.q} answer={faq.a} />
                        ))}
                    </dl>
                </div>
            </section>
        </Layout>
    );
}

/* ─── Helper components ─── */

function EmployerFaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
                <span>{question}</span>
                <span className={`ml-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">▾</span>
            </button>
            {open && (
                <div className="px-6 pb-5 pt-4 text-gray-600 leading-relaxed text-sm border-t border-gray-100">
                    {answer}
                </div>
            )}
        </div>
    );
}

function employerFaqs(isBg: boolean) {
    return [
        {
            q: isBg ? "Какво означава Verified Employer тук?" : "What does Verified Employer mean here?",
            a: isBg
                ? "Verified Employer е статус, потвърден от нашия екип след регистрация и основна проверка. Той показва на кандидатите, че кандидатстват по официалния канал на компанията."
                : "Verified Employer is a status confirmed by our team after signup and basic validation. It signals to candidates that they are applying through the company's official channel.",
        },
        {
            q: isBg ? "Как работи оценката за съвпадение?" : "How does match scoring work?",
            a: isBg
                ? "Системата ни анализира профила на кандидата спрямо изискванията на позицията — умения, ниво, ключови думи — и генерира процентна оценка. Виждате и обяснение защо кандидатът съвпада или не."
                : "Our system analyses each applicant's profile against the role requirements — skills, seniority, keywords — and generates a percentage score. You also see an explanation of why the candidate matches or doesn't.",
        },
        {
            q: isBg ? "Можем ли да филтрираме кандидатите и да запазваме кратки списъци?" : "Can we filter applicants and save shortlists?",
            a: isBg
                ? "Да. Поддържаме твърди филтри (задължителни умения, локация, ниво) и запазени филтри за повтарящи се търсения. Можете да именувате кратки списъци за всяка позиция."
                : "Yes. We support hard filters (must-have skills, location, seniority) and saved filters for recurring searches. You can name shortlist sets per role.",
        },
        {
            q: isBg ? "Могат ли кандидатите да кандидатстват с профила си от Bachkam?" : "Can candidates apply with their Bachkam profile?",
            a: isBg
                ? "Да. Кандидатите, регистрирани в платформата, могат да кандидатстват за позиции на Verified Employers с един клик, използвайки запазения си профил. Получавате структурирани данни, а не само PDF."
                : "Yes. Registered candidates can apply to Verified Employer roles in one click using their saved profile. You receive structured data, not just a PDF.",
        },
        {
            q: isBg ? "Как да започнем, ако не сме включени в платформата?" : "How do we start if we are not listed?",
            a: isBg
                ? "Изберете пакет и се регистрирайте директно. Не е необходимо да имате съществуващ профил. Можете да добавите данните на компанията по време на настройката и да заявите верификация след това."
                : "Choose a package and sign up directly. You do not need an existing profile. Add company details during setup and request verification afterwards.",
        },
        {
            q: isBg ? "Платформата двуезична ли е?" : "Is the platform bilingual?",
            a: isBg
                ? "Да. Цялата платформа — обявите, профилите и интерфейсът — са достъпни на английски и български. Работодателите могат да публикуват двуезични обяви."
                : "Yes. The entire platform — listings, profiles, and the interface — is available in both English and Bulgarian. Employers can publish bilingual listings.",
        },
    ];
}
