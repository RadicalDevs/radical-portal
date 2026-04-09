"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { VacatureWithKlant, VoorgesteldeKandidaat } from "@/app/admin/actions/vacatures";
import {
  updateVacature,
  deleteVacature,
  getVacatureKandidaten,
  linkKandidaatToVacature,
  getKandidatenForLinking,
  getSectorOpties,
} from "@/app/admin/actions/vacatures";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Tabs } from "@/components/crm/ui/Tabs";
import { InlineField } from "@/components/crm/ui/InlineField";
import { Modal } from "@/components/crm/ui/Modal";
import { SearchSelect } from "@/components/crm/ui/SearchSelect";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import { ActivityTimeline } from "@/components/crm/timeline/ActivityTimeline";

const STATUS_VARIANT: Record<string, "default" | "warning" | "smaragd" | "danger"> = {
  voorgesteld: "default",
  in_gesprek: "warning",
  geselecteerd: "smaragd",
  geplaatst: "smaragd",
  afgewezen: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  voorgesteld: "Voorgesteld",
  in_gesprek: "In gesprek",
  geselecteerd: "Geselecteerd",
  geplaatst: "Geplaatst",
  afgewezen: "Afgewezen",
};

interface Props {
  vacature: VacatureWithKlant;
  kandidaten: VoorgesteldeKandidaat[];
}

export default function VacatureDetailClient({
  vacature: initialVacature,
  kandidaten: initialKandidaten,
}: Props) {
  const router = useRouter();
  const [vacature, setVacature] = useState(initialVacature);
  const [kandidaten, setKandidaten] = useState(initialKandidaten);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkOptions, setLinkOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedKandidaatId, setSelectedKandidaatId] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [sectorOpties, setSectorOpties] = useState<{ value: string; label: string }[]>([]);
  const [, startTransition] = useTransition();

  // AI Matching state
  const [matchResults, setMatchResults] = useState<Array<{
    kandidaat_id: string;
    voornaam: string;
    achternaam: string;
    email: string;
    vaardigheden: string[];
    beschikbaarheid: boolean | null;
    salarisindicatie: number | null;
    totaal_score: number;
    semantic_score?: number;
    vaardigheden_score?: number;
    apac_score?: number;
    salaris_score?: number;
    uitleg: {
      matchende_vaardigheden: string[];
      ontbrekende_vaardigheden: string[];
      sterke_punten: string[];
      aandachtspunten: string[];
      samenvatting: string;
    };
  }>>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [hasMatched, setHasMatched] = useState(false);

  const handleMatch = useCallback(async () => {
    setMatching(true);
    setMatchError(null);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacature_id: vacature.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Matching mislukt");
      }
      const data = await res.json();
      setMatchResults(data.matches || []);
      setHasMatched(true);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setMatching(false);
    }
  }, [vacature.id]);

  const refreshKandidaten = () => {
    startTransition(async () => {
      const fresh = await getVacatureKandidaten(vacature.id);
      setKandidaten(fresh);
    });
  };

  const handleFieldSave = async (field: string, value: string) => {
    const result = await updateVacature(vacature.id, field, value);
    if (!result.error) {
      const numFields = ["salaris_min", "salaris_max", "budget"];
      const newValue = numFields.includes(field) ? (Number(value) || null) : (value || null);
      setVacature((prev) => ({ ...prev, [field]: newValue }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Weet je zeker dat je deze vacature wilt verwijderen?")) return;
    const result = await deleteVacature(vacature.id);
    if (!result.error) router.push("/admin/vacatures");
  };

  const openLinkModal = async () => {
    setLinkError(null);
    setSelectedKandidaatId("");
    try {
      const [options, sectors] = await Promise.all([
        getKandidatenForLinking(vacature.id),
        sectorOpties.length === 0 ? getSectorOpties() : Promise.resolve(sectorOpties),
      ]);
      setLinkOptions(
        options.map((k) => ({ value: k.id, label: `${k.voornaam} ${k.achternaam}` }))
      );
      if (sectorOpties.length === 0) setSectorOpties(sectors);
      setShowLinkModal(true);
    } catch {
      setLinkError("Kon kandidaten niet laden. Probeer opnieuw.");
    }
  };

  const handleLinkKandidaat = async () => {
    if (!selectedKandidaatId) return;
    const result = await linkKandidaatToVacature(vacature.id, selectedKandidaatId);
    if (result.error) {
      setLinkError(result.error);
    } else {
      setShowLinkModal(false);
      refreshKandidaten();
    }
  };

  const tabs = [
    {
      key: "details",
      label: "Details",
      content: (
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Klant</p>
              {vacature.klant ? (
                <button
                  onClick={() => router.push(`/admin/klanten/${vacature.klant!.id}`)}
                  className="mt-1 text-sm text-smaragd hover:underline"
                >
                  {vacature.klant.bedrijfsnaam}
                </button>
              ) : (
                <p className="mt-1 text-sm text-body">—</p>
              )}
            </div>
            <InlineField
              label="Status"
              value={vacature.status}
              onSave={(v) => handleFieldSave("status", v)}
              type="select"
              options={[
                { value: "open", label: "Open" },
                { value: "on_hold", label: "On hold" },
                { value: "gesloten", label: "Gesloten" },
              ]}
            />
            <InlineField
              label="Salaris min"
              value={vacature.salaris_min?.toString() ?? ""}
              onSave={(v) => handleFieldSave("salaris_min", v)}
              type="number"
              placeholder="—"
            />
            <InlineField
              label="Salaris max"
              value={vacature.salaris_max?.toString() ?? ""}
              onSave={(v) => handleFieldSave("salaris_max", v)}
              type="number"
              placeholder="—"
            />
            <InlineField
              label="Budget"
              value={vacature.budget?.toString() ?? ""}
              onSave={(v) => handleFieldSave("budget", v)}
              type="number"
              placeholder="—"
            />
            <InlineField
              label="Sector"
              value={vacature.sector || ""}
              onSave={(v) => handleFieldSave("sector", v)}
              type="select"
              options={sectorOpties.length > 0 ? sectorOpties : []}
              placeholder="Geen sector"
            />
            <div>
              <p className="text-xs text-muted">Aangemaakt</p>
              <p className="mt-1 text-sm text-body">
                {new Date(vacature.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-surface-border pt-4">
            <InlineField
              label="Beschrijving"
              value={vacature.beschrijving ?? ""}
              onSave={(v) => handleFieldSave("beschrijving", v)}
              type="textarea"
              placeholder="Geen beschrijving"
            />
          </div>
        </Card>
      ),
    },
    {
      key: "kandidaten",
      label: `Kandidaten (${kandidaten.length})`,
      content: (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={openLinkModal} className="text-sm">
              + Kandidaat koppelen
            </Button>
          </div>
          {kandidaten.length === 0 ? (
            <EmptyState
              title="Geen kandidaten voorgesteld"
              description="Koppel een kandidaat om te beginnen."
            />
          ) : (
            <div className="space-y-2">
              {kandidaten.map((k) => (
                <Card
                  key={k.id}
                  padding="sm"
                  className="cursor-pointer hover:border-smaragd/40 transition-colors"
                  onClick={() => router.push(`/admin/candidates/${k.kandidaat.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-heading">
                        {k.kandidaat.voornaam} {k.kandidaat.achternaam}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {k.kandidaat.vaardigheden?.slice(0, 3).map((v) => (
                          <Badge key={v} variant="smaragd">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[k.status] || "default"}>
                      {STATUS_LABEL[k.status] || k.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "matching",
      label: "AI Matching",
      content: (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleMatch}
              disabled={matching}
              className="rounded-lg bg-gradient-to-r from-smaragd to-smaragd/80 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-smaragd/20 hover:shadow-smaragd/30 disabled:opacity-50 transition-all"
            >
              {matching ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Matching bezig...
                </span>
              ) : hasMatched ? (
                "Opnieuw matchen"
              ) : (
                "Match kandidaten"
              )}
            </button>
            {hasMatched && <span className="text-xs text-muted">{matchResults.length} resultaten</span>}
          </div>

          {matchError && <p className="text-sm text-red-400">{matchError}</p>}

          {hasMatched && matchResults.length === 0 && (
            <div className="rounded-xl bg-surface-light p-10 text-center text-sm text-muted">
              Geen kandidaten gevonden die aan de minimum vereisten voldoen.
            </div>
          )}

          {matchResults.length > 0 && (
            <div className="space-y-2">
              {matchResults.map((m, i) => (
                <div
                  key={m.kandidaat_id}
                  className="rounded-xl border border-surface-border bg-surface p-4 hover:border-smaragd/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-smaragd/90 to-coral/70 text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-heading">{m.voornaam} {m.achternaam}</p>
                        <p className="text-xs text-muted">{m.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-smaragd">{Math.round(m.totaal_score * 100)}%</p>
                      <p className="text-[10px] text-muted">match score</p>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {m.semantic_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-medium text-heading">{Math.round(m.semantic_score * 100)}%</div>
                        <div className="text-[10px] text-muted">Semantisch</div>
                      </div>
                    )}
                    {m.vaardigheden_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-medium text-heading">{Math.round(m.vaardigheden_score * 100)}%</div>
                        <div className="text-[10px] text-muted">Skills</div>
                      </div>
                    )}
                    {m.apac_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-medium text-heading">{Math.round(m.apac_score * 100)}%</div>
                        <div className="text-[10px] text-muted">APAC</div>
                      </div>
                    )}
                    {m.salaris_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-medium text-heading">{Math.round(m.salaris_score * 100)}%</div>
                        <div className="text-[10px] text-muted">Salaris</div>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {m.uitleg.matchende_vaardigheden.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.uitleg.matchende_vaardigheden.map((v) => (
                        <span key={v} className="rounded-full bg-smaragd/10 px-2 py-0.5 text-[10px] font-medium text-smaragd">{v}</span>
                      ))}
                      {m.uitleg.ontbrekende_vaardigheden.slice(0, 3).map((v) => (
                        <span key={v} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">{v}</span>
                      ))}
                    </div>
                  )}

                  {/* Sterke punten & aandachtspunten */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.uitleg.sterke_punten.map((s) => (
                      <span key={s} className="text-[10px] text-smaragd">+ {s}</span>
                    ))}
                    {m.uitleg.aandachtspunten.map((a) => (
                      <span key={a} className="text-[10px] text-amber-400">! {a}</span>
                    ))}
                  </div>

                  {/* Samenvatting */}
                  <p className="mt-2 text-xs text-muted">{m.uitleg.samenvatting}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "activiteiten",
      label: "Activiteiten",
      content: <ActivityTimeline entityType="vacature" entityId={vacature.id} />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Back nav */}
      <div>
        <button
          onClick={() => router.push("/admin/vacatures")}
          className="text-sm text-muted hover:text-heading transition-colors"
        >
          ← Vacatures
        </button>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading">{vacature.functietitel}</h1>
            {vacature.klant && (
              <p className="mt-1 text-sm text-muted">{vacature.klant.bedrijfsnaam}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant={
                vacature.status === "open"
                  ? "smaragd"
                  : vacature.status === "on_hold"
                  ? "warning"
                  : "default"
              }
            >
              {vacature.status === "on_hold" ? "On Hold" : vacature.status.charAt(0).toUpperCase() + vacature.status.slice(1)}
            </Badge>
            <Button variant="danger" className="text-xs" onClick={handleDelete}>
              Verwijderen
            </Button>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} />

      {/* Link kandidaat modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Kandidaat koppelen"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {linkError && (
            <p className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-500">
              {linkError}
            </p>
          )}
          <SearchSelect
            label="Kandidaat"
            name="kandidaat_id"
            placeholder="Zoek een kandidaat..."
            options={linkOptions}
            onChange={setSelectedKandidaatId}
            value={selectedKandidaatId}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowLinkModal(false)}>
              Annuleren
            </Button>
            <Button onClick={handleLinkKandidaat} disabled={!selectedKandidaatId}>
              Koppelen als voorgesteld
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
