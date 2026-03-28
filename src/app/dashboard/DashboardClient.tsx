"use client";

import { useState } from "react";
import Link from "next/link";
import RadarChart from "@/components/apac/RadarChart";
import ProfileModal from "@/components/profile/ProfileModal";
import { useRealtimeApac } from "@/hooks/useRealtimeApac";
import { calculateCombinedScore, scoreToPercentage } from "@/lib/apac/scoring";
import type { DashboardData } from "./actions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  prospect:   { label: "Aangemeld",    color: "text-muted",   bg: "bg-surface-light" },
  in_selectie:{ label: "In selectie",  color: "text-coral",   bg: "bg-coral/10" },
  radical:    { label: "Radical Pool", color: "text-smaragd", bg: "bg-smaragd/10" },
  alumni:     { label: "Alumni",       color: "text-muted",   bg: "bg-surface-light" },
};

const DIMENSIONS = [
  { key: "adaptability" as const, label: "Adaptability", color: "#2ed573" },
  { key: "personality"  as const, label: "Personality",  color: "#E6734F" },
  { key: "awareness"    as const, label: "Awareness",     color: "#3B82F6" },
  { key: "connection"   as const, label: "Connection",    color: "#8B5CF6" },
];

const QUICK_LINKS = [
  {
    href: "/dashboard/results",
    title: "Volledige resultaten",
    description: "Bekijk je uitgebreide APAC-analyse",
    color: "#2ed573",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/support",
    title: "Gesprek met Nelieke",
    description: "Plan een persoonlijk coachgesprek",
    color: "#E6734F",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    href: "#",
    title: "Community",
    description: "Verbind met andere AI-professionals",
    color: "#8B5CF6",
    comingSoon: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    href: "#",
    title: "Evenementen",
    description: "Workshops en meetups",
    color: "#F59E0B",
    comingSoon: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

export default function DashboardClient({ data }: { data: DashboardData }) {
  const liveScores = useRealtimeApac(data.user.kandidaatId, data.scores);
  const [profileOpen, setProfileOpen] = useState(data.kandidaat.isFirstLogin);

  return (
    <div className="space-y-8">
      {/* Profile completion modal (popup bij eerste login) */}
      <ProfileModal
        profile={data.kandidaat.profile}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {/* Profile incomplete banner (altijd zichtbaar als niet compleet) */}
      {!data.kandidaat.profileComplete && !profileOpen && (
        <button
          onClick={() => setProfileOpen(true)}
          className="flex w-full items-center gap-4 rounded-[12px] border border-coral/30 bg-coral/5 p-4 text-left transition-colors hover:bg-coral/10"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/10">
            <svg className="h-5 w-5 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-heading">
              Maak je profiel compleet
            </p>
            <p className="text-xs text-muted">
              Voeg je vaardigheden en beschikbaarheid toe zodat we je beter
              kunnen matchen.
            </p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
          Welkom, <span className="gradient-text-warm">{data.user.firstName}</span>
        </h1>
        <p className="mt-1 text-body">
          Jouw persoonlijke dashboard.
        </p>
      </div>

      {/* APAC Results Hero */}
      {liveScores ? (
        <Link
          href="/dashboard/results"
          className="card-gradient-border group relative block overflow-hidden rounded-2xl p-1 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(46,213,115,0.15),0_0_50px_rgba(230,115,79,0.1)]"
        >
          <div className="relative rounded-[13px] bg-[var(--bg-surface)] p-6 sm:p-8">
            {/* Background glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/8 blur-[60px]" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-[150px] w-[200px] rounded-full bg-coral/6 blur-[50px]" />

            {/* Label */}
            <div className="relative flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-smaragd/10 px-3 py-1 text-xs font-semibold text-smaragd">
                <span className="h-1.5 w-1.5 rounded-full bg-smaragd animate-pulse" />
                APAC Resultaten
              </span>
              <span className="text-xs text-muted">Klik voor je volledige analyse</span>
            </div>

            <div className="relative mt-6 grid items-center gap-6 lg:grid-cols-[240px_1fr]">
              {/* Radar */}
              <div className="flex justify-center">
                <RadarChart scores={liveScores} size={220} animated />
              </div>

              {/* Scores + CTA */}
              <div>
                {/* Combined score big */}
                <div className="flex items-baseline gap-3">
                  <span className="gradient-text-warm font-heading text-5xl font-bold sm:text-6xl">
                    {scoreToPercentage(calculateCombinedScore(liveScores))}%
                  </span>
                  <span className="text-sm text-muted">gecombineerd</span>
                </div>

                {/* Mini score bars */}
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
                  {DIMENSIONS.map((dim) => {
                    const pct = scoreToPercentage(liveScores[dim.key]);
                    return (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: dim.color }}>{dim.label}</span>
                          <span className="text-xs font-bold text-heading">{pct}%</span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded-full bg-surface-light">
                          <div
                            className="h-1 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: dim.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="mt-6 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-smaragd px-5 py-2.5 text-sm font-semibold text-white transition-all group-hover:bg-smaragd-dark group-hover:shadow-[0_0_24px_rgba(46,213,115,0.3)]">
                    Bekijk je volledige resultaten
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="card-gradient-border relative overflow-hidden rounded-2xl p-1">
          <div className="rounded-[13px] bg-[var(--bg-surface)] p-10 text-center">
            <div className="pointer-events-none absolute left-1/2 top-0 h-[150px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/8 blur-[60px]" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-smaragd/10">
                <svg className="h-8 w-8 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-heading">
                Ontdek je menselijke kwaliteiten
              </h3>
              <p className="mt-2 text-sm text-muted">
                Start de APAC-test en ontvang je persoonlijke profiel.
              </p>
              <Link
                href="/apac"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-smaragd px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark hover:shadow-[0_0_24px_rgba(46,213,115,0.3)]"
              >
                Start de test
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile snapshot */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-heading">Jouw profiel</h2>
          <button
            onClick={() => setProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-smaragd/10 px-3.5 py-1.5 text-sm font-medium text-smaragd transition-all hover:bg-smaragd/20"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Bewerken
          </button>
        </div>

        {/* Quick info grid */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ProfileField
            label="Beschikbaarheid"
            value={
              data.kandidaat.profile.beschikbaarheid === true ? "Beschikbaar" :
              data.kandidaat.profile.beschikbaarheid === false ? "Niet beschikbaar" : null
            }
            color={data.kandidaat.profile.beschikbaarheid === true ? "#2ed573" : undefined}
          />
          <ProfileField label="Telefoon" value={data.kandidaat.profile.telefoon} />
          <ProfileField
            label="LinkedIn"
            value={data.kandidaat.profile.linkedin_url ? "Ingevuld" : null}
            color={data.kandidaat.profile.linkedin_url ? "#3B82F6" : undefined}
          />
          <ProfileField
            label="Salaris"
            value={data.kandidaat.profile.salarisindicatie ? `EUR ${data.kandidaat.profile.salarisindicatie.toLocaleString("nl-NL")}` : null}
          />
        </div>

        {/* Skills */}
        <div className="mt-4">
          <p className="text-xs font-medium text-muted">Vaardigheden</p>
          {data.kandidaat.profile.vaardigheden.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.kandidaat.profile.vaardigheden.map((skill) => (
                <span key={skill} className="rounded-full bg-smaragd/10 px-2.5 py-1 text-xs font-medium text-smaragd">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setProfileOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-coral hover:text-coral-dark transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Voeg je skills toe
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className={`glass group flex items-center gap-4 rounded-xl p-5 transition-all duration-300 ${
              link.comingSoon
                ? "pointer-events-none opacity-50"
                : "hover:-translate-y-0.5 hover:border-opacity-60"
            }`}
            style={{ "--link-color": link.color } as React.CSSProperties}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{ background: `${link.color}18`, color: link.color }}
            >
              {link.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-heading">{link.title}</h3>
                {link.comingSoon && (
                  <span className="shrink-0 rounded-full bg-surface-light px-2 py-0.5 text-[10px] font-medium text-muted">
                    Binnenkort
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{link.description}</p>
            </div>
            {!link.comingSoon && (
              <svg className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProfileField({ label, value, color }: { label: string; value: string | null | undefined; color?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      {value ? (
        <p className="mt-0.5 text-sm font-medium" style={{ color: color || "var(--text-heading)" }}>
          {value}
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-muted/40">—</p>
      )}
    </div>
  );
}
