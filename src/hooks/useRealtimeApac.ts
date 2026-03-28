"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApacScores } from "@/lib/apac/types";

/**
 * Supabase Realtime subscription op apac_resultaten.
 * Luistert naar UPDATE en INSERT events voor een specifieke kandidaat.
 * Als Nelieke scores aanpast in het CRM → kandidaat ziet het direct.
 */
export function useRealtimeApac(
  kandidaatId: string,
  initialScores: ApacScores | null
) {
  const [scores, setScores] = useState<ApacScores | null>(initialScores);

  useEffect(() => {
    if (!kandidaatId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`apac-${kandidaatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "apac_resultaten",
          filter: `kandidaat_id=eq.${kandidaatId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (row) {
            setScores({
              adaptability: Number(row.adaptability),
              personality: Number(row.personality),
              awareness: Number(row.awareness),
              connection: Number(row.connection),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kandidaatId]);

  return scores;
}
