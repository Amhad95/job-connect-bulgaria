import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, Edit, MonitorPlay, AlertTriangle, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminApiSources() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("providers");
    const queryClient = useQueryClient();

    // Queries
    const { data: sources, isLoading: configLoading } = useQuery({
        queryKey: ['job_api_sources'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_api_sources').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: runs, isLoading: runsLoading } = useQuery({
        queryKey: ['job_import_runs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_import_runs').select('*, job_api_sources(name)').order('started_at', { ascending: false }).limit(50);
            if (error) throw error;
            return data;
        }
    });

    const { data: importedJobs, isLoading: jobsLoading } = useQuery({
        queryKey: ['job_import_items_jobs'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_import_items')
                .select(`
          id, status, apply_url, source_url, created_at,
          job_api_sources(name),
          job_postings(title, company_name)
        `)
                .eq('status', 'inserted')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data;
        }
    });

    const { data: errorsList, isLoading: errorsLoading } = useQuery({
        queryKey: ['job_import_items_errors'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_import_items')
                .select('*, job_api_sources(name)')
                .eq('status', 'failed')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        }
    });

    const triggerImport = useMutation({
        mutationFn: async (sourceId?: string) => {
            const payload = sourceId ? { source_id: sourceId } : {};
            const { data, error } = await supabase.functions.invoke('import-theirstack', {
                body: payload
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            toast.success(t("admin.apiSources.importStarted", "Import run completed"));
            queryClient.invalidateQueries({ queryKey: ['job_import_runs'] });
            queryClient.invalidateQueries({ queryKey: ['job_api_sources'] });
        },
        onError: (err) => {
            toast.error(t("admin.apiSources.importFailed", "Import failed: ") + err.message);
        }
    });

    const renderStatus = (status: string) => {
        switch (status) {
            case 'active': return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
            case 'paused': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>;
            case 'disabled': return <Badge variant="destructive">{status}</Badge>;
            case 'completed': return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
            case 'running': return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">{status}</Badge>;
            case 'failed': return <Badge variant="destructive">{status}</Badge>;
            case 'partial': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status}</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("admin.apiSources.title", "API Sources")}</h1>
                    <p className="text-sm text-gray-500">{t("admin.apiSources.subtitle", "Manage external job API providers, run imports, and monitor ingestion.")}</p>
                </div>
                <Button
                    onClick={() => triggerImport.mutate(undefined)}
                    disabled={triggerImport.isPending}
                    className="gap-2"
                >
                    {triggerImport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
                    {t("admin.apiSources.runAll", "Run All Active")}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-2xl grid-cols-5">
                    <TabsTrigger value="providers">{t("admin.apiSources.tabs.providers", "Providers")}</TabsTrigger>
                    <TabsTrigger value="configs">{t("admin.apiSources.tabs.configs", "Source Configs")}</TabsTrigger>
                    <TabsTrigger value="runs">{t("admin.apiSources.tabs.runs", "Import Runs")}</TabsTrigger>
                    <TabsTrigger value="jobs">{t("admin.apiSources.tabs.jobs", "Imported Jobs")}</TabsTrigger>
                    <TabsTrigger value="errors">{t("admin.apiSources.tabs.errors", "Errors")}</TabsTrigger>
                </TabsList>

                <TabsContent value="providers" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.apiSources.providers.title", "Configured Providers")}</CardTitle>
                            <CardDescription>{t("admin.apiSources.providers.desc", "API providers available to the system.")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Active Configs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">TheirStack</TableCell>
                                        <TableCell>
                                            {/* We don't verify API key live, we just assume it's set if configs exist and are active */}
                                            <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>
                                        </TableCell>
                                        <TableCell>{sources?.filter(s => s.provider === 'theirstack' && s.status === 'active').length || 0}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="configs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.apiSources.configs.title", "Source Configurations")}</CardTitle>
                            <CardDescription>{t("admin.apiSources.configs.desc", "Individual queries and rules for each provider.")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {configLoading ? (
                                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Run</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sources?.map(source => (
                                            <TableRow key={source.id}>
                                                <TableCell className="font-medium">{source.name}</TableCell>
                                                <TableCell className="text-gray-500">{source.provider}</TableCell>
                                                <TableCell>{renderStatus(source.status)}</TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {source.last_run_at ? formatDistanceToNow(new Date(source.last_run_at), { addSuffix: true }) : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={triggerImport.isPending}
                                                        onClick={() => triggerImport.mutate(source.id)}
                                                        className="h-8 group"
                                                    >
                                                        <Play className="h-4 w-4 mr-1 text-gray-500 group-hover:text-amber-500" />
                                                        Run Now
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!sources || sources.length === 0) && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">No source configs found</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="runs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.apiSources.runs.title", "Recent Import Runs")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {runsLoading ? (
                                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Received</TableHead>
                                            <TableHead className="text-right text-green-600">Inserted</TableHead>
                                            <TableHead className="text-right text-gray-500">Skipped</TableHead>
                                            <TableHead className="text-right text-red-600">Failed</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {runs?.map((run: any) => (
                                            <TableRow key={run.id}>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="truncate max-w-[200px]">{run.job_api_sources?.name}</TableCell>
                                                <TableCell>{renderStatus(run.status)}</TableCell>
                                                <TableCell className="text-right font-medium">{run.records_received}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">{run.records_inserted}</TableCell>
                                                <TableCell className="text-right text-gray-500">{run.records_skipped_duplicate}</TableCell>
                                                <TableCell className="text-right text-red-600">{run.records_failed > 0 ? run.records_failed : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!runs || runs.length === 0) && (
                                            <TableRow><TableCell colSpan={7} className="text-center py-6 text-gray-500">No runs recorded</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="jobs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.apiSources.jobs.title", "Recently Imported Jobs")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {jobsLoading ? (
                                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Job Title</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Source Config</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead className="text-right">Links</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importedJobs?.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium max-w-xs xl:max-w-md truncate">
                                                    {item.job_postings?.title || "Unknown"}
                                                </TableCell>
                                                <TableCell className="text-gray-500">
                                                    {item.job_postings?.company_name || "-"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {item.job_api_sources?.name}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild className="h-8">
                                                        <a href={item.apply_url || item.source_url} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="w-4 h-4 mr-1" /> View
                                                        </a>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!importedJobs || importedJobs.length === 0) && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">No imported jobs</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="errors" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("admin.apiSources.errors.title", "Failed Items")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {errorsLoading ? (
                                <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>External ID</TableHead>
                                            <TableHead>Error Message</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {errorsList?.map((err: any) => (
                                            <TableRow key={err.id}>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell>{err.job_api_sources?.name}</TableCell>
                                                <TableCell className="text-sm font-mono text-gray-500">{err.external_source_job_id}</TableCell>
                                                <TableCell className="text-red-600 max-w-sm xl:max-w-md truncate">
                                                    {err.error_message || "Unknown error"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!errorsList || errorsList.length === 0) && (
                                            <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No errors recorded</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
