"use client";

import { useState } from "react";
import type { Klant } from "@/lib/types/crm";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { Textarea } from "@/components/crm/ui/Textarea";
import { Button } from "@/components/crm/ui/Button";
import { createKlant } from "@/app/admin/actions/klanten";

interface KlantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  klant?: Klant;
}

export function KlantFormModal({ isOpen, onClose, onSuccess }: KlantFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createKlant(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      onSuccess();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nieuwe Klant" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Bedrijfsnaam"
          name="bedrijfsnaam"
          placeholder="Bijv. Acme B.V."
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="KVK Nummer" name="kvk_nummer" placeholder="12345678" />
          <Input label="BTW Nummer" name="btw_nummer" placeholder="NL123456789B01" />
        </div>
        <Input
          label="Betaalvoorwaarden"
          name="betaalvoorwaarden"
          placeholder="Bijv. 30 dagen na factuurdatum"
        />
        <Textarea
          label="Notities"
          name="notities"
          placeholder="Interne notities over deze klant..."
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
