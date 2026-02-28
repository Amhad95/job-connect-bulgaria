import { Briefcase, Plus } from "lucide-react";

/**
 * EmployerJobs — Placeholder (Phase 2A)
 *
 * This is the employer-only job management console.
 * It is NOT a candidate-facing job board. Candidates continue to
 * browse jobs on the existing /jobs page.
 *
 * Full CRUD will be implemented in Phase 2B.
 */
export default function EmployerJobs() {
    return (
        <div>
            {/* Page header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-gray-900">Job Postings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your open roles and applicant pipelines.
                    </p>
                </div>
                <button
                    disabled
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                    New Job
                </button>
            </div>

            {/* Placeholder state */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                    <Briefcase className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">No jobs posted yet</h2>
                <p className="text-sm text-gray-500 max-w-xs">
                    Your job postings will appear here. Full job management (create, edit, close) is
                    coming in the next phase.
                </p>
                <span className="mt-6 inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
                    Phase 2B — coming next
                </span>
            </div>
        </div>
    );
}
