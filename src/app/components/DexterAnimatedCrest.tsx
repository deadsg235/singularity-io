"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const BREATH_DURATION = 5.2;

type DexterAnimatedCrestProps = {
  size?: number;
  className?: string;
};

export function DexterAnimatedCrest({ size = 72, className }: DexterAnimatedCrestProps) {
  const containerSize = `${size}px`;
  const innerSize = `${Math.round(size * 0.72)}px`;
  const logoSize = Math.round(size * 0.88);
  const crestFilter = "drop-shadow(0 12px 18px rgba(255, 128, 40, 0.28)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.18))";

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className ?? ""}`.trim()}
      style={{ width: containerSize, height: containerSize }}
      initial={{ scale: 0.98 }}
      animate={{ scale: [0.99, 1.04, 0.99] }}
      transition={{ duration: BREATH_DURATION * 0.8, repeat: Infinity, ease: [0.6, 0, 0.4, 1] }}
    >
      <motion.div
        className="relative flex items-center justify-center"
        style={{ width: innerSize, height: innerSize }}
        animate={{ scale: [0.995, 1.02, 0.995] }}
        transition={{ duration: BREATH_DURATION * 0.85, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
      >
        <motion.div
          className="flex items-center justify-center"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: BREATH_DURATION, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
        >
          <Image
            src="/assets/logos/logo_orange_round.svg"
            alt="Dexter"
            role="presentation"
            width={logoSize}
            height={logoSize}
            style={{ filter: crestFilter }}
            priority
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default DexterAnimatedCrest;
