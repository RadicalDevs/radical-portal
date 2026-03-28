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

const DIMENSIONS = [
  { key: "adaptability" as const, label: "Adaptability", color: "#2ed573" },
  { key: "personality"  as const, label: "Personality",  color: "#E6734F" },
  { key: "awareness"    as const, label: "Awareness",    color: "#3B82F6" },
  { key: "connection"   as const, label: "Connection",   color: "#8B5CF6" },
];

function SplashCounter({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 2000, 1);
      // Dramatic ease: slow start, fast middle, slow end
      const eased = p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span className="gradient-text-warm font-heading text-8xl font-bold sm:text-9xl counter-animate">
      {value}%
    </span>
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

  // Always show splash for vpz1997, otherwise once per session
  const ALWAYS_SPLASH_IDS = ["60731f07-8152-4b46-b834-3f6f15c83874", "c0f060b1-cbf2-4353-b39c-db17f019d00b"];
  const alwaysSplash = initialScores && ALWAYS_SPLASH_IDS.includes(kandidaatId);

  useEffect(() => {
    const key = "radical-results-seen";
    if (!alwaysSplash && sessionStorage.getItem(key)) {
      setSplashDone(true);
      return;
    }
    const stages: [number, number][] = [
      [800, 1],      // Glow + line starts
      [2800, 2],     // "We hebben je geanalyseerd"
      [5000, 3],     // Dimensions appear one by one
      [7500, 4],     // Everything clears, "Jouw score" text
      [9000, 5],     // Big number counts up
      [12500, 6],    // Dimension breakdown bars
      [16000, 7],    // Quote / message
      [18500, 8],    // Fade out begins
      [20000, 9],    // Done
    ];
    const timers = stages.map(([ms, stage]) =>
      setTimeout(() => {
        setSplashStage(stage);
        if (stage === 9) {
          setSplashDone(true);
          if (!alwaysSplash) sessionStorage.setItem(key, "1");
        }
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [alwaysSplash]);

  if (!scores) return null;

  // ---- CINEMATIC SPLASH (20s) ----
  // Each scene is fully isolated — only ONE scene renders at a time. No overlap.
  const scene =
    splashStage < 2 ? 0 :   // empty, glows building
    splashStage < 4 ? 1 :   // intro text + dimensions
    splashStage < 5 ? 2 :   // "dit is jouw score" title
    splashStage < 6 ? 3 :   // big number counting
    splashStage < 7 ? 4 :   // dimension breakdown bars
    splashStage < 8 ? 5 :   // quote
    6;                       // fade out

  if (!splashDone) {
    const pct = scoreToPercentage(combined);
    return (
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--bg-page)" }}
        animate={splashStage >= 8 ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      >
        {/* ── Animated background ── */}
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/6 blur-[140px]"
          initial={{ width: 0, height: 0 }}
          animate={{ width: 800, height: 800 }}
          transition={{ duration: 6, ease: "easeOut" }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral/5 blur-[120px]"
          initial={{ width: 0, height: 0 }}
          animate={{ width: 500, height: 500 }}
          transition={{ duration: 5, delay: 1, ease: "easeOut" }}
        />
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6]/4 blur-[100px]"
          initial={{ width: 0, height: 0 }}
          animate={{ width: 350, height: 350 }}
          transition={{ duration: 4, delay: 2, ease: "easeOut" }}
        />

        {/* ── Ambient lines ── */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-smaragd/15 to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "85%", opacity: 1 }}
          transition={{ duration: 3, ease: "easeOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-coral/10 to-transparent"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 300, opacity: splashStage < 4 ? 1 : 0 }}
          transition={{ duration: splashStage < 4 ? 2.5 : 1.5, ease: "easeInOut" }}
          style={{ y: -150 }}
        />

        {/* Only the active scene renders — no overlap */}

        {/* Scene 1: Intro + dimensions */}
        {scene === 1 && (
          <motion.div key="s1" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }}>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted/60">APAC Assessment voltooid</p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.3 }} className="mt-5 font-heading text-xl font-bold text-heading sm:text-2xl">We hebben je geanalyseerd op vier dimensies</motion.p>
            {splashStage >= 3 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {DIMENSIONS.map((dim, i) => (
                  <motion.div key={dim.key} initial={{ opacity: 0, scale: 0.3, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.3, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-2.5">
                    <motion.div className="h-3 w-3 rounded-full" style={{ backgroundColor: dim.color }} animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }} />
                    <span className="font-heading text-lg font-bold sm:text-xl" style={{ color: dim.color }}>{dim.label}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Scene 2: Score title */}
        {scene === 2 && (
          <motion.div key="s2" className="relative z-10 px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.0 }}>
            <motion.p initial={{ letterSpacing: "0.6em", opacity: 0 }} animate={{ letterSpacing: "0.2em", opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} className="text-sm font-semibold uppercase text-smaragd">{firstName}, dit is jouw score</motion.p>
          </motion.div>
        )}

        {/* Scene 3: Big number reveal */}
        {scene === 3 && (
          <motion.div key="s3" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-smaragd">{firstName}, dit is jouw score</p>
            <motion.div className="mt-8" initial={{ scale: 0.1, opacity: 0, filter: "blur(30px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}>
              <SplashCounter target={pct} />
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0, duration: 1.0 }} className="mt-4 text-sm text-muted">gecombineerde APAC-score</motion.p>
          </motion.div>
        )}

        {/* Scene 4: Dimension bars */}
        {scene === 4 && (
          <motion.div key="s4" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }}>
            <p className="mb-8 text-sm font-semibold uppercase tracking-[0.2em] text-smaragd">Je dimensies in detail</p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6">
              {DIMENSIONS.map((dim, i) => {
                const dimPct = scoreToPercentage(scores[dim.key]);
                return (
                  <motion.div key={dim.key} initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: i * 0.2 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dim.color }} />
                        <span className="text-sm font-semibold" style={{ color: dim.color }}>{dim.label}</span>
                      </div>
                      <span className="font-heading text-lg font-bold text-heading">{dimPct}%</span>
                    </div>
                    <div className="mt-2.5 h-2 w-full rounded-full bg-surface-light/15 overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: dim.color }} initial={{ width: 0 }} animate={{ width: `${dimPct}%` }} transition={{ duration: 1.5, delay: 0.3 + i * 0.2 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Scene 5: Quote */}
        {scene === 5 && (
          <motion.div key="s5" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
            <motion.div className="h-px bg-gradient-to-r from-transparent via-smaragd/30 to-transparent" initial={{ width: 0 }} animate={{ width: 80 }} transition={{ duration: 1.0 }} />
            <p className="mt-8 font-heading text-2xl italic text-heading/80 leading-relaxed sm:text-3xl">&ldquo;AI is everywhere.<br />The human factor is rare.&rdquo;</p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1.0 }} className="mt-5 text-sm text-muted">Je bent meer dan een CV. Bekijk nu wat jou uniek maakt.</motion.p>
          </motion.div>
        )}

        {/* Scene 6: Loading */}
        {scene === 6 && (
          <motion.div key="s6" className="relative z-10 flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5 }}>
            <div className="h-1.5 w-1.5 rounded-full bg-smaragd animate-pulse" />
            <p className="text-xs text-muted">Je profiel wordt geladen</p>
          </motion.div>
        )}
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
            <RadarChart scores={scores} maxSize={400} animated />
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
