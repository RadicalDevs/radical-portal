"use client";

import { useState, useTransition } from "react";
import { useRole } from "@/hooks/useRole";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Tabs } from "@/components/crm/ui/Tabs";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { Textarea } from "@/components/crm/ui/Textarea";
import { Select } from "@/components/crm/ui/Select";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import { EmailVoorkeurenTab } from "@/components/crm/settings/EmailVoorkeurenTab";
import { IntegratiesTab } from "@/components/crm/settings/IntegratiesTab";
import { MatchingConfigTab } from "@/components/crm/settings/MatchingConfigTab";
import { AutomationSettingsTab } from "@/components/crm/settings/AutomationSettingsTab";
import { TEMPLATE_VARIABLES } from "@/config/templateVariables";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  updateUserRole,
  inviteUser,
  removeUser,
} from "@/app/admin/actions/settings";
import type { CommunicatieTemplate, UserRole } from "@/lib/types/crm";

const CATEGORIE_OPTIONS = [
  { value: "algemeen", label: "Algemeen" },
  { value: "kandidaat_intro", label: "Kandidaat Introductie" },
  { value: "klant_voorstel", label: "Klant Voorstel" },
  { value: "interview_uitnodiging", label: "Interview Uitnodiging" },
  { value: "afwijzing", label: "Afwijzing" },
  { value: "follow_up", label: "Follow-up" },
  { value: "factuur", label: "Factuur" },
  { value: "onboarding", label: "Onboarding" },
];

interface UserRow {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

interface Props {
  templates: CommunicatieTemplate[];
  users: UserRow[];
  userRole: UserRole | null;
  userEmail: string | null;
}

export default function SettingsClient({ templates: initialTemplates, users: initialUsers, userRole, userEmail }: Props) {
  const { canWrite, isAdmin } = useRole();
  const [templates, setTemplates] = useState<CommunicatieTemplate[]>(initialTemplates);
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<CommunicatieTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const handleSubmitTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setActionError(null);

    startTransition(async () => {
      const result = editTemplate
        ? await updateTemplate(editTemplate.id, formData)
        : await createTemplate(formData);
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowForm(false);
        setEditTemplate(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await deleteTemplate(id);
      if (result.error) {
        setActionError(result.error);
      } else {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    startTransition(async () => {
      const result = await inviteUser(inviteEmail);
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteSuccess(true);
        setInviteEmail("");
      }
    });
  };

  const handleRemoveUser = (userId: string) => {
    setRemovingUserId(userId);
  };

  const confirmRemoveUser = (userId: string) => {
    startTransition(async () => {
      const result = await removeUser(userId);
      if (result.error) {
        setActionError(result.error);
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
      setRemovingUserId(null);
    });
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setActionError(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) {
        setActionError(result.error);
      } else {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      }
    });
  };

  const emailTemplates = templates.filter((t) => t.type === "email");
  const whatsappTemplates = templates.filter((t) => t.type === "whatsapp");

  const renderTemplateList = (list: CommunicatieTemplate[]) =>
    list.length === 0 ? (
      <EmptyState
        title="Geen templates"
        description="Maak je eerste communicatie template aan."
        action={<Button onClick={() => setShowForm(true)}>+ Nieuw Template</Button>}
      />
    ) : (
      <div className="space-y-2">
        {list.map((t) => (
          <Card key={t.id} padding="sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-heading">{t.naam}</p>
                  <Badge variant="smaragd">
                    {CATEGORIE_OPTIONS.find((c) => c.value === t.categorie)?.label}
                  </Badge>
                </div>
                {t.onderwerp && (
                  <p className="text-xs text-body mt-1">Onderwerp: {t.onderwerp}</p>
                )}
                <p className="text-xs text-muted mt-1 line-clamp-2">{t.inhoud}</p>
                {t.variabelen.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {t.variabelen.map((v) => (
                      <Badge key={v} variant="coral">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {canWrite && (
                <div className="flex gap-1 ml-4">
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => { setEditTemplate(t); setShowForm(true); }}
                  >
                    Bewerk
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-500 hover:text-red-400"
                    onClick={() => handleDelete(t.id)}
                  >
                    Verwijder
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );

  const mainTabs = [
    {
      key: "templates",
      label: "Communicatie Templates",
      content: (
        <div className="space-y-6">
          {canWrite && (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)}>+ Nieuw Template</Button>
            </div>
          )}
          <Tabs
            tabs={[
              {
                key: "email",
                label: `Email (${emailTemplates.length})`,
                content: renderTemplateList(emailTemplates),
              },
              {
                key: "whatsapp",
                label: `WhatsApp (${whatsappTemplates.length})`,
                content: renderTemplateList(whatsappTemplates),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "gebruikers",
      label: "Gebruikers",
      content: (userRole === "admin" || isAdmin) ? (
        <div className="space-y-6">
          {/* Gebruiker uitnodigen */}
          <Card padding="sm">
            <p className="mb-3 text-sm font-medium text-heading">Gebruiker uitnodigen</p>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@radicalrecruitment.ai"
                className="flex-1 rounded-[var(--radius-default)] border border-border bg-surface px-3 py-1.5 text-sm text-heading placeholder-muted outline-none focus:border-smaragd/50"
              />
              <Button type="submit" disabled={isPending}>
                Uitnodigen
              </Button>
            </form>
            {inviteError && <p className="mt-2 text-xs text-red-400">{inviteError}</p>}
            {inviteSuccess && <p className="mt-2 text-xs text-smaragd">Uitnodiging verstuurd.</p>}
          </Card>

          {/* Gebruikerslijst */}
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-heading">{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="rounded-[var(--radius-default)] border border-border bg-surface-secondary px-3 py-1.5 text-sm text-heading outline-none focus:border-smaragd/50"
                    >
                      <option value="candidate">Kandidaat</option>
                      <option value="admin">Admin</option>
                    </select>
                    {removingUserId === u.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          className="text-xs text-red-400 hover:text-red-300"
                          onClick={() => confirmRemoveUser(u.id)}
                          disabled={isPending}
                        >
                          Bevestig
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs text-muted"
                          onClick={() => setRemovingUserId(null)}
                        >
                          Annuleer
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-xs text-red-500 hover:text-red-400"
                        onClick={() => handleRemoveUser(u.id)}
                      >
                        Verwijder
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Geen toegang"
          description="Alleen admins kunnen gebruikersbeheer inzien."
        />
      ),
    },
    {
      key: "email-notificaties",
      label: "Email Notificaties",
      content: <EmailVoorkeurenTab />,
    },
  ];

  if (userRole === "admin" || isAdmin) {
    mainTabs.push(
      {
        key: "integraties",
        label: "Integraties",
        content: <IntegratiesTab />,
      },
      {
        key: "matching",
        label: "AI Matching",
        content: <MatchingConfigTab />,
      },
      {
        key: "automatisering",
        label: "Automatisering",
        content: <AutomationSettingsTab userEmail={userEmail} />,
      }
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Instellingen</h1>
        <p className="mt-1 text-sm text-muted">
          Beheer templates, gebruikers en integraties
        </p>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {actionError}
        </p>
      )}

      <Tabs tabs={mainTabs} />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTemplate(null); }}
        title={editTemplate ? "Template Bewerken" : "Nieuw Template"}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitTemplate} className="space-y-4">
          <Input
            label="Naam"
            name="naam"
            defaultValue={editTemplate?.naam || ""}
            placeholder="Bijv. Kandidaat introductie mail"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              name="type"
              defaultValue={editTemplate?.type || "email"}
              options={[
                { value: "email", label: "Email" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
            />
            <Select
              label="Categorie"
              name="categorie"
              defaultValue={editTemplate?.categorie || "algemeen"}
              options={CATEGORIE_OPTIONS}
            />
          </div>
          <Input
            label="Onderwerp (alleen voor email)"
            name="onderwerp"
            defaultValue={editTemplate?.onderwerp || ""}
            placeholder="Bijv. Introductie {{kandidaat_naam}} voor {{functietitel}}"
          />
          <div>
            <Textarea
              label="Inhoud"
              name="inhoud"
              id="template-inhoud"
              defaultValue={editTemplate?.inhoud || ""}
              placeholder="Schrijf je template tekst hier..."
              className="min-h-[150px]"
              required
            />
            <div className="mt-2">
              <p className="text-xs text-muted mb-2">Klik op een variabele om in te voegen:</p>
              {TEMPLATE_VARIABLES.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="text-xs font-medium text-body mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.variables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById("template-inhoud") as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const insert = `{{${v.key}}}`;
                            textarea.value = text.slice(0, start) + insert + text.slice(end);
                            textarea.selectionStart = textarea.selectionEnd = start + insert.length;
                            textarea.focus();
                            textarea.dispatchEvent(new Event("input", { bubbles: true }));
                          }
                        }}
                        className="rounded-full bg-smaragd/10 px-2.5 py-1 text-xs text-smaragd hover:bg-smaragd/20 transition-colors"
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowForm(false); setEditTemplate(null); }}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : editTemplate ? "Opslaan" : "Aanmaken"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
