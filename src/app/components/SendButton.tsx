"use client";

import React from "react";
import Image from "next/image";

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SendButton({ onClick, disabled = false }: SendButtonProps) {
  return (
    <button
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F26B1A] via-[#FF8A3C] to-[#FF5E0E] text-[#1D0B02] shadow-[0_12px_30px_rgba(15,8,1,0.45)] transition-transform duration-150 ease-out hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FBD0A4] focus-visible:ring-offset-[rgba(14,7,2,0.85)] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Send message"
    >
      <Image src="arrow.svg" alt="Send" width={14} height={14} />
    </button>
  );
}

export default SendButton;
