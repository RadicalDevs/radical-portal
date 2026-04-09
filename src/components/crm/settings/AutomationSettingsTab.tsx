"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/crm/ui/Card";

interface AutomationSetting {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface SettingMeta {
  key: string;
  label: string;
  beschrijving: string;
  configFields?: { key: string; label: string; type: "number" }[];
}

const SECTIONS: { title: string; settings: SettingMeta[] }[] = [
  {
    title: "Reminders",
    settings: [
      {
        key: "taak_deadline_reminders",
        label: "Taak deadline reminders",
        beschrijving: "Stuur een notificatie wanneer een taak bijna verlopen is",
        configFields: [{ key: "uren_voor_deadline", label: "Uren voor deadline", type: "number" }],
      },
      {
        key: "follow_up_reminders",
        label: "Follow-up reminders",
        beschrijving: "Herinnering bij kandidaten/klanten zonder recente activiteit",
        configFields: [{ key: "dagen_inactief", label: "Dagen inactief", type: "number" }],
      },
      {
        key: "factuur_betalingsherinnering",
        label: "Factuur betalingsherinnering",
        beschrijving: "Notificatie bij onbetaalde facturen na de vervaldatum",
        configFields: [{ key: "dagen_na_vervaldatum", label: "Dagen na vervaldatum", type: "number" }],
      },
      {
        key: "pipeline_stagnatie_alert",
        label: "Pipeline stagnatie alert",
        beschrijving: "Waarschuwing wanneer een deal te lang in dezelfde stage staat",
        configFields: [{ key: "dagen_in_stage", label: "Dagen in stage", type: "number" }],
      },
    ],
  },
  {
    title: "AVG / GDPR",
    settings: [
      {
        key: "avg_data_purge",
        label: "Automatische data opschoning",
        beschrijving: "Verwijder verlopen data conform bewaartermijnen",
      },
      {
        key: "avg_consent_expiry_warning",
        label: "Consent verloopmeldingen",
        beschrijving: "Notificatie wanneer toestemmingen bijna verlopen",
        configFields: [{ key: "dagen_voor_expiry", label: "Dagen voor expiry", type: "number" }],
      },
    ],
  },
  {
    title: "AI Matching",
    settings: [
      {
        key: "auto_match_nieuwe_vacature",
        label: "Auto-match bij nieuwe vacature",
        beschrijving: "Automatisch kandidaten matchen en recruiter notificeren bij een nieuwe vacature",
        configFields: [
          { key: "min_score", label: "Minimum score (0-1)", type: "number" },
          { key: "max_results", label: "Max resultaten", type: "number" },
        ],
      },
      {
        key: "auto_match_nieuwe_kandidaat",
        label: "Auto-match bij nieuwe kandidaat",
        beschrijving: "Automatisch matchen tegen open vacatures bij een nieuwe kandidaat",
        configFields: [
          { key: "min_score", label: "Minimum score (0-1)", type: "number" },
          { key: "max_results", label: "Max resultaten", type: "number" },
        ],
      },
      {
        key: "auto_embed_bij_aanmaak",
        label: "Auto-embed bij aanmaak",
        beschrijving: "Automatisch AI embeddings genereren bij nieuwe kandidaten en vacatures",
      },
    ],
  },
  {
    title: "Communicatie",
    settings: [
      {
        key: "whatsapp_auto_reply",
        label: "WhatsApp auto-reply",
        beschrijving: "Automatisch bevestigingsbericht sturen bij inkomende WhatsApp berichten",
      },
      {
        key: "pipeline_stage_emails",
        label: "Pipeline stage notificaties",
        beschrijving: "Automatische notificaties bij stage-wijzigingen (afwijzingen altijd als draft)",
      },
      {
        key: "scheduled_follow_ups",
        label: "Geplande follow-ups",
        beschrijving: "Automatische follow-up herinneringen na intake en interviews",
        configFields: [
          { key: "dagen_na_intake", label: "Dagen na intake", type: "number" },
          { key: "dagen_na_interview", label: "Dagen na interview", type: "number" },
        ],
      },
    ],
  },
  {
    title: "Rapportages",
    settings: [
      {
        key: "wekelijkse_rapportage",
        label: "Wekelijkse rapportage",
        beschrijving: "Elke maandag een email met KPIs naar alle admins",
      },
      {
        key: "pipeline_stagnatie_rapport",
        label: "Stagnatie rapport",
        beschrijving: "Rapporteer deals die te lang in dezelfde stage staan",
        configFields: [{ key: "dagen_in_stage", label: "Dagen in stage", type: "number" }],
      },
    ],
  },
];

const EARLY_ACCESS_EMAILS = ["vincent@radicalrecruitment.ai"];

export function AutomationSettingsTab({ userEmail }: { userEmail?: string | null }) {
  if (!userEmail || !EARLY_ACCESS_EMAILS.includes(userEmail.toLowerCase())) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-smaragd/10">
          <svg className="h-8 w-8 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-heading">Coming Soon</h3>
        <p className="mt-2 max-w-md text-sm text-muted">
          Automatiseringen worden momenteel getest en zijn binnenkort beschikbaar voor alle admins.
        </p>
      </div>
    );
  }
  const [settings, setSettings] = useState<AutomationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/automation");
      const data = await res.json();
      setSettings(data.settings || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getSetting = (key: string): AutomationSetting | undefined =>
    settings.find((s) => s.key === key);

  const updateSetting = async (key: string, enabled: boolean, config?: Record<string, unknown>) => {
    setSaving(key);
    const current = getSetting(key);
    await fetch("/api/settings/automation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        enabled,
        config: config || current?.config || {},
      }),
    });

    setSettings((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, enabled, config: config || s.config } : s
      )
    );
    setSaving(null);
  };

  const updateConfigField = async (key: string, field: string, value: number) => {
    const current = getSetting(key);
    if (!current) return;
    const newConfig = { ...current.config, [field]: value };
    await updateSetting(key, current.enabled, newConfig);
  };

  if (loading) {
    return <p className="text-sm text-muted">Laden...</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-body">
        Beheer welke automatiseringen actief zijn. Alle automatiseringen staan standaard <strong>uit</strong>.
        Activeer alleen wat je nodig hebt.
      </p>

      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-heading mb-3">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.settings.map((meta) => {
              const setting = getSetting(meta.key);
              const enabled = setting?.enabled || false;

              return (
                <Card key={meta.key} padding="sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 min-h-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-heading">
                          {meta.label}
                        </span>
                        {saving === meta.key && (
                          <span className="text-xs text-muted">Opslaan...</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {meta.beschrijving}
                      </p>

                      {enabled && meta.configFields && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {meta.configFields.map((field) => (
                            <label key={field.key} className="flex items-center gap-2">
                              <span className="text-xs text-body">
                                {field.label}:
                              </span>
                              <input
                                type="number"
                                value={(setting?.config?.[field.key] as number) ?? ""}
                                onChange={(e) =>
                                  updateConfigField(meta.key, field.key, parseFloat(e.target.value))
                                }
                                step={field.key.includes("score") ? 0.05 : 1}
                                min={0}
                                className="w-20 rounded-[var(--radius-default)] border border-border bg-surface-secondary px-2 py-1 text-xs text-heading outline-none focus:border-smaragd/50"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => updateSetting(meta.key, !enabled)}
                      disabled={saving === meta.key}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                        enabled ? "bg-smaragd" : "bg-border"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
