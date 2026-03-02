import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    Briefcase, LayoutGrid, Settings, Menu, ChevronRight,
    Users, Clock, AlertTriangle, ArrowLeft, Building2
} from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";
import { PendingApprovalBanner } from "@/components/EmployerRoute";
import { NotificationBell } from "@/components/NotificationBell";
import { differenceInDays } from "date-fns";
import logo from "@/assets/bachkam-logo.svg";

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
            <div className="mx-3 mt-auto mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-[11px] font-semibold text-red-200">
                        {subStatus === "trial_expired" ? "Trial ended" : "Payment past due"}
                    </p>
                </div>
                <Link to="/employers#pricing" className="text-[11px] font-medium text-red-300 hover:text-red-200 underline underline-offset-2 transition-colors">
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
            <div className={`mx-3 mt-auto mb-3 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition-colors ${urgent ? "border-amber-500/30 bg-amber-500/10" : "border-blue-500/20 bg-blue-500/10"}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${urgent ? "text-amber-400" : "text-blue-400"}`} />
                    <p className={`text-[11px] font-semibold ${urgent ? "text-amber-200" : "text-blue-100"}`}>
                        Trial: {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "expires today"}
                    </p>
                </div>
                <Link to="/employers#pricing" className={`text-[11px] font-medium underline underline-offset-2 transition-colors ${urgent ? "text-amber-300 hover:text-amber-200" : "text-blue-300 hover:text-blue-200"}`}>
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
    const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
    const { employerName, role, approvalStatus, subStatus, trialEndsAt } = useEmployer();

    const canSeeTeam = role === "owner" || role === "admin";
    const NAV = canSeeTeam ? [...NAV_BASE, ...NAV_OWNER_ADMIN] : NAV_BASE;

    const isActive = (path: string, exact = false) =>
        exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 flex font-sans">
            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Dark Premium Theme */}
            <aside className={`bg-slate-950 text-slate-300 border-r border-slate-800 w-64 flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 h-full z-30 shadow-2xl md:shadow-none`}>
                {/* Workspace header */}
                <div className="p-6 border-b border-slate-800/60 flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <img src={logo} alt="бачкам" className="h-7 w-auto" />
                            <span className="text-xl font-display font-bold text-white tracking-tight">бачкам</span>
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Workspace</p>
                        <h2 className="text-sm font-medium text-slate-200 truncate">{employerName}</h2>
                    </div>
                    <button className="md:hidden text-slate-500 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-md p-1.5" onClick={() => setSidebarOpen(false)}>
                        ×
                    </button>
                </div>

                {/* Nav */}
                <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
                    {NAV.map((item) => {
                        const active = isActive(item.path, item.exact);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${active
                                    ? "bg-blue-600/10 text-blue-400"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                                    }`}
                            >
                                <div className={`${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                                    {item.icon}
                                </div>
                                <span>{item.label}</span>
                                {active && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom utilities */}
                <div className="flex flex-col mt-auto pb-4">
                    <TrialBanner trialEndsAt={trialEndsAt} subStatus={subStatus} />

                    <div className="px-3">
                        <Link
                            to="/"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-all duration-200 group"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                            Back to website
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* Top header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-16 flex items-center px-4 md:px-8 shrink-0 gap-3 sticky top-0 z-10 transition-all">
                    <button
                        className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden md:flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Building2 className="w-3 h-3 text-slate-400" />
                        </div>
                        <span className="text-slate-900">{employerName}</span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <NotificationBell />
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {employerName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden sm:flex flex-col items-start leading-none">
                                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full capitalize">
                                    {role}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content area */}
                <div className="p-4 md:p-8 flex-1 overflow-auto">
                    <div className="max-w-[1400px] mx-auto">
                        <PendingApprovalBanner status={approvalStatus} />
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
