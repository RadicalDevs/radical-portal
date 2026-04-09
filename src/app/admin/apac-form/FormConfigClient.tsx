"use client";

import { useState, useTransition, useRef } from "react";
import { updateFormConfig } from "../actions";
import type { FormConfigResult } from "../actions";
import type { ApacFormConfig } from "@/lib/apac/types";

const DEFAULT_RULES = JSON.stringify(
  [
    {
      label: "No Safe Havens",
      text: "There are no 'obvious' answers. Every answer is ok and just reflects your internal software.",
      color: "smaragd",
    },
    {
      label: "The Instinct Lock",
      text: "Trust your intuition, refrain socially desirable answers.",
      color: "smaragd",
    },
  ],
  null,
  2
);

type PreviewConfig = Pick<
  ApacFormConfig,
  | "intro_title"
  | "intro_subtitle"
  | "intro_tagline"
  | "intro_body"
  | "rules_title"
  | "rules_items"
  | "rules_footer"
>;

function IntroPreviewModal({
  config,
  onClose,
}: {
  config: PreviewConfig;
  onClose: () => void;
}) {
  const ruleColor = "#2ed573";
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-surface-border bg-bg p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-surface-border pb-4">
          <span className="rounded-full bg-smaragd/10 px-3 py-1 text-xs font-semibold text-smaragd">
            Preview — intro scherm
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-light hover:text-heading"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Intro content (mirrors ApacTestClient IntroScreen) */}
        <div className="space-y-8">
          <div>
            <h1 className="font-heading text-4xl font-bold text-heading sm:text-5xl">
              {config.intro_title}
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-bold sm:text-3xl" style={{ color: "#E6734F" }}>
              {config.intro_subtitle}
            </h2>
            {config.intro_tagline && (
              <p className="text-base font-bold text-heading">{config.intro_tagline}</p>
            )}
            {config.intro_body && (
              <p className="text-base leading-relaxed text-label">{config.intro_body}</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-heading text-xl font-bold" style={{ color: "#E6734F" }}>
              {config.rules_title}
            </h3>
            <div className="space-y-2">
              {config.rules_items.map((rule, i) => (
                <p key={i} className="text-base text-label">
                  <span className="font-bold" style={{ color: ruleColor }}>
                    {rule.label}:
                  </span>{" "}
                  {rule.text}
                </p>
              ))}
            </div>
            {config.rules_footer && (
              <p className="text-base text-label">{config.rules_footer}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-[8px] bg-smaragd px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark"
          >
            Start the APAC test
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FormConfigClient({
  config,
}: {
  config: ApacFormConfig | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FormConfigResult | null>(null);
  const [requireLastname, setRequireLastname] = useState(
    config?.require_lastname ?? false
  );
  const [showComments, setShowComments] = useState(
    config?.show_comments_field ?? true
  );
  const [rulesRaw, setRulesRaw] = useState(
    config?.rules_items
      ? JSON.stringify(config.rules_items, null, 2)
      : DEFAULT_RULES
  );
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<PreviewConfig | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handlePreview() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);

    let parsedRules: ApacFormConfig["rules_items"] = [];
    try {
      parsedRules = JSON.parse(rulesRaw);
    } catch {
      // show preview with empty rules if JSON is invalid
    }

    setPreviewConfig({
      intro_title: (fd.get("intro_title") as string) || "",
      intro_subtitle: (fd.get("intro_subtitle") as string) || "",
      intro_tagline: (fd.get("intro_tagline") as string) || "",
      intro_body: (fd.get("intro_body") as string) || "",
      rules_title: (fd.get("rules_title") as string) || "",
      rules_items: parsedRules,
      rules_footer: (fd.get("rules_footer") as string) || "",
    });
    setShowPreview(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate rules JSON
    try {
      const parsed = JSON.parse(rulesRaw);
      if (!Array.isArray(parsed)) throw new Error("Moet een array zijn");
      for (const r of parsed) {
        if (typeof r.label !== "string" || typeof r.text !== "string")
          throw new Error("Elke regel moet label en text hebben");
      }
      setRulesError(null);
    } catch (err) {
      setRulesError(
        err instanceof Error ? err.message : "Ongeldige JSON"
      );
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("rules_items", rulesRaw);
    fd.set("require_lastname", String(requireLastname));
    fd.set("show_comments_field", String(showComments));

    startTransition(async () => {
      const res = await updateFormConfig(fd);
      setResult(res);
      setTimeout(() => setResult(null), 4000);
    });
  }

  return (
    <>
      {showPreview && previewConfig && (
        <IntroPreviewModal config={previewConfig} onClose={() => setShowPreview(false)} />
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        {/* ── Introductie ── */}
        <Section title="Introductie" subtitle="Getoond aan de kandidaat vóór de vragen starten">
          <Field label="Titel *">
            <input
              name="intro_title"
              required
              defaultValue={config?.intro_title ?? "The Radical APAC test"}
              className={inputCls}
            />
          </Field>
          <Field label="Ondertitel (groot — oranje)">
            <input
              name="intro_subtitle"
              defaultValue={
                config?.intro_subtitle ??
                "Adaptability, Personality, Awareness, Connection"
              }
              className={inputCls}
            />
          </Field>
          <Field label="Slogan (vetgedrukt)">
            <input
              name="intro_tagline"
              defaultValue={
                config?.intro_tagline ??
                "Code is now a commodity. Your character is becoming the true currency."
              }
              className={inputCls}
            />
          </Field>
          <Field label="Bodytekst">
            <textarea
              name="intro_body"
              rows={4}
              defaultValue={
                config?.intro_body ??
                "Welcome! Technical mastery is your baseline, but at Radical, it is only the beginning. We are looking for the great 'humans in the loop' who can navigate the ethical, cognitive, and social complexity that AI introduces to our world."
              }
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Section>

        {/* ── Regels van het spel ── */}
        <Section title="Regels van het spel" subtitle="De 'rules of the game' blok in de introductie">
          <Field label="Sectietitel">
            <input
              name="rules_title"
              defaultValue={config?.rules_title ?? "The rules of the game"}
              className={inputCls}
            />
          </Field>
          <Field
            label="Regels (JSON)"
            hint={`Formaat: [{"label": "Naam", "text": "Omschrijving", "color": "smaragd"}]`}
          >
            <textarea
              value={rulesRaw}
              onChange={(e) => {
                setRulesRaw(e.target.value);
                setRulesError(null);
              }}
              rows={10}
              className={`${inputCls} resize-y font-mono text-xs`}
            />
            {rulesError && (
              <p className="mt-1 text-xs text-coral">{rulesError}</p>
            )}
          </Field>
          <Field label="Voettekst onder de regels">
            <input
              name="rules_footer"
              defaultValue={
                config?.rules_footer ??
                "The total test consists of 30 randomized questions."
              }
              className={inputCls}
            />
          </Field>
        </Section>

        {/* ── Dank je wel pagina ── */}
        <Section title="Resultaten / Dank je wel" subtitle="Tekst bovenaan de resultatenpagina">
          <Field label="Titel">
            <input
              name="thankyou_title"
              defaultValue={config?.thankyou_title ?? "Bedankt!"}
              className={inputCls}
            />
          </Field>
          <Field label="Begeleidende tekst">
            <textarea
              name="thankyou_body"
              rows={3}
              defaultValue={
                config?.thankyou_body ??
                "Je hebt de APAC-test voltooid. Hieronder zie je je persoonlijk profiel."
              }
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Section>

        {/* ── Formulierinstellingen ── */}
        <Section title="Formulierinstellingen" subtitle="Verplichte velden in het aanmeldformulier">
          <div className="flex items-center gap-3">
            <input
              type="text"
              disabled
              value="Voornaam"
              className="w-36 cursor-not-allowed rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-sm text-muted"
            />
            <span className="rounded-full bg-smaragd/10 px-2 py-0.5 text-xs font-medium text-smaragd">
              Altijd verplicht
            </span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <input
              type="text"
              disabled
              value="E-mail"
              className="w-36 cursor-not-allowed rounded-lg border border-surface-border bg-surface-light px-3 py-2 text-sm text-muted"
            />
            <span className="rounded-full bg-smaragd/10 px-2 py-0.5 text-xs font-medium text-smaragd">
              Altijd verplicht
            </span>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={requireLastname}
              onChange={(e) => setRequireLastname(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm text-label">
              Achternaam verplicht maken
            </span>
          </label>
        </Section>

        {/* ── Opmerkingenveld ── */}
        <Section
          title="Opmerkingenveld"
          subtitle="Optioneel tekstveld aan het einde van de test waar respondenten feedback kunnen achterlaten"
        >
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showComments}
              onChange={(e) => setShowComments(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm text-label">
              Opmerkingenveld tonen aan het einde van de test
            </span>
          </label>
          {showComments && (
            <Field label="Label tekst" hint="De tekst die boven het tekstveld wordt getoond">
              <input
                name="comments_field_label"
                defaultValue={config?.comments_field_label ?? "Anything else you want to share?"}
                className={inputCls}
              />
            </Field>
          )}
        </Section>

        {/* ── E-mail notificaties ── */}
        <Section
          title="E-mail notificaties"
          subtitle="Ontvang een melding wanneer iemand de APAC-test heeft ingevuld"
        >
          <Field
            label="Notificatie-e-mailadressen"
            hint="Één adres per regel, of kommagescheiden. Zorg dat SMTP geconfigureerd is in .env."
          >
            <textarea
              name="notification_emails"
              rows={4}
              defaultValue={(config?.notification_emails ?? []).join("\n")}
              placeholder={"nelieke@radicalrecruitment.ai\noscar@radicalrecruitment.ai"}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Section>

        {/* Save button + feedback */}
        {result && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              result.success
                ? "bg-smaragd/10 text-smaragd"
                : "bg-coral/10 text-coral"
            }`}
          >
            {result.success
              ? "Instellingen opgeslagen."
              : ("error" in result ? result.error : "Onbekende fout")}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-smaragd px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark disabled:opacity-50"
          >
            {isPending ? "Opslaan…" : "Instellingen opslaan"}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-6 py-3 text-sm font-semibold text-heading transition-all hover:bg-surface-light"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Bekijk preview
          </button>
        </div>
      </form>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-smaragd focus:outline-none";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="font-heading text-lg font-bold text-heading">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
