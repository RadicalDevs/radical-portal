"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import RadarChart from "@/components/apac/RadarChart";
import { ActivityTimeline } from "@/components/crm/timeline/ActivityTimeline";
import { EmailLogTab } from "@/components/crm/EmailLogTab";
import CandidateReportTab from "@/components/crm/reports/CandidateReportTab";
import ReportSummaryInline from "@/components/crm/reports/ReportSummaryInline";
import { scoreToPercentage } from "@/lib/apac/scoring";
import type { ApacMaxScores } from "@/lib/apac/types";
import type {
  AdminKandidaat,
  AvgToestemming,
  KandidaatPlaatsing,
} from "../actions";
import {
  adminDeleteCv,
  adminUploadCv,
  deleteKandidaat,
  getAdminCvDownloadUrl,
  getAdminKandidaatDetails,
  getAvgToestemmingen,
  getKandidaatPlaatsingen,
  sendKandidaatEmail,
  toggleAvgToestemming,
  updateApacScores,
  updateKandidaatProfiel,
} from "../actions";

const AVG_TOESTEMMING_LABELS: Record<string, string> = {
  data_verwerking:       "Gegevensverwerking",
  cv_opslag:             "CV Opslag",
  communicatie_email:    "Email Communicatie",
  communicatie_whatsapp: "WhatsApp Communicatie",
  delen_met_klanten:     "Delen met Klanten",
  profiling:             "Profiling & AI Analyse",
};

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  custom:       { subject: "", body: "" },
  welkom:       {
    subject: "Welkom bij Radical!",
    body: `Hallo {voornaam},

Hartelijk welkom in het Radical netwerk! We zijn blij dat je deel uitmaakt van onze community van AI-professionals.

Mocht je vragen hebben, neem dan gerust contact met ons op.

Met vriendelijke groet,
Het Radical Team`,
  },
  gesprek:      {
    subject: "Uitnodiging voor een gesprek",
    body: `Hallo {voornaam},

We willen je graag uitnodigen voor een gesprek om jou beter te leren kennen en te bespreken hoe we je verder kunnen helpen.

Kun jij aangeven wanneer je beschikbaar bent?

Met vriendelijke groet,
Het Radical Team`,
  },
  statusupdate: {
    subject: "Update over jouw status",
    body: `Hallo {voornaam},

We willen je graag informeren over een update in jouw status binnen het Radical netwerk.

Neem gerust contact met ons op als je vragen hebt.

Met vriendelijke groet,
Het Radical Team`,
  },
  afwijzing:    {
    subject: "Terugkoppeling op jouw aanmelding",
    body: `Hallo {voornaam},

Bedankt voor je interesse in het Radical netwerk en de tijd die je hebt genomen voor onze assessment.

Na zorgvuldige overweging hebben we besloten om op dit moment niet verder te gaan met jouw aanmelding. We hopen in de toekomst nog van je te horen.

Met vriendelijke groet,
Het Radical Team`,
  },
};

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
  maxScores,
}: {
  kandidaten: AdminKandidaat[];
  maxScores: ApacMaxScores;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterVeto, setFilterVeto] = useState<"all" | "triggered" | "clean">("all");
  const [sortKey, setSortKey] = useState<keyof AdminKandidaat>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<AdminKandidaat | null>(null);
  const [scoreDisplay, setScoreDisplay] = useState<"points" | "percentage">("points");

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
    if (filterVeto === "triggered")
      list = list.filter((k) => k.vetoGetriggerd === true);
    else if (filterVeto === "clean")
      list = list.filter((k) => k.vetoGetriggerd === false && k.adaptability !== null);

    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [kandidaten, search, filterStatus, filterSource, filterVeto, sortKey, sortDir]);

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
        <select
          value={filterVeto}
          onChange={(e) => setFilterVeto(e.target.value as "all" | "triggered" | "clean")}
          className="h-9 rounded-lg border border-surface-border bg-surface px-3 text-sm text-body focus:border-smaragd focus:outline-none"
        >
          <option value="all">Alle veto</option>
          <option value="triggered">Veto getriggerd</option>
          <option value="clean">Geen veto</option>
        </select>
        <button
          onClick={() => setScoreDisplay(scoreDisplay === "points" ? "percentage" : "points")}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-smaragd hover:text-heading"
        >
          {scoreDisplay === "points" ? "Punten" : "Percentage"}
          <span className="text-[10px] text-muted/60">↔</span>
        </button>
        <span className="text-sm text-muted">{filtered.length} kandidaten</span>
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
              <Th>Veto</Th>
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
                <td colSpan={12} className="py-10 text-center text-muted">
                  Geen kandidaten gevonden.
                </td>
              </tr>
            )}
            {filtered.map((k) => (
              <tr
                key={k.id}
                className="transition-colors hover:bg-surface-light"
              >
                <td className="px-3 py-2 font-medium text-heading">
                  {k.voornaam} {k.achternaam}
                </td>
                <td className="px-3 py-2 text-muted">{k.email ?? "—"}</td>
                <td className="px-3 py-2 text-muted">
                  {formatDate(k.apacDate)}
                </td>
                <td className="px-3 py-2">
                  {k.gecombineerd !== null ? (
                    <span className="text-lg font-bold text-smaragd leading-none">
                      {scoreDisplay === "percentage"
                        ? `${scoreToPercentage(k.gecombineerd, maxScores.adaptability + maxScores.personality + maxScores.awareness + maxScores.connection)}%`
                        : k.gecombineerd.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {k.adaptability !== null ? (
                    <div className="flex gap-1">
                      {([
                        { val: k.adaptability, dim: "adaptability" as const, color: "#2ed573", label: "A" },
                        { val: k.personality,  dim: "personality" as const,  color: "#E6734F", label: "P" },
                        { val: k.awareness,    dim: "awareness" as const,    color: "#3B82F6", label: "A" },
                        { val: k.connection,   dim: "connection" as const,   color: "#8B5CF6", label: "C" },
                      ] as const).map((d, i) => (
                        <div key={i} className="flex flex-col items-center rounded-md px-1.5 py-1 bg-surface-light min-w-[32px]">
                          <span className="text-[9px] font-semibold uppercase" style={{ color: d.color }}>{d.label}</span>
                          <span className="text-xs font-bold text-heading leading-tight">
                            {scoreDisplay === "percentage"
                              ? `${scoreToPercentage(d.val ?? 0, maxScores[d.dim])}%`
                              : d.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {k.vetoGetriggerd === true && k.vetoDetails.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                      {k.vetoDetails.length} veto
                    </span>
                  ) : k.adaptability !== null ? (
                    <span className="text-muted">—</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      (POOL_STATUS[k.poolStatus] ?? POOL_STATUS.prospect).cls
                    }`}
                  >
                    {(POOL_STATUS[k.poolStatus] ?? POOL_STATUS.prospect).label}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">
                  {SOURCE_LABELS[k.apacSource] ?? k.apacSource}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {k.education ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {k.educationLevel ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {k.educationName ?? "—"}
                </td>
                <td className="px-3 py-2">
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
          maxScores={maxScores}
          scoreDisplay={scoreDisplay}
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
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted ${
        onClick ? "cursor-pointer select-none hover:text-heading" : ""
      }`}
    >
      {children}
    </th>
  );
}

type ModalTab = "profiel" | "apac" | "avg" | "pipeline" | "activiteiten" | "email" | "rapport";

function DetailModal({
  kandidaat: initialKandidaat,
  maxScores,
  scoreDisplay,
  onClose,
  onDeleted,
}: {
  kandidaat: AdminKandidaat;
  maxScores: ApacMaxScores;
  scoreDisplay: "points" | "percentage";
  onClose: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [kandidaat, setKandidaat] = useState(initialKandidaat);
  const [activeTab, setActiveTab] = useState<ModalTab>("profiel");

  // Profiel edit state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    voornaam: initialKandidaat.voornaam,
    achternaam: initialKandidaat.achternaam,
    email: initialKandidaat.email ?? "",
    telefoon: initialKandidaat.telefoon ?? "",
    linkedin_url: initialKandidaat.linkedinUrl ?? "",
    pool_status: initialKandidaat.poolStatus,
    beschikbaarheid: initialKandidaat.beschikbaarheid ?? false,
    vaardigheden: (initialKandidaat.vaardigheden ?? []).join(", "),
    tags: (initialKandidaat.tags ?? []).join(", "),
    notities: initialKandidaat.notities ?? "",
    reden_afwijzing: "",
  });

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // CV upload state
  const cvFileRef = useRef<HTMLInputElement>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [confirmDeleteCv, setConfirmDeleteCv] = useState(false);
  const [deletingCv, setDeletingCv] = useState(false);


  // Email compose
  const [emailTemplate, setEmailTemplate] = useState<string>("custom");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // APAC edit
  const [apacEditMode, setApacEditMode] = useState(false);
  const [apacEditScores, setApacEditScores] = useState({
    adaptability: kandidaat.adaptability ?? 0,
    personality:  kandidaat.personality ?? 0,
    awareness:    kandidaat.awareness ?? 0,
    connection:   kandidaat.connection ?? 0,
  });
  const [apacSaving, setApacSaving] = useState(false);
  const [apacSaveError, setApacSaveError] = useState<string | null>(null);
  const apacGecombineerd =
    apacEditScores.adaptability + apacEditScores.personality +
    apacEditScores.awareness + apacEditScores.connection;

  // AVG toestemmingen
  const [avgToestemmingen, setAvgToestemmingen] = useState<AvgToestemming[]>([]);
  const [loadingAvg, setLoadingAvg] = useState(false);
  const [avgLoaded, setAvgLoaded] = useState(false);

  // Pipeline/plaatsingen
  const [plaatsingen, setPlaatsingen] = useState<KandidaatPlaatsing[]>([]);
  const [loadingPlaatsingen, setLoadingPlaatsingen] = useState(false);
  const [plaatsingenLoaded, setPlaatsingenLoaded] = useState(false);


  useEffect(() => {
    if (activeTab === "avg" && !avgLoaded) {
      setLoadingAvg(true);
      getAvgToestemmingen(kandidaat.id).then((list) => {
        setAvgToestemmingen(list);
        setLoadingAvg(false);
        setAvgLoaded(true);
      });
    }
  }, [activeTab, kandidaat.id, avgLoaded]);

  useEffect(() => {
    if (!plaatsingenLoaded) {
      setLoadingPlaatsingen(true);
      getKandidaatPlaatsingen(kandidaat.id)
        .then((list) => {
          setPlaatsingen(list);
          setPlaatsingenLoaded(true);
        })
        .catch(() => {})
        .finally(() => setLoadingPlaatsingen(false));
    }
  }, [kandidaat.id, plaatsingenLoaded]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const vaardigheden = editForm.vaardigheden
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = editForm.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await updateKandidaatProfiel(kandidaat.id, {
      voornaam: editForm.voornaam,
      achternaam: editForm.achternaam,
      email: editForm.email,
      telefoon: editForm.telefoon,
      linkedin_url: editForm.linkedin_url,
      pool_status: editForm.pool_status,
      beschikbaarheid: editForm.beschikbaarheid,
      vaardigheden,
      tags,
      notities: editForm.notities,
      reden_afwijzing: editForm.pool_status === "afgewezen" ? editForm.reden_afwijzing : "",
    });

    if (!result.success) {
      setSaveError(result.error ?? "Opslaan mislukt");
      setSaving(false);
      return;
    }

    // Trigger notificatie als pool_status is gewijzigd
    const oudeStatus = kandidaat.poolStatus;
    if (editForm.pool_status !== oudeStatus) {
      fetch("/api/notificatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "kandidaat_status",
          kandidaat_id: kandidaat.id,
          pool_status: editForm.pool_status,
          ...(editForm.pool_status === "afgewezen" && editForm.reden_afwijzing
            ? { reden_afwijzing: editForm.reden_afwijzing }
            : {}),
        }),
      }).catch(() => {});
    }

    // Update local state
    setKandidaat((prev) => ({
      ...prev,
      voornaam: editForm.voornaam,
      achternaam: editForm.achternaam,
      email: editForm.email || null,
      telefoon: editForm.telefoon || null,
      linkedinUrl: editForm.linkedin_url || null,
      poolStatus: editForm.pool_status,
      beschikbaarheid: editForm.beschikbaarheid,
      vaardigheden,
      tags,
      notities: editForm.notities || null,
    }));
    setSaving(false);
    setEditMode(false);
    router.refresh();
  }

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

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvUploading(true);
    setCvUploadError(null);
    const fd = new FormData();
    fd.append("cv", file);
    const result = await adminUploadCv(kandidaat.id, fd);
    setCvUploading(false);
    if (!result.success) {
      setCvUploadError(result.error ?? "Upload mislukt");
    } else {
      setKandidaat((prev) => ({ ...prev, cvUrl: result.cvUrl ?? prev.cvUrl }));
    }
    if (cvFileRef.current) cvFileRef.current.value = "";
  }

  async function handleCvDelete() {
    setDeletingCv(true);
    const result = await adminDeleteCv(kandidaat.id);
    setDeletingCv(false);
    if (result.success) {
      setKandidaat((prev) => ({ ...prev, cvUrl: null }));
      setConfirmDeleteCv(false);
    }
  }

  async function handleAvgToggle(type: string, toegestaan: boolean) {
    const existing = avgToestemmingen.find((t) => t.type === type);
    // Optimistic update
    setAvgToestemmingen((prev) =>
      existing
        ? prev.map((t) =>
            t.type === type
              ? {
                  ...t,
                  toegestaan,
                  gegevenOp: toegestaan ? new Date().toISOString() : t.gegevenOp,
                  ingetrokkenOp: !toegestaan ? new Date().toISOString() : null,
                }
              : t
          )
        : [
            ...prev,
            {
              id: `tmp-${type}`,
              type,
              toegestaan,
              gegevenOp: toegestaan ? new Date().toISOString() : null,
              verlooptOp: null,
              ingetrokkenOp: null,
            },
          ]
    );
    await toggleAvgToestemming(kandidaat.id, type, toegestaan, existing?.id);
  }

  async function handleAvgAlleToestaan() {
    const missing = Object.keys(AVG_TOESTEMMING_LABELS).filter(
      (type) => !avgToestemmingen.find((t) => t.type === type && t.toegestaan)
    );
    for (const type of missing) {
      await handleAvgToggle(type, true);
    }
  }

  function applyEmailTemplate(key: string) {
    setEmailTemplate(key);
    const tpl = EMAIL_TEMPLATES[key];
    if (!tpl) return;
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body.replace("{voornaam}", kandidaat.voornaam));
    setEmailSent(false);
    setEmailError(null);
  }

  async function handleEmailSend() {
    if (!kandidaat.email) return;
    setEmailSending(true);
    setEmailError(null);
    const result = await sendKandidaatEmail(
      kandidaat.id,
      kandidaat.email,
      emailSubject,
      emailBody
    );
    setEmailSending(false);
    if (result.success) {
      setEmailSent(true);
    } else {
      setEmailError(result.error ?? "Versturen mislukt.");
    }
  }

  async function handleApacSave() {
    setApacSaving(true);
    setApacSaveError(null);
    const result = await updateApacScores(kandidaat.id, apacEditScores);
    if (!result.success) {
      setApacSaveError(result.error ?? "Opslaan mislukt");
      setApacSaving(false);
      return;
    }
    setKandidaat((prev) => ({
      ...prev,
      adaptability: apacEditScores.adaptability,
      personality:  apacEditScores.personality,
      awareness:    apacEditScores.awareness,
      connection:   apacEditScores.connection,
      gecombineerd: result.gecombineerd ?? apacGecombineerd,
    }));
    setApacSaving(false);
    setApacEditMode(false);
    router.refresh();
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

  const secondaryTabs: { key: ModalTab; label: string }[] = [
    { key: "rapport", label: "Rapport" },
    { key: "avg",   label: "AVG" },
    { key: "email", label: "E-mail" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[97vh] w-full max-w-[98vw] flex-col rounded-2xl border border-surface-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-surface-border px-6 pt-5 pb-4">
          <div className="flex items-center gap-4">
            {/* Initials avatar */}
            <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-smaragd/90 to-coral/70 flex items-center justify-center shadow-sm">
              <span className="font-heading font-bold text-base text-white uppercase select-none">
                {(kandidaat.voornaam?.[0] ?? "")}{(kandidaat.achternaam?.[0] ?? "")}
              </span>
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-heading">
                {kandidaat.voornaam} {kandidaat.achternaam}
              </h2>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                {kandidaat.email && <p className="text-sm text-muted">{kandidaat.email}</p>}
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    (POOL_STATUS[kandidaat.poolStatus] ?? POOL_STATUS.prospect).cls
                  }`}
                >
                  {(POOL_STATUS[kandidaat.poolStatus] ?? POOL_STATUS.prospect).label}
                </span>
                {kandidaat.vetoGetriggerd && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/30 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                    {kandidaat.vetoDetails.length} veto
                  </span>
                )}
                {kandidaat.beschikbaarheid === true && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-smaragd/10 px-2 py-0.5 text-xs font-medium text-smaragd">
                    <span className="h-1.5 w-1.5 rounded-full bg-smaragd animate-pulse" />
                    Beschikbaar
                  </span>
                )}
                {kandidaat.apacDate && (
                  <span className="text-xs text-muted">
                    APAC {new Date(kandidaat.apacDate).toLocaleDateString("nl-NL")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Secondary tabs: AVG + Email */}
            {secondaryTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(activeTab === t.key ? "profiel" : t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-smaragd/10 text-smaragd"
                    : "text-muted hover:bg-surface-light hover:text-body"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={onClose}
              className="ml-2 rounded-lg p-1.5 text-muted hover:bg-surface-light"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── MAIN VIEW (alles in één overzicht) ── */}
          {activeTab === "profiel" && (
            <div className="space-y-4">
              {/* ─── TOP BAR: Vaardigheden + Acties ─── */}
              <div>
                {!editMode ? (
                <div className="space-y-2">
                  {/* Vaardigheden + Tags */}
                  {((kandidaat.vaardigheden ?? []).length > 0 || (kandidaat.tags ?? []).length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {(kandidaat.vaardigheden ?? []).map((v) => (
                        <span key={v} className="inline-flex rounded-full bg-smaragd/10 px-2.5 py-0.5 text-[11px] font-medium text-smaragd">{v}</span>
                      ))}
                      {(kandidaat.tags ?? []).map((t) => (
                        <span key={t} className="inline-flex rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-medium text-coral">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Compacte actie-rij */}
                  <div className="flex flex-wrap items-center gap-3">
                    {kandidaat.telefoon && (
                      <span className="text-xs text-muted">{kandidaat.telefoon}</span>
                    )}
                    {kandidaat.linkedinUrl && (
                      <a href={kandidaat.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-smaragd hover:underline">LinkedIn ↗</a>
                    )}
                    {(kandidaat.telefoon || kandidaat.linkedinUrl) && <span className="h-3 w-px bg-surface-border" />}
                    {kandidaat.cvUrl ? (
                      <button
                        onClick={async () => {
                          const result = await getAdminCvDownloadUrl(kandidaat.id);
                          if (result.success) window.open(result.url, "_blank");
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-surface-light px-2 py-1 text-xs text-muted hover:text-smaragd transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        CV downloaden
                      </button>
                    ) : (
                      <button onClick={() => cvFileRef.current?.click()} disabled={cvUploading} className="inline-flex items-center gap-1 rounded-md bg-surface-light px-2 py-1 text-xs text-muted hover:text-smaragd transition-colors disabled:opacity-50">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-3 3m3-3l3 3M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" /></svg>
                        {cvUploading ? "Uploaden…" : "CV uploaden"}
                      </button>
                    )}
                    <button onClick={() => setEditMode(true)} className="inline-flex items-center gap-1 rounded-md bg-surface-light px-2 py-1 text-xs text-muted hover:text-heading transition-colors">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      Bewerken
                    </button>
                    <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleCvUpload} className="hidden" />
                  </div>
                  {cvUploadError && <p className="text-xs text-red-400">{cvUploadError}</p>}
                </div>
              ) : (
                /* Edit mode */
                <div className="space-y-3 rounded-xl bg-surface-light/40 px-4 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Voornaam">
                      <input
                        type="text"
                        value={editForm.voornaam}
                        onChange={(e) => setEditForm((f) => ({ ...f, voornaam: e.target.value }))}
                        className="input-field"
                      />
                    </FieldGroup>
                    <FieldGroup label="Achternaam">
                      <input
                        type="text"
                        value={editForm.achternaam}
                        onChange={(e) => setEditForm((f) => ({ ...f, achternaam: e.target.value }))}
                        className="input-field"
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup label="E-mail">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="Telefoon">
                    <input
                      type="text"
                      value={editForm.telefoon}
                      onChange={(e) => setEditForm((f) => ({ ...f, telefoon: e.target.value }))}
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="LinkedIn URL">
                    <input
                      type="url"
                      value={editForm.linkedin_url}
                      onChange={(e) => setEditForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="Pool status">
                    <select
                      value={editForm.pool_status}
                      onChange={(e) => setEditForm((f) => ({ ...f, pool_status: e.target.value }))}
                      className="input-field"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="in_selectie">In selectie</option>
                      <option value="radical">Radical Pool</option>
                      <option value="alumni">Alumni</option>
                      <option value="afgewezen">Afgewezen</option>
                    </select>
                  </FieldGroup>

                  {editForm.pool_status === "afgewezen" && (
                    <FieldGroup label="Reden afwijzing">
                      <textarea
                        value={editForm.reden_afwijzing}
                        onChange={(e) => setEditForm((f) => ({ ...f, reden_afwijzing: e.target.value }))}
                        placeholder="Waarom wordt deze kandidaat afgewezen?"
                        rows={3}
                        className="input-field"
                      />
                    </FieldGroup>
                  )}

                  <FieldGroup label="Vaardigheden (komma-gescheiden)">
                    <input
                      type="text"
                      value={editForm.vaardigheden}
                      onChange={(e) => setEditForm((f) => ({ ...f, vaardigheden: e.target.value }))}
                      placeholder="Python, TypeScript, AI..."
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="Tags (komma-gescheiden)">
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="senior, fulltime, remote..."
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="Notities">
                    <textarea
                      value={editForm.notities}
                      onChange={(e) => setEditForm((f) => ({ ...f, notities: e.target.value }))}
                      rows={4}
                      className="input-field resize-none"
                    />
                  </FieldGroup>

                  <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.beschikbaarheid}
                      onChange={(e) => setEditForm((f) => ({ ...f, beschikbaarheid: e.target.checked }))}
                      className="h-4 w-4 rounded accent-smaragd"
                    />
                    Beschikbaar
                  </label>

                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setEditMode(false); setSaveError(null); }}
                      disabled={saving}
                      className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-light transition-colors disabled:opacity-50"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-smaragd px-3 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving ? "Opslaan…" : "Opslaan"}
                    </button>
                  </div>
                </div>
              )}

              {/* Delete — compact inline */}
              {!confirmDelete ? (
                <div className="flex justify-end">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[11px] text-muted/40 hover:text-red-400 transition-colors"
                  >
                    Verwijderen
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-3 space-y-2">
                  <p className="text-center text-xs text-red-400 font-medium">
                    Weet je zeker dat je <strong>{kandidaat.voornaam} {kandidaat.achternaam}</strong> wilt verwijderen? Dit kan niet ongedaan worden.
                  </p>
                  {deleteError && <p className="text-center text-xs text-red-500">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="flex-1 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-light transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 rounded-lg bg-red-900/40 border border-red-800/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Verwijderen…" : "Ja, verwijder"}
                    </button>
                  </div>
                </div>
              )}
              </div>{/* end top bar */}

              {/* ─── FULL WIDTH: Rapport + APAC + Activiteiten ─── */}

              {/* AI Rapport Samenvatting — PROMINENT */}
              <div className="cursor-pointer" onClick={() => setActiveTab("rapport")}>
                  <ReportSummaryInline kandidaatId={kandidaat.id} />
                </div>

                {/* APAC Scores — compact */}
                <div className="rounded-xl bg-surface-light/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">APAC</p>
                      {kandidaat.gecombineerd !== null && (
                        <span className="gradient-text font-heading text-base font-bold leading-none">{kandidaat.gecombineerd}</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setApacEditScores({
                          adaptability: kandidaat.adaptability ?? 0,
                          personality:  kandidaat.personality ?? 0,
                          awareness:    kandidaat.awareness ?? 0,
                          connection:   kandidaat.connection ?? 0,
                        });
                        setApacSaveError(null);
                        setApacEditMode(true);
                        setActiveTab("apac_edit" as ModalTab);
                      }}
                      className="text-xs text-muted hover:text-smaragd transition-colors"
                    >
                      Aanpassen
                    </button>
                  </div>
                  {scores ? (() => {
                    return (
                      <div className="flex items-center gap-3">
                        {/* Radar chart */}
                        <div className="w-[100px] shrink-0 -my-2">
                          <RadarChart scores={scores} maxScores={maxScores} maxSize={100} animated={false} />
                        </div>
                        {/* Score bars */}
                        <div className="flex-1 space-y-1.5">
                          {(
                            [
                              { key: "adaptability", label: "Adaptability", color: "#2ed573" },
                              { key: "personality",  label: "Personality",  color: "#E6734F" },
                              { key: "awareness",    label: "Awareness",    color: "#3B82F6" },
                              { key: "connection",   label: "Connection",   color: "#8B5CF6" },
                            ] as const
                          ).map((d) => {
                            const dimMax = maxScores[d.key];
                            const pct = scoreToPercentage(scores[d.key], dimMax);
                            return (
                              <div key={d.key} className="flex items-center gap-3">
                                <span className="w-20 text-[11px] font-medium text-muted shrink-0">{d.label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-surface-border/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: d.color,
                                    }}
                                  />
                                </div>
                                <span className="w-12 text-right text-sm font-bold font-heading" style={{ color: d.color }}>
                                  {scoreDisplay === "percentage" ? `${pct}%` : `${scores[d.key]}/${dimMax}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : (
                    <p className="text-center text-xs text-muted py-3">Nog geen APAC-test.</p>
                  )}
                  {kandidaat.vetoGetriggerd && kandidaat.vetoDetails.length > 0 && (
                    <div className="mt-4 rounded-lg border border-red-800/30 bg-red-900/10 p-4 space-y-3">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                        Veto waarschuwingen ({kandidaat.vetoDetails.length})
                      </p>
                      {kandidaat.vetoDetails.map((v, i) => (
                        <div key={i} className="text-sm">
                          <p className="font-medium text-heading">{v.question_text}</p>
                          <p className="text-xs text-muted mt-0.5">
                            Antwoord: <span className="text-red-400 font-semibold">{v.answer_label}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {kandidaat.respondentOpmerkingen && (
                    <div className="mt-3 rounded-lg border border-blue-800/20 bg-blue-900/10 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">
                        Opmerkingen kandidaat
                      </p>
                      <p className="text-sm text-body whitespace-pre-wrap">
                        {kandidaat.respondentOpmerkingen}
                      </p>
                    </div>
                  )}
                </div>

                {/* Activiteiten */}
                <div className="flex-1">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Activiteiten</p>
                  <ActivityTimeline entityType="kandidaat" entityId={kandidaat.id} />
                </div>

                {/* Email log */}
                <div className="flex-1">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Email</p>
                  <EmailLogTab kandidaatId={kandidaat.id} />
                </div>

                {/* Pipeline / Plaatsingen — compact */}
                <div className="pt-1">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Pipeline & Plaatsingen</p>
                  {loadingPlaatsingen ? (
                    <p className="py-4 text-center text-sm text-muted">Laden…</p>
                  ) : plaatsingen.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted">Geen plaatsingen gevonden.</p>
                  ) : (
                    <div className="space-y-2">
                      {plaatsingen.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-light px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-heading">{p.vacatureTitel || "Geen vacature"}</p>
                            <p className="text-xs text-muted">{p.pipelineType} · {p.dealStage}</p>
                          </div>
                          <span className="rounded-full bg-smaragd/10 px-2 py-0.5 text-xs font-semibold text-smaragd">{p.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* ── APAC EDIT MODE (apart scherm) ── */}
          {(activeTab as string) === "apac_edit" && (
            <div className="mx-auto max-w-lg space-y-4">
              <p className="text-xs text-muted">
                Voer de totaalscores per dimensie in (max {maxScores.adaptability} per dimensie). Gecombineerd wordt automatisch berekend.
              </p>
              {(
                [
                  { key: "adaptability", label: "Adaptability", color: "#2ed573" },
                  { key: "personality",  label: "Personality",  color: "#E6734F" },
                  { key: "awareness",    label: "Awareness",    color: "#3B82F6" },
                  { key: "connection",   label: "Connection",   color: "#8B5CF6" },
                ] as const
              ).map((d) => (
                <FieldGroup key={d.key} label={d.label}>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={maxScores[d.key]}
                      step={1}
                      value={apacEditScores[d.key]}
                      onChange={(e) =>
                        setApacEditScores((prev) => ({
                          ...prev,
                          [d.key]: Number(e.target.value),
                        }))
                      }
                      className="input-field w-28"
                    />
                    <div className="h-2 flex-1 rounded-full bg-surface-border overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, scoreToPercentage(apacEditScores[d.key], maxScores[d.key]))}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </div>
                </FieldGroup>
              ))}

              <div className="rounded-xl bg-smaragd/5 border border-smaragd/20 p-3 text-center">
                <p className="text-xs text-muted">Gecombineerd (auto)</p>
                <p className="gradient-text font-heading text-2xl font-bold">{apacGecombineerd}</p>
              </div>

              {apacSaveError && <p className="text-xs text-red-400">{apacSaveError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => { setApacEditMode(false); setApacSaveError(null); setActiveTab("profiel"); }}
                  disabled={apacSaving}
                  className="flex-1 rounded-lg border border-surface-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-light transition-colors disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={async () => { await handleApacSave(); setActiveTab("profiel"); }}
                  disabled={apacSaving}
                  className="flex-1 rounded-lg bg-smaragd px-3 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {apacSaving ? "Opslaan…" : "Opslaan"}
                </button>
              </div>
            </div>
          )}

          {/* ── AVG TAB ── */}
          {activeTab === "avg" && (
            <div className="space-y-3">
              {loadingAvg ? (
                <p className="py-8 text-center text-sm text-muted">Laden…</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">AVG Toestemmingen</p>
                    <button
                      onClick={handleAvgAlleToestaan}
                      className="rounded px-2 py-1 text-xs font-medium text-smaragd hover:bg-smaragd/10 transition-colors"
                    >
                      Alles toestaan
                    </button>
                  </div>

                  {Object.entries(AVG_TOESTEMMING_LABELS).map(([type, label]) => {
                    const t = avgToestemmingen.find((ts) => ts.type === type);
                    const isOn = t?.toegestaan ?? false;
                    const isExpired = t?.verlooptOp && new Date(t.verlooptOp) < new Date();

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-light px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-body">{label}</p>
                          {t?.gegevenOp && (
                            <p className="text-xs text-muted">
                              {isOn ? "Gegeven" : "Ingetrokken"} op{" "}
                              {new Date(isOn ? t.gegevenOp! : (t.ingetrokkenOp ?? t.gegevenOp)!).toLocaleDateString("nl-NL")}
                            </p>
                          )}
                          {isExpired && (
                            <span className="inline-block rounded-full bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-400">
                              Verlopen
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAvgToggle(type, !isOn)}
                          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                            isOn ? "bg-smaragd" : "bg-surface-border"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              isOn ? "left-[22px]" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}

                  {avgToestemmingen.some((t) => t.ingetrokkenOp) && (
                    <div className="rounded-lg border border-red-800/30 bg-red-900/10 p-3">
                      <p className="mb-1.5 text-xs font-semibold text-red-400">Ingetrokken</p>
                      {avgToestemmingen
                        .filter((t) => t.ingetrokkenOp)
                        .map((t) => (
                          <p key={t.id} className="text-xs text-muted">
                            {AVG_TOESTEMMING_LABELS[t.type] ?? t.type} — {new Date(t.ingetrokkenOp!).toLocaleDateString("nl-NL")}
                          </p>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── RAPPORT TAB ── */}
          {activeTab === "rapport" && (
            <CandidateReportTab
              kandidaatId={kandidaat.id}
              cvUrl={kandidaat.cvUrl ?? null}
            />
          )}

          {/* ── EMAIL TAB ── */}
          {activeTab === "email" && (
            <div className="space-y-4">
              {!kandidaat.email ? (
                <div className="rounded-xl bg-surface-light p-10 text-center text-sm text-muted">
                  Geen e-mailadres bekend voor deze kandidaat.
                </div>
              ) : emailSent ? (
                <div className="rounded-xl bg-smaragd/5 border border-smaragd/20 p-8 text-center space-y-2">
                  <p className="text-smaragd text-2xl">✓</p>
                  <p className="text-sm font-medium text-heading">E-mail verstuurd!</p>
                  <p className="text-xs text-muted">Naar: {kandidaat.email}</p>
                  <button
                    onClick={() => { setEmailSent(false); setEmailSubject(""); setEmailBody(""); setEmailTemplate("custom"); }}
                    className="mt-2 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-light transition-colors"
                  >
                    Nieuwe e-mail
                  </button>
                </div>
              ) : (
                <>
                  <FieldGroup label="Template">
                    <select
                      value={emailTemplate}
                      onChange={(e) => applyEmailTemplate(e.target.value)}
                      className="input-field"
                    >
                      <option value="custom">— Eigen bericht —</option>
                      <option value="welkom">Welkomstmail</option>
                      <option value="gesprek">Uitnodiging gesprek</option>
                      <option value="statusupdate">Statusupdate</option>
                      <option value="afwijzing">Afwijzing</option>
                    </select>
                  </FieldGroup>

                  <FieldGroup label="Aan">
                    <p className="text-sm text-muted py-1">{kandidaat.email}</p>
                  </FieldGroup>

                  <FieldGroup label="Onderwerp">
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Onderwerp…"
                      className="input-field"
                    />
                  </FieldGroup>

                  <FieldGroup label="Bericht">
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Typ hier je bericht…"
                      rows={8}
                      className="input-field resize-none"
                    />
                  </FieldGroup>

                  {emailError && <p className="text-xs text-red-400">{emailError}</p>}

                  <button
                    onClick={handleEmailSend}
                    disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                    className="w-full rounded-lg bg-smaragd px-3 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {emailSending ? "Versturen…" : "Verstuur e-mail"}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  link = false,
  valueClass,
}: {
  label: string;
  value: string | null | undefined;
  link?: boolean;
  valueClass?: string;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-smaragd hover:underline truncate block"
        >
          LinkedIn ↗
        </a>
      ) : (
        <p className={`text-sm text-body truncate ${valueClass ?? ""}`}>{value}</p>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
