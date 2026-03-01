import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/bachkam-logo.svg";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-white py-2 rounded-3xl px-[15px] opacity-100">
              <img src={logo} alt="бачкам" className="h-8 w-8" />
              <span className="font-display text-xl font-bold text-primary">бачкам</span>
            </div>
            <p className="text-primary-foreground/80 max-w-sm leading-relaxed text-sm font-medium">
              {t("footer.tagline", "Bulgaria's comprehensive job hub. Every listing links to the employer's original posting.")}
            </p>
          </div>

          {/* Company links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-primary-foreground/60">
              {t("footer.company", "Company")}
            </h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/about" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.aboutUs", "About Us")}
              </Link>
              <Link to="/contact" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.contactUs", "Contact Us")}
              </Link>
              <Link to="/privacy" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.privacy")}
              </Link>
              <Link to="/terms" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.terms")}
              </Link>
            </nav>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm uppercase tracking-wider text-primary-foreground/60">
              {t("footer.quickLinks", "Quick Links")}
            </h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/jobs" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("nav.jobs")}
              </Link>
              <Link to="/employers" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("nav.forEmployers")}
              </Link>
              <Link to="/blog" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.blog", "Blog")}
              </Link>
              <Link to="/opt-out" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                {t("footer.optOut", "Opt-Out / Remove Listing")}
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-primary-foreground/20">
          <p className="text-xs text-primary-foreground/60">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>);

}