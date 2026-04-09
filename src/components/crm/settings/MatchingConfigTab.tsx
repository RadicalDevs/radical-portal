"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs } from "@/components/crm/ui/Tabs";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { GlobalWeightsEditor } from "./GlobalWeightsEditor";
import { RoltypeWeightsEditor } from "./RoltypeWeightsEditor";
import { SectorWeightsEditor } from "./SectorWeightsEditor";
import { CultuurPijlersEditor } from "./CultuurPijlersEditor";
import type { MatchWeights, HardFilterConfig, APACRolGewichten } from "@/config/matching";
import type { MatchingConfigRow, MatchingRoltype, MatchingSector, CultuurPijler } from "@/lib/types/crm";

async function fetchMatchingData() {
  const res = await fetch("/api/settings/matching");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json() as Promise<{
    config: MatchingConfigRow[];
    roltypes: MatchingRoltype[];
    sectors: MatchingSector[];
    cultuurPijlers: CultuurPijler[];
  }>;
}

async function saveConfig(body: Record<string, unknown>) {
  const res = await fetch("/api/settings/matching", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity: "config", ...body }),
  });
  if (!res.ok) throw new Error("Save failed");
}

async function deleteConfig(body: Record<string, unknown>) {
  const res = await fetch("/api/settings/matching", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity: "config", ...body }),
  });
  if (!res.ok) throw new Error("Delete failed");
}

async function saveEntity(entity: string, body: Record<string, unknown>) {
  const res = await fetch("/api/settings/matching", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, ...body }),
  });
  if (!res.ok) throw new Error("Save failed");
}

async function deleteEntity(entity: string, body: Record<string, unknown>) {
  const res = await fetch("/api/settings/matching", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, ...body }),
  });
  if (!res.ok) throw new Error("Delete failed");
}

export function MatchingConfigTab() {
  const [configRows, setConfigRows] = useState<MatchingConfigRow[]>([]);
  const [roltypes, setRoltypes] = useState<MatchingRoltype[]>([]);
  const [sectors, setSectors] = useState<MatchingSector[]>([]);
  const [cultuurPijlers, setCultuurPijlers] = useState<CultuurPijler[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await fetchMatchingData();
    setConfigRows(data.config);
    setRoltypes(data.roltypes);
    setSectors(data.sectors);
    setCultuurPijlers(data.cultuurPijlers);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) return <Skeleton variant="card" count={2} />;

  const globalRow = configRows.find((r) => r.scope_type === "global");

  const tabs = [
    {
      key: "global",
      label: "Globale Gewichten",
      content: (
        <GlobalWeightsEditor
          initialWeights={globalRow?.weights as unknown as MatchWeights | null}
          initialFilters={globalRow?.hard_filters as unknown as HardFilterConfig | null}
          initialDisabledComponents={globalRow?.disabled_components as string[] | null}
          onSave={async (weights, filters, disabledComponents) => {
            await saveConfig({ scope_type: "global", scope_key: null, weights, hard_filters: filters, disabled_components: disabledComponents });
            await reload();
          }}
          onReset={async () => {
            await deleteConfig({ scope_type: "global", scope_key: null });
            await reload();
          }}
        />
      ),
    },
    {
      key: "roltypes",
      label: `Per Roltype (${roltypes.length})`,
      content: (
        <RoltypeWeightsEditor
          roltypes={roltypes}
          configRows={configRows}
          onSaveRoltype={async (key, label) => {
            await saveEntity("roltype", { key, label, order: roltypes.length + 1 });
            await reload();
          }}
          onDeleteRoltype={async (key) => {
            await deleteEntity("roltype", { key });
            await reload();
          }}
          onSaveWeights={async (key, apac: APACRolGewichten) => {
            await saveConfig({ scope_type: "roltype", scope_key: key, apac_gewichten: apac });
            await reload();
          }}
        />
      ),
    },
    {
      key: "sectors",
      label: `Per Sector (${sectors.length})`,
      content: (
        <SectorWeightsEditor
          sectors={sectors}
          configRows={configRows}
          onSaveSector={async (key, label) => {
            await saveEntity("sector", { key, label, order: sectors.length + 1 });
            await reload();
          }}
          onDeleteSector={async (key) => {
            await deleteEntity("sector", { key });
            await reload();
          }}
          onSaveWeights={async (key, weights) => {
            await saveConfig({ scope_type: "sector", scope_key: key, weights });
            await reload();
          }}
        />
      ),
    },
    {
      key: "cultuur",
      label: `Cultuur Pijlers (${cultuurPijlers.length})`,
      content: (
        <CultuurPijlersEditor
          pijlers={cultuurPijlers}
          sectors={sectors}
          configRows={configRows}
          onSavePijler={async (key, label, beschrijving, apac_mapping, kleur) => {
            await saveEntity("cultuur_pijler", { key, label, beschrijving, apac_mapping, kleur, order: cultuurPijlers.length + 1 });
            await reload();
          }}
          onDeletePijler={async (key) => {
            await deleteEntity("cultuur_pijler", { key });
            await reload();
          }}
          onSaveSectorDefaults={async (sectorKey, defaults) => {
            await saveConfig({ scope_type: "sector", scope_key: sectorKey, cultuur_defaults: defaults });
            await reload();
          }}
        />
      ),
    },
  ];

  return <Tabs tabs={tabs} />;
}
