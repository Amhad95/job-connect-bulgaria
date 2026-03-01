import { Settings, Users, Bell, ArrowRight, Shield, CreditCard } from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";
import { Link } from "react-router-dom";

export default function EmployerSettings() {
    const { employerName } = useEmployer();

    return (
        <div className="max-w-5xl animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Workspace Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage {employerName}'s workspace preferences, team, and billing.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Link to="/employer/settings/team" className="p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Team Management</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Invite team members, manage roles, and review seat usage.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </Link>

                <Link to="/employer/settings/notifications" className="p-6 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                            <Bell className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Notifications</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Configure email and in-app alerts for new applications.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </Link>

                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4 opacity-70">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                            <Shield className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                Security & Identity
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Coming Soon</span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">Set up SSO, two-factor authentication, and login rules.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4 opacity-70">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                            <CreditCard className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                Billing & Plans
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Coming Soon</span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">Manage your subscription, invoices, and payment methods.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
