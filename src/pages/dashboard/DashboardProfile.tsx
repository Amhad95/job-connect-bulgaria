import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertCircle,
    Plus,
    Trash2,
    Pencil,
    GripVertical,
    Briefcase,
    GraduationCap,
    Wrench,
    Award,
    Link2,
    ChevronUp,
    ChevronDown,
    X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AutosaveIndicator } from "@/components/profile/AutosaveIndicator";
import { TypeaheadInput } from "@/components/profile/TypeaheadInput";
import {
    useApplicantProfile,
    useUpsertProfile,
    useExperiences,
    useUpsertExperience,
    useDeleteExperience,
    useEducation,
    useUpsertEducation,
    useDeleteEducation,
    useProfileSkills,
    useUpsertSkill,
    useDeleteSkill,
    useCertificates,
    useUpsertCertificate,
    useDeleteCertificate,
    useProfileLinks,
    useUpsertLink,
    useDeleteLink,
    useCatalogSearch,
} from "@/hooks/useProfile";
import { searchCatalog, addToCatalog } from "@/services/profileService";
import type {
    Experience,
    Education,
    Skill,
    Certificate,
    ProfileLink,
    CatalogItem,
} from "@/services/profileService";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function DashboardProfile() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
    const savedTimeout = useRef<ReturnType<typeof setTimeout>>();

    // ── Data hooks ──────────────────────────────────────────────────────────
    const { data: profile } = useApplicantProfile();
    const upsertProfile = useUpsertProfile();
    const { data: experiences = [] } = useExperiences();
    const upsertExperience = useUpsertExperience();
    const deleteExperience = useDeleteExperience();
    const { data: education = [] } = useEducation();
    const upsertEducation = useUpsertEducation();
    const deleteEducation = useDeleteEducation();
    const { data: skills = [] } = useProfileSkills();
    const upsertSkill = useUpsertSkill();
    const deleteSkill = useDeleteSkill();
    const { data: certificates = [] } = useCertificates();
    const upsertCertificate = useUpsertCertificate();
    const deleteCertificate = useDeleteCertificate();
    const { data: links = [] } = useProfileLinks();
    const upsertLink = useUpsertLink();
    const deleteLink = useDeleteLink();

    // ── Basics state (autosaved) ────────────────────────────────────────────
    const [headline, setHeadline] = useState("");
    const [summary, setSummary] = useState("");
    const [location, setLocation] = useState("");
    const [phone, setPhone] = useState("");

    // Sync from server
    useEffect(() => {
        if (profile) {
            setHeadline(profile.headline || "");
            setSummary(profile.summary || "");
            setLocation(profile.location || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    // Autosave basics (debounced)
    const autosaveBasics = useCallback(() => {
        if (!user) return;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (savedTimeout.current) clearTimeout(savedTimeout.current);

        saveTimeout.current = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await upsertProfile.mutateAsync({
                    headline: headline || null,
                    summary: summary || null,
                    location: location || null,
                    phone: phone || null,
                    email: user.email || null,
                });
                setSaveStatus("saved");
                savedTimeout.current = setTimeout(() => setSaveStatus("idle"), 3000);
            } catch {
                setSaveStatus("error");
            }
        }, 800);
    }, [headline, summary, location, phone, user, upsertProfile]);

    useEffect(() => {
        if (profile !== undefined) autosaveBasics();
        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            if (savedTimeout.current) clearTimeout(savedTimeout.current);
        };
    }, [headline, summary, location, phone]);

    // ── Modals state ────────────────────────────────────────────────────────
    const [expModalOpen, setExpModalOpen] = useState(false);
    const [editingExp, setEditingExp] = useState<Experience | null>(null);
    const [eduModalOpen, setEduModalOpen] = useState(false);
    const [editingEdu, setEditingEdu] = useState<Education | null>(null);
    const [certModalOpen, setCertModalOpen] = useState(false);
    const [editingCert, setEditingCert] = useState<Certificate | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<ProfileLink | null>(null);

    // ── Skill typeahead ─────────────────────────────────────────────────────
    const [skillQuery, setSkillQuery] = useState("");
    const [skillSuggestions, setSkillSuggestions] = useState<CatalogItem[]>([]);

    const handleSkillSearch = useCallback(async (q: string) => {
        setSkillQuery(q);
        if (q.length < 2) {
            setSkillSuggestions([]);
            return;
        }
        try {
            const results = await searchCatalog("skills_catalog", q);
            setSkillSuggestions(results);
        } catch {
            setSkillSuggestions([]);
        }
    }, []);

    const handleAddSkill = useCallback(
        async (item: CatalogItem) => {
            try {
                await upsertSkill.mutateAsync({
                    skill_id: item.id,
                    skill_name: item.name,
                    category: item.category || null,
                    sort_order: skills.length,
                });
                setSkillQuery("");
                setSkillSuggestions([]);
            } catch (err: any) {
                toast.error(err.message);
            }
        },
        [upsertSkill, skills.length]
    );

    const handleCreateNewSkill = useCallback(
        async (name: string) => {
            try {
                const catalogItem = await addToCatalog("skills_catalog", name);
                await upsertSkill.mutateAsync({
                    skill_id: catalogItem.id,
                    skill_name: name,
                    sort_order: skills.length,
                });
                setSkillQuery("");
                setSkillSuggestions([]);
            } catch (err: any) {
                toast.error(err.message);
            }
        },
        [upsertSkill, skills.length]
    );

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("profile.title", "My Profile")}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t("profile.subtitle", "Your 1-Click Apply profile for verified employer jobs.")}
                    </p>
                </div>
                <AutosaveIndicator status={saveStatus} />
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900 font-semibold">
                    {t("profile.atsNoticeTitle", "1-Click Apply Profile")}
                </AlertTitle>
                <AlertDescription className="text-blue-700/90 mt-1">
                    {t(
                        "profile.atsNoticeDesc",
                        "This profile is used when applying to Verified Employer jobs on our platform. A snapshot is saved with each application."
                    )}
                </AlertDescription>
            </Alert>

            {/* ── Basics ──────────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {t("profile.basics", "Basic Information")}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>{t("profile.headline", "Headline")}</Label>
                        <Input
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            placeholder={t("profile.headlinePlaceholder", "e.g., Senior Software Engineer")}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("profile.location", "Location")}</Label>
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder={t("profile.locationPlaceholder", "e.g., Sofia, Bulgaria")}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>
                            {t("profile.email", "Email")}{" "}
                            <span className="text-xs text-gray-400">({t("profile.locked", "Locked")})</span>
                        </Label>
                        <Input value={user?.email || ""} disabled />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("profile.phone", "Phone")}</Label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+359 ..."
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>{t("profile.summary", "Summary")}</Label>
                    <Textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder={t("profile.summaryPlaceholder", "Brief professional summary...")}
                        rows={3}
                    />
                </div>
            </section>

            {/* ── Experience ──────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                        {t("profile.experience", "Work Experience")}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-blue-600"
                        onClick={() => {
                            setEditingExp(null);
                            setExpModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> {t("profile.addRole", "Add role")}
                    </Button>
                </div>
                {experiences.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                        {t("profile.noExperience", "No experience added yet.")}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {experiences.map((exp) => (
                            <div
                                key={exp.id}
                                className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900">{exp.title}</p>
                                        <p className="text-sm text-blue-600">{exp.company_name}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {exp.start_date} – {exp.is_current ? t("profile.present", "Present") : exp.end_date}
                                            {exp.location && ` · ${exp.location}`}
                                        </p>
                                        {exp.bullets.length > 0 && (
                                            <ul className="mt-2 space-y-1">
                                                {exp.bullets.map((b) => (
                                                    <li key={b.id} className="text-sm text-gray-600 flex items-start gap-1.5">
                                                        <span className="text-gray-300 mt-1">•</span>
                                                        {b.bullet}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {exp.skills.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {exp.skills.map((s) => (
                                                    <Badge key={s.id} variant="secondary" className="text-xs">
                                                        {s.skill_name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                            onClick={() => {
                                                setEditingExp(exp);
                                                setExpModalOpen(true);
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                                            onClick={() => {
                                                if (confirm(t("profile.confirmDelete", "Delete this item?"))) {
                                                    deleteExperience.mutate(exp.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Education ───────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                        {t("profile.education", "Education")}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-purple-600"
                        onClick={() => {
                            setEditingEdu(null);
                            setEduModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> {t("profile.addEducation", "Add")}
                    </Button>
                </div>
                {education.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                        {t("profile.noEducation", "No education added yet.")}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {education.map((edu) => (
                            <div
                                key={edu.id}
                                className="p-4 rounded-lg border border-gray-100 bg-gray-50/50"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                                        </p>
                                        <p className="text-sm text-purple-600">{edu.institution_name}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {edu.start_date || "?"} – {edu.is_current ? t("profile.present", "Present") : edu.end_date || "?"}
                                        </p>
                                        {edu.notes && <p className="text-sm text-gray-600 mt-1">{edu.notes}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-2">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-purple-600" onClick={() => { setEditingEdu(edu); setEduModalOpen(true); }}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => { if (confirm(t("profile.confirmDelete", "Delete this item?"))) deleteEducation.mutate(edu.id); }}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Skills ──────────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Wrench className="h-5 w-5 text-emerald-600" />
                    {t("profile.skills", "Skills")}
                </h2>
                <div className="flex flex-wrap gap-2 mb-3">
                    {skills.map((s) => (
                        <span
                            key={s.id}
                            className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 group"
                        >
                            {s.skill_name}
                            {s.proficiency && (
                                <span className="text-[10px] text-emerald-500 uppercase font-bold">{s.proficiency}</span>
                            )}
                            <button
                                onClick={() => deleteSkill.mutate(s.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 ml-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {skills.length === 0 && (
                        <span className="text-sm text-gray-400 italic">
                            {t("profile.noSkills", "No skills added yet.")}
                        </span>
                    )}
                </div>
                <TypeaheadInput
                    placeholder={t("profile.searchSkill", "Type a skill and press Enter...")}
                    suggestions={skillSuggestions}
                    onSearch={handleSkillSearch}
                    onSelect={handleAddSkill}
                    onCreateNew={handleCreateNewSkill}
                    value={skillQuery}
                    onChange={setSkillQuery}
                />
            </section>

            {/* ── Certificates ────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-600" />
                        {t("profile.certificates", "Certificates")}
                    </h2>
                    <Button variant="ghost" size="sm" className="gap-1 text-amber-600" onClick={() => { setEditingCert(null); setCertModalOpen(true); }}>
                        <Plus className="h-4 w-4" /> {t("profile.addCertificate", "Add")}
                    </Button>
                </div>
                {certificates.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{t("profile.noCertificates", "No certificates added yet.")}</p>
                ) : (
                    <div className="space-y-2">
                        {certificates.map((c) => (
                            <div key={c.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                                    <p className="text-xs text-gray-500">{c.issuer}{c.issue_date && ` · ${c.issue_date}`}</p>
                                </div>
                                <div className="flex gap-1">
                                    {c.credential_url && (
                                        <a href={c.credential_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600"><Link2 className="h-3.5 w-3.5" /></Button>
                                        </a>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-600" onClick={() => { setEditingCert(c); setCertModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => { if (confirm(t("profile.confirmDelete", "Delete this item?"))) deleteCertificate.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Links ───────────────────────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-indigo-600" />
                        {t("profile.links", "Links")}
                    </h2>
                    <Button variant="ghost" size="sm" className="gap-1 text-indigo-600" onClick={() => { setEditingLink(null); setLinkModalOpen(true); }}>
                        <Plus className="h-4 w-4" /> {t("profile.addLink", "Add")}
                    </Button>
                </div>
                {links.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">{t("profile.noLinks", "No links added yet.")}</p>
                ) : (
                    <div className="space-y-2">
                        {links.map((l) => (
                            <div key={l.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 text-sm">{l.label}</p>
                                    <p className="text-xs text-blue-600 truncate">{l.url}</p>
                                </div>
                                <div className="flex gap-1 shrink-0 ml-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" onClick={() => { setEditingLink(l); setLinkModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => { if (confirm(t("profile.confirmDelete", "Delete this item?"))) deleteLink.mutate(l.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Modals ──────────────────────────────────────────────────────── */}
            <ExperienceFormModal
                open={expModalOpen}
                onClose={() => setExpModalOpen(false)}
                experience={editingExp}
                onSave={async (data) => {
                    await upsertExperience.mutateAsync(data);
                    setExpModalOpen(false);
                }}
            />
            <EducationFormModal
                open={eduModalOpen}
                onClose={() => setEduModalOpen(false)}
                education={editingEdu}
                onSave={async (data) => {
                    await upsertEducation.mutateAsync(data);
                    setEduModalOpen(false);
                }}
            />
            <CertificateFormModal
                open={certModalOpen}
                onClose={() => setCertModalOpen(false)}
                certificate={editingCert}
                onSave={async (data) => {
                    await upsertCertificate.mutateAsync(data);
                    setCertModalOpen(false);
                }}
            />
            <LinkFormModal
                open={linkModalOpen}
                onClose={() => setLinkModalOpen(false)}
                link={editingLink}
                onSave={async (data) => {
                    await upsertLink.mutateAsync(data);
                    setLinkModalOpen(false);
                }}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERIENCE FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ExperienceFormModal({
    open,
    onClose,
    experience,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    experience: Experience | null;
    onSave: (data: {
        experience: any;
        bullets: { bullet: string; sort_order: number }[];
        skills: { skill_id?: string | null; skill_name: string }[];
    }) => Promise<void>;
}) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCurrent, setIsCurrent] = useState(false);
    const [loc, setLoc] = useState("");
    const [desc, setDesc] = useState("");
    const [bullets, setBullets] = useState<string[]>([]);
    const [bulletInput, setBulletInput] = useState("");
    const [roleSkills, setRoleSkills] = useState<{ skill_id?: string | null; skill_name: string }[]>([]);
    const [roleSkillQuery, setRoleSkillQuery] = useState("");
    const [roleSkillSuggestions, setRoleSkillSuggestions] = useState<CatalogItem[]>([]);

    // Populate when editing
    useEffect(() => {
        if (open) {
            if (experience) {
                setTitle(experience.title);
                setCompany(experience.company_name);
                setStartDate(experience.start_date || "");
                setEndDate(experience.end_date || "");
                setIsCurrent(experience.is_current);
                setLoc(experience.location || "");
                setDesc(experience.description || "");
                setBullets(experience.bullets.map((b) => b.bullet));
                setRoleSkills(experience.skills.map((s) => ({ skill_id: s.skill_id, skill_name: s.skill_name })));
            } else {
                setTitle("");
                setCompany("");
                setStartDate("");
                setEndDate("");
                setIsCurrent(false);
                setLoc("");
                setDesc("");
                setBullets([]);
                setRoleSkills([]);
            }
            setBulletInput("");
            setRoleSkillQuery("");
        }
    }, [open, experience]);

    const handleSkillSearch = async (q: string) => {
        setRoleSkillQuery(q);
        if (q.length < 2) { setRoleSkillSuggestions([]); return; }
        try {
            const r = await searchCatalog("skills_catalog", q);
            setRoleSkillSuggestions(r);
        } catch { setRoleSkillSuggestions([]); }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !company.trim() || !startDate) return;
        setSaving(true);
        try {
            await onSave({
                experience: {
                    ...(experience?.id ? { id: experience.id } : {}),
                    title: title.trim(),
                    company_name: company.trim(),
                    start_date: startDate,
                    end_date: isCurrent ? null : endDate || null,
                    is_current: isCurrent,
                    location: loc || null,
                    description: desc || null,
                    sort_order: experience?.sort_order ?? 0,
                },
                bullets: bullets.map((b, i) => ({ bullet: b, sort_order: i })),
                skills: roleSkills,
            });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {experience ? t("profile.editExperience", "Edit Experience") : t("profile.addExperience", "Add Experience")}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>{t("profile.jobTitle", "Title")} *</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Software Engineer" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("profile.company", "Company")} *</Label>
                            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Google" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>{t("profile.startDate", "Start date")} *</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("profile.endDate", "End date")}</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isCurrent} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch id="is-current" checked={isCurrent} onCheckedChange={(v) => { setIsCurrent(v); if (v) setEndDate(""); }} />
                        <Label htmlFor="is-current" className="cursor-pointer text-sm">{t("profile.currentlyWorkHere", "I currently work here")}</Label>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("profile.locationOptional", "Location (optional)")}</Label>
                        <Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g., Sofia, Bulgaria" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("profile.descOptional", "Quick notes (optional)")}</Label>
                        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
                    </div>

                    {/* Bullets */}
                    <div className="space-y-2">
                        <Label>{t("profile.achievements", "Achievements / Bullets")}</Label>
                        {bullets.map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-gray-400">•</span>
                                <Input value={b} onChange={(e) => { const arr = [...bullets]; arr[i] = e.target.value; setBullets(arr); }} className="flex-1 h-8 text-sm" />
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => setBullets(bullets.filter((_, idx) => idx !== i))}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <Input
                                value={bulletInput}
                                onChange={(e) => setBulletInput(e.target.value)}
                                placeholder={t("profile.addBullet", "Add achievement and press Enter")}
                                className="h-8 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && bulletInput.trim()) {
                                        e.preventDefault();
                                        setBullets([...bullets, bulletInput.trim()]);
                                        setBulletInput("");
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Role-specific skills */}
                    <div className="space-y-2">
                        <Label>{t("profile.roleSkills", "Role-specific skills")}</Label>
                        <div className="flex flex-wrap gap-1 mb-1">
                            {roleSkills.map((s, i) => (
                                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                    {s.skill_name}
                                    <button onClick={() => setRoleSkills(roleSkills.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                                </Badge>
                            ))}
                        </div>
                        <TypeaheadInput
                            placeholder={t("profile.searchSkill", "Type a skill...")}
                            suggestions={roleSkillSuggestions}
                            onSearch={handleSkillSearch}
                            onSelect={(item) => {
                                setRoleSkills([...roleSkills, { skill_id: item.id, skill_name: item.name }]);
                                setRoleSkillQuery("");
                                setRoleSkillSuggestions([]);
                            }}
                            onCreateNew={(name) => {
                                setRoleSkills([...roleSkills, { skill_name: name }]);
                                setRoleSkillQuery("");
                            }}
                            value={roleSkillQuery}
                            onChange={setRoleSkillQuery}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={saving || !title.trim() || !company.trim() || !startDate}>
                        {saving ? t("profile.saving", "Saving...") : t("common.save", "Save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATION FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function EducationFormModal({
    open,
    onClose,
    education,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    education: Education | null;
    onSave: (data: Partial<Education>) => Promise<void>;
}) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [institution, setInstitution] = useState("");
    const [degree, setDegree] = useState("");
    const [field, setField] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCurrent, setIsCurrent] = useState(false);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (open) {
            if (education) {
                setInstitution(education.institution_name);
                setDegree(education.degree || "");
                setField(education.field_of_study || "");
                setStartDate(education.start_date || "");
                setEndDate(education.end_date || "");
                setIsCurrent(education.is_current);
                setNotes(education.notes || "");
            } else {
                setInstitution(""); setDegree(""); setField("");
                setStartDate(""); setEndDate(""); setIsCurrent(false); setNotes("");
            }
        }
    }, [open, education]);

    const handleSubmit = async () => {
        if (!institution.trim()) return;
        setSaving(true);
        try {
            await onSave({
                ...(education?.id ? { id: education.id } : {}),
                institution_name: institution.trim(),
                degree: degree || null,
                field_of_study: field || null,
                start_date: startDate || null,
                end_date: isCurrent ? null : endDate || null,
                is_current: isCurrent,
                notes: notes || null,
                sort_order: education?.sort_order ?? 0,
            });
        } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{education ? t("profile.editEducation", "Edit Education") : t("profile.addEducation", "Add Education")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5"><Label>{t("profile.institution", "Institution")} *</Label><Input value={institution} onChange={(e) => setInstitution(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>{t("profile.degree", "Degree")}</Label><Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="e.g., BSc" /></div>
                        <div className="space-y-1.5"><Label>{t("profile.fieldOfStudy", "Field of study")}</Label><Input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g., Computer Science" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>{t("profile.startDate", "Start date")}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>{t("profile.endDate", "End date")}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isCurrent} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch id="edu-current" checked={isCurrent} onCheckedChange={(v) => { setIsCurrent(v); if (v) setEndDate(""); }} />
                        <Label htmlFor="edu-current" className="cursor-pointer text-sm">{t("profile.currentlyStudying", "Currently studying here")}</Label>
                    </div>
                    <div className="space-y-1.5"><Label>{t("profile.notes", "Notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={saving || !institution.trim()}>{saving ? t("profile.saving", "Saving...") : t("common.save", "Save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATE FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function CertificateFormModal({
    open, onClose, certificate, onSave,
}: {
    open: boolean; onClose: () => void; certificate: Certificate | null;
    onSave: (data: Partial<Certificate>) => Promise<void>;
}) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [issuer, setIssuer] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [credUrl, setCredUrl] = useState("");

    useEffect(() => {
        if (open) {
            if (certificate) {
                setName(certificate.name); setIssuer(certificate.issuer || "");
                setIssueDate(certificate.issue_date || ""); setExpiryDate(certificate.expiry_date || "");
                setCredUrl(certificate.credential_url || "");
            } else { setName(""); setIssuer(""); setIssueDate(""); setExpiryDate(""); setCredUrl(""); }
        }
    }, [open, certificate]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave({
                ...(certificate?.id ? { id: certificate.id } : {}),
                name: name.trim(), issuer: issuer || null, issue_date: issueDate || null,
                expiry_date: expiryDate || null, credential_url: credUrl || null,
                sort_order: certificate?.sort_order ?? 0,
            });
        } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{certificate ? t("profile.editCert", "Edit Certificate") : t("profile.addCert", "Add Certificate")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5"><Label>{t("profile.certName", "Certificate name")} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>{t("profile.issuer", "Issuer")}</Label><Input value={issuer} onChange={(e) => setIssuer(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>{t("profile.issueDate", "Issue date")}</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>{t("profile.expiryDate", "Expiry date")}</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1.5"><Label>{t("profile.credentialUrl", "Credential URL")}</Label><Input value={credUrl} onChange={(e) => setCredUrl(e.target.value)} placeholder="https://..." /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={saving || !name.trim()}>{saving ? t("profile.saving", "Saving...") : t("common.save", "Save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINK FORM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function LinkFormModal({
    open, onClose, link, onSave,
}: {
    open: boolean; onClose: () => void; link: ProfileLink | null;
    onSave: (data: Partial<ProfileLink>) => Promise<void>;
}) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [label, setLabel] = useState("");
    const [url, setUrl] = useState("");

    useEffect(() => {
        if (open) {
            if (link) { setLabel(link.label); setUrl(link.url); } else { setLabel(""); setUrl(""); }
        }
    }, [open, link]);

    const handleSubmit = async () => {
        if (!label.trim() || !url.trim()) return;
        setSaving(true);
        try {
            await onSave({
                ...(link?.id ? { id: link.id } : {}),
                label: label.trim(), url: url.trim(), sort_order: link?.sort_order ?? 0,
            });
        } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{link ? t("profile.editLink", "Edit Link") : t("profile.addLink", "Add Link")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t("profile.linkLabel", "Label")} *</Label>
                        <Select value={label} onValueChange={setLabel}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                                <SelectItem value="GitHub">GitHub</SelectItem>
                                <SelectItem value="Portfolio">Portfolio</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5"><Label>URL *</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={saving || !label.trim() || !url.trim()}>{saving ? t("profile.saving", "Saving...") : t("common.save", "Save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
