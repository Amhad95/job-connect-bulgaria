import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Upload, ExternalLink, Shield, Trash2, Filter, FileText, KanbanSquare, ArrowRight, Briefcase, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { mockJobs } from "@/data/mockJobs";

const popularSearches = [
  "Software Engineer", "Marketing", "Data Analyst", "Project Manager",
  "Designer", "Sales", "Счетоводител", "Програмист", "Remote",
];

export default function Index() {
  const { t } = useTranslation();
  const trendingJobs = mockJobs.filter((j) => j.isNew).slice(0, 6);
  const recentJobs = mockJobs.slice(0, 4);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-highlight/5">
        <div className="container flex flex-col items-center gap-8 py-20 text-center md:py-28">
          <div className="inline-flex items-center gap-2 rounded-pill border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground animate-fade-in">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span>{mockJobs.length}+ {t("common.searchJobs").toLowerCase()}</span>
          </div>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in">
            {t("hero.headline")}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground animate-fade-in">
            {t("hero.subheadline")}
          </p>

          {/* Search bar */}
          <div className="flex w-full max-w-xl items-center gap-2 animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("hero.primaryCta")}
                className="flex h-12 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Link to="/jobs">
              <Button size="lg" className="h-12 rounded-lg px-6 font-display font-semibold shadow-sm">
                {t("hero.primaryCta")}
              </Button>
            </Link>
          </div>

          <Link to="/apply-kit">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              {t("hero.secondaryCta")}
            </Button>
          </Link>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2">
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

      {/* How it works */}
      <section className="border-y bg-background">
        <div className="container py-16 md:py-20">
          <h2 className="mb-12 text-center font-display text-2xl font-bold md:text-3xl">
            {t("howItWorks.title")}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <Step number="1" title={t("howItWorks.step1.title")} description={t("howItWorks.step1.description")} />
            <Step number="2" title={t("howItWorks.step2.title")} description={t("howItWorks.step2.description")} />
            <Step number="3" title={t("howItWorks.step3.title")} description={t("howItWorks.step3.description")} />
          </div>
        </div>
      </section>

      {/* Feature sections */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-16 md:py-20">
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<Filter className="h-6 w-6" />}
              title={t("features.findRoles.title")}
              body={t("features.findRoles.body")}
            />
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title={t("features.applyKit.title")}
              body={t("features.applyKit.body")}
            />
            <FeatureCard
              icon={<KanbanSquare className="h-6 w-6" />}
              title={t("features.trackEverything.title")}
              body={t("features.trackEverything.body")}
            />
          </div>
        </div>
      </section>

      {/* Privacy trust section */}
      <section className="border-t bg-card">
        <div className="container py-16 md:py-20">
          <h2 className="mb-8 text-center font-display text-2xl font-bold md:text-3xl">
            {t("trust.headline")}
          </h2>
          <div className="mx-auto max-w-xl space-y-4">
            <TrustBullet text={t("trust.bullet1")} />
            <TrustBullet text={t("trust.bullet2")} />
            <TrustBullet text={t("trust.bullet3")} />
          </div>
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

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-sm">
        {number}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/20">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
      <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
