import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Search, Upload, ExternalLink, ArrowRight, TrendingUp,
  Globe, CheckCircle, Shield, Trash2, Zap,
  User, LayoutGrid, Bell, Building2, BadgeCheck, LinkIcon,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import heroIllustration from "@/assets/hero-illustration.svg";
import { useState } from "react";

const popularSearches = [
  "Software Engineer", "Marketing", "Data Analyst", "Project Manager",
  "Designer", "Sales", "Счетоводител", "Програмист", "Remote",
];

export default function Index() {
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === "bg";
  const { data: jobs = [] } = useJobs();
  const trendingJobs = jobs.slice(0, 6);
  const recentJobs = jobs.slice(0, 4);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-highlight/5">
        <div className="container grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in drop-shadow-sm">
              {isBg ? "Спрете да прескачате между кариерните страници." : "Stop jumping between career pages."}
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-fade-in leading-relaxed font-medium">
              {isBg
                ? "Ние следим пазара вместо вас. Открийте хиляди обяви, събрани от целия уеб, и кандидатствайте мигновено при нашите Потвърдени работодатели – всичко от един централизиран хъб."
                : "We track the market so you don't have to. Discover thousands of roles curated from across the web, and apply instantly to our Verified Employers—all from one centralized hub."}
            </p>

            {/* Search bar */}
            <div className="flex w-full max-w-xl items-center gap-2 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("jobs.searchPlaceholder")}
                  className="flex h-12 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Link to="/jobs">
                <Button size="lg" className="h-12 rounded-xl px-6 font-display font-semibold shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5">
                  {t("hero.primaryCta")}
                </Button>
              </Link>
            </div>

            <Link to="/apply-kit" className="self-center md:self-start">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                {t("hero.secondaryCta")}
              </Button>
            </Link>

            {/* Popular searches */}
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {popularSearches.map((s) => (
                <Link
                  key={s}
                  to={`/jobs?q=${encodeURIComponent(s)}`}
                  className="rounded-pill border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center animate-fade-in">
            <img src={heroIllustration} alt="Career growth illustration" className="w-full max-w-md drop-shadow-lg" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-card">
        <div className="container flex flex-col items-center gap-6 py-5 md:flex-row md:justify-center md:gap-12">
          <TrustItem icon={<ExternalLink className="h-4 w-4 text-primary" />} text={t("trust.directLinks")} />
          <TrustItem icon={<Shield className="h-4 w-4 text-success" />} text={t("trust.sourceShown")} />
          <TrustItem icon={<Trash2 className="h-4 w-4 text-destructive" />} text={t("trust.deleteAnytime")} />
        </div>
      </section>

      {/* Trending Jobs */}
      <section className="bg-surface">
        <div className="container py-16 md:py-20">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.trendingJobs")}</h2>
            </div>
            <Link to="/jobs" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
              {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trendingJobs.map((job) => (
              <Link key={job.id} to={`/jobs?id=${job.id}`}>
                <JobCard job={job} />
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center md:hidden">
            <Link to="/jobs">
              <Button variant="outline" className="gap-2">
                {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: How It Works ── */}
      <section className="bg-slate-50 py-20" aria-labelledby="how-it-works-heading">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center">
            {isBg ? "Как работи" : "How it works"}
          </span>
          <h2 id="how-it-works-heading" className="text-3xl font-bold text-center mb-4 text-gray-900">
            {isBg ? "Два начина да откриете следващата си роля" : "Two ways to find your next role"}
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            {isBg
              ? "Изберете подхода според обявата. Ясно показваме дали кандидатствате в оригиналния източник или директно през платформата."
              : "Choose the path that matches the job post. We make it obvious whether you're applying on the source website or directly through us."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card A — External Listing */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Globe className="w-10 h-10 text-blue-600 mb-6" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Покритие на целия пазар" : "Market-Wide Discovery"}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                {isBg
                  ? "Подбираме външни обяви от публични кариерни страници и ATS системи. Когато видите баджа, ви водим към официалната обява за кандидатстване."
                  : "We curate external listings from public company career pages and ATS sources. When you see the badge, we send you to the official job page to apply."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                  External Listing
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  {isBg ? "Към сайта на работодателя" : "Apply on employer site"}
                </span>
              </div>
            </div>

            {/* Card B — Verified Employer */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Zap className="w-10 h-10 text-blue-600 mb-6" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Директно кандидатстване с 1 клик" : "1-Click Direct Apply"}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                {isBg
                  ? "Търсете баджа 'Verified Employer'. Тези компании публикуват директно и можете да кандидатствате веднага със запазения си профил."
                  : "Look for the 'Verified Employer' badge. These companies post roles directly, so you can apply instantly using your saved profile."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700">
                  <CheckCircle className="w-3 h-3" aria-hidden="true" />
                  Verified Employer
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                  {isBg ? "Кандидатствайте тук" : "Apply here"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Candidate Tools ── */}
      <section className="bg-white py-20" aria-labelledby="candidate-tools-heading">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center md:text-left">
            {isBg ? "За кандидати" : "For Candidates"}
          </span>
          <h2 id="candidate-tools-heading" className="text-3xl font-bold mb-4 text-gray-900 text-center md:text-left">
            {isBg ? "Търсенето ви на работа, най-накрая организирано." : "Your job search, finally organized."}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mb-12 text-center md:text-left">
            {isBg
              ? "Запазете профила си веднъж и следете външни кандидатури и директни кандидатствания едно до друго. Без разхвърляни бележки и изгубени линкове."
              : "Save your profile once, then track external applications and direct applies side-by-side. No more messy notes, lost links, or duplicated effort."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Saved Profile */}
            <FeatureTile
              icon={<User className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Запазен профил" : "Saved Profile"}
              desc={isBg ? "Попълнете информацията си веднъж и я използвайте навсякъде." : "Fill in your details once and reuse them across every application."}
              bullets={isBg
                ? ["Качете CV и мотивационно писмо", "Добавете умения и езици", "Редактирайте по всяко време"]
                : ["Upload CV and cover letter", "Add skills and languages", "Edit anytime"]}
            />
            {/* Card 2 — Application Tracking */}
            <FeatureTile
              icon={<LayoutGrid className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Проследяване на кандидатури" : "Application Tracking"}
              desc={isBg ? "Канбан борд за всички ваши кандидатури – вътрешни и външни." : "Kanban board for all your applications — internal and external."}
              bullets={isBg
                ? ["Колони: Запазено, В процес, Финален етап", "Маркирайте отговори и откази", "Проследявайте история на всяка обява"]
                : ["Columns: Saved, Applied, Final stage", "Mark responses and rejections", "Track history of each role"]}
            />
            {/* Card 3 — Alerts */}
            <FeatureTile
              icon={<Bell className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Сигнали и списъци" : "Alerts and Shortlists"}
              desc={isBg ? "Уведомления при нови обяви по ваши критерии." : "Get notified when new roles match your saved filters."}
              bullets={isBg
                ? ["Задайте ключови думи и локация", "Получавайте имейл или push сигнали", "Запазете филтрирани търсения"]
                : ["Set keywords and location", "Receive email or push alerts", "Save filtered searches"]}
            />
            {/* Card 4 — Company Pages */}
            <FeatureTile
              icon={<Building2 className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Профили на компании" : "Company Pages"}
              desc={isBg ? "Разгледайте официалните профили на Verified Employers." : "Browse official profiles of Verified Employers on the platform."}
              bullets={isBg
                ? ["Всички отворени позиции на едно място", "Информация за компанията и кандидатстването", "Следете компании за нови обяви"]
                : ["All open roles in one place", "Company info and apply flow", "Follow companies for new posts"]}
            />
            {/* Card 5 — Role Signals */}
            <FeatureTile
              icon={<BadgeCheck className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Сигнали за обявите" : "Role Signals"}
              desc={isBg ? "Всяка обява е ясно маркирана: Verified Employer или External Listing." : "Every listing is clearly marked: Verified Employer or External Listing."}
              bullets={isBg
                ? ["Знайте преди да кликате", "Без скрити пренасочвания", "Прозрачен ATS процес при директни обяви"]
                : ["Know before you click", "No hidden redirects", "Transparent ATS flow for direct roles"]}
            />
            {/* Card 6 — Apply Flow */}
            <FeatureTile
              icon={<LinkIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Прецизен процес на кандидатстване" : "Clean Apply Flow"}
              desc={isBg ? "External обяви ви водят към оригинала. Директните обяви – директно в платформата." : "External listings route you to the source. Direct roles keep you in-platform."}
              bullets={isBg
                ? ["Никога не губите контекста", "1-клик за директни обяви", "Следете кои сте посетили"]
                : ["Never lose context", "1-click for direct roles", "Track which you've visited"]}
            />
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              aria-label={isBg ? "Създайте профил" : "Create your profile"}
              className="inline-flex justify-center items-center rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              {isBg ? "Създайте профил" : "Create your profile"}
            </Link>
            <Link
              to="/jobs"
              aria-label={isBg ? "Разгледайте обяви" : "Browse jobs"}
              className="inline-flex justify-center items-center rounded-full border border-gray-300 bg-white px-8 py-4 text-gray-900 font-semibold text-lg hover:bg-gray-50 transition-colors"
            >
              {isBg ? "Разгледайте обяви" : "Browse jobs"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Employer Workflow ── */}
      <section className="bg-slate-50 py-20" aria-labelledby="employer-heading">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left column */}
            <div>
              <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">
                {isBg ? "За работодатели" : "For Employers"}
              </span>
              <h2 id="employer-heading" className="text-3xl font-bold mb-4 text-gray-900">
                {isBg
                  ? "Станете Verified Employer и наемайте с повече яснота."
                  : "Become a Verified Employer and hire with signal."}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                {isBg
                  ? "Заявете профила на компанията, публикувайте директно и управлявайте кандидатури на едно място. Кандидатите виждат ясен бадж и знаят, че кандидатстват по официалния канал."
                  : "Claim your company profile, post roles directly, and manage applicants in one place. Candidates see a clear badge so they know they're applying to the official employer channel."}
              </p>

              <ul className="space-y-4" aria-label={isBg ? "Какво получавате" : "What you get"}>
                {[
                  { icon: <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Verified badge on all your listings", bg: "Бадж 'Verified' на всички ваши обяви" },
                  { icon: <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "AI-assisted candidate ranking and scoring", bg: "AI подпомагане за класиране на кандидати" },
                  { icon: <LayoutGrid className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Pipeline management in one dashboard", bg: "Управление на канала в едно табло" },
                  { icon: <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Priority placement in search results", bg: "Приоритетно позициониране в търсенето" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {item.icon}
                    <span className="text-gray-700">{isBg ? item.bg : item.en}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/employers"
                aria-label={isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
                className="mt-10 inline-flex justify-center items-center rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                {isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
              </Link>
            </div>

            {/* Right column — stepper */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-semibold mb-6 text-gray-900">
                {isBg ? "Как работи за работодатели" : "How it works for employers"}
              </h3>
              <ol className="space-y-6" aria-label={isBg ? "Стъпки за работодатели" : "Employer steps"}>
                {[
                  {
                    n: "1",
                    en: ["Claim profile", "Search for your company and verify ownership."],
                    bg: ["Заявете профил", "Намерете компанията си и потвърдете собствеността."],
                  },
                  {
                    n: "2",
                    en: ["Verification", "Our team reviews and activates your Verified Employer status."],
                    bg: ["Верификация", "Екипът ни преглежда и активира статуса ви Verified Employer."],
                  },
                  {
                    n: "3",
                    en: ["Post roles", "Create bilingual listings with your ATS settings."],
                    bg: ["Публикувайте позиции", "Създайте двуезични обяви с ATS настройки."],
                  },
                  {
                    n: "4",
                    en: ["Review pipeline", "Manage all applicants, stages, and scores in one place."],
                    bg: ["Прегледайте канала", "Управлявайте всички кандидати, етапи и оценки на едно място."],
                  },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold" aria-hidden="true">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{isBg ? step.bg[0] : step.en[0]}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{isBg ? step.bg[1] : step.en[1]}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Blue Billboard CTA ── */}
      <section className="py-16 px-4" aria-labelledby="billboard-heading">
        <div className="bg-blue-600 rounded-3xl max-w-6xl mx-auto px-6 py-16 md:py-20 text-center text-white shadow-xl">
          <h2 id="billboard-heading" className="text-3xl md:text-5xl font-extrabold mb-6">
            {isBg
              ? "Уморени сте от неподходящи CV-та? Поемете контрол над подбора си."
              : "Tired of unqualified CVs? Take control of your hiring."}
          </h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {isBg
              ? "Заявете профила на вашата компания и станете Verified Employer. Публикувайте директно, отключете AI подпомагане за класиране и управлявайте процеса като в модерен ATS."
              : "Claim your company profile to become a Verified Employer. Post roles directly, unlock AI-assisted candidate ranking, and manage your pipeline in a modern ATS-style workflow."}
          </p>
          <Link
            to="/employers"
            aria-label={isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
            className="inline-block bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-full hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
          >
            {isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
          </Link>
        </div>
      </section>

      {/* ── SECTION 5: FAQ ── */}
      <section className="bg-white py-20" aria-labelledby="faq-heading">
        <div className="max-w-6xl mx-auto px-4">
          <h2 id="faq-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
            {isBg ? "Въпроси преди кандидатстване" : "Questions people ask before applying"}
          </h2>
          <dl className="max-w-3xl mx-auto space-y-3">
            {faqs(isBg).map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </dl>
        </div>
      </section>
    </Layout>
  );
}

/* ─── Helper components ─── */

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function FeatureTile({
  icon, title, desc, bullets,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-200">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-gray-700" aria-label={title}>
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span>{question}</span>
        <span className={`ml-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-600 leading-relaxed text-sm border-t border-gray-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}



function faqs(isBg: boolean) {
  return [
    {
      q: isBg ? "Какво означава Verified Employer?" : "What does Verified Employer mean?",
      a: isBg
        ? "Verified Employer са компании, регистрирани директно в платформата ни. Те публикуват обяви сами и управляват кандидатурите чрез нашия ATS. 'Verified' означава, че е официалният канал на компанията."
        : "Verified Employers are companies registered directly on our platform. They post roles themselves and manage applicants through our ATS. The 'Verified' badge confirms it's the company's official hiring channel.",
    },
    {
      q: isBg ? "Какво е External Listing?" : "What is an External Listing?",
      a: isBg
        ? "External Listing са обяви, подбрани от публичните кариерни страници на компании. Когато кликнете, ви насочваме директно към оригиналната обява на сайта на работодателя."
        : "External Listings are job posts curated from company career pages across the web. When you click one, we send you directly to the original posting on the employer's site.",
    },
    {
      q: isBg ? "Съхранявате ли CV-то и данните ми?" : "Do you store my CV and data?",
      a: isBg
        ? "Вашите документи остават конфиденциални. Можете да ги изтриете по всяко време от профила си. Данните ви не се споделят с работодатели без вашето изрично съгласие."
        : "Your documents remain private to your account. You can delete them at any time from your profile settings. Your data is never shared with employers without explicit consent.",
    },
    {
      q: isBg ? "Мога ли да следя кандидатури от други сайтове?" : "Can I track applications from other sites?",
      a: isBg
        ? "Да. Можете ръчно да добавяте кандидатури от всеки сайт в Kanban борда ви. Маркирайте ги по статус и следете отговорите на едно място."
        : "Yes. You can manually add applications from any website to your tracking board. Mark them by status and follow up—all in one place.",
    },
    {
      q: isBg ? "Как се верифицират работодателите?" : "How do employers get verified?",
      a: isBg
        ? "Работодателите заявяват профила на компанията си, след което нашият екип потвърждава собствеността чрез бизнес email домейн или официална документация преди активиране."
        : "Employers claim their company profile, then our team confirms ownership via business email domain or official documentation before activating the Verified badge.",
    },
    {
      q: isBg ? "Платформата двуезична ли е?" : "Is the platform bilingual?",
      a: isBg
        ? "Да. Цялата платформа – включително обявите, профилите и интерфейса – е на английски и български. Можете да превключите езика по всяко време от навигацията."
        : "Yes. The entire platform—including listings, profiles, and the interface—is available in both English and Bulgarian. Switch languages at any time from the navigation.",
    },
  ];
}

