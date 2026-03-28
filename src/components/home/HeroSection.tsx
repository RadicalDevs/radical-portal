"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ParticleNetwork from "./ParticleNetwork";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd" />
      <ParticleNetwork />

      {/* Glow blobs */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/8 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-coral/6 blur-[100px] animate-float-slow" />

      {/* Content */}
      <div className="relative z-10 max-w-4xl">
        <motion.div
          custom={0.1}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-smaragd/25 bg-smaragd/8 px-5 py-2 text-sm font-medium text-smaragd backdrop-blur-sm"
        >
          <span className="h-2 w-2 rounded-full bg-smaragd animate-pulse" />
          Ontdek wat jou uniek maakt
        </motion.div>

        <motion.h1
          custom={0.3}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="font-heading text-5xl font-bold leading-[1.1] text-heading sm:text-6xl lg:text-7xl"
        >
          AI is everywhere.
        </motion.h1>

        <motion.h1
          custom={0.5}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-2 font-heading text-5xl font-bold leading-[1.1] sm:text-6xl lg:text-7xl"
        >
          <span className="gradient-text-warm">The human factor is rare.</span>
        </motion.h1>

        <motion.p
          custom={0.7}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl"
        >
          Radical verbindt AI-professionals die het verschil maken door wie ze zijn.
          Geselecteerd op <span className="text-heading font-medium">menselijke kwaliteiten</span>,
          niet alleen technische skills.
        </motion.p>

        <motion.div
          custom={0.9}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href="/apac"
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:bg-smaragd-dark hover:shadow-[0_0_40px_rgba(46,213,115,0.4)] hover:-translate-y-1 animate-shimmer"
          >
            Doe de APAC-test
            <svg
              className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <a
            href="#hoe-het-werkt"
            className="inline-flex items-center gap-2 rounded-2xl border border-surface-border/60 bg-surface/60 px-8 py-4 text-lg font-semibold text-heading backdrop-blur-md transition-all duration-300 hover:border-smaragd/30 hover:bg-smaragd/5"
          >
            Ontdek hoe het werkt
            <svg
              className="h-4 w-4 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted/60">Scroll</span>
          <div className="h-8 w-5 rounded-full border border-muted/30 p-1">
            <motion.div
              className="h-2 w-full rounded-full bg-smaragd/60"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
