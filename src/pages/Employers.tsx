import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Columns, Sparkles, Zap, Building2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Employers() {
    const { t, i18n } = useTranslation();
    const isBg = i18n.language === "bg";

    return (
        <Layout>
            <div className="bg-background min-h-screen text-foreground selection:bg-primary/20">
                {/* HERO SECTION */}
                <section className="relative px-6 pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute inset-0 bg-primary/5 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

                    <Badge variant="outline" className="mb-8 px-4 py-1.5 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 font-medium transition-colors text-sm rounded-full">
                        <Building2 className="w-4 h-4 mr-2" />
                        {isBg ? "За работодатели: Фаза 2 е активна" : "For Employers: ATS Phase 2 is Live"}
                    </Badge>

                    <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tighter text-foreground mb-6 drop-shadow-sm font-display leading-[1.1]">
                        {isBg ? "Наемете най-добрите таланти в България по-бързо" : "Hire Bulgaria's Top Talent Faster."}
                    </h1>

                    <p className="max-w-2xl text-xl text-muted-foreground mb-10 leading-relaxed font-medium">
                        {isBg
                            ? "Пълноценният портал за работа, който автоматично свързва проверени професионалисти с вашите отворени позиции."
                            : "The comprehensive job hub that actively matches verified professionals with your open roles."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto px-4 z-10">
                        <Button size="lg" className="h-14 px-8 w-full sm:w-auto text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all rounded-xl">
                            {isBg ? "Запази Демо" : "Book a Demo"}
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-8 w-full sm:w-auto text-lg font-semibold transition-all rounded-xl border-border hover:bg-muted bg-background">
                            {isBg ? "Регистрирай се" : "Sign Up"}
                        </Button>
                    </div>
                </section>

                {/* FEATURES GRID */}
                <section className="py-24 bg-card/50 border-y border-border relative">
                    <div className="container px-6 max-w-6xl mx-auto relative z-10">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                                {isBg ? "Ускорете процеса си на подбор" : "Accelerate Your Hiring Pipeline"}
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
                                {isBg ? "Забравете за ръчното сортиране. Нашият портал насочва квалифицирани кандидати директно към вашето табло." : "Stop manual resume sorting. Our job hub routes qualified ATS applicants directly into your dashboard."}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<Columns className="w-6 h-6 text-indigo-500" />}
                                iconBg="bg-indigo-500/10"
                                title={isBg ? "Интерактивен процес на кандидатстване" : "Interactive Pipeline"}
                                desc={isBg ? "Управлявайте кандидатите визуално чрез персонализирани етапи." : "Manage candidates visually through highly customizable, modular applicant stages."}
                            />
                            <FeatureCard
                                icon={<Sparkles className="w-6 h-6 text-amber-500" />}
                                iconBg="bg-amber-500/10"
                                title={isBg ? "AI-оптимизирано класиране" : "AI-Powered Ranking"}
                                desc={isBg ? "Автоматично съвпадение и класиране на профилите на кандидатите спрямо вашите специфични изисквания." : "Automatically match and rank candidate CVs directly to your defined job requirements."}
                            />
                            <FeatureCard
                                icon={<Zap className="w-6 h-6 text-emerald-500" />}
                                iconBg="bg-emerald-500/10"
                                title={isBg ? "Бързо кандидатстване" : "Easy Apply Infrastructure"}
                                desc={isBg ? "Позволете на кандидатите да кандидатстват с един клик, намалявайки спада с над 60%." : "Allow candidates to apply in one click using platform profiles, drastically accelerating funnels."}
                            />
                        </div>
                    </div>
                </section>

                {/* PRICING SECTION */}
                <section className="py-24 bg-background">
                    <div className="container px-6 max-w-6xl mx-auto">
                        <div className="text-center mb-16 flex flex-col items-center">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/20">Pricing</Badge>
                            <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                                {isBg ? "Ясни планове за всеки бизнес" : "Clear Plans for Every Business"}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                            <PricingCard
                                title={isBg ? "Базов" : "Starter"}
                                price="$0"
                                desc={isBg ? "Идеален за започване." : "Perfect for getting started."}
                                features={["1 Active Job Post", "Basic Pipeline View", "Community Support"]}
                            />
                            <PricingCard
                                title={isBg ? "Растеж" : "Growth"}
                                price="$99"
                                desc={isBg ? "За мащабни екипи." : "For scaling teams."}
                                features={["10 Active Job Posts", "AI Ranking Output", "1-Click Apply Connect", "Priority Support"]}
                                isPopular
                            />
                            <PricingCard
                                title={isBg ? "Корпоративен" : "Enterprise"}
                                price="Custom"
                                desc={isBg ? "Неограничени възможности." : "Unlimited possibilities."}
                                features={["Unlimited Job Posts", "White-labeled ATS", "Dedicated Account Rep", "Custom Integrations"]}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
}

function FeatureCard({ icon, iconBg, title, desc }: { icon: React.ReactNode, iconBg: string, title: string, desc: string }) {
    return (
        <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group">
            <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed font-medium">{desc}</p>
        </div>
    );
}

function PricingCard({ title, price, desc, features, isPopular }: { title: string, price: string, desc: string, features: string[], isPopular?: boolean }) {
    return (
        <div className={`p-8 rounded-2xl border flex flex-col h-full ${isPopular ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 md:-translate-y-4 relative' : 'border-border bg-card'}`}>
            {isPopular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase rounded-full shadow-md">Most Popular</div>}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
            </div>
            <div className="text-4xl font-extrabold text-foreground mb-6 font-display">
                {price}
                {price !== "Custom" && <span className="text-lg text-muted-foreground font-normal tracking-normal">/mo</span>}
            </div>
            <ul className="space-y-4 mb-8 flex-1">
                {features.map((ft, i) => (
                    <li key={i} className="flex items-start text-foreground font-medium text-sm md:text-base">
                        <CheckCircle2 className="w-5 h-5 text-primary mr-3 shrink-0 mt-0.5" />
                        <span>{ft}</span>
                    </li>
                ))}
            </ul>
            <Button variant={isPopular ? "default" : "outline"} className={`w-full h-12 rounded-xl text-base font-semibold ${isPopular ? 'shadow-lg shadow-primary/20' : 'bg-background hover:bg-muted'}`}>
                {price === "Custom" ? "Contact Sales" : "Get Started"}
            </Button>
        </div>
    );
}
