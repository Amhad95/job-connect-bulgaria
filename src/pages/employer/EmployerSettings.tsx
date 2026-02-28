import { Settings } from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";

/**
 * EmployerSettings — Placeholder (Phase 2A)
 */
export default function EmployerSettings() {
    const { employerName, role } = useEmployer();

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-gray-900">Workspace Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your employer workspace.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{employerName}</p>
                        <p className="text-xs text-gray-500 capitalize">Your role: {role}</p>
                    </div>
                </div>
                <p className="text-sm text-gray-500">
                    Full settings (team members, branding, billing) will be available in a future phase.
                </p>
                <span className="mt-6 inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
                    Coming soon
                </span>
            </div>
        </div>
    );
}
