import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Search, Upload, ExternalLink, ArrowRight, TrendingUp,
  Globe, CheckCircle, Shield, Trash2, Zap,
  User, LayoutGrid, BadgeCheck, FileText, Sparkles, PenLine, Target,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import heroIllustration from "@/assets/hero-illustration.svg";
import { useState } from "react";



export default function Index() {
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === "bg";
  const { data: jobs = [] } = useJobs();
  const trendingJobs = jobs.slice(0, 6);
  const recentJobs = jobs.slice(0, 4);

  const roleTagKeys = [
    "hero.roleTags.softwareEngineer",
    "hero.roleTags.marketing",
    "hero.roleTags.dataAnalyst",
    "hero.roleTags.projectManager",
    "hero.roleTags.designer",
    "hero.roleTags.sales",
    "hero.roleTags.accountant",
    "hero.roleTags.developer",
    "hero.roleTags.remote",
  ] as const;

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-highlight/5 bg-white/70 backdrop-blur-[1px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-l from-sky-200/90 via-sky-100/50 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_right,rgba(56,189,248,0.35),rgba(56,189,248,0.00)_60%)]" />
        <div className="container grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <h1 className="max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in drop-shadow-sm">
              {isBg ? "Спрете да прескачате между кариерните страници." : "Stop jumping between career pages."}
            </h1>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-fade-in leading-relaxed font-medium">
              {isBg
                ? "Ние следим пазара вместо вас. Открийте хиляди обяви, събрани от целия уеб, и кандидатствайте мигновено при нашите Потвърдени работодатели – всичко от един централизиран хъб."
                : "We track the market so you don't have to. Discover thousands of roles curated from across the web, and apply instantly to our Verified Employers—all from one centralized hub."}
            </p>

            {/* Search bar */}
            <div className="flex w-full max-w-xl items-center gap-2 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("jobs.searchPlaceholder")}
                  className="flex h-12 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Link to="/jobs">
                <Button size="lg" className="h-12 rounded-xl px-6 font-display font-semibold shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5">
                  {t("hero.primaryCta")}
                </Button>
              </Link>
            </div>

            <Link to="/apply-kit" className="self-center md:self-start">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                {t("hero.secondaryCta")}
              </Button>
            </Link>

            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {roleTagKeys.map((key) => (
                <Link
                  key={key}
                  to={`/jobs?q=${encodeURIComponent(t(key))}`}
                  className="rounded-pill border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {t(key)}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center animate-fade-in">
            <img src={heroIllustration} alt="Career growth illustration" className="w-full max-w-md drop-shadow-lg" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y bg-card">
        <div className="container flex flex-col items-center gap-6 py-5 md:flex-row md:justify-center md:gap-12">
          <TrustItem icon={<ExternalLink className="h-4 w-4 text-primary" />} text={t("trust.directLinks")} />
          <TrustItem icon={<Shield className="h-4 w-4 text-success" />} text={t("trust.sourceShown")} />
          <TrustItem icon={<Trash2 className="h-4 w-4 text-destructive" />} text={t("trust.deleteAnytime")} />
        </div>
      </section>

      {/* Trending Jobs */}
      <section className="bg-surface">
        <div className="container py-16 md:py-20">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.trendingJobs")}</h2>
            </div>
            <Link to="/jobs" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
              {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trendingJobs.map((job) => (
              <Link key={job.id} to={`/jobs?id=${job.id}`}>
                <JobCard job={job} />
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center md:hidden">
            <Link to="/jobs">
              <Button variant="outline" className="gap-2">
                {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: How It Works ── */}
      <section className="bg-sky-50 border-y border-sky-100 py-20" aria-labelledby="how-it-works-heading">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center">
            {isBg ? "Как работи" : "How it works"}
          </span>
          <h2 id="how-it-works-heading" className="text-3xl font-bold text-center mb-4 text-gray-900">
            {isBg ? "Два начина да откриете следващата си роля" : "Two ways to find your next role"}
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-3xl mx-auto mb-12">
            {isBg
              ? "Изберете подхода според обявата. Ясно показваме дали кандидатствате в оригиналния източник или директно през платформата."
              : "Choose the path that matches the job post. We make it obvious whether you're applying on the source website or directly through us."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card A — External Listing */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Globe className="w-10 h-10 text-blue-600 mb-6" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Покритие на целия пазар" : "Market-Wide Discovery"}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                {isBg
                  ? "Подбираме външни обяви от публични кариерни страници и ATS системи. Когато видите баджа, ви водим към официалната обява за кандидатстване."
                  : "We curate external listings from public company career pages and ATS sources. When you see the badge, we send you to the official job page to apply."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                  {t("badges.externalListing")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700">
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  {isBg ? "Към сайта на работодателя" : "Apply on employer site"}
                </span>
              </div>
            </div>

            {/* Card B — Verified Employer */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <Zap className="w-10 h-10 text-blue-600 mb-6" aria-hidden="true" />
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                {isBg ? "Директно кандидатстване с 1 клик" : "1-Click Direct Apply"}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                {isBg
                  ? "Търсете баджа 'Verified Employer'. Тези компании публикуват директно и можете да кандидатствате веднага със запазения си профил."
                  : "Look for the 'Verified Employer' badge. These companies post roles directly, so you can apply instantly using your saved profile."}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-700">
                  <CheckCircle className="w-3 h-3" aria-hidden="true" />
                  {t("badges.verifiedEmployer")}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700">
                  {isBg ? "Кандидатствайте тук" : "Apply here"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Candidate Tools ── */}
      <section className="bg-white py-20" aria-labelledby="candidate-tools-heading">
        <div className="max-w-6xl mx-auto px-4">
          <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block text-center md:text-left">
            {isBg ? "За кандидати" : "For Candidates"}
          </span>
          <h2 id="candidate-tools-heading" className="text-3xl font-bold mb-4 text-gray-900 text-center md:text-left">
            {isBg ? "Търсенето ви на работа, най-накрая организирано." : "Your job search, finally organized."}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mb-12 text-center md:text-left">
            {isBg
              ? "Запазете профила си веднъж и следете външни кандидатури и директни кандидатствания едно до друго. Без разхвърляни бележки и изгубени линкове."
              : "Save your profile once, then track external applications and direct applies side-by-side. No more messy notes, lost links, or duplicated effort."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Direct Apply + Saved Profile */}
            <FeatureTile
              icon={<User className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Кандидатсвайте със запазения си профил" : "Apply with your saved profile"}
              desc={isBg ? "За позиции от Verified Employer кандидатсвайте за секунди с профила, който създавате веднъж." : "For Verified Employer roles, apply in seconds using the profile you build once."}
              bullets={isBg
                ? ["Един профил за много позиции", "По-бързо кандидатстване при verified обяви"]
                : ["Reuse one profile across roles", "Faster applications for verified postings"]}
            />
            {/* Card 2 — Application Tracking */}
            <FeatureTile
              icon={<LayoutGrid className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Следете всички кандидатури на едно място" : "Track every application in one place"}
              desc={isBg ? "Държете външни кандидатури и директни кандидатствания едно до друго, с ясен статус и линкове." : "Keep external applications and direct applies side-by-side, with clear status and links."}
              bullets={isBg
                ? ["Външни + verified в една дъска", "Никога не губите линка към източника"]
                : ["External + verified in one board", "Never lose the source link"]}
            />
            {/* Card 3 — AI CV Tailoring */}
            <FeatureTile
              icon={<FileText className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "AI адаптиране на CV за всяка позиция" : "AI CV tailoring for any role"}
              desc={isBg ? "Поставете описанието на позицията и генерирайте версия на CV, съобразена с изискванията." : "Paste a job description and generate a tailored CV version aligned to the requirements."}
              bullets={isBg
                ? ["Подходящи формулировки и ключови думи", "Подобрява сигналите за процент на съвпадение"]
                : ["Role-specific phrasing and keywords", "Improves match percentage signals"]}
            />
            {/* Card 4 — AI Cover Letter */}
            <FeatureTile
              icon={<PenLine className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "AI мотивационни писма според позицията" : "AI cover letters that fit the job"}
              desc={isBg ? "Генерирайте фокусирано писмо от профила си и описанието на позицията, после го редактирайте преди изпращане." : "Generate a focused cover letter from your profile and the job description, then edit before sending."}
              bullets={isBg
                ? ["Контрол на тон и дължина", "Остава релевантно към позицията"]
                : ["Tone and length controls", "Keeps it relevant to the role"]}
            />
            {/* Card 5 — AI Job Suggestions */}
            <FeatureTile
              icon={<Sparkles className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Персонализирани AI предложения за работа" : "AI job suggestions, personalized"}
              desc={isBg ? "Получавайте препоръки според профила си, активността си и позициите, които разглеждате." : "Get recommendations based on your profile, activity, and the roles you engage with."}
              bullets={isBg
                ? ["По-малко скролване, по-релевантни позиции", "Препоръките се подобряват с времето"]
                : ["Less scrolling, more relevant roles", "Suggestions improve over time"]}
            />
            {/* Card 6 — Match Clarity */}
            <FeatureTile
              icon={<Target className="w-5 h-5 text-blue-600" aria-hidden="true" />}
              title={isBg ? "Ясни сигнали: източник, проверка, съвпадение" : "Clear signals: source, verification, match"}
              desc={isBg ? "Винаги знаете къде кандидатствате, дали е verified, и колко добре съвпада профилът ви." : "Always know where you're applying, whether it's verified, and how well your profile matches."}
              bullets={isBg
                ? ["Verified срещу External с един поглед", "Насоки според процент на съвпадение"]
                : ["Verified vs External at a glance", "Match percentage guidance"]}
            />
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              aria-label={isBg ? "Създайте профил" : "Create your profile"}
              className="inline-flex justify-center items-center rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              {isBg ? "Създайте профил" : "Create your profile"}
            </Link>
            <Link
              to="/tools"
              aria-label={isBg ? "Пробвайте AI адаптиране" : "Try AI tailoring"}
              className="inline-flex justify-center items-center rounded-full border border-gray-300 bg-white px-8 py-4 text-gray-900 font-semibold text-lg hover:bg-gray-50 transition-colors"
            >
              {isBg ? "Пробвайте AI адаптиране" : "Try AI tailoring"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Employer Workflow ── */}
      <section className="bg-slate-50 py-20" aria-labelledby="employer-heading">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left column */}
            <div>
              <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-3 block">
                {isBg ? "За работодатели" : "For Employers"}
              </span>
              <h2 id="employer-heading" className="text-3xl font-bold mb-4 text-gray-900">
                {isBg
                  ? "Цялостен ATS с AI класиране, вграден в подбора ви."
                  : "A full ATS with AI ranking, built into your hiring."}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                {isBg
                  ? "Изберете пакет и се регистрирайте, за да отключите публикуване на позиции, управление на процеса, филтри и AI класиране на кандидати. Ако компанията ви вече присъства, можете да я заявите и да поискате верификация."
                  : "Choose a package and sign up to unlock job posting, pipeline management, filtering, and AI-ranked applicants. If your company already appears on the platform, you can also claim it and request verification."}
              </p>

              <ul className="space-y-4" aria-label={isBg ? "Какво получавате" : "What you get"}>
                {[
                  { icon: <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "AI-ranked applicants and match scoring", bg: "AI класиране на кандидати и оценки за съвпадение" },
                  { icon: <Target className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Filters and shortlists", bg: "Филтри и кратки списъци" },
                  { icon: <LayoutGrid className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Pipeline stages (ATS workflow)", bg: "Етапи на процеса (ATS работен поток)" },
                  { icon: <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />, en: "Verified Employer badge for trusted direct apply", bg: "Бадж Verified Employer за доверено директно кандидатстване" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {item.icon}
                    <span className="text-gray-700">{isBg ? item.bg : item.en}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/pricing"
                aria-label={isBg ? "Вижте пакетите за работодатели" : "View employer packages"}
                className="mt-10 inline-flex justify-center items-center rounded-full bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                {isBg ? "Вижте пакетите за работодатели" : "View employer packages"}
              </Link>
            </div>

            {/* Right column — stepper */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <h3 className="text-lg font-semibold mb-6 text-gray-900">
                {isBg ? "Как работи за работодатели" : "How it works for employers"}
              </h3>
              <ol className="space-y-6" aria-label={isBg ? "Стъпки за работодатели" : "Employer steps"}>
                {[
                  {
                    n: "1",
                    en: ["Pick a package and sign up", "Create your employer workspace in minutes."],
                    bg: ["Изберете пакет и се регистрирайте", "Създайте работодателско пространство за минути."],
                  },
                  {
                    n: "2",
                    en: ["Add company details (or request listing)", "If you're not listed yet, you can still onboard and publish."],
                    bg: ["Добавете данни за компанията (или поискайте добавяне)", "Ако още не сте налични, пак можете да се включите и да публикувате."],
                  },
                  {
                    n: "3",
                    en: ["Post roles and define requirements", "Capture skills, seniority, and must-haves for better ranking."],
                    bg: ["Публикувайте позиции и задайте изисквания", "Опишете умения, ниво и ключови изисквания за по-добро класиране."],
                  },
                  {
                    n: "4",
                    en: ["Review an AI-ranked pipeline", "Filter, shortlist, and move candidates through stages like a modern ATS."],
                    bg: ["Прегледайте AI-класиран процес", "Филтрирайте, селектирайте и движете кандидатите по етапи като в модерен ATS."],
                  },
                ].map((step) => (
                  <li key={step.n} className="flex items-start gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold" aria-hidden="true">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{isBg ? step.bg[0] : step.en[0]}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{isBg ? step.bg[1] : step.en[1]}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Blue Billboard CTA ── */}
      <section className="py-16 px-4" aria-labelledby="billboard-heading">
        <div className="bg-blue-600 rounded-3xl max-w-6xl mx-auto px-6 py-16 md:py-20 text-center text-white shadow-xl">
          <h2 id="billboard-heading" className="text-3xl md:text-5xl font-extrabold mb-6">
            {isBg
              ? "Уморени сте от неподходящи CV-та? Поемете контрол над подбора си."
              : "Tired of unqualified CVs? Take control of your hiring."}
          </h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {isBg
              ? "Изберете пакет, публикувайте позиции, отключете AI класиране на кандидати и управлявайте процеса като в модерен ATS."
              : "Choose a package, post roles directly, unlock AI-assisted candidate ranking, and manage your entire pipeline in a modern ATS-style workflow."}
          </p>
          <Link
            to="/pricing"
            aria-label={isBg ? "Вижте пакетите за работодатели" : "View employer packages"}
            className="inline-block bg-white text-blue-600 font-bold text-lg px-8 py-4 rounded-full hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
          >
            {isBg ? "Вижте пакетите за работодатели" : "View employer packages"}
          </Link>
        </div>
      </section>

      {/* ── SECTION 5: FAQ ── */}
      <section className="bg-white py-20" aria-labelledby="faq-heading">
        <div className="max-w-6xl mx-auto px-4">
          <h2 id="faq-heading" className="text-3xl font-bold text-center mb-12 text-gray-900">
            {isBg ? "Въпроси преди кандидатстване" : "Questions people ask before applying"}
          </h2>
          <dl className="max-w-3xl mx-auto space-y-3">
            {faqs(isBg).map((faq, i) => (
              <FaqItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </dl>
        </div>
      </section>
    </Layout>
  );
}

/* ─── Helper components ─── */

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function FeatureTile({
  icon, title, desc, bullets,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-gray-200">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
      <ul className="mt-4 space-y-2 text-sm text-gray-700" aria-label={title}>
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span>{question}</span>
        <span className={`ml-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-gray-600 leading-relaxed text-sm border-t border-gray-100 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}



function faqs(isBg: boolean) {
  return [
    {
      q: isBg ? "Какво означава Verified Employer?" : "What does Verified Employer mean?",
      a: isBg
        ? "Verified Employer са компании, регистрирани директно в платформата ни. Те публикуват обяви сами и управляват кандидатурите чрез нашия ATS. 'Verified' означава, че е официалният канал на компанията."
        : "Verified Employers are companies registered directly on our platform. They post roles themselves and manage applicants through our ATS. The 'Verified' badge confirms it's the company's official hiring channel.",
    },
    {
      q: isBg ? "Какво е External Listing?" : "What is an External Listing?",
      a: isBg
        ? "External Listing са обяви, подбрани от публичните кариерни страници на компании. Когато кликнете, ви насочваме директно към оригиналната обява на сайта на работодателя."
        : "External Listings are job posts curated from company career pages across the web. When you click one, we send you directly to the original posting on the employer's site.",
    },
    {
      q: isBg ? "Съхранявате ли CV-то и данните ми?" : "Do you store my CV and data?",
      a: isBg
        ? "Вашите документи остават конфиденциални. Можете да ги изтриете по всяко време от профила си. Данните ви не се споделят с работодатели без вашето изрично съгласие."
        : "Your documents remain private to your account. You can delete them at any time from your profile settings. Your data is never shared with employers without explicit consent.",
    },
    {
      q: isBg ? "Мога ли да следя кандидатури от други сайтове?" : "Can I track applications from other sites?",
      a: isBg
        ? "Да. Можете ръчно да добавяте кандидатури от всеки сайт в Kanban борда ви. Маркирайте ги по статус и следете отговорите на едно място."
        : "Yes. You can manually add applications from any website to your tracking board. Mark them by status and follow up—all in one place.",
    },
    {
      q: isBg ? "Как се верифицират работодателите?" : "How do employers get verified?",
      a: isBg
        ? "Работодателите заявяват профила на компанията си, след което нашият екип потвърждава собствеността чрез бизнес email домейн или официална документация преди активиране."
        : "Employers claim their company profile, then our team confirms ownership via business email domain or official documentation before activating the Verified badge.",
    },
    {
      q: isBg ? "Платформата двуезична ли е?" : "Is the platform bilingual?",
      a: isBg
        ? "Да. Цялата платформа – включително обявите, профилите и интерфейса – е на английски и български. Можете да превключите езика по всяко време от навигацията."
        : "Yes. The entire platform—including listings, profiles, and the interface—is available in both English and Bulgarian. Switch languages at any time from the navigation.",
    },
  ];
}

