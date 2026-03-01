import { Settings, Users, Bell } from "lucide-react";
import { useEmployer } from "@/contexts/EmployerContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmployerSettings() {
    const { employerName, role } = useEmployer();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-gray-900">Workspace Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage {employerName}'s workspace preferences and team.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Team Settings Card */}
                <Link to="/employer/settings/team" className="block group">
                    <Card className="h-full transition-all hover:border-blue-200 hover:shadow-md">
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <CardTitle className="text-lg">Team Management</CardTitle>
                            <CardDescription>
                                Invite team members, manage roles, and review your current seat usage.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* Notification Settings Card */}
                <Link to="/employer/settings/notifications" className="block group">
                    <Card className="h-full transition-all hover:border-blue-200 hover:shadow-md">
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                                <Bell className="w-5 h-5 text-purple-600" />
                            </div>
                            <CardTitle className="text-lg">Notifications</CardTitle>
                            <CardDescription>
                                Configure your email and in-app alerts for new applications and AI scoring.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
