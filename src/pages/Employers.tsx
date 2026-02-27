import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Columns, Sparkles, Zap, Building2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Employers() {
    const { t, i18n } = useTranslation();

    const isBg = i18n.language === "bg";

    return (
        <Layout>
            <div className="bg-slate-50 min-h-screen">
                {/* HERO SECTION */}
                <section className="relative px-6 pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute inset-0 bg-blue-600/5 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

                    <Badge className="mb-6 px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                        <Building2 className="w-3.5 h-3.5 mr-2" />
                        {isBg ? "За работодатели: Фаза 2 е активна" : "For Employers: Phase 2 is Live"}
                    </Badge>

                    <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
                        {isBg ? "Наемете най-добрите таланти в България по-бързо" : "Hire Bulgaria's Top Talent Faster"}
                    </h1>

                    <p className="max-w-2xl text-lg md:text-xl text-slate-600 mb-10 leading-relaxed font-medium">
                        {isBg
                            ? "Пълноценният портал за работа, който автоматично свързва проверени професионалисти с вашите отворени позиции."
                            : "The comprehensive job hub that automatically matches verified professionals with your open roles."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                        <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-600/25 transition-all">
                            {isBg ? "Запази Демо" : "Book a Demo"}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold bg-white border-slate-200 hover:bg-slate-50">
                            {isBg ? "Регистрирай се сега" : "Sign Up Now"}
                        </Button>
                    </div>
                </section>

                {/* FEATURES GRID */}
                <section className="py-24 bg-white border-t border-slate-100">
                    <div className="container px-6 max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                {isBg ? "Ускорете процеса си на подбор" : "Accelerate Your Hiring Pipeline"}
                            </h2>
                            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                                {isBg ? "Забравете за ръчното сортиране. Нашият портал свързва кандидати директно с вашата обява." : "Stop manual resume sorting. Our job hub pipes qualified ATS applicants directly into your dashboard."}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Feature 1 */}
                            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                                    <Columns className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">
                                    {isBg ? "Интерактивен процес на кандидатстване" : "Interactive Applicant Pipeline"}
                                </h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {isBg ? "Управлявайте кандидатите визуално чрез персонализирани етапи." : "Manage candidates visually through custom stages."}
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full blur-2xl" />
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 relative">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 relative">
                                    {isBg ? "AI-оптимизирано класиране на кандидати" : "AI-Powered Applicant Ranking"}
                                </h3>
                                <p className="text-slate-600 leading-relaxed font-medium relative">
                                    {isBg ? "Автоматично съвпадение и класиране на профилите на кандидатите спрямо вашите изисквания." : "Automatically match and rank candidate profiles to your job requirements."}
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">
                                    {isBg ? "Директно публикуване и бързо кандидатстване" : "Direct Posting & Easy Apply"}
                                </h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {isBg ? "Позволете на кандидатите да кандидатстват с един клик, използвайки своите профили в платформата." : "Allow candidates to apply in one click using their platform profiles."}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PRICING SECTION */}
                <section className="py-24 bg-slate-50">
                    <div className="container px-6 max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">
                                {isBg ? "Ясни планове за всеки бизнес" : "Clear Plans for Every Business"}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Free Tier */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{isBg ? "Базов" : "Free Tier"}</h3>
                                <p className="text-slate-500 mb-6">{isBg ? "Идеален за започване." : "Perfect for getting started."}</p>
                                <div className="text-4xl font-bold text-slate-900 mb-6">$0<span className="text-lg text-slate-400 font-normal">/mo</span></div>
                                <ul className="space-y-4 mb-8">
                                    {["1 Active Job Post", "Basic Pipeline View", "Community Support"].map(ft => (
                                        <li key={ft} className="flex items-center text-slate-600"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" /> {ft}</li>
                                    ))}
                                </ul>
                                <Button variant="outline" className="w-full">Get Started</Button>
                            </div>

                            {/* Growth Tier */}
                            <div className="bg-blue-600 p-8 rounded-2xl border-none shadow-xl shadow-blue-900/10 transform md:-translate-y-4">
                                <div className="inline-block px-3 py-1 bg-blue-500 text-blue-50 text-xs font-bold uppercase rounded-full mb-4">Most Popular</div>
                                <h3 className="text-xl font-bold text-white mb-2">{isBg ? "Растеж" : "Growth"}</h3>
                                <p className="text-blue-200 mb-6">{isBg ? "За мащабни екипи." : "For scaling teams."}</p>
                                <div className="text-4xl font-bold text-white mb-6">$99<span className="text-lg text-blue-300 font-normal">/mo</span></div>
                                <ul className="space-y-4 mb-8">
                                    {["10 Active Job Posts", "AI Ranking Output", "1-Click Apply Connect", "Priority Support"].map(ft => (
                                        <li key={ft} className="flex items-center text-blue-50"><CheckCircle2 className="w-5 h-5 text-blue-300 mr-3" /> {ft}</li>
                                    ))}
                                </ul>
                                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">Start Free Trial</Button>
                            </div>

                            {/* Enterprise */}
                            <div className="bg-white p-8 rounded-2xl border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{isBg ? "Корпоративен" : "Enterprise"}</h3>
                                <p className="text-slate-500 mb-6">{isBg ? "Неограничени възможности." : "Unlimited possibilities."}</p>
                                <div className="text-4xl font-bold text-slate-900 mb-6">Custom</div>
                                <ul className="space-y-4 mb-8">
                                    {["Unlimited Job Posts", "White-labeled ATS", "Dedicated Account Rep", "Custom Integrations"].map(ft => (
                                        <li key={ft} className="flex items-center text-slate-600"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" /> {ft}</li>
                                    ))}
                                </ul>
                                <Button variant="outline" className="w-full">Contact Sales</Button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}

// Temporary internal component missing export fix
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>{children}</div>;
}
