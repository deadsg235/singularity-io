import pino, { type Bindings, type Logger, type LoggerOptions } from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

const options: LoggerOptions = {
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  // Ensure message is always a string and top-level for readability in raw logs
  messageKey: 'msg',
  formatters: {
    level(label) {
      return { level: label };
    },
    // Flatten bindings for cleaner single-line JSON logs
    bindings(bindings) {
      return { ...bindings };
    },
  },
};

// Use pino directly; pino-pretty in dev handles the formatting.
// In prod, this outputs raw JSON which is standard, but if the user wants readable PM2 logs,
// we rely on the LOG_PRETTY env var handled by the PM2 ecosystem config or separate process.
export const logger: Logger = pino(options);

export function createScopedLogger(bindings: Bindings): Logger {
  return logger.child(bindings);
}

export type { Logger };
