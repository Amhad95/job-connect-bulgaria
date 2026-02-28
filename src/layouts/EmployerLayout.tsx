import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    Briefcase, LayoutGrid, Settings, Menu, ChevronRight,
    Users, Clock, AlertTriangle,
} from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";
import { PendingApprovalBanner } from "@/components/EmployerRoute";
import { differenceInDays } from "date-fns";

const NAV_BASE = [
    { label: "Job Postings", path: "/employer/jobs", icon: <Briefcase className="w-5 h-5" />, exact: false },
    { label: "Settings", path: "/employer/settings", icon: <Settings className="w-5 h-5" />, exact: true },
];

const NAV_OWNER_ADMIN = [
    { label: "Team", path: "/employer/settings/team", icon: <Users className="w-5 h-5" />, exact: true },
];

// ── TrialBanner ─────────────────────────────────────────────────────────────
function TrialBanner({ trialEndsAt, subStatus }: { trialEndsAt: string | null; subStatus: string }) {
    if (subStatus === "active") return null;
    if (!trialEndsAt && subStatus !== "trial_expired" && subStatus !== "past_due") return null;

    if (subStatus === "trial_expired" || subStatus === "past_due") {
        return (
            <div className="mx-3 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <p className="text-[11px] font-semibold text-red-800">
                        {subStatus === "trial_expired" ? "Trial ended" : "Payment past due"}
                    </p>
                </div>
                <Link to="/employers#pricing" className="text-[11px] font-semibold text-red-700 underline underline-offset-1">
                    Upgrade to restore access →
                </Link>
            </div>
        );
    }

    // Trialing — show countdown
    if (subStatus === "trialing" && trialEndsAt) {
        const daysLeft = differenceInDays(new Date(trialEndsAt), new Date());
        const urgent = daysLeft <= 3;
        return (
            <div className={`mx-3 mb-3 rounded-xl border px-3 py-2.5 ${urgent ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${urgent ? "text-amber-500" : "text-blue-400"}`} />
                    <p className={`text-[11px] font-semibold ${urgent ? "text-amber-800" : "text-blue-700"}`}>
                        Trial: {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "expires today"}
                    </p>
                </div>
                <Link to="/employers#pricing" className={`text-[11px] font-semibold underline underline-offset-1 ${urgent ? "text-amber-700" : "text-blue-600"}`}>
                    Upgrade now →
                </Link>
            </div>
        );
    }

    return null;
}

// ── EmployerLayout ──────────────────────────────────────────────────────────
export default function EmployerLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { employerName, role, approvalStatus, subStatus, trialEndsAt } = useEmployer();

    const canSeeTeam = role === "owner" || role === "admin";
    const NAV = canSeeTeam ? [...NAV_BASE, ...NAV_OWNER_ADMIN] : NAV_BASE;

    const isActive = (path: string, exact = false) =>
        exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-gray-200 w-60 flex-shrink-0 flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 absolute md:static h-full z-20`}>
                {/* Workspace header */}
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Employer ATS</p>
                        <h2 className="text-sm font-bold text-gray-900 truncate">{employerName}</h2>
                    </div>
                    <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>×</button>
                </div>

                {/* Nav */}
                <nav className="p-3 space-y-0.5 flex-1">
                    {NAV.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Trial / subscription banner at bottom of sidebar */}
                <TrialBanner trialEndsAt={trialEndsAt} subStatus={subStatus} />
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0 gap-3">
                    <button className="md:hidden p-2 -ml-2 text-gray-600" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="hidden md:flex items-center gap-1 text-xs text-gray-400">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-gray-700 font-medium">{employerName}</span>
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full capitalize">
                            {role}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6 md:p-8 flex-1 overflow-auto">
                    <PendingApprovalBanner status={approvalStatus} />
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
