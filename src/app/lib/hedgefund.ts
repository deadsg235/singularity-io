"use client";

import { CONFIG, getDexterApiRoute } from "@/app/config/env";

export class HedgefundApiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, status: number, details?: unknown, message?: string) {
    super(message || code || "HedgefundApiError");
    this.name = "HedgefundApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type HedgefundStatus = {
  dryRun: boolean;
  riskBudgetSol: number;
  watchlistCount: number;
  pumpfunTargets: number;
  autoStart: boolean;
};

export type HedgefundSignalConfig = {
  minLiquidityUsd: number;
  minVolumeUsd: number;
  maxPriceImpact: number;
  targetSol: number;
};

export type HedgefundPumpfunConfig = {
  targetSol: number;
  tradeUrl: string;
  priorityLamports: number;
};

export type HedgefundTradingConfig = {
  slippageBps: number;
  maxTradeSol: number;
  riskBudgetSol: number;
  dryRun: boolean;
  pollIntervalMs: number;
  confirmTimeoutMs: number;
  autoStart: boolean;
};

export type HedgefundConfig = {
  watchlist: string[];
  pumpfunTargets: string[];
  signals: HedgefundSignalConfig;
  pumpfun: HedgefundPumpfunConfig;
  trading: HedgefundTradingConfig;
};

export type HedgefundWalletSummary = {
  alias: string;
  publicKey: string;
  tags: string[];
  weight: number;
};

export type HedgefundPortfolioToken = {
  mint: string;
  decimals: number;
  amountRaw: string;
  amountUi: number;
};

export type HedgefundPortfolioSnapshot = {
  alias: string;
  publicKey: string;
  solLamports: string;
  sol: number;
  fetchedAt: string;
  tokens: HedgefundPortfolioToken[];
};

export type HedgefundPortfolio = {
  snapshots: HedgefundPortfolioSnapshot[];
  totalSolLamports: string;
  totalSol: number;
};

export type HedgefundSignal = Record<string, unknown>;

export type HedgefundTradeResult = {
  plan: Record<string, unknown>;
  action: "buy" | "sell";
  signature?: string;
  solscanUrl?: string;
  simulated: boolean;
  rawTransaction?: string;
  provider: "pumpfun" | "jupiter";
  pool?: string;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT";
  accessToken: string;
  body?: unknown;
  signal?: AbortSignal;
};

const API_BASE = CONFIG.dexterApiOrigin;

function requireAccessToken(token: string | null | undefined): asserts token {
  if (!token || !token.trim()) {
    throw new HedgefundApiError("missing_access_token", 401, null, "Superadmin token required.");
  }
}

async function requestApi<T>(endpoint: string, { method = "GET", accessToken, body, signal }: RequestOptions): Promise<T> {
  requireAccessToken(accessToken);
  const url = endpoint.startsWith("http") ? endpoint : getDexterApiRoute(endpoint);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    cache: "no-store",
    body: payload,
    signal,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok || !data) {
    const code = data?.error || "hedgefund_request_failed";
    const message = data?.message || `Hedgefund request failed (${response.status})`;
    throw new HedgefundApiError(code, response.status, data, message);
  }

  return data as T;
}

export async function getHedgefundStatus(accessToken: string, signal?: AbortSignal): Promise<HedgefundStatus> {
  const payload = await requestApi<{ ok: boolean; status: HedgefundStatus }>("/api/hedgefund/status", {
    method: "GET",
    accessToken,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("status_not_ok", 500, payload);
  }
  return payload.status;
}

export async function getHedgefundConfig(accessToken: string, signal?: AbortSignal): Promise<HedgefundConfig> {
  const payload = await requestApi<{ ok: boolean; config: HedgefundConfig }>("/api/hedgefund/config", {
    method: "GET",
    accessToken,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("config_not_ok", 500, payload);
  }
  return payload.config;
}

export async function updateHedgefundConfig(
  accessToken: string,
  updates: Partial<HedgefundConfig>,
  signal?: AbortSignal,
): Promise<HedgefundConfig> {
  const payload = await requestApi<{ ok: boolean; config: HedgefundConfig }>("/api/hedgefund/config", {
    method: "PUT",
    accessToken,
    body: updates,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("config_update_failed", 500, payload);
  }
  return payload.config;
}

export async function listHedgefundWallets(accessToken: string, signal?: AbortSignal): Promise<HedgefundWalletSummary[]> {
  const payload = await requestApi<{ ok: boolean; wallets: HedgefundWalletSummary[] }>("/api/hedgefund/wallets", {
    method: "GET",
    accessToken,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("wallets_not_ok", 500, payload);
  }
  return payload.wallets;
}

export async function getHedgefundPortfolio(
  accessToken: string,
  options: { alias?: string } = {},
  signal?: AbortSignal,
): Promise<HedgefundPortfolio> {
  const search = new URLSearchParams();
  if (options.alias) {
    search.set("alias", options.alias);
  }
  const path = `/api/hedgefund/portfolio${search.toString() ? `?${search.toString()}` : ""}`;
  const payload = await requestApi<{ ok: boolean; portfolio: HedgefundPortfolio }>(path, {
    method: "GET",
    accessToken,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("portfolio_not_ok", 500, payload);
  }
  return payload.portfolio;
}

export async function getHedgefundSignals(accessToken: string, signal?: AbortSignal): Promise<HedgefundSignal[]> {
  const payload = await requestApi<{ ok: boolean; signals: HedgefundSignal[] }>("/api/hedgefund/signals", {
    method: "GET",
    accessToken,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("signals_not_ok", 500, payload);
  }
  return payload.signals;
}

export async function runHedgefundTick(
  accessToken: string,
  body: { dryRun?: boolean; riskBudgetSol?: number } = {},
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const payload = await requestApi<{ ok: boolean; result: Record<string, unknown> }>("/api/hedgefund/tick", {
    method: "POST",
    accessToken,
    body,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("tick_failed", 500, payload);
  }
  return payload.result;
}

export async function submitHedgefundBuy(
  accessToken: string,
  body: {
    mint: string;
    wallet?: string;
    amount?: number;
    slippageBps?: number;
    simulate?: boolean;
  },
  signal?: AbortSignal,
): Promise<HedgefundTradeResult> {
  const payload = await requestApi<{ ok: boolean; result: HedgefundTradeResult }>("/api/hedgefund/trade/buy", {
    method: "POST",
    accessToken,
    body,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("buy_failed", 500, payload);
  }
  return payload.result;
}

export async function submitHedgefundSell(
  accessToken: string,
  body: {
    mint: string;
    wallet?: string;
    amount?: number;
    slippageBps?: number;
    simulate?: boolean;
  },
  signal?: AbortSignal,
): Promise<HedgefundTradeResult> {
  const payload = await requestApi<{ ok: boolean; result: HedgefundTradeResult }>("/api/hedgefund/trade/sell", {
    method: "POST",
    accessToken,
    body,
    signal,
  });
  if (!payload.ok) {
    throw new HedgefundApiError("sell_failed", 500, payload);
  }
  return payload.result;
}

export const HedgefundApi = {
  getStatus: getHedgefundStatus,
  getConfig: getHedgefundConfig,
  updateConfig: updateHedgefundConfig,
  listWallets: listHedgefundWallets,
  getPortfolio: getHedgefundPortfolio,
  getSignals: getHedgefundSignals,
  runTick: runHedgefundTick,
  buy: submitHedgefundBuy,
  sell: submitHedgefundSell,
  origin: API_BASE,
};
