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

  useEffect(() => {
    const supabase = createClient();
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-xl font-bold text-heading">
            Radical<span className="gradient-text">Portal</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
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
          <div className="ml-2 flex items-center gap-1 pl-2 border-l border-surface-border">
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
      </div>
    </nav>
  );
}
