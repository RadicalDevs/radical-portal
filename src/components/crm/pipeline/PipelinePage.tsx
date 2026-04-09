"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PIPELINE_CONFIGS,
  getStagesByPhase,
} from "@/config/pipeline";
import { usePipelineDeals } from "@/hooks/usePipelineDeals";
import type { DealWithRelations } from "@/hooks/usePipelineDeals";
import type { PipelineType } from "@/lib/types/crm";
import { KanbanBoard } from "@/components/crm/kanban/KanbanBoard";
import { KanbanPhaseGroup } from "@/components/crm/kanban/KanbanPhaseGroup";
import { KanbanColumn } from "@/components/crm/kanban/KanbanColumn";
import { KanbanCard, KanbanCardOverlay } from "@/components/crm/kanban/KanbanCard";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { SearchSelect } from "@/components/crm/ui/SearchSelect";
import { Textarea } from "@/components/crm/ui/Textarea";
import { FactuurFormModal } from "@/components/crm/forms/FactuurFormModal";
import type { FactuurRegel } from "@/lib/types/crm";

interface PipelinePageProps {
  pipelineType: PipelineType;
}

export function PipelinePage({ pipelineType }: PipelinePageProps) {
  const config = PIPELINE_CONFIGS[pipelineType];
  const {
    deals,
    loading,
    klanten,
    stages,
    fetchKlanten,
    handleDragEnd,
    handleAddDeal,
    handleDeleteDeal,
    handleLoseDeal,
    invoiceTrigger,
    clearInvoiceTrigger,
  } = usePipelineDeals(pipelineType);

  const buildInitialRegels = (omzet: number | undefined, invoiceLabel: string | undefined): FactuurRegel[] => {
    const label = invoiceLabel || "Recruitment diensten";
    const match = label.match(/(\d+)%/);
    const pct = match ? Number(match[1]) : null;
    const bedrag = pct && omzet ? Math.round((omzet * pct) / 100) : (omzet || 0);
    return [{ omschrijving: label, aantal: 1, eenheidsprijs: bedrag, btw_percentage: 21 }];
  };

  const [showForm, setShowForm] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const router = useRouter();

  const formatCurrency = (val: number | null | undefined) =>
    val ? `€${val.toLocaleString("nl-NL")}` : "";

  const openNewDealForm = async () => {
    await fetchKlanten();
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await handleAddDeal(formData);
    setShowForm(false);
  };

  /** Lightweight overlay shown while dragging — no interactive buttons */
  const renderDragOverlay = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return null;
    return (
      <KanbanCardOverlay>
        <p className="text-sm font-medium text-heading">
          {deal.klant?.bedrijfsnaam || "Onbekend"}
        </p>
        {deal.potentiele_omzet ? (
          <span className="text-xs font-medium text-smaragd">
            {formatCurrency(deal.potentiele_omzet)}
          </span>
        ) : null}
      </KanbanCardOverlay>
    );
  };

  const renderDealCard = (deal: DealWithRelations) => (
    <KanbanCard key={deal.id} id={deal.id}>
      {/* Delete button — hover only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteDeal(deal.id);
        }}
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-transparent hover:text-white hover:bg-red-500 transition-all z-10"
        title="Verwijderen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>

      {/* Lose button — hover only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLoseDeal(deal.id);
        }}
        className="absolute -top-2 left-[-8px] h-5 w-5 rounded-full flex items-center justify-center text-transparent hover:text-white hover:bg-amber-500 transition-all z-10"
        title="Markeer als verloren"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18"/></svg>
      </button>

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-heading">
          {deal.klant?.bedrijfsnaam || "Onbekend"}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/klanten/${deal.klant_id}`);
          }}
          className="text-xs text-smaragd hover:underline flex-shrink-0"
        >
          Bekijk
        </button>
      </div>
      {deal.contactpersoon && (
        <p className="text-xs text-muted">
          {deal.contactpersoon.naam}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        {deal.potentiele_omzet ? (
          <span className="text-xs font-medium text-smaragd">
            {formatCurrency(deal.potentiele_omzet)}
          </span>
        ) : <span />}
        {deal.sluitingsdatum && (
          <span className="text-xs text-muted">
            {new Date(deal.sluitingsdatum).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      {/* Linked kandidaten */}
      {deal.kandidaat_plaatsingen?.length > 0 && (
        <div className="mt-2 border-t border-surface-border pt-2 space-y-1">
          {deal.kandidaat_plaatsingen.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/admin/candidates/${p.kandidaat?.id}`);
                }}
                className="text-[11px] text-smaragd hover:underline truncate"
              >
                {p.kandidaat?.voornaam} {p.kandidaat?.achternaam}
              </button>
              <Badge variant={
                p.status === "geplaatst" || p.status === "geselecteerd" ? "smaragd"
                  : p.status === "in_gesprek" ? "warning"
                  : p.status === "afgewezen" ? "danger"
                  : "default"
              }>
                {p.status}
              </Badge>
            </div>
          ))}
          {deal.kandidaat_plaatsingen.length > 3 && (
            <p className="text-[10px] text-muted">
              +{deal.kandidaat_plaatsingen.length - 3} meer
            </p>
          )}
        </div>
      )}
    </KanbanCard>
  );

  if (loading) {
    return <Skeleton variant="card" count={3} />;
  }

  const activeDeals = deals.filter((d) => showLost ? d.is_lost : !d.is_lost);
  const totalValue = activeDeals.reduce(
    (sum, d) => sum + (d.potentiele_omzet || 0),
    0
  );
  const closedStages = stages.filter((s) => s.isCloseStage).map((s) => s.key);
  const closedValue = activeDeals
    .filter((d) => closedStages.includes(d.stage))
    .reduce((sum, d) => sum + (d.potentiele_omzet || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">{config.label}</h1>
          <p className="mt-1 text-sm text-muted">
            {config.description} — {activeDeals.length} deal{activeDeals.length !== 1 ? "s" : ""} {showLost ? "verloren" : "actief"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLost((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              showLost
                ? "border-amber-400 bg-amber-400/10 text-amber-600"
                : "border-surface-border bg-transparent text-muted hover:text-heading"
            }`}
          >
            {showLost ? "Verloren deals" : "Actieve deals"}
          </button>
          {!showLost && <Button onClick={openNewDealForm}>+ Nieuwe Deal</Button>}
        </div>
      </div>

      {/* Pipeline totals */}
      <div className="flex gap-4 text-sm">
        <div className="text-body">
          Pipelinewaarde:{" "}
          <span className="font-medium text-smaragd">
            {formatCurrency(totalValue)}
          </span>
        </div>
        <div className="text-body">
          Afgerond:{" "}
          <span className="font-medium text-smaragd">
            {formatCurrency(closedValue)}
          </span>
        </div>
      </div>

      {/* Kanban Board met fasegroepen */}
      <KanbanBoard onDragEnd={handleDragEnd} renderOverlay={renderDragOverlay}>
        {config.phases.map((phase) => {
          const phaseStages = getStagesByPhase(pipelineType, phase.key);
          if (phaseStages.length === 0) return null;

          return (
            <KanbanPhaseGroup
              key={phase.key}
              label={phase.label}
              color={phase.color}
              borderColor={phase.borderColor}
            >
              {phaseStages.map((stage) => {
                const stageDeals = activeDeals.filter(
                  (d) => d.stage === stage.key
                );
                return (
                  <KanbanColumn
                    key={stage.key}
                    id={stage.key}
                    title={stage.label}
                    color={phase.color}
                    count={stageDeals.length}
                    description={stage.description}
                    isInvoiceTrigger={stage.isInvoiceTrigger}
                    invoiceLabel={stage.invoiceLabel}
                    isCloseStage={stage.isCloseStage}
                  >
                    {stageDeals.map(renderDealCard)}
                  </KanbanColumn>
                );
              })}
            </KanbanPhaseGroup>
          );
        })}
      </KanbanBoard>

      {/* Invoice trigger — FactuurFormModal met vooringevulde regels */}
      {invoiceTrigger && (
        <FactuurFormModal
          isOpen={true}
          onClose={clearInvoiceTrigger}
          onSuccess={clearInvoiceTrigger}
          preselectedKlantId={invoiceTrigger.deal.klant_id}
          initialRegels={buildInitialRegels(invoiceTrigger.deal.potentiele_omzet, invoiceTrigger.stage.invoiceLabel)}
          initialNotities={`Pipeline: ${config.label} — ${invoiceTrigger.stage.label}`}
        />
      )}

      {/* Nieuwe Deal Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={`Nieuwe Deal — ${config.label}`}
        maxWidth="md"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <SearchSelect
            label="Klant"
            name="klant_id"
            placeholder="Selecteer een klant..."
            options={klanten.map((k) => ({
              value: k.id,
              label: k.bedrijfsnaam,
            }))}
            required
          />
          <Input
            label="Potentiele omzet"
            name="potentiele_omzet"
            type="number"
            placeholder="Bijv. 25000"
          />

          {/* Pipeline-specifieke velden */}
          {pipelineType === "permanent" && (
            <Input
              label="Fee percentage"
              name="fee_percentage"
              type="number"
              placeholder="Bijv. 20"
            />
          )}
          {pipelineType === "interim" && (
            <Input
              label="Marge"
              name="marge"
              type="number"
              placeholder="Bijv. 15"
            />
          )}
          {(pipelineType === "interim" || pipelineType === "project") && (
            <>
              <Input
                label="Verwachte startdatum"
                name="startdatum"
                type="date"
              />
              <Input
                label="Verwachte einddatum"
                name="einddatum"
                type="date"
              />
            </>
          )}

          <Input
            label="Verwachte sluitingsdatum"
            name="sluitingsdatum"
            type="date"
          />
          <Textarea
            label="Notities"
            name="notities"
            placeholder="Notities over deze deal..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Annuleren
            </Button>
            <Button type="submit">
              Toevoegen aan {stages[0]?.label || "Lead"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
