"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Klant, Contactpersoon } from "@/lib/types/crm";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Tabs } from "@/components/crm/ui/Tabs";
import { Input } from "@/components/crm/ui/Input";
import { InlineField } from "@/components/crm/ui/InlineField";
import { ActivityTimeline } from "@/components/crm/timeline/ActivityTimeline";
import { EmailLogTab } from "@/components/crm/EmailLogTab";
import {
  updateKlant,
  deleteKlant,
  createContactpersoon,
  updateContactpersoon,
  deleteContactpersoon,
  getContactpersonen,
} from "@/app/admin/actions/klanten";

interface Props {
  klant: Klant;
  contactpersonen: Contactpersoon[];
}

export default function KlantDetailClient({ klant: initialKlant, contactpersonen: initialContacts }: Props) {
  const router = useRouter();
  const [klant, setKlant] = useState(initialKlant);
  const [contactpersonen, setContactpersonen] = useState(initialContacts);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refreshContacts = () => {
    startTransition(async () => {
      const fresh = await getContactpersonen(klant.id);
      setContactpersonen(fresh);
    });
  };

  const handleFieldSave = async (field: string, value: string) => {
    const result = await updateKlant(klant.id, field, value);
    if (!result.error) {
      setKlant((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Weet je zeker dat je deze klant wilt verwijderen?")) return;
    const result = await deleteKlant(klant.id);
    if (!result.error) router.push("/admin/klanten");
  };

  const handleAddContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createContactpersoon(klant.id, formData);
    if (result.error) {
      setContactError(result.error);
    } else {
      setShowContactForm(false);
      (e.target as HTMLFormElement).reset();
      refreshContacts();
    }
  };

  const handleEditContact = async (e: React.FormEvent<HTMLFormElement>, contactId: string) => {
    e.preventDefault();
    setContactError(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateContactpersoon(contactId, klant.id, formData);
    if (result.error) {
      setContactError(result.error);
    } else {
      setEditingContactId(null);
      refreshContacts();
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setContactError(null);
    const result = await deleteContactpersoon(contactId, klant.id);
    if (result.error) setContactError(result.error);
    else refreshContacts();
  };

  const tabs = [
    {
      key: "algemeen",
      label: "Algemene Info",
      content: (
        <div className="space-y-6">
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InlineField
                label="KVK Nummer"
                value={klant.kvk_nummer || ""}
                onSave={(v) => handleFieldSave("kvk_nummer", v)}
                placeholder="Niet ingevuld"
              />
              <InlineField
                label="BTW Nummer"
                value={klant.btw_nummer || ""}
                onSave={(v) => handleFieldSave("btw_nummer", v)}
                placeholder="Niet ingevuld"
              />
              <InlineField
                label="Betaalvoorwaarden"
                value={klant.betaalvoorwaarden || ""}
                onSave={(v) => handleFieldSave("betaalvoorwaarden", v)}
                placeholder="Niet ingevuld"
              />
              <div>
                <p className="text-xs text-muted">Aangemaakt</p>
                <p className="mt-1 text-sm text-body">
                  {new Date(klant.created_at).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-surface-border pt-4">
              <InlineField
                label="Notities"
                value={klant.notities || ""}
                onSave={(v) => handleFieldSave("notities", v)}
                type="textarea"
                placeholder="Geen notities"
              />
            </div>
          </Card>

          {/* Contactpersonen */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-body">Contactpersonen</h3>
              <Button variant="ghost" className="text-xs" onClick={() => setShowContactForm(!showContactForm)}>
                + Toevoegen
              </Button>
            </div>

            {contactError && (
              <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-500">{contactError}</p>
            )}

            {showContactForm && (
              <Card padding="sm" className="mb-3">
                <form onSubmit={handleAddContact} className="grid grid-cols-2 gap-3">
                  <Input name="naam" placeholder="Naam *" required />
                  <Input name="email" placeholder="Email" type="email" />
                  <Input name="telefoon" placeholder="Telefoon" />
                  <Input name="functie" placeholder="Functie" />
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowContactForm(false)}>
                      Annuleren
                    </Button>
                    <Button type="submit">Opslaan</Button>
                  </div>
                </form>
              </Card>
            )}

            {contactpersonen.length === 0 ? (
              <p className="text-sm text-muted">Nog geen contactpersonen.</p>
            ) : (
              <div className="space-y-2">
                {contactpersonen.map((c) => (
                  <Card key={c.id} padding="sm">
                    {editingContactId === c.id ? (
                      <form onSubmit={(e) => handleEditContact(e, c.id)} className="grid grid-cols-2 gap-3">
                        <Input name="naam" placeholder="Naam *" defaultValue={c.naam} required />
                        <Input name="email" placeholder="Email" type="email" defaultValue={c.email || ""} />
                        <Input name="telefoon" placeholder="Telefoon" defaultValue={c.telefoon || ""} />
                        <Input name="functie" placeholder="Functie" defaultValue={c.functie || ""} />
                        <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer select-none text-body">
                          <input
                            type="checkbox"
                            name="is_primair"
                            defaultChecked={c.is_primair ?? false}
                            className="h-4 w-4 rounded accent-smaragd"
                          />
                          Primair contactpersoon
                        </label>
                        <div className="col-span-2 flex justify-between gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-xs text-red-500 hover:text-red-400"
                            onClick={() => handleDeleteContact(c.id)}
                          >
                            Verwijder
                          </Button>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditingContactId(null)}>
                              Annuleren
                            </Button>
                            <Button type="submit">Opslaan</Button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-heading">{c.naam}</p>
                            {c.is_primair && <Badge variant="smaragd">Primair</Badge>}
                            {c.functie && <span className="text-xs text-muted">{c.functie}</span>}
                          </div>
                          <div className="mt-1 flex gap-4 text-xs text-body">
                            {c.email && <span>{c.email}</span>}
                            {c.telefoon && <span>{c.telefoon}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" className="text-xs" onClick={() => setEditingContactId(c.id)}>
                          Bewerken
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "activiteiten",
      label: "Activiteiten",
      content: <ActivityTimeline entityType="klant" entityId={klant.id} />,
    },
    {
      key: "email",
      label: "Email",
      content: <EmailLogTab klantId={klant.id} />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Back nav */}
      <div>
        <button
          onClick={() => router.push("/admin/klanten")}
          className="text-sm text-muted hover:text-heading transition-colors"
        >
          ← Klanten
        </button>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-heading">{klant.bedrijfsnaam}</h1>
          <Button variant="danger" className="text-xs" onClick={handleDelete}>
            Verwijderen
          </Button>
        </div>
        {klant.sector && (
          <p className="mt-1 text-sm text-muted">{klant.sector}</p>
        )}
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}
