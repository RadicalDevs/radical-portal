"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

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

const STATS = [
  { value: 500, suffix: "+", label: "AI-professionals geanalyseerd", color: "#2ed573" },
  { value: 250, suffix: "+", label: "Radicals in het netwerk", color: "#E6734F" },
  { value: 4, suffix: "", label: "dimensies, 1 uniek profiel", color: "#8B5CF6" },
  { value: 93, suffix: "%", label: "vindt APAC-inzichten waardevol", color: "#3B82F6" },
];

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-8">
      {/* Background */}
      <div className="absolute inset-0 bg-surface/50" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-smaragd/5 blur-[100px] animate-float" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-coral/5 blur-[80px] animate-float-delay" />

      <div ref={ref} className="relative mx-auto max-w-5xl">
        <AnimatedSection className="text-center">
          <h2 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
            Radical in <span className="gradient-text">cijfers</span>
          </h2>
        </AnimatedSection>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <AnimatedSection key={stat.label} delay={i * 0.12}>
              <div className="text-center">
                <p className="counter-animate font-heading text-4xl font-bold sm:text-5xl" style={{ color: stat.color }}>
                  <CounterValue target={stat.value} started={isInView} />
                  {stat.suffix}
                </p>
                <p className="mt-2 text-sm text-muted">{stat.label}</p>
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
