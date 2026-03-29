"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import RadarChart from "@/components/apac/RadarChart";
import ScoreCard from "@/components/apac/ScoreCard";
import type { ApacScores, ApacDimension } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import {
  DIMENSION_LABELS,
  DIMENSION_COLORS,
  scoreToPercentage,
} from "@/lib/apac/scoring";

interface Props {
  scores: ApacScores;
  gecombineerd: number;
  sessionId: string;
  isLoggedIn: boolean;
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

/* ─── Animation phases ─── */
const PHASE_SPLASH = 0; // "Analyseren..." loading animation
const PHASE_REVEAL = 1; // Radar chart draws in
const PHASE_DIMS = 2; // Dimension cards appear one by one
const PHASE_FINAL = 3; // Combined score grand reveal

/* ─── Timing (ms) ─── */
const SPLASH_DURATION = 3200;
const REVEAL_DELAY = 600;
const DIM_STAGGER = 500;
const FINAL_DELAY = 800;

const ANALYZING_STEPS = [
  "Antwoorden verwerken…",
  "Adaptability berekenen…",
  "Personality analyseren…",
  "Awareness meten…",
  "Connection evalueren…",
  "Profiel samenstellen…",
];

export default function ResultsClient({ scores, gecombineerd, sessionId, isLoggedIn }: Props) {
  const [phase, setPhase] = useState(PHASE_SPLASH);
  const [splashStep, setSplashStep] = useState(0);
  const [showChart, setShowChart] = useState(false);
  const [visibleDims, setVisibleDims] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [countedScore, setCountedScore] = useState(0);

  // Phase 0 → 1: Splash screen with rotating text
  useEffect(() => {
    const stepInterval = SPLASH_DURATION / ANALYZING_STEPS.length;
    const interval = setInterval(() => {
      setSplashStep((prev) => {
        if (prev >= ANALYZING_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, stepInterval);

    const timer = setTimeout(() => {
      setPhase(PHASE_REVEAL);
    }, SPLASH_DURATION);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  // Phase 1: Show radar chart
  useEffect(() => {
    if (phase !== PHASE_REVEAL) return;
    const timer = setTimeout(() => setShowChart(true), REVEAL_DELAY);
    const next = setTimeout(() => setPhase(PHASE_DIMS), REVEAL_DELAY + 1400);
    return () => {
      clearTimeout(timer);
      clearTimeout(next);
    };
  }, [phase]);

  // Phase 2: Show dimension cards one by one
  useEffect(() => {
    if (phase !== PHASE_DIMS) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < APAC_DIMENSIONS.length; i++) {
      timers.push(
        setTimeout(() => setVisibleDims(i + 1), i * DIM_STAGGER)
      );
    }
    timers.push(
      setTimeout(
        () => setPhase(PHASE_FINAL),
        APAC_DIMENSIONS.length * DIM_STAGGER + FINAL_DELAY
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Phase 3: Confetti + animate combined score counter
  const confettiFired = useRef(false);
  useEffect(() => {
    if (phase !== PHASE_FINAL) return;
    const showTimer = setTimeout(() => setShowFinal(true), 200);

    // Fire confetti when final score appears
    if (!confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.15, y: 0.6 },
          colors: ["#2ed573", "#E6734F", "#8B5CF6", "#3B82F6", "#ffffff"],
          angle: 60,
          gravity: 0.8,
          ticks: 200,
        });
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { x: 0.85, y: 0.6 },
          colors: ["#2ed573", "#E6734F", "#8B5CF6", "#3B82F6", "#ffffff"],
          angle: 120,
          gravity: 0.8,
          ticks: 200,
        });
      }, 300);
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 120,
          origin: { x: 0.5, y: 0.3 },
          colors: ["#2ed573", "#5ee89a", "#E6734F"],
          gravity: 0.6,
          ticks: 250,
          startVelocity: 25,
        });
      }, 700);
    }

    const target = scoreToPercentage(gecombineerd);
    const duration = 1500;
    const startTime = Date.now() + 200;
    let raf: number;

    function tick() {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCountedScore(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(showTimer);
      cancelAnimationFrame(raf);
    };
  }, [phase, gecombineerd]);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* ── PHASE 0: Splash screen ── */}
        {phase === PHASE_SPLASH && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex min-h-[60vh] flex-col items-center justify-center"
          >
            {/* Pulsing ring animation */}
            <div className="relative mb-10">
              <div className="h-28 w-28 rounded-full border-2 border-smaragd/20" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-smaragd"
                style={{ borderTopColor: "transparent", borderRightColor: "transparent" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-coral/60"
                style={{ borderBottomColor: "transparent", borderLeftColor: "transparent" }}
                animate={{ rotate: -360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border border-purple-500/40"
                style={{ borderTopColor: "transparent" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
              {/* Center dot */}
              <motion.div
                className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>

            {/* Rotating analysis text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={splashStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="font-heading text-lg font-semibold text-heading"
              >
                {ANALYZING_STEPS[splashStep]}
              </motion.p>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-surface-border">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-smaragd via-coral to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: SPLASH_DURATION / 1000, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 1+: Results content ── */}
      {phase >= PHASE_REVEAL && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Radar Chart with dramatic entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={showChart ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow behind chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={showChart ? { opacity: 0.3 } : {}}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="absolute -inset-8 rounded-full blur-[60px]"
                style={{
                  background:
                    "radial-gradient(circle, #2ed573 0%, #E6734F 50%, #8B5CF6 100%)",
                }}
              />
              <RadarChart scores={scores} maxSize={360} animated />
            </div>
          </motion.div>

          {/* ── PHASE 2: Score Cards ── */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {APAC_DIMENSIONS.map((dim, i) => (
              <motion.div
                key={dim}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={
                  i < visibleDims
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 20, scale: 0.95 }
                }
                transition={{
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                <ScoreCard
                  dimension={dim}
                  score={scores[dim]}
                  description={getDescription(dim, scores[dim])}
                  animated={i < visibleDims}
                />
              </motion.div>
            ))}
          </div>

          {/* ── PHASE 3: Combined score (grand finale) ── */}
          <AnimatePresence>
            {showFinal && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
                className="mt-12"
              >
                {isLoggedIn ? (
                  /* ── Logged in: show real score ── */
                  <div className="relative overflow-hidden rounded-2xl border border-smaragd/30 bg-gradient-to-br from-smaragd/10 via-surface to-coral/5 p-8 text-center sm:p-10">
                    <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/10 blur-[80px]" />
                    <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
                      Gecombineerde score
                    </p>
                    <motion.div
                      className="mt-4 font-heading text-7xl font-bold sm:text-8xl"
                      style={{
                        background: "linear-gradient(135deg, #2ed573 0%, #E6734F 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {countedScore}%
                    </motion.div>
                    <p className="mx-auto mt-4 max-w-md text-muted">
                      {gecombineerd >= 8
                        ? "Uitzonderlijk. Je menselijke kwaliteiten plaatsen je in de top van AI-professionals."
                        : gecombineerd >= 6.5
                        ? "Sterk. Je hebt een solide basis van menselijke kwaliteiten om op voort te bouwen."
                        : gecombineerd >= 5
                        ? "Veelbelovend. Met de juiste begeleiding kun je hier veel meer uit halen."
                        : "Een startpunt. Iedereen begint ergens — dit is het begin van je groei."}
                    </p>
                  </div>
                ) : (
                  /* ── Not logged in: teaser + CTA (gecombineerd) ── */
                  <div className="relative overflow-hidden rounded-2xl border border-smaragd/30 bg-gradient-to-br from-smaragd/10 via-surface to-coral/5 p-8 text-center sm:p-10">
                    <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/10 blur-[80px]" />
                    <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
                      Gecombineerde score
                    </p>
                    {/* Blurred/locked score */}
                    <div className="relative mt-4 flex items-center justify-center">
                      <div
                        className="select-none font-heading text-7xl font-bold blur-lg sm:text-8xl"
                        style={{
                          background: "linear-gradient(135deg, #2ed573 0%, #E6734F 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                        aria-hidden="true"
                      >
                        ??%
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 rounded-full border border-smaragd/40 bg-surface/90 px-4 py-2 backdrop-blur-sm">
                          <svg className="h-4 w-4 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          <span className="text-sm font-semibold text-heading">Vergrendeld</span>
                        </div>
                      </div>
                    </div>
                    <h2 className="mt-6 font-heading text-xl font-bold text-heading sm:text-2xl">
                      Wil je meer weten?
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-muted">
                      Maak een gratis account aan voor je gecombineerde score, persoonlijke coaching door Nelieke, en toegang tot onze community van AI-professionals.
                    </p>
                    <Link
                      href={`/auth/register?session=${sessionId}`}
                      className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl"
                    >
                      Maak een account aan
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <p className="mt-3 text-xs text-muted">Gratis — je resultaten worden aan je profiel gekoppeld.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
