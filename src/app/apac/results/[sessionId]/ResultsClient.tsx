"use client";

import RadarChart from "@/components/apac/RadarChart";
import ScoreCard from "@/components/apac/ScoreCard";
import type { ApacScores, ApacDimension } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import { scoreToPercentage } from "@/lib/apac/scoring";

interface Props {
  scores: ApacScores;
  gecombineerd: number;
}

/** Score-afhankelijke beschrijvingen per dimensie */
const DIMENSION_DESCRIPTIONS: Record<
  ApacDimension,
  { high: string; mid: string; low: string }
> = {
  adaptability: {
    high: "Je bent uitzonderlijk flexibel en veerkrachtig. In een sector die continu verandert, ben jij degene die moeiteloos meebeweegt. Je omarmt verandering niet alleen — je bloeit erin op.",
    mid: "Je kunt je goed aanpassen aan verandering, al kost het soms even moeite. Je hebt de basis om in een dynamische omgeving te floreren, en met bewuste aandacht kun je hier verder in groeien.",
    low: "Verandering kan je onzeker maken, en dat is menselijk. De AI-sector vraagt veel flexibiliteit — maar het goede nieuws is dat aanpassingsvermogen een vaardigheid is die je kunt ontwikkelen.",
  },
  personality: {
    high: "Je persoonlijkheid is een krachtig instrument. Je weet wie je bent, je staat stevig in je schoenen en je durft jezelf te laten zien. Dat is precies wat teams nodig hebben in de AI-wereld.",
    mid: "Je hebt een herkenbare persoonlijkheid die je in veel situaties goed inzet. Er is ruimte om je nog meer te profileren en je unieke kwaliteiten bewuster in te zetten.",
    low: "Je persoonlijkheid is er, maar komt nog niet altijd volledig tot uiting. In de AI-sector telt authenticiteit — en daar zit juist jouw groeikans.",
  },
  awareness: {
    high: "Je bewustzijn is opvallend sterk. Je bent reflectief, begrijpt de bredere context en ziet de impact van technologie op mens en maatschappij. Dat maakt je een waardevolle stem in elke AI-discussie.",
    mid: "Je hebt een goed ontwikkeld bewustzijn van je omgeving en de bredere impact van je werk. Met meer reflectie kun je dit nog verder verdiepen.",
    low: "Er is ruimte om je bewustzijn te verbreden — zowel zelfbewustzijn als bewustzijn van de ethische en maatschappelijke context van AI. Dit is een reis, geen eindbestemming.",
  },
  connection: {
    high: "Je vermogen om verbindingen te maken is uitzonderlijk. Je bouwt bruggen tussen mensen, ideeën en disciplines. In een wereld waar AI dreigt te isoleren, ben jij de verbinder.",
    mid: "Je kunt goed verbinden met anderen en bouwt zinvolle relaties op. Er is potentie om dit nog strategischer in te zetten in je professionele netwerk.",
    low: "Verbinding maken kan uitdagend zijn, zeker in een technisch veld. Maar juist de menselijke connectie wordt steeds waardevoller naarmate AI meer taken overneemt.",
  },
};

function getDescription(dimension: ApacDimension, score: number): string {
  const descs = DIMENSION_DESCRIPTIONS[dimension];
  if (score >= 7.5) return descs.high;
  if (score >= 5) return descs.mid;
  return descs.low;
}

export default function ResultsClient({ scores, gecombineerd }: Props) {
  return (
    <>
      {/* Combined score badge */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-surface-border bg-surface px-6 py-3 shadow-sm">
          <span className="text-sm text-muted">Gecombineerde score</span>
          <span className="text-2xl font-bold text-smaragd">
            {scoreToPercentage(gecombineerd)}%
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mt-8 flex justify-center">
        <RadarChart scores={scores} size={360} animated />
      </div>

      {/* Score Cards */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {APAC_DIMENSIONS.map((dim) => (
          <ScoreCard
            key={dim}
            dimension={dim}
            score={scores[dim]}
            description={getDescription(dim, scores[dim])}
          />
        ))}
      </div>
    </>
  );
}
