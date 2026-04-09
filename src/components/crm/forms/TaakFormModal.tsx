"use client";

import { useState } from "react";
import type { Taak } from "@/lib/types/crm";
import { createTaak, updateTaak } from "@/app/admin/actions/taken";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { Textarea } from "@/components/crm/ui/Textarea";
import { Select } from "@/components/crm/ui/Select";
import { Button } from "@/components/crm/ui/Button";

interface TaakFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taak?: Taak;
  defaultKlantId?: string;
  defaultKandidaatId?: string;
}

export function TaakFormModal({
  isOpen,
  onClose,
  onSuccess,
  taak,
  defaultKlantId,
  defaultKandidaatId,
}: TaakFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!taak;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (defaultKlantId) formData.set("klant_id", defaultKlantId);
    if (defaultKandidaatId) formData.set("kandidaat_id", defaultKandidaatId);

    const result = isEdit
      ? await updateTaak(taak.id, formData)
      : await createTaak(formData);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Taak Bewerken" : "Nieuwe Taak"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Titel"
          name="titel"
          defaultValue={taak?.titel}
          placeholder="Wat moet er gedaan worden?"
          required
        />
        <Textarea
          label="Beschrijving"
          name="beschrijving"
          defaultValue={taak?.beschrijving || ""}
          placeholder="Extra details..."
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Prioriteit"
            name="prioriteit"
            defaultValue={taak?.prioriteit || "normaal"}
            options={[
              { value: "laag", label: "Laag" },
              { value: "normaal", label: "Normaal" },
              { value: "hoog", label: "Hoog" },
              { value: "urgent", label: "Urgent" },
            ]}
          />
          <Input
            label="Deadline"
            name="deadline"
            type="date"
            defaultValue={taak?.deadline || ""}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Opslaan" : "Toevoegen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
