import type { RealtimeAgent } from '@openai/agents/realtime';
import { loadDexterTradingScenario, defaultAgentSetKey } from './customerServiceRetail';
import type { ResolvedConciergeProfile } from './customerServiceRetail/promptProfile';

export type AgentScenarioContext = {
  resolvedProfile?: ResolvedConciergeProfile | null;
};

export type AgentScenarioLoader = (context?: AgentScenarioContext) => Promise<RealtimeAgent[]>;

export const scenarioLoaders: Record<string, AgentScenarioLoader> = {
  dexterTrading: loadDexterTradingScenario,
};

export { defaultAgentSetKey };
