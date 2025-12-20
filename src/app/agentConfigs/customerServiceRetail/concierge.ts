import { RealtimeAgent } from '@openai/agents/realtime';
import { CONFIG } from '@/app/config/env';
import { ConciergePromptProfile, resolveConciergeProfile, type ResolvedConciergeProfile } from './promptProfile';

// IMPORTANT: Backend-native MCP tools are attached by Dexter API during realtime session creation.

type BuildConciergeAgentOptions = {
  profile?: ConciergePromptProfile;
  resolvedProfile?: ResolvedConciergeProfile | null;
  accessToken?: string | null;
};

export async function buildConciergeAgent(options: BuildConciergeAgentOptions = {}): Promise<RealtimeAgent> {
  const resolvedProfile = options.resolvedProfile
    ?? await resolveConciergeProfile({
      profile: options.profile,
      accessToken: options.accessToken ?? null,
    });

  return new RealtimeAgent({
    name: resolvedProfile.agentName,
    voice: resolvedProfile.voiceKey ?? CONFIG.dexterVoicePrimary,
    handoffDescription: resolvedProfile.handoffDescription,
    instructions: resolvedProfile.instructions,
    tools: [],
    handoffs: [],
  });
}

export default buildConciergeAgent;
