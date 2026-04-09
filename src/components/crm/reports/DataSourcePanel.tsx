"use client";

import { useState } from "react";
import type { KandidaatBrondataRow, KandidaatTranscriptieRow } from "@/lib/types/report";
import { extractAndStoreCvText, deleteTranscriptie } from "@/app/admin/actions/reports";
import TranscriptionModal from "./TranscriptionModal";
import LinkedInPasteModal from "./LinkedInPasteModal";

interface Props {
  kandidaatId: string;
  cvUrl: string | null;
  brondata: KandidaatBrondataRow[];
  transcripties: KandidaatTranscriptieRow[];
  onDataChanged: () => void;
}

export default function DataSourcePanel({ kandidaatId, cvUrl, brondata, transcripties, onDataChanged }: Props) {
  const [showTranscriptieModal, setShowTranscriptieModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [extractingCv, setExtractingCv] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);

  const hasCvText = brondata.some((b) => b.bron_type === "cv_tekst");
  const linkedInData = brondata.find((b) => b.bron_type === "linkedin_profiel");
  const hasCv = !!cvUrl;

  async function handleExtractCv() {
    if (!cvUrl) return;
    setExtractingCv(true);
    setCvError(null);
    try {
      const result = await extractAndStoreCvText(kandidaatId, cvUrl);
      if (result.error) {
        setCvError(result.error);
      } else {
        onDataChanged();
      }
    } catch (err) {
      setCvError(err instanceof Error ? err.message : "CV extractie mislukt");
    } finally {
      setExtractingCv(false);
    }
  }

  async function handleDeleteTranscriptie(id: string) {
    setDeletingId(id);
    await deleteTranscriptie(id);
    setDeletingId(null);
    onDataChanged();
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-heading uppercase tracking-wide">Data Bronnen</h4>

      <div className="grid grid-cols-1 gap-2">
        {/* CV */}
        <div className="flex items-center justify-between rounded-lg border border-surface-border bg-background/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasCvText ? "bg-smaragd" : hasCv ? "bg-yellow-500" : "bg-red-500/50"}`} />
            <span className="text-sm text-heading">CV Tekst</span>
          </div>
          <div className="text-right">
            {hasCvText ? (
              <span className="text-xs text-smaragd">Geëxtraheerd</span>
            ) : hasCv ? (
              <button onClick={handleExtractCv} disabled={extractingCv} className="text-xs text-smaragd hover:underline disabled:opacity-50">
                {extractingCv ? "Bezig..." : "Extraheren"}
              </button>
            ) : (
              <span className="text-xs text-muted">Geen CV geüpload</span>
            )}
            {cvError && <p className="text-[10px] text-red-400 mt-0.5">{cvError}</p>}
          </div>
        </div>

        {/* LinkedIn */}
        <div className="flex items-center justify-between rounded-lg border border-surface-border bg-background/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${linkedInData ? "bg-smaragd" : "bg-red-500/50"}`} />
            <span className="text-sm text-heading">LinkedIn Profiel</span>
          </div>
          <button onClick={() => setShowLinkedInModal(true)} className="text-xs text-smaragd hover:underline">
            {linkedInData ? "Bewerken" : "Toevoegen"}
          </button>
        </div>

        {/* Transcripties */}
        <div className="rounded-lg border border-surface-border bg-background/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${transcripties.length > 0 ? "bg-smaragd" : "bg-red-500/50"}`} />
              <span className="text-sm text-heading">Transcripties ({transcripties.length})</span>
            </div>
            <button onClick={() => setShowTranscriptieModal(true)} className="text-xs text-smaragd hover:underline">
              Toevoegen
            </button>
          </div>
          {transcripties.length > 0 && (
            <div className="mt-2 space-y-1">
              {transcripties.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted truncate max-w-[200px]">{t.titel}</span>
                  <button
                    onClick={() => handleDeleteTranscriptie(t.id)}
                    disabled={deletingId === t.id}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === t.id ? "..." : "Verwijder"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data volledigheid */}
      <div className="text-xs text-muted">
        {[hasCvText && "CV", linkedInData && "LinkedIn", transcripties.length > 0 && "Transcripties"].filter(Boolean).length}/3 bronnen beschikbaar
      </div>

      {/* Modals */}
      {showTranscriptieModal && (
        <TranscriptionModal
          kandidaatId={kandidaatId}
          onClose={() => setShowTranscriptieModal(false)}
          onAdded={onDataChanged}
        />
      )}
      {showLinkedInModal && (
        <LinkedInPasteModal
          kandidaatId={kandidaatId}
          existingText={linkedInData?.inhoud}
          onClose={() => setShowLinkedInModal(false)}
          onSaved={onDataChanged}
        />
      )}
    </div>
  );
}
