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

      {/* Distinction Grid */}
      <section className="border-y bg-background py-20 px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Column 1 */}
            <div className="flex flex-col items-center text-center p-10 rounded-3xl bg-card border border-border shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Globe className="h-8 w-8" />
              </div>
              <h3 className="mb-4 font-display text-2xl md:text-3xl font-bold text-foreground">
                {isBg ? "Покритие на целия пазар" : "Market-Wide Discovery"}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg max-w-md">
                {isBg
                  ? "Ние подбираме най-добрите външни обяви от сайтовете на компаниите. Когато видите бадж 'Външна обява', ще ви насочим директно към източника за кандидатстване."
                  : "We curate the best external listings from top company websites. When you see an 'External Listing' badge, we'll direct you straight to the source to apply."}
              </p>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col items-center text-center p-10 rounded-3xl bg-card border border-border shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 rounded-bl-[100px] pointer-events-none" />
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 relative z-10">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-4 font-display text-2xl md:text-3xl font-bold text-foreground relative z-10">
                {isBg ? "Директно кандидатстване с 1 клик" : "1-Click Direct Apply"}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-lg max-w-md relative z-10">
                {isBg
                  ? "Търсете баджа 'Потвърден работодател'. Тези компании използват нашата платформа директно, което ви позволява да кандидатствате мигновено с вашия запазен профил и AI-оптимизирано CV."
                  : "Look for the 'Verified Employer' badge. These companies use our platform directly, allowing you to apply instantly using your saved profile and AI-optimized CV."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Applicant Tools Banner */}
      <section className="bg-muted/40 py-20 px-6">
        <div className="container text-center max-w-3xl mx-auto flex flex-col items-center justify-center">
          <h2 className="mb-6 font-display text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            {isBg ? "Цялото ви търсене на работа, най-накрая организирано." : "Your entire job search, finally organized."}
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl font-medium">
            {isBg
              ? "Създайте своя интерактивен профил веднъж. Проследявайте външни линкове и директни кандидатури на едно място във вашия личен Канбан борд."
              : "Build your interactive profile once. Track external links and direct applications side-by-side in your personal Kanban board."}
          </p>
        </div>
      </section>

      {/* B2B Employer Banner */}
      <section className="bg-blue-600 py-24 px-6 text-center text-white relative overflow-hidden">
        <div className="absolute left-0 top-0 w-64 h-64 bg-white/5 rounded-br-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-400/20 rounded-tl-full blur-3xl pointer-events-none" />

        <div className="container max-w-4xl mx-auto flex flex-col items-center relative z-10">
          <h2 className="mb-8 font-display text-4xl font-extrabold md:text-6xl leading-[1.1] tracking-tight">
            {isBg ? "Уморени сте от неподходящи CV-та? Поемете контрол над подбора си." : "Tired of unqualified CVs? Take control of your hiring."}
          </h2>
          <p className="mb-12 text-xl md:text-2xl text-blue-100/90 max-w-3xl leading-relaxed font-medium">
            {isBg
              ? "Заявете профила на вашата компания, за да станете Потвърден работодател. Публикувайте обяви директно, отключете нашето AI класиране на кандидати и управлявайте процеса в модерна ATS, създадена за българския пазар."
              : "Claim your company profile to become a Verified Employer. Post roles directly, unlock our AI candidate ranking, and manage your pipeline in a modern ATS built for the Bulgarian market."}
          </p>
          <Link to="/employers">
            <Button size="lg" className="h-16 px-10 rounded-2xl bg-white text-blue-600 hover:bg-gray-50 text-xl font-bold shadow-2xl shadow-blue-900/30 transition-all hover:-translate-y-1">
              {isBg ? "Вижте функциите за работодатели" : "View Employer Features"}
            </Button>
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

