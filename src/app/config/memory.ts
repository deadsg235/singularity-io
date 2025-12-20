export const MEMORY_LIMITS = {
  adminPanel: {
    recentCount: 50,
  },
} as const;

export type MemoryLimits = typeof MEMORY_LIMITS;
