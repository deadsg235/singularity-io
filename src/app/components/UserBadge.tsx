export type UserBadgeVariant = "pro" | "dev" | "admin" | "user" | "demo";
type UserBadgeSize = "xs" | "sm" | "md";

const VARIANT_STYLES: Record<UserBadgeVariant, { label: string; title: string; text: string; dot: string }> = {
  pro: {
    label: "Pro",
    title: "Pro member access",
    text: "text-iris",
    dot: "bg-iris/80",
  },
  dev: {
    label: "Dev",
    title: "Super admin access",
    text: "text-[#3B1A05]",
    dot: "bg-[#8C3A0E]",
  },
  admin: {
    label: "Admin",
    title: "Admin access",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
  user: {
    label: "User",
    title: "Signed-in user",
    text: "text-neutral-200",
    dot: "bg-neutral-300",
  },
  demo: {
    label: "Demo",
    title: "Shared demo persona",
    text: "text-[#FEFBF4]",
    dot: "bg-[#FEFBF4]/40",
  },
};

const SIZE_STYLES: Record<UserBadgeSize, { text: string; gap: string; dot: string }> = {
  xs: {
    text: "text-[9px] tracking-[0.14em]",
    gap: "gap-1.5",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    text: "text-[10px] tracking-[0.12em]",
    gap: "gap-1.5",
    dot: "h-1.5 w-1.5",
  },
  md: {
    text: "text-[11px] tracking-[0.1em]",
    gap: "gap-2",
    dot: "h-2 w-2",
  },
};

interface UserBadgeProps {
  variant: UserBadgeVariant;
  size?: UserBadgeSize;
  className?: string;
}

export function UserBadge({ variant, size = "sm", className }: UserBadgeProps) {
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  const classes = [
    "inline-flex items-center font-display font-semibold",
    sizeStyles.text,
    sizeStyles.gap,
    variantStyles.text,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dotClasses = [sizeStyles.dot, "rounded-full", variantStyles.dot].join(" ");

  return (
    <span className={classes} title={variantStyles.title}>
      <span className={dotClasses} aria-hidden />
      {variantStyles.label}
    </span>
  );
}

export default UserBadge;

export function resolveUserBadgeTextClass(variant?: UserBadgeVariant | null) {
  if (!variant) return "text-[#FEFBF4]";
  return VARIANT_STYLES[variant]?.text ?? "text-[#FEFBF4]";
}
