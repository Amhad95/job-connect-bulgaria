import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, RefreshCw, Languages } from "lucide-react";

export default function AdminDashboard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecentJobs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('job_postings')
            .select('*, employers(name)')
            .eq('status', 'ACTIVE')
            .order('last_seen_at', { ascending: false })
            .limit(50);

        if (error) {
            toast.error("Failed to fetch jobs");
        } else {
            setJobs(data || []);
        }
        setLoading(false);
    };

    useEffect(() => { fetchRecentJobs(); }, []);

    const handleDeactivate = async (id: string) => {
        const { error } = await supabase
            .from('job_postings')
            .update({ status: 'INACTIVE' as const })
            .eq('id', id);

        if (error) toast.error("Failed to deactivate job");
        else {
            toast.info("Job deactivated.");
            setJobs(jobs.filter(j => j.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Job Dashboard</h1>
                    <p className="text-gray-500 mt-1">Recently crawled active jobs.</p>
                </div>
                <Button variant="outline" onClick={fetchRecentJobs} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Loading...</td></tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center">
                                            <Check className="w-12 h-12 text-green-200 mb-3" />
                                            <span className="text-gray-500 font-medium">No active jobs found.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {job.employers?.name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{job.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(job.last_seen_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {job.location_city || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleDeactivate(job.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                                <X className="w-4 h-4 mr-1" /> Deactivate
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
