import Image from "next/image";

interface SolanaAmountProps {
  value: unknown;
  fromLamports?: boolean;
  className?: string;
}

export function convertToSol(value: unknown, fromLamports: boolean): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (fromLamports) {
    try {
      if (typeof value === "bigint") return Number(value) / 1_000_000_000;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric / 1_000_000_000;
      const asBigInt = BigInt(value as any);
      return Number(asBigInt) / 1_000_000_000;
    } catch {
      return undefined;
    }
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric;
}

export function formatSolNumeric(numeric: number | undefined): string | undefined {
  if (numeric === undefined || Number.isNaN(numeric)) return undefined;
  const abs = Math.abs(numeric);
  const formatter = abs >= 1
    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    : abs >= 0.01
      ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 })
      : new Intl.NumberFormat("en-US", { minimumSignificantDigits: 2, maximumSignificantDigits: 6 });
  return formatter.format(numeric);
}

export function formatSolValue(value: unknown, { fromLamports = false }: { fromLamports?: boolean } = {}) {
  const numeric = convertToSol(value, fromLamports);
  return formatSolNumeric(numeric);
}

const ICON_PATH = "/assets/icons/solana.svg";

export function SolanaAmount({ value, fromLamports = false, className }: SolanaAmountProps) {
  const formatted = formatSolValue(value, { fromLamports });
  if (formatted === undefined) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-neutral-100 ${className ?? ""}`}>
      <Image src={ICON_PATH} alt="Solana" width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatted}</span>
    </span>
  );
}

export default SolanaAmount;
