import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, RefreshCw, Languages } from "lucide-react";

export default function AdminDashboard() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingQueue = async () => {
        setLoading(true);
        // Fetch jobs that need moderation, ordered by newest scraped
        const { data, error } = await supabase
            .from('job_postings')
            .select('*, employers(name)')
            .eq('approval_status', 'PENDING')
            .order('last_seen_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch moderation queue");
        } else {
            setJobs(data || []);
        }
        setLoading(false);
    };

    useEffect(() => { fetchPendingQueue(); }, []);

    const handleApprove = async (job: any) => {
        // 1. Client-Side Deduplication Check (Before Approval)
        const { data: duplicates } = await supabase
            .from('job_postings')
            .select('id')
            .eq('approval_status', 'APPROVED')
            .eq('employer_id', job.employer_id)
            .eq('title_en', job.title_en || job.title)
            .limit(1);

        if (duplicates && duplicates.length > 0) {
            toast.error("Duplicate Risk! An approved job with this mapping already exists.");
            return;
        }

        // 2. Approve
        const { error } = await supabase
            .from('job_postings')
            .update({ approval_status: 'APPROVED' })
            .eq('id', job.id);

        if (error) {
            toast.error("Failed to approve job");
        } else {
            toast.success("Job Approved & Synced to Live Board!");
            setJobs(jobs.filter(j => j.id !== job.id));
        }
    };

    const handleReject = async (id: string) => {
        const { error } = await supabase
            .from('job_postings')
            .update({ approval_status: 'REJECTED' })
            .eq('id', id);

        if (error) toast.error("Failed to reject job");
        else {
            toast.info("Job Rejected & archived.");
            setJobs(jobs.filter(j => j.id !== id));
        }
    };

    const triggerTranslation = async (job: any) => {
        toast.info("Triggering AI Translation...");
        // Ideally calls a Supabase Edge Function to hit OpenAI mappings
        // Mocked for UI until serverless function is deployed
        setTimeout(() => toast.success("Translation generated & unified!"), 1500);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Moderation Queue</h1>
                    <p className="text-gray-500 mt-1">Incoming aggregated jobs awaiting review and translation before going live.</p>
                </div>
                <Button variant="outline" onClick={fetchPendingQueue} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh Queue
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Detected Title (Native/Raw)</th>
                                <th className="px-6 py-4 text-center">Translation</th>
                                <th className="px-6 py-4 text-right">Action Gate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Scanning queue...</td></tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center">
                                            <Check className="w-12 h-12 text-green-200 mb-3" />
                                            <span className="text-gray-500 font-medium">Queue is completely completely empty!</span>
                                            <span className="text-sm text-gray-400">All crawled jobs have been moderated.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {job.employers?.name || 'Unknown Source'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-800">{job.title_bg || job.title_en || job.title}</div>
                                            <div className="text-xs text-gray-400 mt-1">{new Date(job.last_seen_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button variant="ghost" size="sm" onClick={() => triggerTranslation(job)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 gap-2">
                                                <Languages className="w-4 h-4" /> Translate
                                            </Button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleReject(job.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" onClick={() => handleApprove(job)} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                                    <Check className="w-4 h-4" /> Approve
                                                </Button>
                                            </div>
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
