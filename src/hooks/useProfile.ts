import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import * as profileSvc from "@/services/profileService";

const PROFILE_KEY = "applicant-profile";
const EXPERIENCES_KEY = "applicant-experiences";
const EDUCATION_KEY = "applicant-education";
const SKILLS_KEY = "applicant-skills";
const CERTIFICATES_KEY = "applicant-certificates";
const LINKS_KEY = "applicant-links";

export function useApplicantProfile() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [PROFILE_KEY, user?.id],
        queryFn: () => profileSvc.getProfile(user!.id),
        enabled: !!user,
    });
}

export function useUpsertProfile() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (fields: Partial<Omit<profileSvc.ApplicantProfile, "user_id">>) =>
            profileSvc.upsertProfile(user!.id, fields),
        onSuccess: () => qc.invalidateQueries({ queryKey: [PROFILE_KEY] }),
    });
}

// ── Experiences ──────────────────────────────────────────────────────────────

export function useExperiences() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [EXPERIENCES_KEY, user?.id],
        queryFn: () => profileSvc.getExperiences(user!.id),
        enabled: !!user,
    });
}

export function useUpsertExperience() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (params: {
            experience: Parameters<typeof profileSvc.upsertExperience>[1];
            bullets?: { bullet: string; sort_order: number }[];
            skills?: { skill_id?: string | null; skill_name: string }[];
        }) => {
            const exp = await profileSvc.upsertExperience(user!.id, params.experience);
            if (params.bullets) {
                await profileSvc.syncBullets(exp.id, user!.id, params.bullets);
            }
            if (params.skills) {
                await profileSvc.syncExperienceSkills(exp.id, user!.id, params.skills);
            }
            return exp;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [EXPERIENCES_KEY] }),
    });
}

export function useDeleteExperience() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.deleteExperience,
        onSuccess: () => qc.invalidateQueries({ queryKey: [EXPERIENCES_KEY] }),
    });
}

// ── Education ────────────────────────────────────────────────────────────────

export function useEducation() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [EDUCATION_KEY, user?.id],
        queryFn: () => profileSvc.getEducation(user!.id),
        enabled: !!user,
    });
}

export function useUpsertEducation() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (edu: Partial<profileSvc.Education>) =>
            profileSvc.upsertEducation(user!.id, edu),
        onSuccess: () => qc.invalidateQueries({ queryKey: [EDUCATION_KEY] }),
    });
}

export function useDeleteEducation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.deleteEducation,
        onSuccess: () => qc.invalidateQueries({ queryKey: [EDUCATION_KEY] }),
    });
}

// ── Skills ───────────────────────────────────────────────────────────────────

export function useProfileSkills() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [SKILLS_KEY, user?.id],
        queryFn: () => profileSvc.getSkills(user!.id),
        enabled: !!user,
    });
}

export function useUpsertSkill() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (skill: Partial<profileSvc.Skill>) =>
            profileSvc.upsertSkill(user!.id, skill),
        onSuccess: () => qc.invalidateQueries({ queryKey: [SKILLS_KEY] }),
    });
}

export function useDeleteSkill() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.deleteSkill,
        onSuccess: () => qc.invalidateQueries({ queryKey: [SKILLS_KEY] }),
    });
}

// ── Certificates ─────────────────────────────────────────────────────────────

export function useCertificates() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [CERTIFICATES_KEY, user?.id],
        queryFn: () => profileSvc.getCertificates(user!.id),
        enabled: !!user,
    });
}

export function useUpsertCertificate() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (cert: Partial<profileSvc.Certificate>) =>
            profileSvc.upsertCertificate(user!.id, cert),
        onSuccess: () => qc.invalidateQueries({ queryKey: [CERTIFICATES_KEY] }),
    });
}

export function useDeleteCertificate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.deleteCertificate,
        onSuccess: () => qc.invalidateQueries({ queryKey: [CERTIFICATES_KEY] }),
    });
}

// ── Links ────────────────────────────────────────────────────────────────────

export function useProfileLinks() {
    const { user } = useAuth();
    return useQuery({
        queryKey: [LINKS_KEY, user?.id],
        queryFn: () => profileSvc.getLinks(user!.id),
        enabled: !!user,
    });
}

export function useUpsertLink() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (link: Partial<profileSvc.ProfileLink>) =>
            profileSvc.upsertLink(user!.id, link),
        onSuccess: () => qc.invalidateQueries({ queryKey: [LINKS_KEY] }),
    });
}

export function useDeleteLink() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.deleteLink,
        onSuccess: () => qc.invalidateQueries({ queryKey: [LINKS_KEY] }),
    });
}

// ── Catalog Search ───────────────────────────────────────────────────────────

export function useCatalogSearch(
    table: Parameters<typeof profileSvc.searchCatalog>[0],
    query: string
) {
    return useQuery({
        queryKey: ["catalog-search", table, query],
        queryFn: () => profileSvc.searchCatalog(table, query),
        enabled: query.length >= 2,
        staleTime: 30_000,
    });
}

// ── 1-Click Apply ────────────────────────────────────────────────────────────

export function useCreatePlatformApplication() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: profileSvc.createPlatformApplication,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["tracker"] });
            qc.invalidateQueries({ queryKey: ["has-applied"] });
        },
    });
}

export function useHasApplied(jobId: string | undefined) {
    return useQuery({
        queryKey: ["has-applied", jobId],
        queryFn: () => profileSvc.hasAppliedToJob(jobId!),
        enabled: !!jobId,
    });
}
