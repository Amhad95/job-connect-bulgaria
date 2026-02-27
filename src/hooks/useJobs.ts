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
  sourceType?: 'EXTERNAL' | 'DIRECT';
}

async function fetchJobs(): Promise<DbJob[]> {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const cutoff = oneMonthAgo.toISOString();

  const { data, error } = await supabase
    .from("job_postings")
    .select(`
      id, title, canonical_url, apply_url,
      location_city, work_mode, employment_type, category,
      salary_min, salary_max, currency,
      first_seen_at, last_seen_at, posted_at, last_scraped_at, source_type,
      employers!inner ( name, logo_url ),
      job_posting_content ( description_text )
    `)
    .eq("status", "ACTIVE")
    .not("last_scraped_at", "is", null)
    .or(`posted_at.gte.${cutoff},and(posted_at.is.null,first_seen_at.gte.${cutoff})`)
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (error) throw error;

  const validJobs = (data ?? []).filter((row: any) => {
    // 1. Must have a real title
    if (!row.title || row.title.includes("Untitled Position") || row.title.length < 5) return false;

    // 2. Must have explicitly crawled posted date (fixes relative date NULLs forcing crawl-date sorting)
    if (!row.posted_at) return false;

    // 3. Location threshold (must drop global job list bleed-over)
    const loc = (row.location_city || "").toLowerCase();
    const foreign = ["london", "new york", "berlin", "paris", "madrid", "amsterdam", "dubai", "usa", "uk", "germany", "france", "spain", "italy", "poland", "romania", "greece", "turkey", "serbia"];
    if (foreign.some(f => loc.includes(f))) return false;
    if (!row.location_city && row.work_mode !== "remote") return false;

    // 4. Must have a deep extracted description (fixes "Life at our company" sparse extracts)
    const content = Array.isArray(row.job_posting_content) ? row.job_posting_content[0] : row.job_posting_content;
    const desc = content?.description_text || "";
    if (desc.length < 150) return false;

    // 5. Must NOT be a generic URL (fixes main careers page bleeding in)
    try {
      const url = new URL(row.canonical_url);
      const path = url.pathname.replace(/\/$/, "").toLowerCase();
      const genericPaths = ["", "/", "/careers", "/jobs", "/karieri", "/bg/careers", "/en/careers", "/about", "/life"];
      if (genericPaths.includes(path)) return false;
      // If the path is extremely short and has no identifiers (hyphens, numbers, or 'job')
      if (path.length < 10 && !path.includes('-') && !path.includes('job') && !path.match(/\d/)) return false;
    } catch {
      return false;
    }

    return true;
  });

  return validJobs.map((row: any) => ({
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
    sourceType: row.source_type ?? 'EXTERNAL',
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
      first_seen_at, last_seen_at, posted_at, source_type,
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
    sourceType: data.source_type ?? 'EXTERNAL',
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
