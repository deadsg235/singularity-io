"use client";

import React, { useEffect, useRef } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask Dexter anything",
  disabled = false,
  autoFocus = false,
  className,
}: TextInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className={`flex-1 border-0 bg-transparent px-3 py-1.5 text-base text-neutral-100 outline-none transition-all duration-200 ease-out placeholder:text-neutral-500 focus:text-neutral-50 focus:placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
    />
  );
}

export default TextInput;
