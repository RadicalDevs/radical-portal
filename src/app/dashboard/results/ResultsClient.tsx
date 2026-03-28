"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import RadarChart from "@/components/apac/RadarChart";
import { useRealtimeApac } from "@/hooks/useRealtimeApac";
import { calculateCombinedScore, scoreToPercentage, DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import type { ApacScores, ApacDimension } from "@/lib/apac/types";
import type { Article } from "../actions";

interface Props {
  kandidaatId: string;
  firstName: string;
  initialScores: ApacScores;
  articles: Article[];
}

const DIMENSION_INSIGHTS: Record<
  ApacDimension,
  { title: string; high: string; mid: string; low: string }
> = {
  adaptability: {
    title: "Wat zegt je Adaptability over jou als professional?",
    high: "Je bent uitzonderlijk flexibel en veerkrachtig. In een sector die continu verandert, ben jij degene die moeiteloos meebeweegt. Je omarmt verandering niet alleen — je bloeit erin op. Voor werkgevers betekent dit dat je snel inzetbaar bent in wisselende projecten en technologieën.",
    mid: "Je kunt je goed aanpassen aan verandering, al kost het soms even moeite. Je hebt de basis om in een dynamische omgeving te floreren. Overweeg om jezelf vaker bloot te stellen aan nieuwe situaties — elk oncomfortabel moment bouwt aan je veerkracht.",
    low: "Verandering kan je onzeker maken, en dat is menselijk. De AI-sector vraagt veel flexibiliteit, maar het goede nieuws is dat aanpassingsvermogen een vaardigheid is die je kunt ontwikkelen. Begin klein: probeer elke week één ding anders te doen in je workflow.",
  },
  personality: {
    title: "Wat zegt je Personality over wie je bent?",
    high: "Je persoonlijkheid is een krachtig instrument. Je weet wie je bent, je staat stevig in je schoenen en je durft jezelf te laten zien. Dat is precies wat teams nodig hebben in de AI-wereld — authentieke professionals die hun visie durven delen.",
    mid: "Je hebt een herkenbare persoonlijkheid die je in veel situaties goed inzet. Er is ruimte om je nog meer te profileren. Durf vaker je mening te geven in meetings en je unieke perspectief te delen — dat is wat je onderscheidt van AI.",
    low: "Je persoonlijkheid is er, maar komt nog niet altijd volledig tot uiting. In de AI-sector telt authenticiteit. Vraag jezelf af: wat maakt mij uniek als mens en professional? Die kern is je grootste kracht.",
  },
  awareness: {
    title: "Wat zegt je Awareness over je bewustzijn?",
    high: "Je bewustzijn is opvallend sterk. Je bent reflectief, begrijpt de bredere context en ziet de impact van technologie op mens en maatschappij. Dat maakt je een waardevolle stem in elke AI-discussie en een ethisch kompas voor teams.",
    mid: "Je hebt een goed ontwikkeld bewustzijn van je omgeving en de bredere impact van je werk. Verdiep dit door regelmatig te reflecteren op de ethische implicaties van de technologie waar je mee werkt.",
    low: "Er is ruimte om je bewustzijn te verbreden — zowel zelfbewustzijn als bewustzijn van de ethische context van AI. Overweeg een boek over AI-ethiek, of voer een gesprek met Nelieke over hoe je hier bewuster mee om kunt gaan.",
  },
  connection: {
    title: "Wat zegt je Connection over hoe je verbindt?",
    high: "Je vermogen om verbindingen te maken is uitzonderlijk. Je bouwt bruggen tussen mensen, ideeën en disciplines. In een wereld waar AI dreigt te isoleren, ben jij de verbinder. Dat is zeldzaam en ongelooflijk waardevol.",
    mid: "Je kunt goed verbinden met anderen en bouwt zinvolle relaties op. Om dit naar een hoger niveau te tillen: probeer actief mensen uit verschillende disciplines samen te brengen. Jij kunt de brug zijn.",
    low: "Verbinding maken kan uitdagend zijn, zeker in een technisch veld. Maar juist de menselijke connectie wordt steeds waardevoller naarmate AI meer taken overneemt. Begin met één gesprek per week dat je normaal niet zou voeren.",
  },
};

function getInsight(dim: ApacDimension, score: number): string {
  const insights = DIMENSION_INSIGHTS[dim];
  if (score >= 7.5) return insights.high;
  if (score >= 5) return insights.mid;
  return insights.low;
}

// Animated counter
function AnimatedPercentage({ value, color, size = "text-5xl" }: { value: number; color: string; size?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1500, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value]);

  return (
    <span ref={ref} className={`font-heading ${size} font-bold counter-animate`} style={{ color }}>
      {display}%
    </span>
  );
}

// Animated score bar
function AnimatedBar({ percentage, color, delay = 0 }: { percentage: number; color: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="mt-3 h-2.5 w-full rounded-full bg-surface-light/50 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
        transition={{ duration: 1.2, delay: delay + 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </div>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function ResultsClient({
  kandidaatId,
  firstName,
  initialScores,
  articles,
}: Props) {
  const scores = useRealtimeApac(kandidaatId, initialScores);
  const [splashDone, setSplashDone] = useState(false);
  const [splashStage, setSplashStage] = useState(0);

  const combined = scores ? calculateCombinedScore(scores) : 0;

  // Check if this is the first visit (splash only once per session)
  useEffect(() => {
    const key = "radical-results-seen";
    if (sessionStorage.getItem(key)) {
      setSplashDone(true);
      return;
    }
    // Stage timing
    const t1 = setTimeout(() => setSplashStage(1), 400);   // "Je resultaten zijn klaar"
    const t2 = setTimeout(() => setSplashStage(2), 1600);  // Show score
    const t3 = setTimeout(() => setSplashStage(3), 3200);  // Fade out
    const t4 = setTimeout(() => {
      setSplashDone(true);
      sessionStorage.setItem(key, "1");
    }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  if (!scores) return null;

  // ---- SPLASH SCREEN ----
  if (!splashDone) {
    return (
      <motion.div
        className="flex min-h-[70vh] flex-col items-center justify-center text-center"
        animate={splashStage >= 3 ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/10 blur-[100px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral/8 blur-[80px]" />

        {/* Stage 0: Pulsing dot */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="h-4 w-4 rounded-full bg-smaragd animate-pulse" />
          <div className="absolute inset-0 h-4 w-4 rounded-full bg-smaragd/40 animate-ping" />
        </motion.div>

        {/* Stage 1: Text */}
        <AnimatePresence>
          {splashStage >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-8"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-smaragd">
                {firstName}, je resultaten zijn klaar
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage 2: Big score reveal */}
        <AnimatePresence>
          {splashStage >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6"
            >
              <span className="gradient-text-warm font-heading text-7xl font-bold sm:text-8xl">
                {scoreToPercentage(combined)}%
              </span>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-3 text-muted"
              >
                Je gecombineerde APAC-score
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ---- MAIN CONTENT ----
  return (
    <div className="space-y-12">
      {/* ---- HERO HEADER ---- */}
      <div className="text-center">
        <motion.p
          custom={0.1}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-smaragd"
        >
          Jouw APAC Profiel
        </motion.p>
        <motion.h1
          custom={0.25}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-3 font-heading text-4xl font-bold text-heading sm:text-5xl"
        >
          {firstName}, <span className="gradient-text-warm">dit ben jij</span>
        </motion.h1>
        <motion.p
          custom={0.4}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-3 max-w-lg text-muted"
        >
          Je unieke combinatie van menselijke kwaliteiten op basis van de APAC-test.
        </motion.p>
      </div>

      {/* ---- COMBINED SCORE ---- */}
      <motion.div
        custom={0.55}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex justify-center"
      >
        <div className="glass rounded-2xl px-10 py-6 text-center" style={{ boxShadow: "0 0 40px rgba(46,213,115,0.12), 0 0 80px rgba(230,115,79,0.08)" }}>
          <p className="text-sm font-medium text-muted">Gecombineerde score</p>
          <div className="mt-1 gradient-text-warm">
            <AnimatedPercentage value={scoreToPercentage(combined)} color="inherit" size="text-5xl" />
          </div>
        </div>
      </motion.div>

      {/* ---- RADAR CHART ---- */}
      <motion.div
        custom={0.7}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="flex justify-center"
      >
        <div className="relative">
          {/* Glow behind chart */}
          <div className="absolute inset-0 rounded-full bg-smaragd/8 blur-[60px]" />
          <div className="relative">
            <RadarChart scores={scores} size={400} animated />
          </div>
        </div>
      </motion.div>

      {/* ---- 4 DIMENSION SCORES GRID ---- */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {APAC_DIMENSIONS.map((dim, i) => {
          const color = DIMENSION_COLORS[dim];
          const pct = scoreToPercentage(scores[dim]);
          return (
            <motion.div
              key={dim}
              custom={0.9 + i * 0.12}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color }}>{DIMENSION_LABELS[dim]}</span>
                <AnimatedPercentage value={pct} color={color} size="text-2xl" />
              </div>
              <AnimatedBar percentage={pct} color={color} delay={i * 0.12} />
            </motion.div>
          );
        })}
      </div>

      {/* ---- DIMENSION DEEP DIVES ---- */}
      <div className="space-y-5">
        {APAC_DIMENSIONS.map((dim, i) => {
          const color = DIMENSION_COLORS[dim];
          const pct = scoreToPercentage(scores[dim]);
          const insight = getInsight(dim, scores[dim]);

          return (
            <DimensionCard
              key={dim}
              index={i}
              dim={dim}
              color={color}
              pct={pct}
              title={DIMENSION_INSIGHTS[dim].title}
              insight={insight}
            />
          );
        })}
      </div>

      {/* ---- ARTICLES ---- */}
      {articles.length > 0 && (
        <ArticlesSection articles={articles} />
      )}
    </div>
  );
}

function DimensionCard({
  index,
  dim,
  color,
  pct,
  title,
  insight,
}: {
  index: number;
  dim: ApacDimension;
  color: string;
  pct: number;
  title: string;
  insight: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      className="glass group relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all duration-500 hover:-translate-y-0.5"
    >
      {/* Color accent top */}
      <div
        className="absolute inset-x-0 top-0 h-1 transition-all duration-500 group-hover:h-1.5"
        style={{ background: color }}
      />

      <h2 className="font-heading text-lg font-bold text-heading sm:text-xl">
        {title}
      </h2>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${color}15` }}
        >
          <span className="font-heading text-xl font-bold" style={{ color }}>{pct}%</span>
        </div>
        <div className="flex-1">
          <p className="font-heading text-sm font-bold" style={{ color }}>{DIMENSION_LABELS[dim]}</p>
          <AnimatedBar percentage={pct} color={color} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{insight}</p>
    </motion.div>
  );
}

function ArticlesSection({ articles }: { articles: Article[] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <h2 className="font-heading text-2xl font-bold text-heading">
        Aanbevolen <span className="gradient-text">voor jou</span>
      </h2>
      <p className="mt-1 text-muted">Artikelen op basis van je sterkste dimensies.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {articles.map((article, i) => (
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
            className="glass group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
          >
            <h3 className="font-heading font-bold text-heading">{article.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-muted">{article.content}</p>
            {article.related_variables && (
              <div className="mt-3 flex gap-2">
                {(article.related_variables as string[]).map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-smaragd/10 px-2.5 py-0.5 text-[11px] font-medium text-smaragd"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
