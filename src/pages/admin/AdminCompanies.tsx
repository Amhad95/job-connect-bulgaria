import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    const triggerManualCrawl = async (company: any) => {
        toast.info(`Finding sources for ${company.name}...`);

        const { data: sources, error: srcErr } = await supabase
            .from('employer_sources')
            .select('id, policy_status, careers_home_url, ats_type')
            .eq('employer_id', company.id)
            .eq('policy_status', 'ACTIVE');

        if (srcErr || !sources || sources.length === 0) {
            toast.error("No active sources found for this company.");
            return;
        }

        let successCount = 0;
        for (const source of sources) {
            const { error } = await supabase.functions.invoke('crawl-source', {
                body: { employer_source_id: source.id }
            });
            if (error) {
                toast.error(`Crawl failed for source ${source.ats_type || source.careers_home_url}: ${error.message}`);
            } else {
                successCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Crawl triggered for ${successCount} source(s) of ${company.name}`);
        }
    };

    const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Companies Repository</h1>
                    <p className="text-muted-foreground mt-1">Manage sources and fire manual scraping events.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search companies..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted border-b text-muted-foreground font-medium">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Domain</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">Loading directory...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">No companies found</td></tr>
                            ) : (
                                filtered.map((company) => (
                                    <tr key={company.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                                            {company.logo_url && <img src={company.logo_url} className="w-6 h-6 rounded object-cover" alt="" />}
                                            {company.name}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                                            {company.website_domain || <span className="italic opacity-50">Not set</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => triggerManualCrawl(company)}
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
