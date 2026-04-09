"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Input } from "@/components/crm/ui/Input";

interface IntegrationRow {
  key: string;
  label: string;
  enabled: boolean;
  secrets: Record<string, string>;
  updated_at: string | null;
}

const INTEGRATION_META: Record<string, { description: string; webhook: string | null }> = {
  whatsapp: {
    description: "Direct berichten sturen naar kandidaten en inkomende berichten loggen",
    webhook: "/api/webhooks/whatsapp",
  },
  smtp: {
    description: "E-mails versturen via kSuite (Infomaniak) SMTP voor facturatie en communicatie",
    webhook: null,
  },
  n8n: {
    description: "Webhook endpoints voor n8n workflows — taken, activiteiten en notificaties aanmaken",
    webhook: "/api/webhooks/n8n",
  },
  typeform: {
    description: "Automatisch kandidaten aanmaken vanuit Typeform intake formulieren",
    webhook: "/api/webhooks/typeform",
  },
  carv: {
    description: "Gespreksopnames en transcripties verwerken met non-verbale signalen",
    webhook: "/api/webhooks/transcription",
  },
  ai: {
    description: "Kandidaat-matching en profielanalyse op basis van vacature-eisen",
    webhook: "/api/ai",
  },
  airtable: {
    description: "Synchronisatie met Airtable bases voor data-import en webhooks",
    webhook: "/api/webhooks/airtable",
  },
};

const NON_SECRET_FIELDS = new Set([
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_FROM",
  "N8N_BASE_URL",
  "AIRTABLE_BASE_ID",
  "WHATSAPP_PHONE_NUMBER_ID",
]);

export function IntegratiesTab() {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSecrets, setEditSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleEdit = (integration: IntegrationRow) => {
    setEditingKey(integration.key);
    const empty: Record<string, string> = {};
    for (const field of Object.keys(integration.secrets)) {
      empty[field] = "";
    }
    setEditSecrets(empty);
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const nonEmpty: Record<string, string> = {};
      for (const [field, value] of Object.entries(editSecrets)) {
        if (value.trim()) {
          nonEmpty[field] = value.trim();
        }
      }

      if (Object.keys(nonEmpty).length === 0) {
        setEditingKey(null);
        return;
      }

      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, secrets: nonEmpty }),
      });

      if (res.ok) {
        setEditingKey(null);
        fetchIntegrations();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ test: true }) });
      if (res.ok) {
        setSmtpTestResult({ ok: true, msg: "Test e-mail verzonden! Controleer de inbox." });
      } else {
        const { error } = await res.json();
        setSmtpTestResult({ ok: false, msg: error || "Onbekende fout" });
      }
    } catch (e) {
      setSmtpTestResult({ ok: false, msg: e instanceof Error ? e.message : "Netwerk fout" });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">Laden...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-body">
        Beheer API keys en webhook secrets voor alle integraties. Alleen admins hebben toegang tot deze pagina.
      </p>

      {integrations.map((integration) => {
        const meta = INTEGRATION_META[integration.key] || { description: "", webhook: null };
        const isEditing = editingKey === integration.key;
        const hasSecrets = Object.values(integration.secrets).some((v) => v === "••••••••");

        return (
          <Card key={integration.key} padding="sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-heading">{integration.label}</p>
                    <Badge variant={hasSecrets ? "smaragd" : "default"}>
                      {hasSecrets ? "Geconfigureerd" : "Niet geconfigureerd"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">{meta.description}</p>
                  {meta.webhook && (
                    <p className="text-xs text-body mt-1 font-mono">
                      Webhook: {meta.webhook}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {integration.key === "smtp" && hasSecrets && (
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={handleTestSmtp}
                        disabled={testingSmtp}
                      >
                        {testingSmtp ? "Testen..." : "Test verbinding"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleEdit(integration)}
                    >
                      {hasSecrets ? "Wijzig keys" : "Configureer"}
                    </Button>
                  </div>
                )}
              </div>

              {!isEditing && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(integration.secrets).map(([field, value]) => (
                      <div
                        key={field}
                        className="flex items-center gap-1.5 rounded-md bg-surface-secondary px-2 py-1"
                      >
                        <span className="text-xs font-mono text-body">{field}</span>
                        <span className={`text-xs ${value === "••••••••" ? "text-smaragd" : "text-muted"}`}>
                          {value === "••••••••" ? "✓" : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {integration.key === "smtp" && smtpTestResult && (
                    <p className={`text-xs mt-1 ${smtpTestResult.ok ? "text-emerald-500" : "text-red-400"}`}>
                      {smtpTestResult.ok ? "✓ " : "✗ "}
                      {smtpTestResult.msg}
                    </p>
                  )}
                </>
              )}

              {isEditing && (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs text-muted">
                    Laat een veld leeg om de huidige waarde te behouden.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.keys(integration.secrets).map((field) => (
                      <Input
                        key={field}
                        label={field}
                        type={NON_SECRET_FIELDS.has(field) ? "text" : "password"}
                        value={editSecrets[field] || ""}
                        onChange={(e) =>
                          setEditSecrets((prev) => ({ ...prev, [field]: e.target.value }))
                        }
                        placeholder={
                          integration.secrets[field] === "••••••••"
                            ? "Huidige waarde behouden"
                            : "Nog niet ingesteld"
                        }
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingKey(null)}>Annuleren</Button>
                    <Button onClick={() => handleSave(integration.key)} disabled={saving}>
                      {saving ? "Opslaan..." : "Opslaan"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
