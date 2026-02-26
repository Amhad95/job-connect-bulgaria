import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  city?: string;
  workMode?: string;
  employmentType?: string;
  category?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  applyUrl?: string;
  canonicalUrl: string;
  firstSeenAt: string;
  lastSeenAt: string;
  postedAt?: string;
}

async function fetchJobs(): Promise<DbJob[]> {
  const { data, error } = await supabase
    .from("job_postings")
    .select(`
      id, title, canonical_url, apply_url,
      location_city, work_mode, employment_type, category,
      salary_min, salary_max, currency,
      first_seen_at, last_seen_at, posted_at,
      employers!inner ( name, logo_url )
    `)
    .eq("status", "ACTIVE")
    .order("first_seen_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    company: row.employers.name,
    companyLogo: row.employers.logo_url ?? undefined,
    city: row.location_city ?? undefined,
    workMode: row.work_mode ?? undefined,
    employmentType: row.employment_type ?? undefined,
    category: row.category ?? undefined,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    currency: row.currency ?? undefined,
    applyUrl: row.apply_url ?? row.canonical_url,
    canonicalUrl: row.canonical_url,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    postedAt: row.posted_at ?? row.first_seen_at,
  }));
}

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchJobById(id: string): Promise<DbJob & { description?: string; requirements?: string; benefits?: string }> {
  const { data, error } = await supabase
    .from("job_postings")
    .select(`
      id, title, canonical_url, apply_url,
      location_city, work_mode, employment_type, category,
      salary_min, salary_max, currency,
      first_seen_at, last_seen_at, posted_at,
      employers!inner ( name, logo_url ),
      job_posting_content ( description_text, requirements_text, benefits_text )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  const content = Array.isArray(data.job_posting_content)
    ? data.job_posting_content[0]
    : data.job_posting_content;

  return {
    id: data.id,
    title: data.title,
    company: (data.employers as any).name,
    companyLogo: (data.employers as any).logo_url ?? undefined,
    city: data.location_city ?? undefined,
    workMode: data.work_mode ?? undefined,
    employmentType: data.employment_type ?? undefined,
    category: data.category ?? undefined,
    salaryMin: data.salary_min ?? undefined,
    salaryMax: data.salary_max ?? undefined,
    currency: data.currency ?? undefined,
    applyUrl: data.apply_url ?? data.canonical_url,
    canonicalUrl: data.canonical_url,
    firstSeenAt: data.first_seen_at,
    lastSeenAt: data.last_seen_at,
    postedAt: data.posted_at ?? data.first_seen_at,
    description: content?.description_text ?? undefined,
    requirements: content?.requirements_text ?? undefined,
    benefits: content?.benefits_text ?? undefined,
  };
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJobById(id!),
    enabled: !!id,
  });
}
