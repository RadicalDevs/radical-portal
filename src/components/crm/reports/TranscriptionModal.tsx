"use client";

import { useState } from "react";
import { addTranscriptie } from "@/app/admin/actions/reports";

export default function TranscriptionModal({
  kandidaatId,
  onClose,
  onAdded,
}: {
  kandidaatId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [titel, setTitel] = useState("");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await addTranscriptie(kandidaatId, titel, transcript);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onAdded();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-surface-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold text-heading mb-4">Transcriptie toevoegen</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Titel</label>
            <input
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="bijv. Intake gesprek Nelieke - 15 maart"
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-heading placeholder:text-muted/50 focus:border-smaragd focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Transcriptie tekst</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Plak hier de volledige transcriptie..."
              rows={12}
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-heading placeholder:text-muted/50 focus:border-smaragd focus:outline-none resize-y"
              required
            />
            <p className="mt-1 text-xs text-muted">{transcript.length.toLocaleString()} karakters</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-heading">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving || !titel.trim() || !transcript.trim()}
              className="rounded-lg bg-smaragd px-4 py-2 text-sm font-medium text-white hover:bg-smaragd/90 disabled:opacity-50"
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
