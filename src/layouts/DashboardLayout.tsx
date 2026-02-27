import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserCircle, Bookmark, Trello, Sparkles, Menu } from "lucide-react";

export default function DashboardLayout() {
    const { t } = useTranslation();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // We map translation keys. Fallbacks provided for clarity if missing from i18n JSONs today.
    const navItems = [
        { label: t("dashboard.profile", "My Profile"), path: "/dashboard", icon: <UserCircle className="w-5 h-5" /> },
        { label: t("dashboard.saved", "Saved Jobs"), path: "/dashboard/saved", icon: <Bookmark className="w-5 h-5" /> },
        { label: t("dashboard.tracker", "Application Tracker"), path: "/dashboard/tracker", icon: <Trello className="w-5 h-5" /> },
        { label: t("dashboard.applyKit", "Apply Kit"), path: "/dashboard/apply-kit", icon: <Sparkles className="w-5 h-5 text-amber-500" /> },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex border-t">
            {/* Sidebar */}
            <aside className={`bg-white border-r w-64 flex-shrink-0 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:static h-full min-h-[calc(100vh-4rem)] z-10`}>
                <div className="p-4 border-b flex justify-between items-center md:hidden">
                    <h2 className="text-lg font-bold text-gray-800">{t("dashboard.title", "Applicant Dashboard")}</h2>
                    <button className="text-gray-400" onClick={() => setSidebarOpen(false)}>×</button>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <header className="md:hidden bg-white border-b h-14 flex items-center px-4 shrink-0">
                    <button className="p-2 -ml-2 text-gray-600 flex items-center" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6 inline-block" />
                    </button>
                    <span className="ml-3 font-semibold text-gray-800">{t("dashboard.title", "Applicant Dashboard")}</span>
                </header>

                <div className="p-4 md:p-8 flex-1 overflow-auto bg-gray-50/50">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
