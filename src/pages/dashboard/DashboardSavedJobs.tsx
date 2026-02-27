import { useTranslation } from "react-i18next";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";

export default function DashboardSavedJobs() {
    const { t } = useTranslation();
    // Using useJobs mock to retrieve data, matching previous functionality natively.
    const { data: jobs = [] } = useJobs();
    const savedJobs = jobs.slice(0, 3);

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("jobs.savedJobs", "Saved Jobs")}
                </h1>
                <p className="text-gray-500 mt-1">Review your bookmarked opportunities.</p>
            </div>

            {savedJobs.length === 0 ? (
                <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                    <Bookmark className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                    <p className="text-gray-500">{t("jobs.noSavedJobs", "You haven't saved any jobs yet.")}</p>
                    <Link to="/jobs">
                        <Button variant="outline" className="mt-4 text-primary border-primary hover:bg-primary/5">Browse Jobs</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {savedJobs.map((job) => (
                        <div key={job.id} className="relative group">
                            <Link to={`/jobs?id=${job.id}`} className="block">
                                <JobCard job={job} />
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
