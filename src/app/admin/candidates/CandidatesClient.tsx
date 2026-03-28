"use client";

import { useState, useMemo } from "react";
import RadarChart from "@/components/apac/RadarChart";
import type { AdminKandidaat } from "../actions";

const POOL_STATUS: Record<string, { label: string; cls: string }> = {
  prospect:    { label: "Prospect",     cls: "bg-surface-light text-muted" },
  in_selectie: { label: "In selectie",  cls: "bg-coral/10 text-coral" },
  radical:     { label: "Radical Pool", cls: "bg-smaragd/10 text-smaragd" },
  alumni:      { label: "Alumni",       cls: "bg-surface-light text-muted" },
};

const SOURCE_LABELS: Record<string, string> = {
  tally:    "Tally",
  portal:   "Portal",
  manual:   "Manueel",
  typeform: "Typeform",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CandidatesClient({
  kandidaten,
}: {
  kandidaten: AdminKandidaat[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [sortKey, setSortKey] = useState<keyof AdminKandidaat>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<AdminKandidaat | null>(null);

  const filtered = useMemo(() => {
    let list = [...kandidaten];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (k) =>
          k.voornaam.toLowerCase().includes(q) ||
          k.achternaam.toLowerCase().includes(q) ||
          (k.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all")
      list = list.filter((k) => k.poolStatus === filterStatus);
    if (filterSource !== "all")
      list = list.filter((k) => k.apacSource === filterSource);

    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [kandidaten, search, filterStatus, filterSource, sortKey, sortDir]);

  function toggleSort(key: keyof AdminKandidaat) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: keyof AdminKandidaat }) {
    if (sortKey !== col) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1 text-smaragd">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Zoek naam of e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-lg border border-surface-border bg-surface px-3 text-sm text-body placeholder:text-muted focus:border-smaragd focus:outline-none"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-surface-border bg-surface px-3 text-sm text-body focus:border-smaragd focus:outline-none"
        >
          <option value="all">Alle statussen</option>
          <option value="prospect">Prospect</option>
          <option value="in_selectie">In selectie</option>
          <option value="radical">Radical Pool</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="h-9 rounded-lg border border-surface-border bg-surface px-3 text-sm text-body focus:border-smaragd focus:outline-none"
        >
          <option value="all">Alle bronnen</option>
          <option value="tally">Tally</option>
          <option value="portal">Portal</option>
          <option value="manual">Manueel</option>
        </select>
        <span className="ml-auto text-sm text-muted">{filtered.length} kandidaten</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-border bg-surface-light">
            <tr>
              <Th onClick={() => toggleSort("voornaam")}>
                Naam <SortIcon col="voornaam" />
              </Th>
              <Th onClick={() => toggleSort("email")}>E-mail</Th>
              <Th onClick={() => toggleSort("apacDate")}>
                APAC datum <SortIcon col="apacDate" />
              </Th>
              <Th onClick={() => toggleSort("gecombineerd")}>
                Score <SortIcon col="gecombineerd" />
              </Th>
              <Th>A / P / A / C</Th>
              <Th onClick={() => toggleSort("poolStatus")}>
                Status <SortIcon col="poolStatus" />
              </Th>
              <Th onClick={() => toggleSort("apacSource")}>Bron</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-muted">
                  Geen kandidaten gevonden.
                </td>
              </tr>
            )}
            {filtered.map((k) => (
              <tr
                key={k.id}
                className="transition-colors hover:bg-surface-light"
              >
                <td className="px-4 py-3 font-medium text-heading">
                  {k.voornaam} {k.achternaam}
                </td>
                <td className="px-4 py-3 text-muted">{k.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(k.apacDate)}
                </td>
                <td className="px-4 py-3">
                  {k.gecombineerd !== null ? (
                    <span className="font-semibold text-smaragd">
                      {k.gecombineerd.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {k.adaptability !== null
                    ? `${k.adaptability} / ${k.personality} / ${k.awareness} / ${k.connection}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      (POOL_STATUS[k.poolStatus] ?? POOL_STATUS.prospect).cls
                    }`}
                  >
                    {(POOL_STATUS[k.poolStatus] ?? POOL_STATUS.prospect).label}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">
                  {SOURCE_LABELS[k.apacSource] ?? k.apacSource}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(k)}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-smaragd hover:bg-smaragd/10"
                  >
                    Bekijken
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal kandidaat={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted ${
        onClick ? "cursor-pointer select-none hover:text-heading" : ""
      }`}
    >
      {children}
    </th>
  );
}

function DetailModal({
  kandidaat,
  onClose,
}: {
  kandidaat: AdminKandidaat;
  onClose: () => void;
}) {
  const hasScores =
    kandidaat.adaptability !== null &&
    kandidaat.personality !== null &&
    kandidaat.awareness !== null &&
    kandidaat.connection !== null;

  const scores = hasScores
    ? {
        adaptability: kandidaat.adaptability!,
        personality: kandidaat.personality!,
        awareness: kandidaat.awareness!,
        connection: kandidaat.connection!,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-heading">
              {kandidaat.voornaam} {kandidaat.achternaam}
            </h2>
            <p className="mt-0.5 text-sm text-muted">{kandidaat.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-light"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              (POOL_STATUS[kandidaat.poolStatus] ?? POOL_STATUS.prospect).cls
            }`}
          >
            {(POOL_STATUS[kandidaat.poolStatus] ?? POOL_STATUS.prospect).label}
          </span>
          <span className="inline-flex rounded-full bg-surface-light px-2.5 py-0.5 text-xs text-muted">
            {SOURCE_LABELS[kandidaat.apacSource] ?? kandidaat.apacSource}
          </span>
        </div>

        {scores ? (
          <div className="mt-6 flex justify-center">
            <RadarChart scores={scores} maxSize={240} animated />
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-surface-light p-6 text-center text-sm text-muted">
            Nog geen APAC-test gemaakt.
          </div>
        )}

        {scores && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {(
              [
                { key: "adaptability", label: "Adapt.", color: "#2ed573" },
                { key: "personality",  label: "Pers.",  color: "#E6734F" },
                { key: "awareness",    label: "Aware.", color: "#3B82F6" },
                { key: "connection",   label: "Conn.",  color: "#8B5CF6" },
              ] as const
            ).map((d) => (
              <div
                key={d.key}
                className="rounded-lg border border-surface-border p-2 text-center"
              >
                <p className="text-xs font-medium" style={{ color: d.color }}>
                  {d.label}
                </p>
                <p className="mt-0.5 text-lg font-bold text-heading">
                  {scores[d.key]}
                </p>
              </div>
            ))}
          </div>
        )}

        {kandidaat.gecombineerd !== null && (
          <div className="mt-3 rounded-xl bg-smaragd/5 border border-smaragd/20 p-3 text-center">
            <p className="text-xs text-muted">Gecombineerd</p>
            <p className="gradient-text font-heading text-2xl font-bold">
              {kandidaat.gecombineerd.toFixed(1)}
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted">
          Aangemeld: {new Date(kandidaat.createdAt).toLocaleDateString("nl-NL")}
          {kandidaat.apacDate &&
            ` · APAC: ${new Date(kandidaat.apacDate).toLocaleDateString("nl-NL")}`}
        </p>
      </div>
    </div>
  );
}
