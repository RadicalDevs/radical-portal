"use client";

import { useState } from "react";
import { saveLinkedInData } from "@/app/admin/actions/reports";

export default function LinkedInPasteModal({
  kandidaatId,
  existingText,
  onClose,
  onSaved,
}: {
  kandidaatId: string;
  existingText?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(existingText ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await saveLinkedInData(kandidaatId, text);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-surface-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold text-heading mb-2">LinkedIn Profiel Data</h3>
        <p className="text-xs text-muted/70 mb-4">
          Open het LinkedIn profiel van de kandidaat, selecteer alles (Cmd+A), kopieer (Cmd+C) en plak hier (Cmd+V).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={() => setError(null)}
              placeholder={"Plak hier het volledige LinkedIn profiel...\n\nAbout, Ervaring, Opleiding — alles mag, het systeem haalt er automatisch de relevante informatie uit."}
              rows={18}
              autoFocus
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-heading placeholder:text-muted/50 focus:border-smaragd focus:outline-none resize-y"
              required
            />
            <p className="mt-1 text-xs text-muted">{text.length.toLocaleString()} karakters</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-heading">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving || !text.trim()}
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
