import { useParams } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

const COLUMNS = ["new", "reviewing", "interviewing", "offered", "rejected"] as const;

const COLUMN_LABELS: Record<typeof COLUMNS[number], string> = {
    new: "New",
    reviewing: "Reviewing",
    interviewing: "Interviewing",
    offered: "Offered",
    rejected: "Rejected",
};

/**
 * EmployerPipeline — Placeholder (Phase 2A)
 *
 * Kanban ATS pipeline for a single job posting.
 * Candidate data, AI scores, and status updates arrive in Phase 2B.
 */
export default function EmployerPipeline() {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            {/* Page header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Job ID: {id}</span>
                </div>
                <h1 className="font-display text-2xl font-bold text-gray-900">Applicant Pipeline</h1>
                <p className="text-sm text-gray-500 mt-1">
                    AI-ranked candidates for this role, organized by stage.
                </p>
            </div>

            {/* Placeholder Kanban board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <div
                        key={col}
                        className="flex-shrink-0 w-56 bg-slate-50 rounded-xl border border-gray-200 p-3"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                {COLUMN_LABELS[col]}
                            </p>
                            <span className="text-xs font-bold text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                                0
                            </span>
                        </div>
                        {/* Empty column state */}
                        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                            <p className="text-xs text-gray-400">No applicants</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-center">
                <span className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
                    Phase 2B — applicant data &amp; AI scoring coming next
                </span>
            </div>
        </div>
    );
}
