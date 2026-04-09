"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import RadarChart from "@/components/apac/RadarChart";
import { useRealtimeApac } from "@/hooks/useRealtimeApac";
import { calculateCombinedScore, calculateCombinedMax, scoreToPercentage, DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import type { ApacScores, ApacMaxScores, ApacDimension } from "@/lib/apac/types";
import type { Article } from "../actions";
import { markScoreRevealed } from "../actions";

interface Props {
  kandidaatId: string;
  firstName: string;
  initialScores: ApacScores;
  maxScores: ApacMaxScores;
  articles: Article[];
}

// Animated score counter (points format: "35/50")
function AnimatedScore({ value, max, color, size = "text-5xl" }: { value: number; max: number; color: string; size?: string }) {
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
      {display}<span className="text-[0.5em] font-normal text-muted">/{max}</span>
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

function SplashCounter({ target, max }: { target: number; max: number }) {
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
      {value}<span className="text-5xl sm:text-6xl">/{max}</span>
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
  maxScores,
  articles,
}: Props) {
  const { t } = useLanguage();
  const scores = useRealtimeApac(kandidaatId, initialScores);
  const [splashDone, setSplashDone] = useState(false);
  const [splashStage, setSplashStage] = useState(0);

  const DIMENSION_INSIGHTS: Record<
    ApacDimension,
    { title: string; high: string; mid: string; low: string }
  > = {
    adaptability: {
      title: t("results_adapt_title"),
      high: t("results_adapt_high"),
      mid: t("results_adapt_mid"),
      low: t("results_adapt_low"),
    },
    personality: {
      title: t("results_person_title"),
      high: t("results_person_high"),
      mid: t("results_person_mid"),
      low: t("results_person_low"),
    },
    awareness: {
      title: t("results_aware_title"),
      high: t("results_aware_high"),
      mid: t("results_aware_mid"),
      low: t("results_aware_low"),
    },
    connection: {
      title: t("results_connect_title"),
      high: t("results_connect_high"),
      mid: t("results_connect_mid"),
      low: t("results_connect_low"),
    },
  };

  function getInsight(dim: ApacDimension, score: number, maxScore: number): string {
    const insights = DIMENSION_INSIGHTS[dim];
    const pct = maxScore > 0 ? score / maxScore : 0;
    if (pct >= 0.75) return insights.high;
    if (pct >= 0.50) return insights.mid;
    return insights.low;
  }

  const combined = scores ? calculateCombinedScore(scores) : 0;
  const combinedMax = calculateCombinedMax(maxScores);

  useEffect(() => {
    const key = "radical-results-seen";
    if (sessionStorage.getItem(key)) {
      setSplashDone(true);
      return;
    }
    // NEW ORDER: build tension → dimensions → quote → cliffhanger → BIG SCORE (finale)
    const stages: [number, number][] = [
      [800, 1],      // Glow builds
      [2800, 2],     // "We hebben je geanalyseerd" + dimension names
      [5000, 3],     // Dimension dots animate in
      [7500, 4],     // Individual dimension bars (scores per dimensie)
      [11500, 5],    // Quote (reflectiemoment, ademruimte)
      [15000, 6],    // Cliffhanger: "En nu..." (spanning!)
      [17500, 7],    // BIG NUMBER + CONFETTI (grand finale!)
      [21500, 8],    // Fade out begins
      [23000, 9],    // Done
    ];
    const timers = stages.map(([ms, stage]) =>
      setTimeout(() => {
        setSplashStage(stage);
        if (stage === 9) {
          setSplashDone(true);
          sessionStorage.setItem(key, "1");
          // Mark score as revealed in database so dashboard shows full scores
          markScoreRevealed();
        }
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fire confetti cannon when big score appears (stage 7 = grand finale)
  const confettiFired = useRef(false);
  useEffect(() => {
    if (splashStage === 7 && !confettiFired.current) {
      confettiFired.current = true;

      // Delay slightly so the number has started appearing
      setTimeout(() => {
        // Left cannon
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.1, y: 0.6 },
          colors: ["#2ed573", "#E6734F", "#8B5CF6", "#3B82F6", "#ffffff"],
          angle: 60,
          gravity: 0.7,
          ticks: 250,
          scalar: 1.2,
        });
        // Right cannon
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.9, y: 0.6 },
          colors: ["#2ed573", "#E6734F", "#8B5CF6", "#3B82F6", "#ffffff"],
          angle: 120,
          gravity: 0.7,
          ticks: 250,
          scalar: 1.2,
        });
      }, 500);

      // Center rain
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 140,
          origin: { x: 0.5, y: 0.2 },
          colors: ["#2ed573", "#5ee89a", "#E6734F", "#8B5CF6"],
          gravity: 0.5,
          ticks: 300,
          scalar: 1.0,
          startVelocity: 30,
        });
      }, 1000);

      // Sparkle burst
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 360,
          origin: { x: 0.5, y: 0.45 },
          colors: ["#2ed573", "#ffffff", "#5ee89a"],
          gravity: 0.3,
          ticks: 200,
          scalar: 0.8,
          startVelocity: 18,
        });
      }, 1500);

      // Final subtle rain
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 100,
          origin: { x: 0.5, y: 0.1 },
          colors: ["#2ed573", "#E6734F"],
          gravity: 0.4,
          ticks: 200,
          scalar: 0.6,
          startVelocity: 10,
        });
      }, 2200);
    }
  }, [splashStage]);

  if (!scores) return null;

  // ---- CINEMATIC SPLASH ----
  // NEW flow: intro → dimensions → dimension scores → quote → cliffhanger → BIG SCORE
  const scene =
    splashStage < 2 ? 0 :   // empty, glows building
    splashStage < 4 ? 1 :   // intro text + dimension names
    splashStage < 5 ? 2 :   // dimension breakdown bars
    splashStage < 6 ? 3 :   // quote (breathing room)
    splashStage < 7 ? 4 :   // cliffhanger: "En nu..."
    splashStage < 8 ? 5 :   // BIG NUMBER + CONFETTI
    6;                       // fade out

  if (!splashDone) {
    const pct = scoreToPercentage(combined, combinedMax);
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

        {/* ═══ Scene 1: Intro + dimension names ═══ */}
        {scene === 1 && (
          <motion.div key="s1" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }}>
            <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted/60">{t("results_splash_completed")}</p>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0, delay: 0.3 }} className="mt-5 font-heading text-xl font-bold text-heading sm:text-2xl">{t("results_splash_analyzed")}</motion.p>
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

        {/* ═══ Scene 2: Dimension bars (individual scores — NO combined score yet) ═══ */}
        {scene === 2 && (
          <motion.div key="s2" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.0 }}>
            <p className="mb-8 text-sm font-semibold uppercase tracking-[0.2em] text-smaragd">{t("results_splash_dimensions")}</p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-6">
              {DIMENSIONS.map((dim, i) => {
                const dimPct = scoreToPercentage(scores[dim.key], maxScores[dim.key]);
                const dimScore = Math.round(scores[dim.key]);
                const dimMax = maxScores[dim.key];
                return (
                  <motion.div key={dim.key} initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: i * 0.2 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dim.color }} />
                        <span className="text-sm font-semibold" style={{ color: dim.color }}>{dim.label}</span>
                      </div>
                      <span className="font-heading text-lg font-bold text-heading">{dimScore}<span className="text-sm font-normal text-muted">/{dimMax}</span></span>
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

        {/* ═══ Scene 3: Quote (reflectie, ademruimte) ═══ */}
        {scene === 3 && (
          <motion.div key="s3" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
            <motion.div className="h-px bg-gradient-to-r from-transparent via-smaragd/30 to-transparent" initial={{ width: 0 }} animate={{ width: 80 }} transition={{ duration: 1.0 }} />
            <p className="mt-8 font-heading text-2xl italic text-heading/80 leading-relaxed sm:text-3xl">&ldquo;AI is everywhere.<br />The human factor is rare.&rdquo;</p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1.0 }} className="mt-5 text-sm text-muted">{t("results_splash_more_than_cv")}</motion.p>
          </motion.div>
        )}

        {/* ═══ Scene 4: CLIFFHANGER — "En nu..." ═══ */}
        {scene === 4 && (
          <motion.div key="s4" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            <motion.p
              initial={{ letterSpacing: "0.8em", opacity: 0, y: 10 }}
              animate={{ letterSpacing: "0.25em", opacity: 1, y: 0 }}
              transition={{ duration: 2.0, ease: "easeOut" }}
              className="text-xs font-medium uppercase tracking-widest text-muted/50"
            >
              {t("results_splash_and_now")}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.0 }}
              className="mt-6 font-heading text-2xl font-bold text-heading sm:text-3xl"
            >
              {firstName}, {t("results_splash_combined")}
            </motion.p>
            {/* Pulsing dots for suspense */}
            <motion.div
              className="mt-8 flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-smaragd"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.0, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Scene 5: BIG NUMBER REVEAL + CONFETTI (GRAND FINALE) ═══ */}
        {scene === 5 && (
          <motion.div key="s5" className="relative z-10 flex flex-col items-center px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-smaragd"
            >
              {t("results_splash_combined_title")}
            </motion.p>
            <motion.div
              className="mt-8"
              initial={{ scale: 0.1, opacity: 0, filter: "blur(40px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <SplashCounter target={combined} max={combinedMax} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 1.0 }}
              className="mt-6 text-muted max-w-sm"
            >
              {pct >= 80
                ? t("results_score_exceptional")
                : pct >= 65
                ? t("results_score_strong")
                : pct >= 50
                ? t("results_score_promising")
                : t("results_score_starting")}
            </motion.p>
          </motion.div>
        )}

        {/* ═══ Scene 6: Fade out / loading ═══ */}
        {scene === 6 && (
          <motion.div key="s6" className="relative z-10 flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5 }}>
            <div className="h-1.5 w-1.5 rounded-full bg-smaragd animate-pulse" />
            <p className="text-xs text-muted">{t("results_splash_loading")}</p>
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
          {t("results_your_profile")}
        </motion.p>
        <motion.h1
          custom={0.25}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-3 font-heading text-4xl font-bold text-heading sm:text-5xl"
        >
          {firstName}, <span className="gradient-text-warm">{t("results_this_is_you")}</span>
        </motion.h1>
        <motion.p
          custom={0.4}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-3 max-w-lg text-muted"
        >
          {t("results_subtitle")}
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
          <p className="text-sm font-medium text-muted">{t("results_combined_score")}</p>
          <div className="mt-1 gradient-text-warm">
            <AnimatedScore value={combined} max={combinedMax} color="inherit" size="text-5xl" />
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
            <RadarChart scores={scores} maxScores={maxScores} maxSize={400} animated />
          </div>
        </div>
      </motion.div>

      {/* ---- 4 DIMENSION SCORES GRID ---- */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {APAC_DIMENSIONS.map((dim, i) => {
          const color = DIMENSION_COLORS[dim];
          const pct = scoreToPercentage(scores[dim], maxScores[dim]);
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
                <AnimatedScore value={Math.round(scores[dim])} max={maxScores[dim]} color={color} size="text-2xl" />
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
          const pct = scoreToPercentage(scores[dim], maxScores[dim]);
          const insight = getInsight(dim, scores[dim], maxScores[dim]);

          return (
            <DimensionCard
              key={dim}
              index={i}
              dim={dim}
              color={color}
              pct={pct}
              score={Math.round(scores[dim])}
              maxScore={maxScores[dim]}
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
  score,
  maxScore,
  title,
  insight,
}: {
  index: number;
  dim: ApacDimension;
  color: string;
  pct: number;
  score: number;
  maxScore: number;
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
          <span className="font-heading text-lg font-bold" style={{ color }}>{score}<span className="text-xs font-normal text-muted">/{maxScore}</span></span>
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
  const { t } = useLanguage();
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
        {t("results_recommended")} <span className="gradient-text">{t("results_recommended_for_you")}</span>
      </h2>
      <p className="mt-1 text-muted">{t("results_articles_desc")}</p>

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
