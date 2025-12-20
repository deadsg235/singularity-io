"use client";

import type { GuardrailResultType } from "@/app/types";

interface GuardrailChipProps {
  guardrailResult: GuardrailResultType;
}

const STATUS_LABEL: Record<GuardrailResultType["status"], string> = {
  IN_PROGRESS: "Guardrail running…",
  DONE: "Guardrail applied",
};

export function GuardrailChip({ guardrailResult }: GuardrailChipProps) {
  const { status, category, testText, rationale } = guardrailResult;
  return (
    <div className="rounded-md border border-[#F6A878]/40 bg-[#2A0D08]/80 px-3 py-2 text-xs text-[#FFE5D2] shadow-inner">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold uppercase tracking-[0.12em] text-[#FFC79E]">
          {STATUS_LABEL[status] ?? "Guardrail"}
        </span>
        {category ? (
          <span className="rounded-full bg-[#F6A878]/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#FCD2A8]">
            {category.replace(/_/g, " ")}
          </span>
        ) : null}
      </div>
      {testText ? (
        <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-[#FFEEDC]/80">
          <span className="font-semibold text-[#FFD5AF]">Input:</span> {testText}
        </p>
      ) : null}
      {rationale ? (
        <p className="mt-2 line-clamp-4 text-[11px] leading-relaxed text-[#FFEEDC]/70">
          <span className="font-semibold text-[#FFD5AF]">Rationale:</span> {rationale}
        </p>
      ) : null}
    </div>
  );
}

export default GuardrailChip;
