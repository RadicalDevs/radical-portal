"use client";

import { useState, useRef, useTransition } from "react";
import { importKandidaat, importKandidatenBulk } from "../actions";
import type { BulkImportRow, BulkImportResult, ImportResult } from "../actions";

const DIMENSIONS = ["adaptability", "personality", "awareness", "connection"] as const;
const DIM_LABELS = { adaptability: "Adaptability", personality: "Personality", awareness: "Awareness", connection: "Connection" };

export default function ImportClient() {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-surface-border bg-surface-light p-1 w-fit">
        {(["single", "bulk"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-[8px] px-5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-surface text-smaragd shadow-sm"
                : "text-muted hover:text-heading"
            }`}
          >
            {t === "single" ? "Enkele kandidaat" : "Bulk CSV upload"}
          </button>
        ))}
      </div>

      {tab === "single" ? <SingleImportForm /> : <BulkImportForm />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single import form
// ---------------------------------------------------------------------------

function SingleImportForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const res = await importKandidaat(fd);
      setResult(res);
      if (res.success) formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-surface-border bg-surface p-6 shadow-sm space-y-5"
    >
      <h2 className="font-heading text-lg font-bold text-heading">
        Enkele kandidaat importeren
      </h2>

      {/* Name + email */}
      <div className="grid gap-4 sm:grid-cols-3">
        <LabeledInput name="voornaam" label="Voornaam *" placeholder="Justin" required />
        <LabeledInput name="achternaam" label="Achternaam" placeholder="Voskuil" />
        <LabeledInput name="email" label="E-mailadres *" type="email" placeholder="justin@example.com" required />
      </div>

      {/* APAC Scores */}
      <div>
        <p className="mb-3 text-sm font-semibold text-label">APAC Scores (0–10)</p>
        <div className="grid gap-4 sm:grid-cols-4">
          {DIMENSIONS.map((dim) => (
            <div key={dim}>
              <label className="mb-1 block text-xs font-medium text-muted">
                {DIM_LABELS[dim]}
              </label>
              <input
                name={dim}
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0–10"
                required
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-smaragd focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="w-48">
        <label className="mb-1 block text-sm font-medium text-label">
          Testdatum (optioneel)
        </label>
        <input
          name="datum"
          type="date"
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body focus:border-smaragd focus:outline-none"
        />
      </div>

      {/* Result feedback */}
      {result && (
        <div
          className={`rounded-lg p-3 text-sm font-medium ${
            result.success
              ? "bg-smaragd/10 text-smaragd"
              : "bg-coral/10 text-coral"
          }`}
        >
          {result.success ? result.message : result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-smaragd px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark disabled:opacity-50"
      >
        {isPending ? "Importeren…" : "Importeer kandidaat"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Bulk CSV upload
// ---------------------------------------------------------------------------

// Expected CSV header: voornaam,achternaam,email,adaptability,personality,awareness,connection,datum
function parseCsv(text: string): { rows: BulkImportRow[]; parseErrors: string[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { rows: [], parseErrors: ["CSV heeft geen data regels."] };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["voornaam", "email", "adaptability", "personality", "awareness", "connection"];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) {
    return { rows: [], parseErrors: [`Ontbrekende kolommen: ${missing.join(", ")}`] };
  }

  const rows: BulkImportRow[] = [];
  const parseErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map((c) => c.trim());
    const get = (col: string) => cols[header.indexOf(col)] ?? "";

    const row: BulkImportRow = {
      voornaam: get("voornaam"),
      achternaam: get("achternaam"),
      email: get("email"),
      adaptability: parseFloat(get("adaptability")),
      personality: parseFloat(get("personality")),
      awareness: parseFloat(get("awareness")),
      connection: parseFloat(get("connection")),
      datum: get("datum") || undefined,
    };

    if (!row.voornaam || !row.email || isNaN(row.adaptability)) {
      parseErrors.push(`Rij ${i + 1}: ongeldige data`);
      continue;
    }
    rows.push(row);
  }

  return { rows, parseErrors };
}

function BulkImportForm() {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<BulkImportRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setParseErrors(["Alleen CSV-bestanden worden ondersteund."]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows, parseErrors: errs } = parseCsv(text);
      setPreview(rows);
      setParseErrors(errs);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    if (!preview || preview.length === 0) return;
    startTransition(async () => {
      const res = await importKandidatenBulk(preview);
      setResult(res);
      if (res.success === preview.length) {
        setPreview(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-smaragd bg-smaragd/5"
            : "border-surface-border hover:border-smaragd/50 hover:bg-surface-light"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <svg className="mx-auto h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mt-3 text-sm font-medium text-heading">
          Sleep een CSV-bestand hiernaartoe
        </p>
        <p className="mt-1 text-xs text-muted">
          of klik om te bladeren
        </p>
        <p className="mt-3 text-xs text-muted">
          Verwachte kolommen:{" "}
          <code className="rounded bg-surface-light px-1">
            voornaam, achternaam, email, adaptability, personality, awareness, connection, datum
          </code>
        </p>
      </div>

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-lg bg-coral/10 p-3">
          {parseErrors.map((e, i) => (
            <p key={i} className="text-sm text-coral">{e}</p>
          ))}
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-heading">
              Preview ({preview.length} rijen)
            </p>
            <button
              onClick={() => { setPreview(null); setResult(null); }}
              className="text-xs text-muted hover:text-heading"
            >
              Wissen
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
            <table className="w-full text-xs">
              <thead className="border-b border-surface-border bg-surface-light">
                <tr>
                  {["Naam", "E-mail", "A", "P", "A", "C", "Datum"].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-light">
                    <td className="px-3 py-2 text-heading">
                      {row.voornaam} {row.achternaam}
                    </td>
                    <td className="px-3 py-2 text-muted">{row.email}</td>
                    <td className="px-3 py-2">{row.adaptability}</td>
                    <td className="px-3 py-2">{row.personality}</td>
                    <td className="px-3 py-2">{row.awareness}</td>
                    <td className="px-3 py-2">{row.connection}</td>
                    <td className="px-3 py-2 text-muted">{row.datum ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={isPending}
            className="rounded-xl bg-smaragd px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark disabled:opacity-50"
          >
            {isPending ? "Importeren…" : `Importeer ${preview.length} kandidaten`}
          </button>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="rounded-xl border border-surface-border bg-surface p-5 space-y-3">
          <p className="text-sm font-semibold text-heading">
            Resultaat: {result.success} succesvol geïmporteerd
          </p>
          {result.errors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-coral">
                {result.errors.length} fout(en):
              </p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-muted">
                    Rij {e.row} ({e.email}): {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LabeledInput({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-label">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-smaragd focus:outline-none"
      />
    </div>
  );
}
