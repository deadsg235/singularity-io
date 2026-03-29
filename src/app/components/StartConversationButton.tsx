"use client";

import React from "react";
import { motion } from "framer-motion";
import { DexterAnimatedCrest } from "@/app/components/DexterAnimatedCrest";

type StartConversationButtonProps = {
  onClick?: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  onCaptureOrigin?: (rect: DOMRect | null) => void;
};

const BREATH_DURATION = 5.2;

export function StartConversationButton({ onClick, isLoading = false, disabled, onCaptureOrigin }: StartConversationButtonProps) {
  const isDisabled = disabled ?? isLoading;
  const [isInteracting, setIsInteracting] = React.useState(false);
  const isHovering = isInteracting && !isLoading;
  const isExcited = isHovering || isLoading;
  const crestRef = React.useRef<HTMLDivElement | null>(null);

  const handleClick = async () => {
    if (crestRef.current) {
      onCaptureOrigin?.(crestRef.current.getBoundingClientRect());
    } else {
      onCaptureOrigin?.(null);
    }

    await onClick?.();
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className="group relative mx-auto flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/60 focus:ring-offset-2 focus:ring-offset-[#2b1204] disabled:cursor-not-allowed disabled:opacity-70"
      initial={{ scale: 0.98 }}
      animate={{ scale: isLoading ? [0.98, 1.05, 0.99] : [0.99, 1.04, 0.99] }}
      transition={{ duration: BREATH_DURATION * 0.8, repeat: Infinity, ease: [0.6, 0, 0.4, 1] }}
      whileHover={{ scale: 1.06 }}
      whileFocus={{ scale: 1.06 }}
    >
      <motion.div
        className="relative flex items-center justify-center"
        layoutId="dexter-crest"
        ref={crestRef}
        animate={{ rotate: isHovering ? [0, -2, 2, 0] : 0, scale: isExcited ? [0.99, 1.03, 1] : 1 }}
        transition={{ duration: isExcited ? 1.05 : BREATH_DURATION, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onFocus={() => setIsInteracting(true)}
        onBlur={() => setIsInteracting(false)}
      >
        <DexterAnimatedCrest size={96} />
      </motion.div>
      <span className="sr-only">Start conversation</span>
    </motion.button>
  );
}

export default StartConversationButton;
