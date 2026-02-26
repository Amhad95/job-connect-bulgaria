import { Job } from "@/data/mockJobs";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Bookmark, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function JobCard({ job, selected, onClick, compact }: JobCardProps) {
  const { t } = useTranslation();

  const salaryLabel = job.salaryMin && job.salaryMax
    ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()} ${job.currency}`
    : null;

  const badges = [
    job.city,
    t(`jobs.${job.workMode}`),
    t(`jobs.${job.employmentType}`),
  ].filter(Boolean).slice(0, 3);

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      } ${compact ? "p-3" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {job.title}
            </h3>
            {job.isNew && (
              <Badge variant="default" className="shrink-0 bg-success text-success-foreground text-[10px] px-1.5 py-0">
                {t("jobs.new")}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary">
          <Bookmark className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {badges.map((b) => (
          <Badge key={b} variant="secondary" className="text-[11px] font-medium">
            {b}
          </Badge>
        ))}
        {salaryLabel && (
          <Badge variant="outline" className="border-success/30 text-success text-[11px] font-semibold">
            {salaryLabel}
          </Badge>
        )}
      </div>

      {!compact && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            <span>{job.source}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(job.lastChecked), { addSuffix: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
