import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-4 py-8 md:flex-row md:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <nav className="flex gap-4">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.privacy")}
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.terms")}
          </Link>
          <Link to="/opt-out" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("footer.optOut", "Opt-Out / Remove Listing")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
