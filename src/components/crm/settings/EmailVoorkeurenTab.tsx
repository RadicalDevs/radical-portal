"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Input } from "@/components/crm/ui/Input";
import { NOTIFICATIE_TYPES } from "@/config/notificatieTypes";

const FREQUENTIE_KLEUREN: Record<string, "smaragd" | "coral" | "default"> = {
  direct: "smaragd",
  dagelijks: "coral",
  wekelijks: "default",
};

const CATEGORIEEN = [...new Set(NOTIFICATIE_TYPES.map((t) => t.categorie))];

interface ImapConfig {
  username: string;
  enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export function EmailVoorkeurenTab() {
  const [voorkeuren, setVoorkeuren] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Mailbox koppelen state
  const [imapConfig, setImapConfig] = useState<ImapConfig | null>(null);
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [imapHost, setImapHost] = useState("mail.infomaniak.com");
  const [imapPort, setImapPort] = useState("993");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imapSaving, setImapSaving] = useState(false);
  const [imapError, setImapError] = useState<string | null>(null);
  const [imapDeleting, setImapDeleting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [imapBackfilling, setImapBackfilling] = useState(false);
  const [imapBackfillResult, setImapBackfillResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchVoorkeuren = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/email-voorkeuren");
      if (res.ok) {
        const data = await res.json();
        setVoorkeuren(data.voorkeuren || {});
        setEmail(data.email || "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImapConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/imap-config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setImapConfig(data.config);
          setImapUsername(data.config.username);
        }
      }
    } catch {
      // stil falen
    }
  }, []);

  useEffect(() => {
    fetchVoorkeuren();
    fetchImapConfig();
  }, [fetchVoorkeuren, fetchImapConfig]);

  const handleImapSave = async () => {
    setImapSaving(true);
    setImapError(null);
    try {
      const res = await fetch("/api/settings/imap-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: imapUsername, password: imapPassword, host: imapHost, port: parseInt(imapPort) }),
      });
      if (res.ok) {
        await fetchImapConfig();
        setImapPassword("");
      } else {
        const data = await res.json();
        setImapError(data.error || "Opslaan mislukt");
      }
    } catch {
      setImapError("Verbinding mislukt");
    } finally {
      setImapSaving(false);
    }
  };

  const handleImapDelete = async () => {
    setImapDeleting(true);
    try {
      await fetch("/api/settings/imap-config", { method: "DELETE" });
      setImapConfig(null);
      setImapUsername("");
      setImapPassword("");
    } finally {
      setImapDeleting(false);
    }
  };

  const handleImapBackfill = async () => {
    setImapBackfilling(true);
    setImapBackfillResult(null);
    try {
      const res = await fetch("/api/admin/email-backfill", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setImapBackfillResult({
          ok: true,
          msg: `${data.synced} nieuwe email${data.synced !== 1 ? "s" : ""} gesynchroniseerd (vanaf ${data.since}).`,
        });
      } else {
        setImapBackfillResult({ ok: false, msg: data.error || "Synchronisatie mislukt" });
      }
    } catch {
      setImapBackfillResult({ ok: false, msg: "Verbindingsfout" });
    } finally {
      setImapBackfilling(false);
    }
  };

  const handleToggle = async (key: string) => {
    const newValue = !voorkeuren[key];
    setVoorkeuren((prev) => ({ ...prev, [key]: newValue }));
    setSaving(key);

    try {
      await fetch("/api/settings/email-voorkeuren", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: newValue }),
      });
    } catch {
      setVoorkeuren((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setSaving(null);
    }
  };

  const handleBulk = async (enabled: boolean) => {
    const newVoorkeuren = { ...voorkeuren };
    for (const t of NOTIFICATIE_TYPES) {
      newVoorkeuren[t.key] = enabled;
    }
    setVoorkeuren(newVoorkeuren);

    await Promise.all(
      NOTIFICATIE_TYPES.map((t) =>
        fetch("/api/settings/email-voorkeuren", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: t.key, enabled }),
        })
      )
    );
  };

  if (loading) {
    return <p className="text-sm text-muted">Laden...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Mailbox koppelen sectie */}
      <Card padding="sm">
        <h3 className="text-sm font-semibold text-heading mb-1">Mijn mailbox koppelen</h3>
        <p className="text-xs text-muted mb-4">
          Verstuurde emails worden automatisch gelogd in het CRM bij de bijbehorende klant of kandidaat.
        </p>

        {imapConfig ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-smaragd">
                <span className="w-2 h-2 rounded-full bg-smaragd inline-block" />
                Verbonden
              </span>
              <span className="text-xs text-muted">
                {imapConfig.username} · Verbonden op {new Date(imapConfig.created_at).toLocaleDateString("nl-NL")}
              </span>
            </div>
            {imapConfig.last_synced_at && (
              <p className="text-xs text-muted">
                Laatste sync: {new Date(imapConfig.last_synced_at).toLocaleString("nl-NL")}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                className="text-xs"
                onClick={handleImapBackfill}
                disabled={imapBackfilling}
              >
                {imapBackfilling ? "Synchroniseren..." : "Alle historische emails laden"}
              </Button>
              <Button
                variant="ghost"
                className="text-xs text-coral"
                onClick={handleImapDelete}
                disabled={imapDeleting}
              >
                {imapDeleting ? "Verwijderen..." : "Verbinding verwijderen"}
              </Button>
            </div>
            {imapBackfillResult && (
              <p className={`text-xs ${imapBackfillResult.ok ? "text-smaragd" : "text-coral"}`}>
                {imapBackfillResult.ok ? "✓ " : "✗ "}
                {imapBackfillResult.msg}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-heading mb-1">
                kSuite e-mailadres
              </label>
              <Input
                type="email"
                placeholder="jouw@radicalrecruitment.ai"
                value={imapUsername}
                onChange={(e) => setImapUsername(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-xs font-medium text-heading">
                  Wachtwoord
                </label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-4 h-4 rounded-full bg-surface-secondary text-muted text-xs flex items-center justify-center hover:bg-surface-tertiary transition-colors"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    ?
                  </button>
                  {showTooltip && (
                    <div className="absolute left-6 top-0 z-10 w-72 rounded-md bg-surface-secondary border border-border p-3 text-xs text-body shadow-lg">
                      <span className="font-medium text-heading">Zo maak je een device-wachtwoord:</span>
                      <ol className="mt-1.5 ml-3 list-decimal space-y-0.5">
                        <li>Ga naar <span className="font-medium">manager.infomaniak.com</span></li>
                        <li>Mail & Collaboration → Mailboxen</li>
                        <li>Klik op jouw e-mailadres</li>
                        <li>Tabje <span className="font-medium">Connected device</span> → <span className="font-medium">Add</span></li>
                        <li>Kopieer het gegenereerde wachtwoord</li>
                      </ol>
                      <p className="mt-1.5 text-muted">Dit is niet je gewone login-wachtwoord.</p>
                    </div>
                  )}
                </div>
              </div>
              <Input
                type="password"
                placeholder="Device-wachtwoord uit Infomaniak"
                value={imapPassword}
                onChange={(e) => setImapPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">
                Maak een device-wachtwoord aan via Infomaniak → Mailboxen → Connected device. Klik op ? voor uitleg.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="text-xs text-muted hover:text-body transition-colors"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "▲ Geavanceerde instellingen" : "▼ Geavanceerde instellingen"}
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-2 pl-2 border-l border-border">
                  <div>
                    <label className="block text-xs font-medium text-heading mb-1">IMAP server</label>
                    <Input
                      type="text"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      placeholder="mail.infomaniak.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-heading mb-1">Poort</label>
                    <Input
                      type="text"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      placeholder="993"
                    />
                  </div>
                </div>
              )}
            </div>
            {imapError && (
              <p className="text-xs text-coral">{imapError}</p>
            )}
            <Button
              variant="primary"
              className="text-xs"
              onClick={handleImapSave}
              disabled={imapSaving || !imapUsername || !imapPassword}
            >
              {imapSaving ? "Verbinden..." : "Verbinden"}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-body">
            Kies welke email notificaties je wilt ontvangen.
          </p>
          {email && (
            <p className="mt-1 text-xs text-muted">
              Notificaties worden verstuurd naar{" "}
              <span className="font-medium text-heading">{email}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-xs" onClick={() => handleBulk(true)}>
            Alles aan
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => handleBulk(false)}>
            Alles uit
          </Button>
        </div>
      </div>

      {CATEGORIEEN.map((categorie) => {
        const items = NOTIFICATIE_TYPES.filter((t) => t.categorie === categorie);
        return (
          <Card key={categorie} padding="sm">
            <h3 className="text-sm font-semibold text-heading mb-3">
              {categorie}
            </h3>
            <div className="space-y-1">
              {items.map((item) => {
                const isEnabled = voorkeuren[item.key] ?? true;
                const isSaving = saving === item.key;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-surface-secondary transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-heading">
                          {item.label}
                        </span>
                        <Badge variant={FREQUENTIE_KLEUREN[item.frequentie] || "default"}>
                          {item.frequentie}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {item.beschrijving}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle(item.key)}
                      disabled={isSaving}
                      className={`relative ml-4 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? "bg-smaragd" : "bg-surface-secondary"
                      } ${isSaving ? "opacity-50" : ""}`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
