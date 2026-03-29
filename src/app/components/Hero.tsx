"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const heroVariants = {
  hidden: {
    opacity: 0,
    x: -28,
    skewX: -6,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    x: 0,
    skewX: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    x: 24,
    skewX: 4,
    scale: 0.98,
    transition: {
      duration: 0.32,
      ease: [0.17, 0.84, 0.44, 1],
    },
  },
} as const;

const titleVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.19, 1, 0.22, 1],
    },
  },
  exit: { opacity: 0, y: -12 },
} as const;

const subtitleVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: [0.33, 1, 0.68, 1],
      delay: 0.08,
    },
  },
  exit: { opacity: 0, y: 8 },
} as const;

const accentVariants = {
  hidden: { scaleX: 0, opacity: 0.4 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.18,
    },
  },
  exit: { scaleX: 0, opacity: 0 },
} as const;

interface HeroProps {
  className?: string;
  title: string;
  subtitle: string;
  loading?: boolean;
}

export function Hero({ className, title, subtitle, loading = false }: HeroProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="hero-skeleton"
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-6 w-60 rounded-full bg-white/10 animate-pulse" />
            <div className="h-4 w-72 rounded-full bg-white/5 animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key={title + subtitle}
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            data-hero-anchor
            className="origin-left"
          >
            <motion.div
              data-hero-heading
              className="relative inline-flex flex-col"
              variants={titleVariants}
            >
              {/* Updated to Warm Orange/White (#FFEFD5 is PapayaWhip/Light Orange) */}
              <span className="relative z-[2] font-display text-[32px] leading-[1.1] tracking-tight text-[#FFE4C4] sm:text-[40px] font-semibold drop-shadow-xl">
                {title}
              </span>
              <motion.span
                className="pointer-events-none absolute inset-x-0 -bottom-1 h-2 origin-left rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-transparent opacity-60 blur-sm"
                style={{ zIndex: 1 }}
                variants={accentVariants}
              />
            </motion.div>
            <motion.p
              className="mt-3 max-w-2xl text-sm text-[#D4A68C] sm:text-base font-body leading-relaxed"
              variants={subtitleVariants}
            >
              {subtitle}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Hero;
