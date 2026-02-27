import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Play, Search } from "lucide-react";

export default function AdminCompanies() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('employers').select('*').order('name');
        if (error) {
            toast.error("Failed to load companies");
        } else {
            setCompanies(data || []);
        }
        setLoading(false);
    };

    useEffect(() => { fetchCompanies(); }, []);

    const toggleOptOut = async (id: string, currentVal: boolean) => {
        const newVal = !currentVal;

        // Optimistic UI Update
        setCompanies(prev => prev.map(c => c.id === id ? { ...c, is_opted_out: newVal } : c));

        const { error } = await supabase.from('employers').update({ is_opted_out: newVal }).eq('id', id);
        if (error) {
            toast.error("Failed to update status");
            fetchCompanies(); // revert
        } else {
            toast.success(`Company is now ${newVal ? 'Opted-Out' : 'Active'}`);
        }
    };

    const triggerManualCrawl = async (company: any) => {
        if (company.is_opted_out) {
            toast.error("Cannot crawl an opted-out company.");
            return;
        }

        toast.info(`Triggering manual crawl for ${company.name}...`);
        // Example: Calls Edge Function
        const { data, error } = await supabase.functions.invoke('crawl-source', {
            body: { employer_id: company.id } // Note: Assuming the function adapts to use careers_url
        });

        if (error) {
            toast.error(`Crawl failed: ${error.message}`);
        } else {
            toast.success(`Crawl completed for ${company.name}`);
        }
    };

    const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Companies Repository</h1>
                    <p className="text-gray-500 mt-1">Manage sources, disable crawling via Opt-Out, and fire manual scraping events.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search companies..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Careers URL</th>
                                <th className="px-6 py-4 text-center">Opt-Out</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Loading directory...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-12 text-gray-500">No companies found</td></tr>
                            ) : (
                                filtered.map((company) => (
                                    <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            {company.logo_url && <img src={company.logo_url} className="w-6 h-6 rounded object-cover" alt="" />}
                                            {company.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={company.careers_url || "Not set"}>
                                            {company.careers_url || <span className="text-gray-300 italic">Not configured</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <Switch
                                                    checked={!!company.is_opted_out}
                                                    onCheckedChange={() => toggleOptOut(company.id, !!company.is_opted_out)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => triggerManualCrawl(company)}
                                                disabled={company.is_opted_out}
                                                className="gap-2"
                                            >
                                                <Play className="w-3 h-3" /> Scrape
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
