import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { mockJobs } from "@/data/mockJobs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";

export default function SavedJobs() {
  const { t } = useTranslation();
  // Mock: show first 3 jobs as "saved"
  const savedJobs = mockJobs.slice(0, 3);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <h1 className="mb-8 font-display text-2xl font-bold md:text-3xl">{t("jobs.savedJobs")}</h1>

        {savedJobs.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Bookmark className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t("jobs.noSavedJobs")}</p>
            <Link to="/jobs">
              <Button variant="outline" className="mt-4">{t("tracker.browseCta")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {savedJobs.map((job) => (
              <Link key={job.id} to={`/jobs?id=${job.id}`}>
                <JobCard job={job} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
