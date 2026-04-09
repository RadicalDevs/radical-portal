"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStagesForPipeline, getStageConfig } from "@/config/pipeline";
import type { PipelineType, Deal, PipelineStageConfig } from "@/lib/types/crm";

export interface DealKandidaatPlaatsing {
  id: string;
  status: string;
  kandidaat: { id: string; voornaam: string; achternaam: string } | null;
}

export interface DealWithRelations extends Omit<Deal, "klant" | "contactpersoon"> {
  klant: { bedrijfsnaam: string } | null;
  contactpersoon: { naam: string } | null;
  kandidaat_plaatsingen: DealKandidaatPlaatsing[];
}

export interface InvoiceTrigger {
  deal: DealWithRelations;
  stage: PipelineStageConfig;
}

export function usePipelineDeals(pipelineType: PipelineType) {
  const cacheKey = `pipeline-cache-${pipelineType}`;

  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceTrigger, setInvoiceTrigger] = useState<InvoiceTrigger | null>(null);

  // Restore from cache after hydration — client-only, no SSR mismatch
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached) as { data: DealWithRelations[]; timestamp: number };
        if (Date.now() - timestamp < 30000) {
          setDeals(data);
          setLoading(false);
        }
      }
    } catch { /* empty */ }
  }, [cacheKey]);

  const [klanten, setKlanten] = useState<{ id: string; bedrijfsnaam: string }[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const stages = getStagesForPipeline(pipelineType);

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, pipeline_type, stage, is_lost, potentiele_omzet, fee_percentage, marge, klant_id, contactpersoon_id, sluitingsdatum, startdatum, einddatum, notities, created_at, klant:klanten(bedrijfsnaam), contactpersoon:contactpersonen(naam), kandidaat_plaatsingen(id, status, kandidaat:kandidaten(id, voornaam, achternaam))"
      )
      .eq("pipeline_type", pipelineType)
      .eq("is_lost", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) console.error("fetchDeals:", error.message);
    const result = (data || []) as unknown as DealWithRelations[];
    setDeals(result);
    setLoading(false);
    try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() })); } catch { /* empty */ }
  }, [supabase, pipelineType, cacheKey]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const fetchKlanten = useCallback(async () => {
    const { data } = await supabase
      .from("klanten")
      .select("id, bedrijfsnaam")
      .order("bedrijfsnaam");
    setKlanten((data || []) as unknown as { id: string; bedrijfsnaam: string }[]);
  }, [supabase]);

  const handleDragEnd = async (itemId: string, overId: string) => {
    let newStage: string;

    const isStage = stages.some((s) => s.key === overId);
    if (isStage) {
      newStage = overId;
    } else {
      const targetDeal = deals.find((d) => d.id === overId);
      if (!targetDeal) return;
      newStage = targetDeal.stage;
    }

    const deal = deals.find((d) => d.id === itemId);
    if (!deal || deal.stage === newStage) return;

    const previousDeals = deals;
    setDeals((prev) =>
      prev.map((d) => (d.id === itemId ? { ...d, stage: newStage } : d))
    );

    const { error } = await supabase
      .from("deals")
      .update({ stage: newStage })
      .eq("id", itemId);
    if (error) {
      console.error("[Pipeline] Drag failed, reverting:", error);
      setDeals(previousDeals);
    } else {
      // Check if new stage is an invoice trigger
      const stageConfig = getStageConfig(newStage);
      if (stageConfig?.isInvoiceTrigger) {
        setInvoiceTrigger({ deal: { ...deal, stage: newStage }, stage: stageConfig });
      }
      // Fire-and-forget: notify on stage change
      fetch("/api/notificatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "deal_stage",
          deal_id: itemId,
          oude_stage: deal.stage,
          nieuwe_stage: newStage,
          klant_naam: deal.klant?.bedrijfsnaam || "Onbekend",
          waarde: deal.potentiele_omzet,
        }),
      }).catch((err) => console.error("[Pipeline] Notificatie failed:", err));
      fetch("/api/automation/pipeline-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klantId: deal.klant_id,
          oldStage: deal.stage,
          newStage,
        }),
      }).catch((err) => console.error("[Pipeline] Automation notify failed:", err));
    }
  };

  const clearInvoiceTrigger = () => setInvoiceTrigger(null);

  const handleAddDeal = async (formData: FormData) => {
    const firstStage = stages[0]?.key;
    if (!firstStage) return;

    const { error } = await supabase.from("deals").insert({
      pipeline_type: pipelineType,
      klant_id: formData.get("klant_id") as string,
      stage: firstStage,
      is_lost: false,
      potentiele_omzet: Number(formData.get("potentiele_omzet")) || null,
      fee_percentage: Number(formData.get("fee_percentage")) || null,
      marge: Number(formData.get("marge")) || null,
      sluitingsdatum: (formData.get("sluitingsdatum") as string) || null,
      startdatum: (formData.get("startdatum") as string) || null,
      einddatum: (formData.get("einddatum") as string) || null,
      notities: (formData.get("notities") as string) || null,
    });

    if (error) throw new Error(error.message);
    fetchDeals();
  };

  const handleDeleteDeal = async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      console.error("Delete deal failed:", error.message);
      return;
    }
    fetchDeals();
  };

  const handleLoseDeal = async (id: string) => {
    const previousDeals = deals;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    const { error } = await supabase.from("deals").update({ is_lost: true }).eq("id", id);
    if (error) {
      console.error("Failed to lose deal:", error.message);
      setDeals(previousDeals);
    }
  };

  return {
    deals,
    loading,
    klanten,
    stages,
    fetchDeals,
    fetchKlanten,
    handleDragEnd,
    handleAddDeal,
    handleDeleteDeal,
    handleLoseDeal,
    invoiceTrigger,
    clearInvoiceTrigger,
  };
}
