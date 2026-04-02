"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import RadarChart from "@/components/apac/RadarChart";
import type { AdminKandidaat } from "../actions";
import { deleteKandidaat, getAdminCvDownloadUrl, getAdminKandidaatDetails } from "../actions";

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
  crm:      "CRM",
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
  const router = useRouter();
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
          <option value="crm">CRM</option>
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
              <Th>APAC scores</Th>
              <Th onClick={() => toggleSort("poolStatus")}>
                Status <SortIcon col="poolStatus" />
              </Th>
              <Th onClick={() => toggleSort("apacSource")}>Bron</Th>
              <Th>Universiteit</Th>
              <Th>Diploma</Th>
              <Th>Opleiding</Th>
              <Th>Detail</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-10 text-center text-muted">
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
                    <span className="text-lg font-bold text-smaragd leading-none">
                      {k.gecombineerd.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {k.adaptability !== null ? (
                    <div className="flex gap-1">
                      {([
                        { val: k.adaptability, color: "#2ed573", label: "A" },
                        { val: k.personality,  color: "#E6734F", label: "P" },
                        { val: k.awareness,    color: "#3B82F6", label: "A" },
                        { val: k.connection,   color: "#8B5CF6", label: "C" },
                      ] as const).map((d, i) => (
                        <div key={i} className="flex flex-col items-center rounded-md px-1.5 py-1 bg-surface-light min-w-[32px]">
                          <span className="text-[9px] font-semibold uppercase" style={{ color: d.color }}>{d.label}</span>
                          <span className="text-xs font-bold text-heading leading-tight">{d.val}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
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
                <td className="px-4 py-3 text-xs text-muted">
                  {k.education ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {k.educationLevel ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {k.educationName ?? "—"}
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
        <DetailModal
          kandidaat={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            router.refresh();
          }}
        />
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
  onDeleted,
}: {
  kandidaat: AdminKandidaat;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [details, setDetails] = useState<{ vaardigheden: string[]; tags: string[]; beschikbaarheid: boolean | null; notities: string | null } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    getAdminKandidaatDetails(kandidaat.id).then((d) => {
      if (d) {
        setDetails({
          vaardigheden: d.vaardigheden ?? [],
          tags: d.tags ?? [],
          beschikbaarheid: d.beschikbaarheid ?? null,
          notities: d.notities ?? null,
        });
      }
      setLoadingDetails(false);
    });
  }, [kandidaat.id]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteKandidaat(kandidaat.id);
    if (result.success) {
      onDeleted();
    } else {
      setDeleteError(result.error ?? "Onbekende fout");
      setDeleting(false);
    }
  }

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
            <div className="mt-0.5 flex flex-col gap-0.5">
              {kandidaat.email && <p className="text-sm text-muted">{kandidaat.email}</p>}
              {kandidaat.telefoon && <p className="text-sm text-muted">{kandidaat.telefoon}</p>}
              {kandidaat.linkedinUrl && (
                <a href={kandidaat.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-smaragd hover:underline">
                  LinkedIn
                </a>
              )}
            </div>
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
          {kandidaat.education && (
            <span className="inline-flex rounded-full bg-surface-light px-2.5 py-0.5 text-xs text-muted">
              {kandidaat.education}
            </span>
          )}
          {kandidaat.educationLevel && (
            <span className="inline-flex rounded-full bg-surface-light px-2.5 py-0.5 text-xs text-muted">
              {kandidaat.educationLevel}
            </span>
          )}
        </div>

        {kandidaat.educationName && (
          <p className="mt-2 text-sm text-muted">
            Opleiding: <span className="text-body">{kandidaat.educationName}</span>
          </p>
        )}

        {!loadingDetails && details && (
          <>
            {details.vaardigheden.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Vaardigheden</p>
                <div className="flex flex-wrap gap-1.5">
                  {details.vaardigheden.map((v) => (
                    <span key={v} className="inline-flex rounded-full bg-smaragd/10 px-2.5 py-0.5 text-xs font-medium text-smaragd">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {details.tags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {details.tags.map((t) => (
                    <span key={t} className="inline-flex rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium text-coral">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {details.beschikbaarheid !== null && (
              <p className="mt-2 text-sm text-muted">
                Beschikbaarheid: <span className={details.beschikbaarheid ? "text-smaragd font-medium" : "text-coral font-medium"}>
                  {details.beschikbaarheid ? "Beschikbaar" : "Niet beschikbaar"}
                </span>
              </p>
            )}

            {details.notities && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">Notities</p>
                <p className="text-sm text-body whitespace-pre-wrap rounded-lg bg-surface-light p-3">{details.notities}</p>
              </div>
            )}
          </>
        )}

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

        {/* CV Download */}
        <div className="mt-4">
          {kandidaat.cvUrl ? (
            <button
              onClick={async () => {
                const result = await getAdminCvDownloadUrl(kandidaat.id);
                if (result.success) {
                  window.open(result.url, "_blank");
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-smaragd/30 bg-smaragd/5 px-3 py-2.5 text-sm font-medium text-smaragd transition-colors hover:bg-smaragd/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              CV downloaden
            </button>
          ) : (
            <p className="text-center text-xs text-muted/60">Geen CV geüpload</p>
          )}
        </div>

        {/* Delete sectie */}
        <div className="mt-5 border-t border-surface-border pt-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-lg border border-red-800/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors"
            >
              Kandidaat verwijderen
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-xs text-red-400 font-medium">
                Weet je zeker dat je <strong>{kandidaat.voornaam} {kandidaat.achternaam}</strong> wilt verwijderen? Dit kan niet ongedaan worden.
              </p>
              {deleteError && (
                <p className="text-center text-xs text-red-500">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-muted hover:bg-surface-light transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-red-900/40 border border-red-800/40 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Verwijderen…" : "Ja, verwijder"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
