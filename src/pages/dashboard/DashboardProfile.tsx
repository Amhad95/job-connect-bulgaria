import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, Save, Upload, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

export default function DashboardProfile() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Basic Info
    const [fullName, setFullName] = useState("");

    // JSONB blocks
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    const [experience, setExperience] = useState<any[]>([]);
    const [education, setEducation] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            loadProfileData();
        }
    }, [user]);

    const loadProfileData = async () => {
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setFullName(data.full_name || "");
            // Cast the JSON blobs into arrays
            setSkills((data as any).skills_json || []);
            setExperience((data as any).experience_json || []);
            setEducation((data as any).education_json || []);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        const { error } = await supabase.from('profiles').update({
            full_name: fullName,
            skills_json: skills,
            experience_json: experience,
            education_json: education
        }).eq('id', user.id);

        if (error) {
            toast.error(t("dashboard.saveError", "Failed to save profile."));
        } else {
            toast.success(t("dashboard.saveSuccess", "Profile successfully updated!"));
        }
        setLoading(false);
    };

    const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && skillInput.trim() !== '') {
            e.preventDefault();
            setSkills(prev => [...new Set([...prev, skillInput.trim()])]);
            setSkillInput("");
        }
    };

    const addExperienceBlock = () => {
        setExperience([...experience, { company: "", role: "", years: "" }]);
    };

    const updateExperience = (index: number, key: string, val: string) => {
        const updated = [...experience];
        updated[index][key] = val;
        setExperience(updated);
    };

    const addEducationBlock = () => {
        setEducation([...education, { institution: "", degree: "", year: "" }]);
    };

    const updateEducation = (index: number, key: string, val: string) => {
        const updated = [...education];
        updated[index][key] = val;
        setEducation(updated);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("dashboard.profile", "My Profile")}
                </h1>
                <p className="text-gray-500 mt-1">Manage your internal ATS data and resume configuration.</p>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900 font-semibold">{t("dashboard.bannerTitle", "Important ATS Notice")}</AlertTitle>
                <AlertDescription className="text-blue-700/90 mt-1">
                    {t("dashboard.bannerDesc", "Your profile will be used for 1-Click Apply to Verified Employers on our platform.")}
                </AlertDescription>
            </Alert>

            <div className="grid gap-8 bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">

                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Basic Info</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email <span className="text-xs text-gray-400">(Locked)</span></Label>
                            <Input value={user?.email || ""} disabled />
                        </div>
                    </div>
                </div>

                {/* Resume */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Master Resume</h3>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Upload PDF Resume</p>
                        <p className="text-xs text-gray-500 mb-4">Max 5MB. Will automatically parse into fields below if capable.</p>
                        <Button variant="outline" size="sm">Select File</Button>
                    </div>
                </div>

                {/* Experience */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-lg font-semibold">Experience</h3>
                        <Button variant="ghost" size="sm" onClick={addExperienceBlock} className="h-8 gap-1 text-primary"><Plus className="w-4 h-4" /> Add Role</Button>
                    </div>
                    {experience.length === 0 && <p className="text-sm text-gray-500 italic">No experience added yet.</p>}
                    <div className="space-y-4">
                        {experience.map((exp, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-lg border flex gap-4 relative pr-10">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-red-600" onClick={() => setExperience(experience.filter((_, idx) => idx !== i))}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <div className="grid md:grid-cols-2 gap-3 w-full">
                                    <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} className="h-8 text-sm" /></div>
                                    <div className="space-y-1"><Label className="text-xs">Title / Role</Label><Input value={exp.role} onChange={e => updateExperience(i, 'role', e.target.value)} className="h-8 text-sm" /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Education */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-lg font-semibold">Education</h3>
                        <Button variant="ghost" size="sm" onClick={addEducationBlock} className="h-8 gap-1 text-primary"><Plus className="w-4 h-4" /> Add Degree</Button>
                    </div>
                    {education.length === 0 && <p className="text-sm text-gray-500 italic">No education added yet.</p>}
                    <div className="space-y-4">
                        {education.map((edu, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-lg border flex gap-4 relative pr-10">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-gray-400 hover:text-red-600" onClick={() => setEducation(education.filter((_, idx) => idx !== i))}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                                <div className="grid md:grid-cols-2 gap-3 w-full">
                                    <div className="space-y-1"><Label className="text-xs">Institution</Label><Input value={edu.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} className="h-8 text-sm" /></div>
                                    <div className="space-y-1"><Label className="text-xs">Degree</Label><Input value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} className="h-8 text-sm" /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Skills</h3>
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {skills.map((s, i) => (
                                <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                                    {s}
                                    <button onClick={() => setSkills(skills.filter(sk => sk !== s))} className="hover:text-blue-900 ml-1">×</button>
                                </span>
                            ))}
                            {skills.length === 0 && <span className="text-sm text-gray-500 italic">No skills listed</span>}
                        </div>
                        <Input
                            placeholder="Type a skill and press Enter (e.g. React, Python)"
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={addSkill}
                        />
                    </div>
                </div>

            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={loading} className="gap-2 px-8">
                    <Save className="w-4 h-4" /> Save Configuration
                </Button>
            </div>
        </div>
    );
}
