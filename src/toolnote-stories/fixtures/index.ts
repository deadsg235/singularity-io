import solanaToken from "./solana-token.json";
import solanaBalances from "./solana-balances.json";

type FixtureRecord = Record<string, any>;

const PRIMARY_WALLET = "4f3X7q5hPZL2YV1d1PfYZ7RUTpuj6YewsGmmKzBSSrNV";
const SECOND_WALLET = "7Vq5wvkZpPRsvfv5nPx2EF4nVzcsYwRJQk1vZEBtcDzS";
const DEMO_WALLET = "F6oHkz8oFqgVqMYUp3NEPoPFcAckU4iRciMghvYDn8LM";
const TOKEN_MINT = "JUP4bF4YZ8t8oAdjQ1DPZ8PvFJ69wHwgTGh2dCgyRk7";
const TOKEN_MINT_ALT = "So11111111111111111111111111111111111111112";

export const toolFixtures: FixtureRecord = {
  pumpstream_live_summary: {
    output: {
      generatedAt: "2025-10-08T02:12:00Z",
      streams: [
        {
          name: "Turbo Sol",
          mintId: "4Yx7cNpV5y7QeS2b1n6gLzM3ivQ9Rc8uSJvo8LXkXcLt",
          url: "https://pump.fun/4Yx7cNpV5y7QeS2b1n6gLzM3ivQ9Rc8uSJvo8LXkXcLt",
          thumbnail: "https://placehold.co/120x72/f97316/fff?text=Turbo",
          currentViewers: 1890,
          marketCapUsd: 3600000,
          momentum: 6.8,
        },
        {
          name: "Photon DAO",
          mintId: "8gT1LMfNScmGEJt6d4pSqpF9rrQ9qDJW1GZw6eZ8iTvt",
          url: "https://pump.fun/8gT1LMfNScmGEJt6d4pSqpF9rrQ9qDJW1GZw6eZ8iTvt",
          thumbnail: "https://placehold.co/120x72/ef4444/fff?text=Photon",
          currentViewers: 1324,
          marketCapUsd: 2150000,
          momentum: 4.2,
        },
        {
          name: "Dexter Labs",
          mintId: "6Yd5vUoUqgv7V9BRcBbzK4mUuXgjZ3QrhT3Dn5PjFm9R",
          streamUrl: "https://pump.fun/live/6Yd5vUoUqgv7V9BRcBbzK4mUuXgjZ3QrhT3Dn5PjFm9R",
          thumbnail: "https://placehold.co/120x72/22c55e/fff?text=Dexter",
          currentViewers: 890,
          marketCapUsd: 1480000,
          momentum: 2.1,
        },
        {
          name: "SOL Crafters",
          mintId: "9Pi4hSksWnzQaS4zSRrZz9gmEPMaehJ1SEpqE8np5W3w",
          currentViewers: 612,
          marketCapUsd: 980000,
          momentum: -1.6,
        },
        {
          name: "MetaMix",
          mintId: "3oDcjNRc76bKfsQjVYUAiYy7xZ3PxbmDa1m16Dy9n1Tf",
          currentViewers: 455,
          marketCapUsd: 540000,
          momentum: 0.9,
        },
        {
          name: "Zen Pixels",
          mintId: "D2bRqYJ2Amv9s9L4wXKnc1LdfLEgLq73dsG7qL7tG8sV",
          currentViewers: 318,
          marketCapUsd: 420000,
          momentum: -2.5,
        },
      ],
    },
  },

  resolve_wallet: {
    output: {
      wallet_address: PRIMARY_WALLET,
      source: "primary",
      user_id: "user_f2059b3c-32f5-4fcb-9386-2dd28d51a0fd",
    },
    arguments: {
      wallet_address: SECOND_WALLET,
    },
  },

  list_my_wallets: {
    output: {
      user: { id: "user_f2059b3c-32f5-4fcb-9386-2dd28d51a0fd" },
      wallets: [
        {
          address: PRIMARY_WALLET,
          label: "Primary trading",
          status: "assigned",
          is_default: true,
        },
        {
          public_key: SECOND_WALLET,
          label: "Scouting",
          status: "assigned",
        },
        {
          public_key: DEMO_WALLET,
          label: "Demo wallet",
          status: "available",
        },
      ],
    },
  },

  set_session_wallet_override: {
    output: {
      ok: true,
      wallet_address: SECOND_WALLET,
    },
    arguments: {
      wallet_address: SECOND_WALLET,
    },
  },

  auth_info: {
    output: {
      wallet_address: PRIMARY_WALLET,
      user_id: "user_f2059b3c-32f5-4fcb-9386-2dd28d51a0fd",
      source: "resolver",
      diagnostics: {
        bearer_source: "supabase-session",
        has_token: true,
        override_session: "dexter-demo",
        detail: "Resolver cache primed",
        wallets_cached: 3,
      },
    },
  },

  solana_resolve_token: solanaToken,
  solana_list_balances: solanaBalances,

  search: {
    output: {
      answer:
        "Dexter Agents broker web search with clickable cards that surface favicons, snippets, and summaries so operators can jump into the referenced docs quickly.",
      response_time: 1432,
      results: [
        {
          id: "dexter-docs",
          title: "Dexter Agents – Toolchain Overview",
          url: "https://docs.dexter.cash/agents/toolchain",
          snippet: "Review how Dexchat brokers MCP calls between the realtime voice session and hosted tools.",
          favicon: "https://docs.dexter.cash/favicon.ico",
          score: 0.87,
          published_at: "2025-09-15T18:40:00Z",
        },
        {
          id: "wallet-safety",
          title: "Wallet safety checklist",
          url: "https://docs.dexter.cash/agents/wallet-safety",
          snippet: "Steps we take before allowing unattended swaps on customer wallets.",
          favicon: "https://docs.dexter.cash/favicon.ico",
          score: 0.79,
          published_at: "2025-08-21T13:12:00Z",
        }
      ],
      images: [
        {
          url: "https://placehold.co/640x360/0f172a/fff?text=Dexter+Doc+Preview",
          description: "Screenshot of the Dexter Agents documentation landing page.",
        },
        {
          url: "https://placehold.co/640x360/312e81/fff?text=Wallet+Checklist",
          description: "Checklist highlights from the wallet safety guide.",
        },
      ],
    },
    arguments: {
      query: "dexter wallet tooling",
    },
  },

  fetch: {
    output: {
      title: "Dexter Voice onboarding",
      url: "https://docs.dexter.cash/voice/onboarding",
      text: "Dexter Voice walks new operators through linking a wallet, verifying identity, and running their first scripted task. Use the diagnostics tool if a wallet fails to bind.",
    },
  },

  twitter_topic_analysis: {
    structuredContent: {
      query: "dexter agents",
      queries: ["dexter agents", "dexter ai"],
      ticker: null,
      include_replies: false,
      fetched: 3,
      tweets: [
        {
          id: "1862100000000000000",
          url: "https://x.com/dexter_cash/status/1862100000000000000",
          timestamp: "2025-10-09T17:21:00Z",
          text: "Dexter Agents now ship with live search and pumpstream visual overlays. Shipping thread below ⤵️",
          source_queries: ["dexter agents"],
          author: {
            handle: "dexter_cash",
            display_name: "Dexter Labs",
            avatar_url: "https://placehold.co/96x96/0f172a/fff?text=DX",
            is_verified: true,
            followers: 18200,
          },
          stats: {
            likes: 840,
            retweets: 210,
            replies: 34,
            views: 48000,
          },
          media: {
            photos: [
              "https://placehold.co/640x360/6366f1/fff?text=Ladle+Preview",
            ],
          },
        },
        {
          id: "1862090000000000000",
          url: "https://x.com/solbuild/status/1862090000000000000",
          timestamp: "2025-10-09T15:04:00Z",
          text: "Tried the new Dexter swap preview UI today—animated token flow is a massive upgrade over raw tables.",
          source_queries: ["dexter agents"],
          author: {
            handle: "solbuild",
            display_name: "SolBuild",
            avatar_url: "https://placehold.co/96x96/f97316/fff?text=SB",
            is_verified: false,
            followers: 5600,
          },
          stats: {
            likes: 120,
            retweets: 22,
            replies: 4,
            views: 8900,
          },
          media: {
            photos: [],
          },
        },
        {
          id: "1862080000000000000",
          url: "https://x.com/solanalabs/status/1862080000000000000",
          timestamp: "2025-10-09T13:47:00Z",
          text: "Great to see teams like Dexter Agents building polished operator tooling on Solana. Looking forward to their MPC rollout.",
          source_queries: ["dexter ai"],
          author: {
            handle: "solanalabs",
            display_name: "Solana Labs",
            avatar_url: "https://placehold.co/96x96/22c55e/fff?text=SL",
            is_verified: true,
            followers: 1250000,
          },
          stats: {
            likes: 2300,
            retweets: 640,
            replies: 180,
            views: 480000,
          },
          media: {
            photos: [],
          },
        },
      ],
    },
    arguments: {
      query: "dexter agents",
      include_replies: false,
      max_results: 15,
      media_only: false,
    },
  },

  codex_start: {
    output: {
      conversationId: "codex_c1a7d7e8",
      session: {
        model: "codex-voice-alpha",
        reasoningEffort: "medium",
      },
      durationMs: 420,
      tokenUsage: {
        prompt: 128,
        completion: 64,
        total: 192,
      },
    },
  },

  codex_reply: {
    output: {
      conversationId: "codex_c1a7d7e8",
      response: {
        text: "I reached out to the vendor; they confirmed shipment is on track for Friday.",
        reasoning: "Vendor SLA is 72h, ticket created Tuesday. Friday delivery remains within commitment.",
      },
      durationMs: 780,
      tokenUsage: {
        prompt: 142,
        completion: 98,
        total: 240,
      },
    },
  },

  codex_exec: {
    output: {
      conversationId: "codex_c1a7d7e8",
      response: {
        text: "Executed follow-up task: posted summary to customer portal.",
        reasoning: "Portal update keeps stakeholders aligned and closes the loop on the support request.",
      },
      durationMs: 1120,
      tokenUsage: {
        prompt: 210,
        completion: 136,
        total: 346,
      },
    },
    arguments: {
      command: "post_summary",
    },
  },

  stream_get_scene: {
    output: {
      scene: "dexter-dashboard",
      updatedAt: "2025-10-08T02:05:00Z",
      scenes: ["dexter-dashboard", "wallet-monitor", "pumpstream-overlay", "blank"],
    },
  },

  stream_set_scene: {
    output: {
      scene: "wallet-monitor",
      updatedAt: "2025-10-08T02:06:30Z",
    },
    arguments: {
      scene: "wallet-monitor",
    },
  },

  solana_swap_preview: {
    output: {
      inputAmount: "250 USDC",
      outputAmount: "1.54 SOL",
      inputUsdValue: 250,
      outputUsdValue: 251.3,
      priceImpactPercent: -0.42,
      slippageBps: 50,
      feesLamports: 1_500_000,
      route: [
        {
          provider: "Jupiter",
          inputMint: "USDC11111111111111111111111111111111111111",
          outputMint: TOKEN_MINT,
        },
        {
          provider: "DexterDirect",
          inputMint: TOKEN_MINT,
          outputMint: TOKEN_MINT_ALT,
        },
      ],
      warnings: ["Route crosses two pools. Monitor price impact."],
    },
    arguments: {
      amount_in: "250",
      from_mint: "USDC11111111111111111111111111111111111111",
      to_mint: TOKEN_MINT_ALT,
      slippage_bps: 50,
    },
  },

  solana_swap_execute: {
    output: {
      inputAmount: "250 USDC",
      outputAmount: "1.52 SOL",
      inputUsdValue: 250,
      outputUsdValue: 248.9,
      priceImpactPercent: -0.86,
      feesLamports: 1_750_000,
      route: [
        {
          provider: "Jupiter",
          inputMint: "USDC11111111111111111111111111111111111111",
          outputMint: TOKEN_MINT,
        },
        {
          provider: "Orca",
          inputMint: TOKEN_MINT,
          outputMint: TOKEN_MINT_ALT,
        },
      ],
      signature: "4Jt496b2hRaWe6DvYPEGJyE7vGXNz9QgSS6UvejfHy4PpR6vDyK7SXtsVn1rC1T7hW6iyp7diVqL7sLY9J6yXws",
      status: "confirmed",
    },
    arguments: {
      from_mint: "USDC11111111111111111111111111111111111111",
      to_mint: TOKEN_MINT_ALT,
      amount_in: "250",
      wallet_address: PRIMARY_WALLET,
    },
  },
};
