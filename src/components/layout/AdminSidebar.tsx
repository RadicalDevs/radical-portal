"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/candidates", label: "Kandidaten" },
  { href: "/admin/apac-form", label: "APAC Formulier" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/import", label: "Tally Import" },
  { href: "/admin/poort", label: "De Poort" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-surface-border bg-surface">
      <nav className="flex flex-col gap-1 p-4">
        {adminLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-[8px] px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-smaragd/10 text-smaragd"
                  : "text-muted hover:bg-surface-light hover:text-heading"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
