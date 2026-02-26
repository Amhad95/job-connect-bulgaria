import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { useJobs, DbJob } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, SlidersHorizontal, X, ExternalLink, Bookmark, Clock, MapPin, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

export default function Jobs() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data: jobs = [], isLoading } = useJobs();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCompany, setSelectedCompany] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);

  // Derive available companies from data
  const companies = useMemo(() => {
    const set = new Set(jobs.map(j => j.company));
    return Array.from(set).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q)
      );
    }
    if (selectedCompany.length) result = result.filter((j) => selectedCompany.includes(j.company));
    if (sortBy === "newest") result.sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
    else if (sortBy === "salary") result.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
    return result;
  }, [query, selectedCompany, sortBy, jobs]);

  const activeFilters = [...selectedCompany];

  const clearFilters = () => {
    setSelectedCompany([]);
    setQuery("");
  };

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const previewJob = selectedJob || filteredJobs[0] || null;
  const initials = previewJob ? previewJob.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";

  const avatarUrl = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128&bold=true`;

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.employer") || "Employer"}</h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {companies.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedCompany.includes(c)} onCheckedChange={() => toggleFilter(selectedCompany, c, setSelectedCompany)} />
              <span className="text-muted-foreground truncate">{c}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      {/* Search header */}
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex items-center gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("jobs.searchPlaceholder") || "Search jobs..."}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] hidden md:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("jobs.newest")}</SelectItem>
              <SelectItem value="bestMatch">{t("jobs.bestMatch")}</SelectItem>
              <SelectItem value="salary">{t("jobs.salaryHighToLow")}</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{t("jobs.filters")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FiltersContent />
              </div>
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
                <button onClick={() => setSelectedCompany((c) => c.filter((x) => x !== f))}>
                  <X className="h-3 w-3" />
                </button>
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
            {t("jobs.showing", { count: filteredJobs.length }) || `${filteredJobs.length} jobs`}
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
                <JobCard
                  key={job.id}
                  job={job}
                  selected={previewJob?.id === job.id}
                  onClick={() => setSelectedJob(job)}
                />
              ))
            )}
          </div>
        </div>

        {/* Preview panel */}
        {previewJob && (
          <aside className="hidden w-[28rem] shrink-0 lg:flex flex-col overflow-hidden rounded-lg border bg-card">
            <div className="border-b bg-surface p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0 rounded-md">
                  <AvatarImage src={previewJob.companyLogo || avatarUrl(previewJob.company)} alt={previewJob.company} />
                  <AvatarFallback className="rounded-md text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold">{previewJob.title}</h2>
                  <p className="text-sm text-muted-foreground">{previewJob.company}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {previewJob.city && <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{previewJob.city}</Badge>}
                {previewJob.workMode && <Badge variant="secondary">{t(`jobs.${previewJob.workMode}`)}</Badge>}
                {previewJob.employmentType && <Badge variant="secondary">{t(`jobs.${previewJob.employmentType}`)}</Badge>}
              </div>
              {previewJob.salaryMin && previewJob.salaryMax && (
                <p className="mt-2 text-sm font-semibold text-success">
                  {previewJob.salaryMin.toLocaleString()}–{previewJob.salaryMax.toLocaleString()} {previewJob.currency}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{t("jobDetail.viewFull")}</p>
            </div>
            <div className="border-t p-4 space-y-2">
              <a href={previewJob.applyUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t("jobs.applyOn", { employer: previewJob.company })}
                </Button>
              </a>
              <Link to={`/jobs/${previewJob.id}`}>
                <Button variant="outline" className="w-full gap-2 mt-1">
                  <ArrowRight className="h-4 w-4" />
                  {t("jobDetail.viewFull")}
                </Button>
              </Link>
              <p className="text-center text-[11px] text-muted-foreground">{t("jobs.redirectNote")}</p>
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("jobs.lastChecked")}: {formatDistanceToNow(new Date(previewJob.lastSeenAt), { addSuffix: true })}</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </Layout>
  );
}
