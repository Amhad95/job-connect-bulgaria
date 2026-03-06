import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApplicantProfile {
    user_id: string;
    headline: string | null;
    summary: string | null;
    location: string | null;
    email: string | null;
    phone: string | null;
}

export interface Experience {
    id: string;
    user_id: string;
    company_name: string;
    company_id: string | null;
    title: string;
    start_date: string;
    end_date: string | null;
    is_current: boolean;
    location: string | null;
    description: string | null;
    sort_order: number;
    bullets: ExperienceBullet[];
    skills: ExperienceSkill[];
}

export interface ExperienceBullet {
    id: string;
    experience_id: string;
    bullet: string;
    sort_order: number;
}

export interface ExperienceSkill {
    id: string;
    experience_id: string;
    skill_id: string | null;
    skill_name: string;
}

export interface Education {
    id: string;
    user_id: string;
    institution_name: string;
    institution_id: string | null;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    notes: string | null;
    sort_order: number;
}

export interface Skill {
    id: string;
    user_id: string;
    skill_id: string | null;
    skill_name: string;
    category: string | null;
    proficiency: string | null;
    years_experience: number | null;
    sort_order: number;
}

export interface Certificate {
    id: string;
    user_id: string;
    name: string;
    issuer: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    credential_url: string | null;
    credential_id: string | null;
    sort_order: number;
}

export interface ProfileLink {
    id: string;
    user_id: string;
    label: string;
    url: string;
    sort_order: number;
}

export interface CatalogItem {
    id: string;
    name: string;
    category?: string;
    popularity_score: number;
}

// ── Profile CRUD ─────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ApplicantProfile | null> {
    const { data, error } = await (supabase as any)
        .from("applicant_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function upsertProfile(
    userId: string,
    fields: Partial<Omit<ApplicantProfile, "user_id">>
) {
    const { error } = await (supabase as any)
        .from("applicant_profiles")
        .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" });
    if (error) throw error;
}

// ── Experiences ──────────────────────────────────────────────────────────────

export async function getExperiences(userId: string): Promise<Experience[]> {
    const { data: exps, error } = await (supabase as any)
        .from("applicant_experiences")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
    if (error) throw error;

    // Fetch bullets + skills for all experiences in parallel
    const ids = (exps || []).map((e: any) => e.id);
    if (ids.length === 0) return [];

    const [bulletsRes, skillsRes] = await Promise.all([
        (supabase as any)
            .from("applicant_experience_bullets")
            .select("*")
            .in("experience_id", ids)
            .order("sort_order"),
        (supabase as any)
            .from("applicant_experience_skills")
            .select("*")
            .in("experience_id", ids),
    ]);

    const bulletsMap = new Map<string, ExperienceBullet[]>();
    (bulletsRes.data || []).forEach((b: any) => {
        if (!bulletsMap.has(b.experience_id)) bulletsMap.set(b.experience_id, []);
        bulletsMap.get(b.experience_id)!.push(b);
    });

    const skillsMap = new Map<string, ExperienceSkill[]>();
    (skillsRes.data || []).forEach((s: any) => {
        if (!skillsMap.has(s.experience_id)) skillsMap.set(s.experience_id, []);
        skillsMap.get(s.experience_id)!.push(s);
    });

    return (exps || []).map((e: any) => ({
        ...e,
        bullets: bulletsMap.get(e.id) || [],
        skills: skillsMap.get(e.id) || [],
    }));
}

export async function upsertExperience(
    userId: string,
    exp: Partial<Experience> & { title: string; company_name: string; start_date: string }
) {
    const row = {
        user_id: userId,
        ...exp,
        bullets: undefined,
        skills: undefined,
    };
    delete (row as any).bullets;
    delete (row as any).skills;

    const { data, error } = await (supabase as any)
        .from("applicant_experiences")
        .upsert(row, { onConflict: "id" })
        .select()
        .single();
    if (error) throw error;
    return data as Experience;
}

export async function deleteExperience(id: string) {
    const { error } = await (supabase as any)
        .from("applicant_experiences")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ── Bullets ──────────────────────────────────────────────────────────────────

export async function syncBullets(
    experienceId: string,
    userId: string,
    bullets: { id?: string; bullet: string; sort_order: number }[]
) {
    // Delete existing then reinsert (simpler than diffing)
    await (supabase as any)
        .from("applicant_experience_bullets")
        .delete()
        .eq("experience_id", experienceId);

    if (bullets.length === 0) return;

    const rows = bullets.map((b) => ({
        experience_id: experienceId,
        user_id: userId,
        bullet: b.bullet,
        sort_order: b.sort_order,
    }));

    const { error } = await (supabase as any)
        .from("applicant_experience_bullets")
        .insert(rows);
    if (error) throw error;
}

// ── Experience Skills ────────────────────────────────────────────────────────

export async function syncExperienceSkills(
    experienceId: string,
    userId: string,
    skills: { skill_id?: string | null; skill_name: string }[]
) {
    await (supabase as any)
        .from("applicant_experience_skills")
        .delete()
        .eq("experience_id", experienceId);

    if (skills.length === 0) return;

    const rows = skills.map((s) => ({
        experience_id: experienceId,
        user_id: userId,
        skill_id: s.skill_id || null,
        skill_name: s.skill_name,
    }));

    const { error } = await (supabase as any)
        .from("applicant_experience_skills")
        .insert(rows);
    if (error) throw error;
}

// ── Education ────────────────────────────────────────────────────────────────

export async function getEducation(userId: string): Promise<Education[]> {
    const { data, error } = await (supabase as any)
        .from("applicant_education")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
    if (error) throw error;
    return data || [];
}

export async function upsertEducation(userId: string, edu: Partial<Education>) {
    const { data, error } = await (supabase as any)
        .from("applicant_education")
        .upsert({ user_id: userId, ...edu }, { onConflict: "id" })
        .select()
        .single();
    if (error) throw error;
    return data as Education;
}

export async function deleteEducation(id: string) {
    const { error } = await (supabase as any)
        .from("applicant_education")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ── Skills ───────────────────────────────────────────────────────────────────

export async function getSkills(userId: string): Promise<Skill[]> {
    const { data, error } = await (supabase as any)
        .from("applicant_skills")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
    if (error) throw error;
    return data || [];
}

export async function upsertSkill(userId: string, skill: Partial<Skill>) {
    const { data, error } = await (supabase as any)
        .from("applicant_skills")
        .upsert({ user_id: userId, ...skill }, { onConflict: "id" })
        .select()
        .single();
    if (error) throw error;
    return data as Skill;
}

export async function deleteSkill(id: string) {
    const { error } = await (supabase as any)
        .from("applicant_skills")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ── Certificates ─────────────────────────────────────────────────────────────

export async function getCertificates(userId: string): Promise<Certificate[]> {
    const { data, error } = await (supabase as any)
        .from("applicant_certificates")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
    if (error) throw error;
    return data || [];
}

export async function upsertCertificate(userId: string, cert: Partial<Certificate>) {
    const { data, error } = await (supabase as any)
        .from("applicant_certificates")
        .upsert({ user_id: userId, ...cert }, { onConflict: "id" })
        .select()
        .single();
    if (error) throw error;
    return data as Certificate;
}

export async function deleteCertificate(id: string) {
    const { error } = await (supabase as any)
        .from("applicant_certificates")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ── Links ────────────────────────────────────────────────────────────────────

export async function getLinks(userId: string): Promise<ProfileLink[]> {
    const { data, error } = await (supabase as any)
        .from("applicant_links")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
    if (error) throw error;
    return data || [];
}

export async function upsertLink(userId: string, link: Partial<ProfileLink>) {
    const { data, error } = await (supabase as any)
        .from("applicant_links")
        .upsert({ user_id: userId, ...link }, { onConflict: "id" })
        .select()
        .single();
    if (error) throw error;
    return data as ProfileLink;
}

export async function deleteLink(id: string) {
    const { error } = await (supabase as any)
        .from("applicant_links")
        .delete()
        .eq("id", id);
    if (error) throw error;
}

// ── Catalog Search ───────────────────────────────────────────────────────────

export async function searchCatalog(
    table: "skills_catalog" | "institutions_catalog" | "companies_catalog" | "roles_catalog",
    query: string,
    limit = 10
): Promise<CatalogItem[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const { data, error } = await (supabase as any)
        .from(table)
        .select("id, name, category, popularity_score")
        .ilike("name", `%${q}%`)
        .order("popularity_score", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

export async function addToCatalog(
    table: "skills_catalog" | "institutions_catalog" | "companies_catalog" | "roles_catalog",
    name: string,
    extra?: Record<string, any>
): Promise<CatalogItem> {
    const { data, error } = await (supabase as any)
        .from(table)
        .insert({ name, popularity_score: 1, ...extra })
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Profile Snapshot Builder ─────────────────────────────────────────────────

export async function buildProfileSnapshot(userId: string) {
    const [profile, experiences, education, skills, certificates, links] =
        await Promise.all([
            getProfile(userId),
            getExperiences(userId),
            getEducation(userId),
            getSkills(userId),
            getCertificates(userId),
            getLinks(userId),
        ]);

    return {
        profile,
        experiences,
        education,
        skills,
        certificates,
        links,
        snapshot_at: new Date().toISOString(),
    };
}

// ── 1-Click Apply ────────────────────────────────────────────────────────────

export async function createPlatformApplication(params: {
    job_id: string;
    first_name: string;
    last_name: string;
    email: string;
    resume_url?: string;
    profile_snapshot: any;
}) {
    const { data, error } = await (supabase as any).rpc(
        "create_platform_application",
        {
            p_job_id: params.job_id,
            p_first_name: params.first_name,
            p_last_name: params.last_name,
            p_email: params.email,
            p_resume_url: params.resume_url || "",
            p_profile_snapshot: params.profile_snapshot,
        }
    );
    if (error) throw error;
    return data as string; // returns application uuid
}

// ── Check if already applied ─────────────────────────────────────────────────

export async function hasAppliedToJob(jobId: string): Promise<boolean> {
    const { data, error } = await (supabase as any)
        .from("applications")
        .select("id")
        .eq("job_id", jobId)
        .maybeSingle();
    if (error) return false;
    return !!data;
}
