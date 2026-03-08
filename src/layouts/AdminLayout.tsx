import { useState } from "react";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, Settings, Menu, Handshake, ChevronRight, Webhook } from "lucide-react";

const NAV = [
    {
        label: "Moderation Queue",
        path: "/admin",
        icon: <LayoutDashboard className="w-5 h-5" />,
        exact: true,
    },
    {
        label: "Companies",
        path: "/admin/companies",
        icon: <Building2 className="w-5 h-5" />,
        children: [
            { label: "Crawled Sources", path: "/admin/companies" },
            { label: "Source Domains", path: "/admin/sources" },
        ],
    },
    {
        label: "Partners",
        path: "/admin/partners",
        icon: <Handshake className="w-5 h-5" />,
        children: [
            { label: "All Partners", path: "/admin/partners" },
            { label: "Signup Requests", path: "/admin/partners/requests" },
        ],
    },
    {
        label: "API Sources",
        path: "/admin/api-sources",
        icon: <Webhook className="w-5 h-5" />,
        exact: true,
    },
    {
        label: "System Settings",
        path: "/admin/settings",
        icon: <Settings className="w-5 h-5" />,
        exact: true,
    },
];

export default function AdminLayout() {
    useNoIndex();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const isActive = (path: string, exact = false) =>
        exact ? location.pathname === path : location.pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-gray-200 w-60 flex-shrink-0 transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 absolute md:static h-full z-20`}
            >
                <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">JobAdmin</h2>
                    <button className="md:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>×</button>
                </div>
                <nav className="p-3 space-y-0.5">
                    {NAV.map((item) => {
                        const active = isActive(item.path, item.exact);
                        if (item.children) {
                            const groupActive = item.children.some(c => location.pathname.startsWith(c.path));
                            return (
                                <div key={item.path}>
                                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${groupActive ? "text-blue-700" : "text-gray-600"}`}>
                                        {item.icon}
                                        <span className="flex-1">{item.label}</span>
                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${groupActive ? "rotate-90" : ""}`} />
                                    </div>
                                    <div className="ml-8 mt-0.5 space-y-0.5">
                                        {item.children.map(child => (
                                            <Link
                                                key={child.path}
                                                to={child.path}
                                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === child.path ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
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
                <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 shrink-0">
                    <button className="md:hidden p-2 -ml-2 text-gray-600" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="ml-auto">
                        <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">System Admin</span>
                    </div>
                </header>
                <div className="p-6 md:p-8 flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
