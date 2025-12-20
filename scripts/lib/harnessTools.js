const DEFAULT_PROMPT = 'Give me the latest pumpstream summary. Use page size 5 and fetch the next page if more streams are available.';
const DEFAULT_TARGET_URL = 'https://beta.dexter.cash/';
const DEFAULT_PAGE_SIZE = 5;

const pumpstreamTool = {
  id: 'pumpstream',
  label: 'Pumpstream Live Summary',
  defaults: {
    prompt: DEFAULT_PROMPT,
    targetUrl: DEFAULT_TARGET_URL,
    waitMs: 45000,
    pageSize: DEFAULT_PAGE_SIZE,
  },
  options: {
    pageSize: true,
  },
  api: {
    buildRequest: ({ options }) => ({
      name: 'pumpstream_live_summary',
      arguments: {
        pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
        includeSpotlight: true,
        sort: 'marketCap',
        status: 'live',
      },
    }),
    summarize: ({ result }) => {
      const structured = result?.tool?.structured;
      if (!structured) {
        return { message: 'No structured pumpstream data returned.' };
      }
      const paging = structured.paging || {};
      return {
        generatedAt: structured.generatedAt,
        totalAvailable: structured.totalAvailable,
        totalAfterFilter: structured.totalAfterFilter,
        totalReturned: structured.totalReturned,
        pageSize: paging.pageSize,
        offset: paging.offset,
        currentPage: paging.currentPage,
        totalPages: paging.totalPages,
        hasMore: paging.hasMore,
        nextOffset: paging.nextOffset,
        streamsPreview: Array.isArray(structured.streams)
          ? structured.streams.slice(0, 3).map((s) => ({
              mintId: s.mintId,
              name: s.name,
              marketCapUsd: s.marketCapUsd,
              viewers: s.currentViewers,
            }))
          : [],
      };
    },
    artifactName: ({ timestamp }) => `pumpstream-api-${timestamp}.json`,
  },
};

const TOOL_REGISTRY = {
  pumpstream: pumpstreamTool,
  wallets: {
    id: 'wallets',
    label: 'List Wallets + Balances',
    defaults: {
      waitMs: 45000,
    },
    api: {
      // Two-step chained API test: list_my_wallets then solana_list_balances for the first wallet
      buildRequest: () => ({ name: 'list_my_wallets', arguments: {} }),
      summarize: ({ result }) => {
        try {
          const tool = result?.tool;
          const structured = tool?.structured || tool?.output || result?.structured;
          const wallets = Array.isArray(structured?.wallets) ? structured.wallets : [];
          const first = wallets[0];
          return {
            walletsCount: wallets.length,
            firstWallet: first?.address || first?.public_key || null,
          };
        } catch {
          return { message: 'No wallets returned.' };
        }
      },
      artifactName: ({ timestamp }) => `wallets-api-${timestamp}.json`,
      followUps: [
        ({ previousResult }) => {
          const structured = previousResult?.tool?.structured || {};
          const wallets = Array.isArray(structured.wallets) ? structured.wallets : [];
          const first = wallets[0];
          const addr = first?.address || first?.public_key;
          return addr
            ? { name: 'solana_list_balances', arguments: { wallet_address: addr } }
            : null;
        },
      ],
    },
  },
};

function getToolConfig(toolId) {
  const key = (toolId || '').toLowerCase();
  if (!key) return pumpstreamTool;
  return TOOL_REGISTRY[key];
}

module.exports = {
  TOOL_REGISTRY,
  getToolConfig,
  DEFAULT_TOOL_ID: 'pumpstream',
};
