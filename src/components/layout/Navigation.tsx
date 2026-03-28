"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    // Check session immediately, then listen for changes
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
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
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/candidates", label: "Kandidaten" },
        { href: "/admin/poort", label: "De Poort" },
      ]
    : isLoggedIn
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/results", label: "Resultaten" },
        { href: "/dashboard/support", label: "Coaching" },
        { href: "/dashboard/profile", label: "Profiel" },
      ]
    : [];

  return (
    <nav className="sticky top-0 z-50 border-b border-surface-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-lg font-bold text-heading sm:text-xl">
            Radical<span className="gradient-text">Portal</span>
          </span>
        </Link>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
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
            <ThemeToggle />
            {isLoggedIn === true && (
              <button
                onClick={handleLogout}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-all duration-200 hover:bg-surface-light hover:text-heading"
              >
                Uitloggen
              </button>
            )}
            {isLoggedIn === false && (
              <Link
                href="/auth/login"
                className="rounded-lg bg-smaragd/10 px-3 py-1.5 text-sm font-medium text-smaragd transition-all duration-200 hover:bg-smaragd/20"
              >
                Inloggen
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: theme toggle + hamburger (visible on mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          {navLinks.length > 0 && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-light hover:text-heading"
              aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
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
              Inloggen
            </Link>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-surface-border/60 bg-surface/95 backdrop-blur-md md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
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
                Uitloggen
              </button>
            )}
            {isLoggedIn === false && (
              <Link
                href="/auth/login"
                className="block rounded-lg bg-smaragd/10 px-3 py-2.5 text-center text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
              >
                Inloggen
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
