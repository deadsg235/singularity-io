import type { RealtimeAgent } from '@openai/agents/realtime';

import { buildConciergeAgent } from './concierge';
import type { AgentScenarioContext } from '../index';
export { resolveConciergeProfile, getDefaultConciergeProfileDefinition } from './promptProfile';

export async function loadDexterTradingScenario(context: AgentScenarioContext = {}): Promise<RealtimeAgent[]> {
  const concierge = await buildConciergeAgent({ resolvedProfile: context.resolvedProfile ?? undefined });
  return [concierge];
}

// Name of the company represented by this agent set. Used by guardrails
export const dexterTradingCompanyName = 'Dexter Labs';

export const defaultAgentSetKey = 'dexterTrading';

export default loadDexterTradingScenario;
