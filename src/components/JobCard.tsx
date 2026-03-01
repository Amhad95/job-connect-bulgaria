import { DbJob } from "@/hooks/useJobs";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "@/components/SourceBadge";
import { Bookmark, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: DbJob;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const getInitials = (name: string) =>
  name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

export function JobCard({ job, selected, onClick, compact }: JobCardProps) {
  const { t } = useTranslation();

  const salaryLabel = job.salaryMin && job.salaryMax
    ? `${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()} ${job.currency}`
    : null;

  const badges: string[] = [];
  if (job.city) badges.push(job.city);
  if (job.workMode) badges.push(t(`jobs.${job.workMode}`));
  if (job.employmentType) badges.push(t(`jobs.${job.employmentType}`));

  const dateToCheck = job.postedAt || job.firstSeenAt;
  const isNew = new Date(dateToCheck).getTime() > Date.now() - 48 * 3600 * 1000;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-all overflow-hidden min-w-0 w-full ${selected
        ? "border-primary bg-primary/5 shadow-sm"
        : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
        } ${compact ? "p-3" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0 rounded-md">
          <AvatarImage src={job.companyLogo || avatarUrl(job.company)} alt={job.company} />
          <AvatarFallback className="rounded-md text-[10px] font-semibold">{getInitials(job.company)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm font-semibold text-foreground">
              {job.title}
            </h3>
            {isNew && (
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

      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 ml-11 items-center">
          {/* Source badge — driven purely by sourceType, no hardcoded strings */}
          <SourceBadge sourceType={job.sourceType} />
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
      )}

      {!compact && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground ml-11">
          <div className="flex items-center gap-1">
            <span>{job.company}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {job.postedAt
                ? `${t("jobs.posted") || "Posted"} ${formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}`
                : formatDistanceToNow(new Date(job.firstSeenAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
