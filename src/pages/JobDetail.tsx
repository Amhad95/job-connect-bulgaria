import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";

import { useJob } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceBadge } from "@/components/SourceBadge";
import { EasyApplyModal } from "@/components/EasyApplyModal";
import {
  ArrowLeft, ExternalLink, Bookmark, KanbanSquare, FileText, PenLine,
  Clock, MapPin, Building, Briefcase, Zap
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: job, isLoading, error } = useJob(id);
  const [applyOpen, setApplyOpen] = useState(false);
  const isDirect = job?.sourceType === 'DIRECT';

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-40 w-full mt-8" />
      </div>
    );
  }

  if (!job || error) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">{t("common.noResults")}</p>
        <Link to="/jobs">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("jobDetail.backToResults")}
          </Button>
        </Link>
      </div>
    );
  }

  const initials = job.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const salaryLabel = job.salaryMin && job.salaryMax
    ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()} ${job.currency}`
    : null;


  return (
    <>
      <div className="container max-w-4xl py-8">
          <Link to="/jobs" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("jobDetail.backToResults")}
          </Link>

          {/* Header */}
          <div className="mt-4 flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0 rounded-lg">
              <AvatarImage src={job.companyLogo || avatarUrl(job.company)} alt={job.company} />
              <AvatarFallback className="rounded-lg text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{job.title}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{job.company}</p>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {/* Source badge — purely data-driven, no hardcoded strings */}
                <SourceBadge sourceType={job.sourceType} />
                {job.city && <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{job.city}</Badge>}
                {job.workMode && <Badge variant="secondary">{t(`jobs.${job.workMode}`)}</Badge>}
                {job.employmentType && <Badge variant="secondary">{t(`jobs.${job.employmentType}`)}</Badge>}
                {salaryLabel && (
                  <Badge variant="outline" className="border-success/30 text-success font-semibold">
                    {salaryLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {isDirect ? (
              <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setApplyOpen(true)}>
                <Zap className="h-4 w-4" />
                {t("jobs.easyApply")}
              </Button>
            ) : (
              <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t("jobs.applyOn", { employer: job.company })}
                </Button>
              </a>
            )}
            <Button variant="outline" size="lg" className="gap-2">
              <Bookmark className="h-4 w-4" />
              {t("common.save")}
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <KanbanSquare className="h-4 w-4" />
              {t("jobDetail.addToTracker")}
            </Button>
            <Link to={`/dashboard/apply-kit?tab=cover&jobId=${id}`}>
              <Button variant="outline" size="lg" className="gap-2">
                <PenLine className="h-4 w-4" />
                {t("jobDetail.generateCoverLetter")}
              </Button>
            </Link>
            <Link to={`/dashboard/apply-kit?tab=cv&jobId=${id}`}>
              <Button variant="outline" size="lg" className="gap-2">
                <FileText className="h-4 w-4" />
                {t("jobDetail.tailorCV")}
              </Button>
            </Link>
          </div>

          {/* Content */}
          <div className="mt-8 space-y-8">
            {job.description && (
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.description")}</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{job.description}</p>
              </section>
            )}
            {job.requirements && (
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.requirements")}</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{job.requirements}</p>
              </section>
            )}
            {job.benefits && (
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold">{t("jobDetail.benefits")}</h2>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{job.benefits}</p>
              </section>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">{t("jobs.redirectNote")}</p>

          <div className="mt-4 rounded-lg border bg-surface p-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>{t("jobs.employer")}: {job.company}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{t("jobs.lastChecked")}: {formatDistanceToNow(new Date(job.lastSeenAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

      {/* Easy Apply modal — only rendered for DIRECT jobs */}
      {
        isDirect && job && (
          <EasyApplyModal
            open={applyOpen}
            jobId={job.id}
            jobTitle={job.title}
            companyName={job.company}
            onClose={() => setApplyOpen(false)}
          />
        )
      }
    </>
  );
}

