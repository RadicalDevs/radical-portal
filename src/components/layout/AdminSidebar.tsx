"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  Dashboard: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  Kandidaten: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  ApacForm: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  Analytics: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  Import: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  Poort: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  Klanten: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  Vacatures: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  Pipeline: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
    </svg>
  ),
  Facturatie: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
    </svg>
  ),
  Rapportages: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  ),
  Taken: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878M18 6.878A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Chevron: ({ open }: { open: boolean }) => (
    <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  CollapseLeft: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  ),
  CollapseRight: () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
    </svg>
  ),
};

// ─── Nav config ──────────────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  icon: () => React.JSX.Element;
}

interface NavGroup {
  title: string;
  accent: "smaragd" | "coral";
  links: NavLink[];
}

const navGroups: NavGroup[] = [
  {
    title: "Portaal",
    accent: "smaragd",
    links: [
      { href: "/admin",            label: "Dashboard",      icon: Icon.Dashboard },
      { href: "/admin/candidates", label: "Kandidaten",     icon: Icon.Kandidaten },
      { href: "/admin/apac-form",  label: "APAC Formulier", icon: Icon.ApacForm },
      { href: "/admin/analytics",  label: "Analytics",      icon: Icon.Analytics },
      { href: "/admin/import",     label: "Tally Import",   icon: Icon.Import },
      { href: "/admin/poort",      label: "De Poort",       icon: Icon.Poort },
    ],
  },
  {
    title: "CRM",
    accent: "coral",
    links: [
      { href: "/admin/klanten",    label: "Klanten",        icon: Icon.Klanten },
      { href: "/admin/vacatures",  label: "Vacatures",      icon: Icon.Vacatures },
      { href: "/admin/pipeline",   label: "Pipeline",       icon: Icon.Pipeline },
      { href: "/admin/facturatie", label: "Facturatie",     icon: Icon.Facturatie },
      { href: "/admin/rapportages",label: "Rapportages",    icon: Icon.Rapportages },
      { href: "/admin/taken",      label: "Taken",          icon: Icon.Taken },
      { href: "/admin/settings",   label: "Instellingen",   icon: Icon.Settings },
    ],
  },
];

const pipelineSubLinks: NavLink[] = [
  { href: "/admin/pipeline/permanent", label: "Permanent", icon: Icon.Pipeline },
  { href: "/admin/pipeline/interim",   label: "Interim",   icon: Icon.Pipeline },
  { href: "/admin/pipeline/project",   label: "Project",   icon: Icon.Pipeline },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(
    pathname.startsWith("/admin/pipeline")
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const accentClasses = {
    smaragd: "text-smaragd",
    coral: "text-coral",
  };

  const activeBg = {
    smaragd: "bg-smaragd/10 text-smaragd",
    coral: "bg-coral/10 text-coral",
  };

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r border-surface-border bg-surface transition-all duration-300 ${
        collapsed ? "w-[60px]" : "w-60"
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Uitklappen" : "Inklappen"}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface shadow-sm text-muted hover:text-heading transition-colors"
      >
        {collapsed ? <Icon.CollapseRight /> : <Icon.CollapseLeft />}
      </button>

      {/* Logo / brand */}
      <div className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-smaragd">
          <span className="text-xs font-bold text-white">R</span>
        </div>
        {!collapsed && (
          <span className="font-heading text-sm font-bold text-heading">
            {userName || "Radical Portal"}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t border-surface-border" />

      {/* Nav */}
      <nav className={`flex flex-1 flex-col gap-5 overflow-y-auto py-2 ${collapsed ? "px-2" : "px-3"}`}>
        {navGroups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            {/* Section header */}
            {!collapsed && (
              <p className={`mb-1 px-2 text-[10px] font-bold uppercase tracking-widest ${accentClasses[group.accent]}`}>
                {group.title}
              </p>
            )}
            {collapsed && (
              <div className={`mx-auto mb-1 h-px w-5 ${group.accent === "smaragd" ? "bg-smaragd/40" : "bg-coral/40"}`} />
            )}

            {group.links.map((link) => {
              const active = isActive(link.href);

              if (link.href === "/admin/pipeline") {
                return (
                  <div key={link.href}>
                    <button
                      onClick={() => {
                        if (collapsed) return;
                        setPipelineOpen(!pipelineOpen);
                      }}
                      title={collapsed ? link.label : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                        active
                          ? activeBg[group.accent]
                          : "text-muted hover:bg-surface-light hover:text-heading"
                      } ${collapsed ? "justify-center" : "justify-between"}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <link.icon />
                        {!collapsed && link.label}
                      </span>
                      {!collapsed && <Icon.Chevron open={pipelineOpen} />}
                    </button>

                    {pipelineOpen && !collapsed && (
                      <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l-2 border-surface-border pl-3">
                        {pipelineSubLinks.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                              isActive(sub.href)
                                ? activeBg[group.accent]
                                : "text-muted hover:bg-surface-light hover:text-heading"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    active
                      ? activeBg[group.accent]
                      : "text-muted hover:bg-surface-light hover:text-heading"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <link.icon />
                  {!collapsed && <span>{link.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom spacer */}
      <div className="h-4" />
    </aside>
  );
}
