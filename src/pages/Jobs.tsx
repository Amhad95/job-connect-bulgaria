import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { JobCardSkeleton } from "@/components/JobCardSkeleton";
import { mockJobs, Job } from "@/data/mockJobs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, SlidersHorizontal, X, ExternalLink, Bookmark, Clock, MapPin, Building, ArrowRight, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const cities = ["София", "Пловдив", "Варна", "Бургас", "Русе"];
const workModes = ["remote", "hybrid", "onsite"] as const;
const categories = ["IT", "Marketing", "Design", "Sales", "HR", "Финанси", "Management", "Обслужване", "Образование", "Логистика"];

export default function Jobs() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedCity, setSelectedCity] = useState<string[]>([]);
  const [selectedWorkMode, setSelectedWorkMode] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filteredJobs = useMemo(() => {
    let jobs = [...mockJobs];

    if (query) {
      const q = query.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.category.toLowerCase().includes(q)
      );
    }
    if (selectedCity.length) jobs = jobs.filter((j) => selectedCity.includes(j.city));
    if (selectedWorkMode.length) jobs = jobs.filter((j) => selectedWorkMode.includes(j.workMode));
    if (selectedCategory.length) jobs = jobs.filter((j) => selectedCategory.includes(j.category));

    if (sortBy === "newest") jobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    else if (sortBy === "salary") jobs.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));

    return jobs;
  }, [query, selectedCity, selectedWorkMode, selectedCategory, sortBy]);

  const activeFilters = [...selectedCity, ...selectedWorkMode.map(w => t(`jobs.${w}`)), ...selectedCategory];

  const clearFilters = () => {
    setSelectedCity([]);
    setSelectedWorkMode([]);
    setSelectedCategory([]);
    setQuery("");
  };

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const previewJob = selectedJob || filteredJobs[0] || null;

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* City */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.city")}</h4>
        <div className="space-y-1.5">
          {cities.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedCity.includes(c)} onCheckedChange={() => toggleFilter(selectedCity, c, setSelectedCity)} />
              <span className="text-muted-foreground">{c}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Work mode */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.workMode")}</h4>
        <div className="space-y-1.5">
          {workModes.map((w) => (
            <label key={w} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedWorkMode.includes(w)} onCheckedChange={() => toggleFilter(selectedWorkMode, w, setSelectedWorkMode)} />
              <span className="text-muted-foreground">{t(`jobs.${w}`)}</span>
            </label>
          ))}
        </div>
      </div>
      {/* Category */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t("jobs.category")}</h4>
        <div className="space-y-1.5">
          {categories.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedCategory.includes(c)} onCheckedChange={() => toggleFilter(selectedCategory, c, setSelectedCategory)} />
              <span className="text-muted-foreground">{c}</span>
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
              placeholder={t("jobs.searchPlaceholder") || t("hero.primaryCta")}
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
          {/* Mobile filter button */}
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
        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="container flex items-center gap-2 pb-3 overflow-x-auto">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="shrink-0 gap-1 pr-1">
                {f}
                <button onClick={() => {
                  setSelectedCity((c) => c.filter((x) => x !== f));
                  setSelectedWorkMode((c) => c.filter((x) => t(`jobs.${x}`) !== f));
                  setSelectedCategory((c) => c.filter((x) => x !== f));
                }}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button onClick={clearFilters} className="text-xs text-primary hover:underline shrink-0">{t("common.clearAll")}</button>
          </div>
        )}
      </div>

      <div className="container py-4">
        <p className="mb-3 text-sm text-muted-foreground">
          {t("jobs.showing", { count: filteredJobs.length }) || `${filteredJobs.length} jobs`}
        </p>

        <div className="flex gap-6">
          {/* Desktop Filters */}
          <aside className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-36 rounded-lg border bg-card p-4">
              <h3 className="mb-4 font-display text-sm font-semibold">{t("jobs.filters")}</h3>
              <FiltersContent />
            </div>
          </aside>

          {/* Job list */}
          <div className="flex-1 space-y-2 min-w-0">
            {filteredJobs.length === 0 ? (
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

          {/* Preview panel (desktop) */}
          {previewJob && (
            <aside className="hidden w-96 shrink-0 lg:block">
              <div className="sticky top-36 rounded-lg border bg-card overflow-hidden">
                <div className="border-b bg-surface p-4">
                  <h2 className="font-display text-lg font-bold">{previewJob.title}</h2>
                  <p className="text-sm text-muted-foreground">{previewJob.company}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary"><MapPin className="mr-1 h-3 w-3" />{previewJob.city}</Badge>
                    <Badge variant="secondary">{t(`jobs.${previewJob.workMode}`)}</Badge>
                    <Badge variant="secondary">{t(`jobs.${previewJob.employmentType}`)}</Badge>
                  </div>
                  {previewJob.salaryMin && previewJob.salaryMax && (
                    <p className="mt-2 text-sm font-semibold text-success">
                      {previewJob.salaryMin.toLocaleString()}–{previewJob.salaryMax.toLocaleString()} {previewJob.currency}
                    </p>
                  )}
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t("jobDetail.description") || "Description"}</h4>
                    <p className="text-sm text-foreground leading-relaxed">{previewJob.description}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t("jobDetail.requirements") || "Requirements"}</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {previewJob.requirements.map((r, i) => (
                        <li key={i} className="text-sm text-foreground">{r}</li>
                      ))}
                    </ul>
                  </div>
                  {previewJob.benefits.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t("jobDetail.benefits") || "Benefits"}</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {previewJob.benefits.map((b, i) => (
                          <li key={i} className="text-sm text-foreground">{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="border-t p-4 space-y-2">
                  <a href={previewJob.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full gap-2">
                      <ExternalLink className="h-4 w-4" />
                      {t("jobs.applyOn", { source: previewJob.source })}
                    </Button>
                  </a>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{t("jobs.lastChecked")}: {formatDistanceToNow(new Date(previewJob.lastChecked), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}
