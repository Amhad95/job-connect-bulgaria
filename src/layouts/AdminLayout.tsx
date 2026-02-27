import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Building2, LayoutDashboard, Settings, Menu } from "lucide-react";

export default function AdminLayout() {
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navItems = [
        { label: "Moderation Queue", path: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Companies", path: "/admin/companies", icon: <Building2 className="w-5 h-5" /> },
        { label: "System Settings", path: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`bg-white border-r w-64 flex-shrink-0 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:static h-full z-10`}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">JobAdmin</h2>
                    <button className="md:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>×</button>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
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
            <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
                <header className="bg-white border-b h-16 flex items-center px-6 md:px-8 shrink-0">
                    <button className="md:hidden p-2 -ml-2 text-gray-600 flex items-center" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6 inline-block" />
                    </button>
                    <div className="ml-auto flex items-center space-x-4">
                        <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full">System Admin</span>
                    </div>
                </header>

                <div className="p-6 md:p-8 flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
