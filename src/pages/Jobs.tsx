import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";

import { JobCard } from "@/components/JobCard";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { useJobs, useJob, DbJob } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, SlidersHorizontal, X, ExternalLink, Clock, MapPin, ArrowRight, PenLine, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

function useIsLg() {
  const [isLg, setIsLg] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isLg;
}

export default function Jobs() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data: jobs = [], isLoading } = useJobs();
  const isLg = useIsLg();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([]);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([]);
  const [showWithSalary, setShowWithSalary] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);

  // Fetch full details for preview
  const previewId = selectedJob?.id || (jobs.length > 0 ? jobs[0].id : undefined);
  const { data: jobDetail } = useJob(previewId);

  // Derive filter options from data
  const cities = useMemo(() => {
    const set = new Set(jobs.map(j => j.city).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [jobs]);

  const workModes = useMemo(() => {
    const set = new Set(jobs.map(j => j.workMode).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [jobs]);

  const employmentTypes = useMemo(() => {
    const set = new Set(jobs.map(j => j.employmentType).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
      );
    }
    if (selectedCities.length) result = result.filter((j) => j.city && selectedCities.includes(j.city));
    if (selectedWorkModes.length) result = result.filter((j) => j.workMode && selectedWorkModes.includes(j.workMode));
    if (selectedEmploymentTypes.length) result = result.filter((j) => j.employmentType && selectedEmploymentTypes.includes(j.employmentType));
    if (showWithSalary) result = result.filter((j) => j.salaryMin || j.salaryMax);

    if (sortBy === "newest") {
      result.sort((a, b) => {
        const dateA = new Date(a.postedAt || a.firstSeenAt).getTime();
        const dateB = new Date(b.postedAt || b.firstSeenAt).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === "salary") {
      result.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
    }
    return result;
  }, [query, selectedCities, selectedWorkModes, selectedEmploymentTypes, showWithSalary, sortBy, jobs]);

  const activeFilters = [...selectedCities, ...selectedWorkModes, ...selectedEmploymentTypes, ...(showWithSalary ? ["Has salary"] : [])];

  const clearFilters = () => {
    setSelectedCities([]);
    setSelectedWorkModes([]);
    setSelectedEmploymentTypes([]);
    setShowWithSalary(false);
    setQuery("");
  };

  const removeFilter = (f: string) => {
    if (f === "Has salary") { setShowWithSalary(false); return; }
    setSelectedCities(c => c.filter(x => x !== f));
    setSelectedWorkModes(c => c.filter(x => x !== f));
    setSelectedEmploymentTypes(c => c.filter(x => x !== f));
  };

  const toggle = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const previewJob = selectedJob || filteredJobs[0] || null;
  const initials = previewJob ? previewJob.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";

  const avatarUrl = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Location */}
      {cities.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.city")}</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {cities.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedCities.includes(c)} onCheckedChange={() => toggle(selectedCities, c, setSelectedCities)} />
                <span className="text-muted-foreground truncate">{c}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Work Mode */}
      {workModes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.workMode")}</h4>
          <div className="space-y-1.5">
            {workModes.map((w) => (
              <label key={w} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedWorkModes.includes(w)} onCheckedChange={() => toggle(selectedWorkModes, w, setSelectedWorkModes)} />
                <span className="text-muted-foreground">{t(`jobs.${w}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Employment Type */}
      {employmentTypes.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.employmentType")}</h4>
          <div className="space-y-1.5">
            {employmentTypes.map((e) => (
              <label key={e} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedEmploymentTypes.includes(e)} onCheckedChange={() => toggle(selectedEmploymentTypes, e, setSelectedEmploymentTypes)} />
                <span className="text-muted-foreground">{t(`jobs.${e}`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {/* Salary */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.salaryRange")}</h4>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={showWithSalary} onCheckedChange={() => setShowWithSalary(!showWithSalary)} />
          <span className="text-muted-foreground">Has salary info</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Search header */}
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex items-center gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("jobs.searchPlaceholder")} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] hidden md:flex"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("jobs.newest")}</SelectItem>
              <SelectItem value="bestMatch">{t("jobs.bestMatch")}</SelectItem>
              <SelectItem value="salary">{t("jobs.salaryHighToLow")}</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden"><SlidersHorizontal className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader><SheetTitle>{t("jobs.filters")}</SheetTitle></SheetHeader>
              <div className="mt-4"><FiltersContent /></div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={clearFilters}>{t("common.clearAll")}</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {activeFilters.length > 0 && (
          <div className="container flex items-center gap-2 pb-3 overflow-x-auto">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="shrink-0 gap-1 pr-1">
                {f}
                <button onClick={() => removeFilter(f)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            <button onClick={clearFilters} className="text-xs text-primary hover:underline shrink-0">{t("common.clearAll")}</button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="container flex gap-6 pb-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Desktop Filters */}
        <aside className="hidden w-56 shrink-0 md:block overflow-y-auto">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-display text-sm font-semibold">{t("jobs.filters")}</h3>
            <FiltersContent />
          </div>
        </aside>

        {/* Job list */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1">
          <p className="mb-2 text-sm text-muted-foreground">
            {t("jobs.showing", { count: filteredJobs.length })}
          </p>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <JobCardSkeleton key={i} />)
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-lg border bg-card p-12 text-center">
                <p className="text-muted-foreground">{t("jobs.emptyState")}</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>{t("common.clearAll")}</Button>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} selected={previewJob?.id === job.id} onClick={() => setSelectedJob(job)} />
              ))
            )}
          </div>
        </div>

        {/* Desktop preview panel */}
        {previewJob && (
          <aside className="hidden w-[28rem] shrink-0 lg:flex flex-col overflow-hidden rounded-lg border bg-card">
            <JobPreviewContent job={previewJob} jobDetail={jobDetail} t={t} avatarUrl={avatarUrl} />
          </aside>
        )}
      </div>

      {/* Mobile/Tablet bottom drawer */}
      <Drawer open={!isLg && !!selectedJob} onOpenChange={(open) => { if (!open) setSelectedJob(null); }}>
        <DrawerContent className="max-h-[85vh]">
          {previewJob && (
            <div className="overflow-y-auto max-h-[80vh]">
              <JobPreviewContent job={previewJob} jobDetail={jobDetail} t={t} avatarUrl={avatarUrl} />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

/* Shared preview content used in both desktop sidebar and mobile drawer */
function JobPreviewContent({ job, jobDetail, t, avatarUrl }: {
  job: DbJob;
  jobDetail: any;
  t: (key: string, opts?: any) => string;
  avatarUrl: (name: string) => string;
}) {
  const initials = job.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <>
      <div className="border-b bg-surface p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 rounded-md">
            <AvatarImage src={job.companyLogo || avatarUrl(job.company)} alt={job.company} />
            <AvatarFallback className="rounded-md text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold">{job.title}</h2>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.city && <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{job.city}</Badge>}
          {job.workMode && <Badge variant="secondary">{t(`jobs.${job.workMode}`)}</Badge>}
          {job.employmentType && <Badge variant="secondary">{t(`jobs.${job.employmentType}`)}</Badge>}
        </div>
        {job.salaryMin && job.salaryMax && (
          <p className="mt-2 text-sm font-semibold text-success">
            {job.salaryMin.toLocaleString()}–{job.salaryMax.toLocaleString()} {job.currency}
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {jobDetail?.description ? (
          <>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{t("jobDetail.description")}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{jobDetail.description}</p>
            </div>
            {jobDetail.requirements && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{t("jobDetail.requirements")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{jobDetail.requirements}</p>
              </div>
            )}
            {jobDetail.benefits && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{t("jobDetail.benefits")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{jobDetail.benefits}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("jobDetail.viewFull")}</p>
        )}
      </div>
      <div className="border-t p-4 space-y-2">
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
          <Button className="w-full gap-2"><ExternalLink className="h-4 w-4" />{t("jobs.applyOn", { employer: job.company })}</Button>
        </a>
        <Link to={`/jobs/${job.id}`}>
          <Button variant="outline" className="w-full gap-2 mt-1"><ArrowRight className="h-4 w-4" />{t("jobDetail.viewFull")}</Button>
        </Link>
        <div className="flex gap-2 mt-1">
          <Link to={`/apply-kit?tab=cover&jobId=${job.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs"><PenLine className="h-3.5 w-3.5" />{t("jobDetail.generateCoverLetter")}</Button>
          </Link>
          <Link to={`/apply-kit?tab=cv&jobId=${job.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs"><FileText className="h-3.5 w-3.5" />{t("jobDetail.tailorCV")}</Button>
          </Link>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">{t("jobs.redirectNote")}</p>
        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {job.postedAt
              ? `${t("jobs.posted") || "Posted"} ${formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}`
              : `${t("jobs.lastChecked")}: ${formatDistanceToNow(new Date(job.lastSeenAt), { addSuffix: true })}`}
          </span>
        </div>
      </div>
    </>
  );
}
