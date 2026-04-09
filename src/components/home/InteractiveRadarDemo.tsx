"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";
import type { ApacDimension } from "@/lib/apac/types";
import AnimatedSection from "./AnimatedSection";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translations } from "@/lib/i18n/translations";

// Demo-only illustrative scores (0-10 scale for visual simplicity).
const BASE_SCORES = {
  adaptability: 8.5,
  personality: 7.8,
  awareness: 9.2,
  connection: 8.1,
};

const DIMENSION_ICONS: Record<ApacDimension, React.ReactElement> = {
  adaptability: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  personality: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  awareness: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  connection: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
};

const DIMENSIONS: ApacDimension[] = ["adaptability", "personality", "awareness", "connection"];

export default function InteractiveRadarDemo() {
  const [active, setActive] = useState<ApacDimension | null>(null);
  const { lang, t } = useLanguage();

  const displayScores = useMemo(() => {
    if (!active) return BASE_SCORES;
    const result = { ...BASE_SCORES };
    for (const dim of DIMENSIONS) {
      if (dim === active) {
        result[dim] = Math.min(10, BASE_SCORES[dim] + 1.2);
      } else {
        result[dim] = Math.max(3, BASE_SCORES[dim] - 0.8);
      }
    }
    return result;
  }, [active]);

  const dimensionInfo = useMemo(() => ({
    adaptability: {
      tagline: translations[lang].dim_adaptability_tagline,
      description: translations[lang].dim_adaptability_desc,
    },
    personality: {
      tagline: translations[lang].dim_personality_tagline,
      description: translations[lang].dim_personality_desc,
    },
    awareness: {
      tagline: translations[lang].dim_awareness_tagline,
      description: translations[lang].dim_awareness_desc,
    },
    connection: {
      tagline: translations[lang].dim_connection_tagline,
      description: translations[lang].dim_connection_desc,
    },
  }), [lang]);

  const chartData = DIMENSIONS.map((dim) => ({
    dimension: DIMENSION_LABELS[dim],
    score: displayScores[dim],
    fullMark: 10,
  }));

  const activeColor = active ? DIMENSION_COLORS[active] : "#2ed573";
  const activeInfo = active ? dimensionInfo[active] : null;

  return (
    <section className="px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimatedSection className="text-center">
          <h2 className="font-heading text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
            {t("radar_title_pre")} <span className="gradient-text">APAC</span>{" "}
            {t("radar_title_post")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            {t("radar_subtitle")}
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="mt-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
            {/* Radar chart */}
            <div className="relative flex justify-center">
              <div
                className="absolute inset-0 rounded-full opacity-20 blur-[60px]"
                style={{
                  background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)`,
                  transition: "background 0.6s ease",
                }}
              />
              <div className="relative h-[320px] w-[320px] sm:h-[380px] sm:w-[380px] [&_svg]:overflow-visible [&_svg]:outline-none [&_.recharts-wrapper]:outline-none [&_*:focus]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="55%" data={chartData}>
                    <PolarGrid
                      stroke="var(--bg-surface-border)"
                      strokeDasharray="3 3"
                      gridType="polygon"
                    />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}
                    />
                    <Radar
                      name="APAC"
                      dataKey="score"
                      stroke={activeColor}
                      strokeWidth={2.5}
                      fill={activeColor}
                      fillOpacity={0.2}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dimension info */}
            <div>
              {/* Dimension buttons */}
              <div className="grid grid-cols-2 gap-3">
                {DIMENSIONS.map((dim) => {
                  const info = dimensionInfo[dim];
                  const isActive = active === dim;
                  const color = DIMENSION_COLORS[dim];
                  return (
                    <button
                      key={dim}
                      onMouseEnter={() => setActive(dim)}
                      onMouseLeave={() => setActive(null)}
                      onClick={() => setActive(isActive ? null : dim)}
                      className={`glass group rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                        isActive ? "ring-1" : ""
                      }`}
                      style={{
                        borderColor: isActive ? color : undefined,
                        ["--tw-ring-color" as string]: isActive ? color : undefined,
                        boxShadow: isActive ? `0 0 24px ${color}30` : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
                          style={{ background: `${color}18`, color }}
                        >
                          {DIMENSION_ICONS[dim]}
                        </div>
                        <div>
                          <p className="font-heading font-bold text-heading text-sm">
                            {DIMENSION_LABELS[dim]}
                          </p>
                          <p className="text-xs text-muted line-clamp-1">{info.tagline}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Description panel */}
              <div className="mt-6 min-h-[120px]">
                <AnimatePresence mode="wait">
                  {activeInfo ? (
                    <motion.div
                      key={active}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="glass rounded-xl p-5"
                    >
                      <h3
                        className="font-heading text-lg font-bold"
                        style={{ color: activeColor }}
                      >
                        {activeInfo.tagline}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {activeInfo.description}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="glass rounded-xl p-5"
                    >
                      <p className="text-sm text-muted">
                        <span className="text-smaragd font-medium">Hover</span>{" "}
                        {t("radar_hover_hint")}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
