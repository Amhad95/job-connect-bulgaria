import { Link } from "react-router-dom";
import { useEmployer } from "@/contexts/EmployerContext";
import { BarChart3, Users, Clock, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmployerAnalytics() {
    const { employerName } = useEmployer();

    return (
        <div className="max-w-5xl animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    Analytics
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Beta</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">Track your hiring performance and pipeline health.</p>
            </div>

            {/* Summary metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Avg. Applicants/Job</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">—</p>
                    <p className="text-xs text-slate-400 mt-2">Across active postings</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Avg. Time to First Response</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">—</p>
                    <p className="text-xs text-slate-400 mt-2">From application to review</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Pipeline Conversion</p>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">—</p>
                    <p className="text-xs text-slate-400 mt-2">New → Offered rate</p>
                </div>
            </div>

            {/* Coming soon banner */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-3xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Full Analytics Coming Soon</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                    We're building detailed pipeline analytics, time-to-hire tracking, source attribution, and AI scoring insights.
                    Stay tuned for updates.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link to="/employer/jobs">Back to Dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
