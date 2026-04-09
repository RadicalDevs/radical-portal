"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import AnimatedSection from "./AnimatedSection";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function useCountUp(target: number, duration = 2000, started = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started) return;

    let start: number | null = null;
    let raf: number;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, started]);

  return value;
}

const STAT_VALUES = [500, 250, 4, 93];
const STAT_SUFFIXES = ["+", "+", "", "%"];
const STAT_COLORS = ["#2ed573", "#E6734F", "#8B5CF6", "#3B82F6"];

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useLanguage();

  const statLabels = [
    t("stats_label1"),
    t("stats_label2"),
    t("stats_label3"),
    t("stats_label4"),
  ];

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-8">
      {/* Background */}
      <div className="absolute inset-0 bg-surface/50" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-smaragd/5 blur-[100px] animate-float" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-coral/5 blur-[80px] animate-float-delay" />

      <div ref={ref} className="relative mx-auto max-w-5xl">
        <AnimatedSection className="text-center">
          <h2 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
            Radical in <span className="gradient-text">{t("stats_title_accent")}</span>
          </h2>
        </AnimatedSection>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STAT_VALUES.map((val, i) => (
            <AnimatedSection key={i} delay={i * 0.12}>
              <div className="text-center">
                <p className="counter-animate font-heading text-4xl font-bold sm:text-5xl" style={{ color: STAT_COLORS[i] }}>
                  <CounterValue target={val} started={isInView} />
                  {STAT_SUFFIXES[i]}
                </p>
                <p className="mt-2 text-sm text-muted">{statLabels[i]}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function CounterValue({ target, started }: { target: number; started: boolean }) {
  const value = useCountUp(target, 1800, started);
  return <>{value}</>;
}
