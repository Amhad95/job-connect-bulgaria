import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/bachkam-logo.svg";

export function Header() {
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === "bg";
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLang = () => {
    i18n.changeLanguage(isBg ? "en" : "bg");
  };

  const navLinks = [
    { to: "/jobs", label: t("nav.jobs", "Find Jobs") },
    { to: "/employers", label: t("nav.forEmployers", "For Employers") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-foreground">
          <img src={logo} alt="бачкам" className="h-10 w-10" />
          <span>бачкам</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-slate-100 hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* BG / EN flag toggle */}
          <button
            onClick={toggleLang}
            aria-label="Toggle language"
            className="inline-flex rounded-full border border-slate-200 bg-white p-1"
          >
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${isBg ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
                }`}
            >
              🇧🇬 BG
            </span>
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${!isBg ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50"
                }`}
            >
              🇬🇧 EN
            </span>
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="font-medium text-blue-600 border-blue-600 hover:bg-blue-50">
                  {t("nav.dashboard") || "Dashboard"}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-gray-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/auth">
                <Button variant="outline" size="sm">{t("common.login")}</Button>
              </Link>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white px-4 pb-4 pt-2 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-slate-100 hover:text-gray-900"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex flex-col gap-2 mt-2">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-600">
                    {t("nav.dashboard") || "Dashboard"}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-gray-500"
                  onClick={() => { signOut(); setMobileOpen(false); }}
                >
                  <LogOut className="h-4 w-4" />
                  {t("common.logout")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("common.login")}
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
