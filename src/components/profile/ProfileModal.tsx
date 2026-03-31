"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, uploadCv, deleteCv } from "@/app/dashboard/actions";
import type { KandidaatProfile } from "@/app/dashboard/actions";

interface Props {
  profile: KandidaatProfile;
  open: boolean;
  onClose: () => void;
}

const COMMON_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js",
  "Machine Learning", "Data Science", "NLP", "Computer Vision",
  "DevOps", "Cloud (AWS/GCP/Azure)", "SQL", "Docker",
  "TensorFlow", "PyTorch", "LLMs", "Prompt Engineering",
  "Agile/Scrum", "Project Management", "Product Management",
];

export default function ProfileModal({ profile, open, onClose }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    voornaam: profile.voornaam,
    achternaam: profile.achternaam,
    telefoon: profile.telefoon ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    vaardigheden: profile.vaardigheden,
    beschikbaarheid: profile.beschikbaarheid,
    opzegtermijn: profile.opzegtermijn ?? "",
    salarisindicatie: profile.salarisindicatie,
    uurtarief: profile.uurtarief,
  });

  const [skillInput, setSkillInput] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [hasCv, setHasCv] = useState(!!profile.cv_url);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  function addSkill(skill: string) {
    const trimmed = skill.trim();
    if (trimmed && !form.vaardigheden.includes(trimmed)) {
      setForm((f) => ({ ...f, vaardigheden: [...f.vaardigheden, trimmed] }));
    }
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setForm((f) => ({
      ...f,
      vaardigheden: f.vaardigheden.filter((s) => s !== skill),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("voornaam", form.voornaam);
      fd.set("achternaam", form.achternaam);
      fd.set("telefoon", form.telefoon);
      fd.set("linkedin_url", form.linkedin_url);
      fd.set("vaardigheden", JSON.stringify(form.vaardigheden));
      fd.set("beschikbaarheid", form.beschikbaarheid === null ? "" : String(form.beschikbaarheid));
      fd.set("opzegtermijn", form.opzegtermijn);
      if (form.salarisindicatie !== null) fd.set("salarisindicatie", String(form.salarisindicatie));
      if (form.uurtarief !== null) fd.set("uurtarief", String(form.uurtarief));

      const result = await updateProfile(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Upload CV if a new file was selected
      if (cvFile) {
        setCvUploading(true);
        const cvFd = new FormData();
        cvFd.set("cv", cvFile);
        const cvResult = await uploadCv(cvFd);
        setCvUploading(false);
        if (!cvResult.success) {
          setError(cvResult.error);
          return;
        }
        setHasCv(true);
        setCvFile(null);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        router.refresh();
      }, 1000);
    });
  }

  const suggestedSkills = COMMON_SKILLS.filter(
    (s) => !form.vaardigheden.includes(s)
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-2xl border border-surface-border bg-[var(--bg-page)] p-0 text-body backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
        {/* Header */}
        <div className="border-b border-surface-border px-6 py-5">
          <h2 className="font-heading text-xl font-bold text-heading">
            Maak je profiel compleet
          </h2>
          <p className="mt-1 text-sm text-muted">
            Hoe meer we weten, hoe beter we je kunnen matchen met de juiste
            kansen in de AI-sector.
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Naam */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-label">
                Voornaam
              </label>
              <input
                type="text"
                required
                value={form.voornaam}
                onChange={(e) => setForm((f) => ({ ...f, voornaam: e.target.value }))}
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label">
                Achternaam
              </label>
              <input
                type="text"
                value={form.achternaam}
                onChange={(e) => setForm((f) => ({ ...f, achternaam: e.target.value }))}
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
          </div>

          {/* Skills — het belangrijkste veld */}
          <div>
            <label className="block text-sm font-medium text-label">
              Vaardigheden & skills
              <span className="ml-1 text-smaragd">*</span>
            </label>
            <p className="mt-0.5 text-xs text-muted">
              Dit gebruiken we voor AI-matching met vacatures.
            </p>

            {/* Current skills */}
            {form.vaardigheden.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.vaardigheden.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-smaragd/10 px-3 py-1 text-sm text-smaragd"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-0.5 text-smaragd/60 hover:text-smaragd"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom skill */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
                placeholder="Typ een skill en druk Enter"
                className="block flex-1 rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>

            {/* Quick-add suggestions */}
            {suggestedSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedSkills.slice(0, 10).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className="rounded-full border border-surface-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-smaragd hover:text-smaragd"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Beschikbaarheid */}
          <div>
            <label className="block text-sm font-medium text-label">
              Ben je beschikbaar voor nieuwe kansen?
              <span className="ml-1 text-smaragd">*</span>
            </label>
            <div className="mt-2 flex gap-3">
              {[
                { value: true, label: "Ja, ik ben beschikbaar" },
                { value: false, label: "Nee, niet op dit moment" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, beschikbaarheid: opt.value }))}
                  className={`flex-1 rounded-[8px] border px-4 py-2.5 text-sm font-medium transition-colors ${
                    form.beschikbaarheid === opt.value
                      ? "border-smaragd bg-smaragd/10 text-smaragd"
                      : "border-surface-border text-muted hover:border-smaragd/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opzegtermijn (alleen als beschikbaar = false) */}
          {form.beschikbaarheid === false && (
            <div>
              <label className="block text-sm font-medium text-label">
                Opzegtermijn
              </label>
              <input
                type="text"
                value={form.opzegtermijn}
                onChange={(e) => setForm((f) => ({ ...f, opzegtermijn: e.target.value }))}
                placeholder="Bijv. 1 maand, 3 maanden"
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-label">
                Telefoon
              </label>
              <input
                type="tel"
                value={form.telefoon}
                onChange={(e) => setForm((f) => ({ ...f, telefoon: e.target.value }))}
                placeholder="+31 6..."
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label">
                LinkedIn
              </label>
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="linkedin.com/in/..."
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
          </div>

          {/* Salaris (optioneel) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-label">
                Salarisindicatie (optioneel)
              </label>
              <input
                type="number"
                value={form.salarisindicatie ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    salarisindicatie: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Bruto per jaar"
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-label">
                Uurtarief (optioneel)
              </label>
              <input
                type="number"
                value={form.uurtarief ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    uurtarief: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="EUR per uur"
                className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2 text-sm text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
              />
            </div>
          </div>

          {/* CV Upload */}
          <div className="rounded-[8px] border border-smaragd/20 bg-smaragd/5 p-4">
            <label className="block text-sm font-medium text-label">
              CV uploaden
            </label>
            <p className="mt-0.5 text-xs text-muted">
              Upload je CV zodat wij nog betere inzichten over jou krijgen. PDF of Word, max 10 MB.
            </p>

            {hasCv && !cvFile && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-smaragd/10 px-3 py-1 text-xs font-medium text-smaragd">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  CV geüpload
                </span>
                <button
                  type="button"
                  onClick={() => cvInputRef.current?.click()}
                  className="text-xs text-smaragd hover:underline"
                >
                  Vervangen
                </button>
              </div>
            )}

            {cvFile && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <svg className="h-4 w-4 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="flex-1 truncate text-heading">{cvFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setCvFile(null); if (cvInputRef.current) cvInputRef.current.value = ""; }}
                  className="text-xs text-muted hover:text-heading"
                >
                  Verwijderen
                </button>
              </div>
            )}

            {!cvFile && !hasCv && (
              <button
                type="button"
                onClick={() => cvInputRef.current?.click()}
                className="mt-2 inline-flex items-center gap-2 rounded-[8px] border border-dashed border-surface-border px-4 py-2.5 text-sm text-muted transition-colors hover:border-smaragd hover:text-smaragd"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Selecteer bestand
              </button>
            )}

            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCvFile(file);
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-6 py-4">
          {error && (
            <p className="mb-3 text-sm text-red-400">{error}</p>
          )}
          {success && (
            <p className="mb-3 text-sm text-smaragd">Profiel opgeslagen!</p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted hover:text-heading"
            >
              Later invullen
            </button>
            <button
              type="submit"
              disabled={isPending || cvUploading || form.vaardigheden.length === 0 || form.beschikbaarheid === null}
              className="rounded-[8px] bg-smaragd px-6 py-2.5 text-sm font-semibold text-white hover:bg-smaragd-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cvUploading ? "CV uploaden..." : isPending ? "Opslaan..." : "Profiel opslaan"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
