import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Briefcase, LayoutGrid, Settings, Menu, ChevronRight } from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";

const NAV = [
    {
        label: "Job Postings",
        path: "/employer/jobs",
        icon: <Briefcase className="w-5 h-5" />,
        exact: false,
        children: undefined,
    },
    {
        label: "Settings",
        path: "/employer/settings",
        icon: <Settings className="w-5 h-5" />,
        exact: true,
        children: undefined,
    },
];

export default function EmployerLayout() {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { employerName, role } = useEmployer();

    const isActive = (path: string, exact = false) =>
        exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-gray-200 w-60 flex-shrink-0 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } md:translate-x-0 absolute md:static h-full z-20`}
            >
                {/* Workspace header */}
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                            Employer ATS
                        </p>
                        <h2 className="text-sm font-bold text-gray-900 truncate">{employerName}</h2>
                    </div>
                    <button
                        className="md:hidden text-gray-400 hover:text-gray-600"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ×
                    </button>
                </div>

                {/* Nav */}
                <nav className="p-3 space-y-0.5">
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
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0 gap-3">
                    <button
                        className="md:hidden p-2 -ml-2 text-gray-600"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumb hint */}
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
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
