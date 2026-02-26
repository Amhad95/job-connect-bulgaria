import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { mockJobs } from "@/data/mockJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft, ExternalLink, Bookmark, KanbanSquare, FileText,
  Clock, MapPin, Building, Briefcase,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const job = mockJobs.find((j) => j.id === id);

  if (!job) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">{t("common.noResults")}</p>
          <Link to="/jobs">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("jobDetail.backToResults")}
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const initials = job.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const salaryLabel = job.salaryMin && job.salaryMax
    ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()} ${job.currency}`
    : null;

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        {/* Back link */}
        <Link to="/jobs" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("jobDetail.backToResults")}
        </Link>

        {/* Header */}
        <div className="mt-4 flex items-start gap-4">
          <Avatar className="h-14 w-14 shrink-0 rounded-lg">
            <AvatarImage src={job.companyLogo} alt={job.company} />
            <AvatarFallback className="rounded-lg text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{job.title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">{job.company}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{job.city}</Badge>
              <Badge variant="secondary">{t(`jobs.${job.workMode}`)}</Badge>
              <Badge variant="secondary">{t(`jobs.${job.employmentType}`)}</Badge>
              <Badge variant="secondary"><Briefcase className="mr-1 h-3 w-3" />{job.seniority}</Badge>
              {salaryLabel && (
                <Badge variant="outline" className="border-success/30 text-success font-semibold">
                  {salaryLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("jobs.applyOn", { employer: job.company })}
            </Button>
          </a>
          <Button variant="outline" size="lg" className="gap-2">
            <Bookmark className="h-4 w-4" />
            {t("common.save")}
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <KanbanSquare className="h-4 w-4" />
            {t("jobDetail.addToTracker")}
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("jobDetail.generateCoverLetter")}
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <FileText className="h-4 w-4" />
            {t("jobDetail.tailorCV")}
          </Button>
        </div>

        {/* Content sections */}
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.description")}</h2>
            <p className="text-foreground leading-relaxed">{job.description}</p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.requirements")}</h2>
            <ul className="list-disc list-inside space-y-1.5">
              {job.requirements.map((r, i) => (
                <li key={i} className="text-foreground">{r}</li>
              ))}
            </ul>
          </section>

          {job.benefits.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.benefits")}</h2>
              <ul className="list-disc list-inside space-y-1.5">
                {job.benefits.map((b, i) => (
                  <li key={i} className="text-foreground">{b}</li>
                ))}
              </ul>
            </section>
          )}

          {job.companyInfo && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.aboutCompany")}</h2>
              <p className="text-foreground leading-relaxed">{job.companyInfo}</p>
            </section>
          )}
        </div>

        {/* Source attribution */}
        {/* Redirect note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">{t("jobs.redirectNote")}</p>

        {/* Employer attribution */}
        <div className="mt-4 rounded-lg border bg-surface p-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>{t("jobs.employer")}: {job.company}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{t("jobs.lastChecked")}: {formatDistanceToNow(new Date(job.lastChecked), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
