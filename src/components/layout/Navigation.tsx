"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Re-check auth on every route change (catches server-side login redirects)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      setIsLoggedIn(!!data.session);
      if (data.session) {
        const { data: portalUser } = await supabase
          .from("portal_users")
          .select("kandidaat_id")
          .eq("auth_user_id", data.session.user.id)
          .single();
        if (portalUser?.kandidaat_id) {
          const { data: scores } = await supabase
            .from("apac_resultaten")
            .select("id")
            .eq("kandidaat_id", portalUser.kandidaat_id)
            .limit(1)
            .single();
          setHasCompletedTest(!!scores);
        } else {
          setHasCompletedTest(false);
        }
      } else {
        setHasCompletedTest(false);
      }
    });
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = isAdmin
    ? [
        { href: "/admin", label: t("nav_dashboard") },
        { href: "/admin/candidates", label: t("nav_candidates") },
        { href: "/admin/poort", label: t("nav_gate") },
      ]
    : isLoggedIn
    ? [
        { href: "/dashboard", label: t("nav_dashboard") },
        { href: "/dashboard/results", label: t("nav_results") },
        ...(hasCompletedTest ? [{ href: "/dashboard/support", label: t("nav_coaching") }] : []),
        { href: "/dashboard/profile", label: t("nav_profile") },
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-lg font-bold text-heading sm:text-xl">
            Radical<span className="gradient-text">{t("brand_suffix")}</span>
          </span>
        </Link>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-smaragd/10 text-smaragd"
                    : "text-muted hover:bg-surface-light hover:text-heading"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="ml-2 flex items-center gap-1 border-l border-surface-border pl-2">
            {/* Language toggle */}
            <div className="flex items-center gap-0.5 rounded-lg px-1 py-1">
              <button
                onClick={() => setLang("en")}
                className={`rounded px-1.5 py-0.5 text-xs font-bold transition-all ${
                  lang === "en"
                    ? "text-smaragd"
                    : "text-muted hover:text-heading"
                }`}
              >
                EN
              </button>
              <span className="text-muted/40 text-xs">|</span>
              <button
                onClick={() => setLang("nl")}
                className={`rounded px-1.5 py-0.5 text-xs font-bold transition-all ${
                  lang === "nl"
                    ? "text-smaragd"
                    : "text-muted hover:text-heading"
                }`}
              >
                NL
              </button>
            </div>
            <ThemeToggle />
            {isLoggedIn === true && (
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:bg-surface-light hover:text-heading"
              >
                {t("nav_logout")}
              </button>
            )}
            {isLoggedIn === false && (
              <Link
                href="/auth/login"
                className="rounded-lg bg-smaragd/10 px-3 py-1.5 text-sm font-medium text-smaragd transition-all duration-200 hover:bg-smaragd/20"
              >
                {t("nav_login")}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: theme toggle + hamburger (visible on mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Language toggle mobile */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setLang("en")}
              className={`rounded px-1.5 py-0.5 text-xs font-bold transition-all ${
                lang === "en" ? "text-smaragd" : "text-muted"
              }`}
            >
              EN
            </button>
            <span className="text-muted/40 text-xs">|</span>
            <button
              onClick={() => setLang("nl")}
              className={`rounded px-1.5 py-0.5 text-xs font-bold transition-all ${
                lang === "nl" ? "text-smaragd" : "text-muted"
              }`}
            >
              NL
            </button>
          </div>
          <ThemeToggle />
          {navLinks.length > 0 && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-light hover:text-heading"
              aria-label={menuOpen ? t("nav_menu_close") : t("nav_menu_open")}
            >
              {menuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          )}
          {/* Login button for mobile when not logged in and no nav links */}
          {isLoggedIn === false && navLinks.length === 0 && (
            <Link
              href="/auth/login"
              className="rounded-lg bg-smaragd/10 px-3 py-1.5 text-sm font-medium text-smaragd transition-all duration-200 hover:bg-smaragd/20"
            >
              {t("nav_login")}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-surface-border/60 bg-surface/95 backdrop-blur-md md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/admin" && link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-smaragd/10 text-smaragd"
                      : "text-muted hover:bg-surface-light hover:text-heading"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isLoggedIn === true && (
              <button
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted transition-all hover:bg-surface-light hover:text-heading"
              >
                {t("nav_logout")}
              </button>
            )}
            {isLoggedIn === false && (
              <Link
                href="/auth/login"
                className="block rounded-lg bg-smaragd/10 px-3 py-2.5 text-center text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
              >
                {t("nav_login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
