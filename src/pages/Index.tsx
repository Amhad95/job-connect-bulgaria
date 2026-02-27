import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Upload, ExternalLink, ArrowRight, TrendingUp, Globe, CheckCircle, Shield, Trash2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import heroIllustration from "@/assets/hero-illustration.svg";

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

      {/* How It Works — Two-column card grid */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            {isBg ? "Два начина да откриете следващата си роля" : "Two ways to find your next role"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Card 1 — Aggregator */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Globe className="w-10 h-10 text-blue-600 mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Покритие на целия пазар" : "Market-Wide Discovery"}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {isBg
                  ? "Ние подбираме най-добрите външни обяви от сайтовете на компаниите. Когато видите бадж 'Външна обява', ще ви насочим директно към източника за кандидатстване."
                  : "We curate the best external listings from top company websites. When you see an 'External Listing' badge, we'll direct you straight to the source to apply."}
              </p>
            </div>

            {/* Card 2 — ATS */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <CheckCircle className="w-10 h-10 text-blue-600 mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Директно кандидатстване с 1 клик" : "1-Click Direct Apply"}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {isBg
                  ? "Търсете баджа 'Потвърден работодател'. Тези компании използват нашата платформа директно, което ви позволява да кандидатствате мигновено с вашия запазен профил и AI-оптимизирано CV."
                  : "Look for the 'Verified Employer' badge. These companies use our platform directly, allowing you to apply instantly using your saved profile and AI-optimized CV."}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Applicant Tools — clean white feature highlight */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-4 block">
            {isBg ? "За кандидати" : "For Candidates"}
          </span>
          <h2 className="text-3xl font-bold mb-6 text-gray-900">
            {isBg ? "Цялото ви търсене на работа, най-накрая организирано." : "Your entire job search, finally organized."}
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            {isBg
              ? "Създайте своя интерактивен профил веднъж. Проследявайте външни линкове и директни кандидатури на едно място във вашия личен Канбан борд."
              : "Build your interactive profile once. Track external links and direct applications side-by-side in your personal Kanban board."}
          </p>
        </div>
      </section>

      {/* B2B Employer — billboard card banner */}
      <section className="py-16 px-4">
        <div className="bg-blue-600 rounded-3xl max-w-6xl mx-auto px-6 py-16 md:py-20 text-center text-white shadow-xl">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 leading-tight">
            {isBg ? "Уморени сте от неподходящи CV-та? Поемете контрол над подбора си." : "Tired of unqualified CVs? Take control of your hiring."}
          </h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {isBg
              ? "Заявете профила на вашата компания, за да станете Потвърден работодател. Публикувайте обяви директно, отключете нашето AI класиране на кандидати и управлявайте процеса в модерна ATS."
              : "Claim your company profile to become a Verified Employer. Post roles directly, unlock our AI candidate ranking, and manage your pipeline in a modern ATS."}
          </p>
          <Link
            to="/employers"
            className="inline-block bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-full hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
          >
            {isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
          </Link>
        </div>
      </section>
    </Layout>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

