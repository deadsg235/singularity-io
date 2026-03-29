import { fetchPromptModule } from '@/app/lib/promptModules';

type PromptReference = {
  slug: string;
  fallback: string;
};

export type ConciergePromptProfile = {
  id: string;
  agentName?: string;
  voiceKey?: string | null;
  instructionSegments: PromptReference[];
  handoffDescription: PromptReference;
  guestInstructions: PromptReference;
  toolDescriptions: Record<string, PromptReference>;
};

export type ResolvedConciergeProfile = {
  id: string;
  agentName: string;
  voiceKey?: string | null;
  instructions: string;
  instructionSegments: string[];
  handoffDescription: string;
  guestInstructions: string;
  toolDescriptions: Record<string, string>;
};

const DEFAULT_AGENT_NAME = 'dexterVoice';

const DEFAULT_CONCIERGE_PROMPTS: ConciergePromptProfile = {
  id: 'default',
  agentName: DEFAULT_AGENT_NAME,
  voiceKey: null,
  instructionSegments: [
    {
      slug: 'agent.concierge.instructions',
      fallback: '⚠️ Missing prompt module "agent.concierge.instructions". Update it in the Super Admin prompt editor.',
    },
    {
      slug: 'agent.concierge.instructions.link_handling',
      fallback:
        [
          'When you provide external explorer links or confirmations, never read or spell out the raw URL.',
          'Use a short descriptive label like "View on Solscan" and keep the voice response concise.',
        ].join(' '),
    },
    {
      slug: 'agent.concierge.instructions.image_handling',
      fallback:
        [
          'When the user provides `input_image` content, always acknowledge that an image was received.',
          'Describe the image in useful detail (people, objects, colors, visible text, context) and answer any explicit question they asked about it.',
          'If they did not provide any text with the image, infer a helpful caption and then invite follow-up questions.',
        ].join(' '),
    },
  ],
  handoffDescription: {
    slug: 'agent.concierge.handoff',
    fallback: '⚠️ Missing prompt module "agent.concierge.handoff". Update it in the Super Admin prompt editor.',
  },
  guestInstructions: {
    slug: 'agent.concierge.guest',
    fallback:
      '⚠️ Missing prompt module "agent.concierge.guest". Update the guest instructions in the Super Admin prompt editor.',
  },
  toolDescriptions: {
    resolve_wallet: {
      slug: 'agent.concierge.tool.resolve_wallet',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.resolve_wallet". Update the tool description.',
    },
    list_my_wallets: {
      slug: 'agent.concierge.tool.list_my_wallets',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.list_my_wallets". Update the tool description.',
    },
    set_session_wallet_override: {
      slug: 'agent.concierge.tool.set_session_wallet_override',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.set_session_wallet_override". Update the tool description.',
    },
    auth_info: {
      slug: 'agent.concierge.tool.auth_info',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.auth_info". Update the tool description.',
    },
    pumpstream_live_summary: {
      slug: 'agent.concierge.tool.pumpstream_live_summary',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.pumpstream_live_summary". Update the tool description.',
    },
    onchain_activity_overview: {
      slug: 'agent.concierge.tool.onchain_activity_overview',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.onchain_activity_overview". Update the tool description.',
    },
    onchain_entity_insight: {
      slug: 'agent.concierge.tool.onchain_entity_insight',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.onchain_entity_insight". Update the tool description.',
    },
    search: {
      slug: 'agent.concierge.tool.search',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.search". Update the tool description.',
    },
    twitter_topic_analysis: {
      slug: 'agent.concierge.tool.twitter_topic_analysis',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.twitter_topic_analysis". Update the tool description.',
    },
    fetch: {
      slug: 'agent.concierge.tool.fetch',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.fetch". Update the tool description.',
    },
    markets_fetch_ohlcv: {
      slug: 'agent.concierge.tool.markets_fetch_ohlcv',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.markets_fetch_ohlcv". Update the tool description.',
    },
    codex_start: {
      slug: 'agent.concierge.tool.codex_start',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.codex_start". Update the tool description.',
    },
    codex_reply: {
      slug: 'agent.concierge.tool.codex_reply',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.codex_reply". Update the tool description.',
    },
    codex_exec: {
      slug: 'agent.concierge.tool.codex_exec',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.codex_exec". Update the tool description.',
    },
    stream_public_shout: {
      slug: 'agent.concierge.tool.stream_public_shout',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.stream_public_shout". Update the tool description.',
    },
    stream_shout_feed: {
      slug: 'agent.concierge.tool.stream_shout_feed',
      fallback: '⚠️ Missing prompt module "agent.concierge.tool.stream_shout_feed". Update the tool description.',
    },
  },
};

async function resolvePromptSegment(ref: PromptReference, accessToken?: string | null): Promise<string> {
  try {
    const promptModule = await fetchPromptModule(ref.slug, { accessToken: accessToken ?? null });
    return promptModule.segment;
  } catch (error) {
    console.error('[ConciergeProfile] Missing prompt module', ref.slug, error);
    return ref.fallback;
  }
}

export async function resolveConciergeProfile(options: {
  profile?: ConciergePromptProfile;
  accessToken?: string | null;
} = {}): Promise<ResolvedConciergeProfile> {
  const profile = options.profile ?? DEFAULT_CONCIERGE_PROMPTS;
  const accessToken = options.accessToken ?? null;

  const instructionSegments = await Promise.all(
    profile.instructionSegments.map((segment) => resolvePromptSegment(segment, accessToken)),
  );

  const handoffDescription = await resolvePromptSegment(profile.handoffDescription, accessToken);
  const guestInstructions = await resolvePromptSegment(profile.guestInstructions, accessToken);

  const toolEntries = await Promise.all(
    Object.entries(profile.toolDescriptions).map(async ([key, ref]) => {
      const value = await resolvePromptSegment(ref, accessToken);
      return [key, value] as const;
    }),
  );

  const toolDescriptions = Object.fromEntries(toolEntries);

  return {
    id: profile.id,
    agentName: profile.agentName ?? DEFAULT_AGENT_NAME,
    voiceKey: profile.voiceKey ?? null,
    instructions: instructionSegments.map((value) => value.trim()).filter(Boolean).join('\n\n'),
    instructionSegments,
    handoffDescription,
    guestInstructions,
    toolDescriptions,
  };
}

export function getDefaultConciergeProfileDefinition(): ConciergePromptProfile {
  return DEFAULT_CONCIERGE_PROMPTS;
}
