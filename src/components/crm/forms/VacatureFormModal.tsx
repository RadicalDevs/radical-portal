"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { Textarea } from "@/components/crm/ui/Textarea";
import { Select } from "@/components/crm/ui/Select";
import { SearchSelect } from "@/components/crm/ui/SearchSelect";
import { Button } from "@/components/crm/ui/Button";
import { createVacature, getKlantenVoorSelect } from "@/app/admin/actions/vacatures";

interface VacatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedKlantId?: string;
}

export function VacatureFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedKlantId,
}: VacatureFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [klanten, setKlanten] = useState<{ value: string; label: string }[]>([]);
  const [selectedKlantId, setSelectedKlantId] = useState(preselectedKlantId || "");

  useEffect(() => {
    if (isOpen) {
      getKlantenVoorSelect().then((data) => {
        setKlanten(data.map((k) => ({ value: k.id, label: k.bedrijfsnaam })));
      });
      setSelectedKlantId(preselectedKlantId || "");
      setError(null);
    }
  }, [isOpen, preselectedKlantId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createVacature(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nieuwe Vacature" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Functietitel"
          name="functietitel"
          placeholder="Bijv. Senior Frontend Developer"
          required
        />
        <SearchSelect
          label="Klant"
          name="klant_id"
          value={selectedKlantId}
          placeholder="Selecteer een klant..."
          options={klanten}
          onChange={setSelectedKlantId}
          required
        />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Salaris min" name="salaris_min" type="number" placeholder="40000" />
          <Input label="Salaris max" name="salaris_max" type="number" placeholder="70000" />
          <Input label="Budget" name="budget" type="number" placeholder="15000" />
        </div>
        <Select
          label="Status"
          name="status"
          defaultValue="open"
          options={[
            { value: "open", label: "Open" },
            { value: "on_hold", label: "On Hold" },
            { value: "gesloten", label: "Gesloten" },
          ]}
        />
        <Textarea
          label="Beschrijving"
          name="beschrijving"
          placeholder="Beschrijving van de vacature..."
        />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={loading}>
            Toevoegen
          </Button>
        </div>
      </form>
    </Modal>
  );
}
