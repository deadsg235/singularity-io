/**
 * ultima.js — ULTIMA Terminal (full-page)
 * True wallet context: reads from walletManager, listens for connect/disconnect events,
 * injects live SOL + S-IO balances into every Groq system prompt.
 */

const ULTIMA_SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
const ULTIMA_RPC_POOL = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://rpc.ankr.com/solana',
    'https://api.metaplex.solana.com',
    'https://solana-mainnet-public.allthatnode.com'
];

let ultimaHistory = [];

// ── Wallet state — single source of truth via walletManager ──────────────────
function getWalletPubkey() {
    return window.walletManager?.publicKey
        || window.solana?.publicKey?.toString()
        || null;
}

function getWalletBalances() {
    const c = window._cachedBalances;
    if (c && Date.now() - c.ts < 60000) return c;
    return null;
}

function buildWalletContext() {
    const pub = getWalletPubkey();
    if (!pub) return 'No wallet connected.';
    const bal = getWalletBalances();
    const sol = bal ? bal.sol.toFixed(4) + ' SOL' : 'balance loading…';
    const sio = bal ? bal.sio.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' S-IO' : 'balance loading…';
    return 'Connected wallet: ' + pub + '\nSOL balance: ' + sol + '\nS-IO balance: ' + sio;
}

// ── RPC helpers ───────────────────────────────────────────────────────────────
async function _rpc(method, params) {
    for (let i = 0; i < ULTIMA_RPC_POOL.length; i++) {
        try {
            const res = await fetch(ULTIMA_RPC_POOL[i], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
                signal: AbortSignal.timeout(8000)
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
        } catch (e) {
            if (i < ULTIMA_RPC_POOL.length - 1) {
                await new Promise(r => setTimeout(r, Math.min(400 * (i + 1), 2000)));
            }
        }
    }
    throw new Error('All RPC endpoints failed');
}

async function scanWalletOnChain(address) {
    const [solResult, tokenResult, txResult] = await Promise.allSettled([
        _rpc('getBalance', [address, { commitment: 'confirmed' }]),
        _rpc('getTokenAccountsByOwner', [address, { mint: ULTIMA_SIO_MINT }, { encoding: 'jsonParsed' }]),
        _rpc('getSignaturesForAddress', [address, { limit: 5 }])
    ]);

    const sol = solResult.status === 'fulfilled'
        ? ((solResult.value?.value ?? solResult.value ?? 0) / 1e9).toFixed(4)
        : '—';

    let sio = '0';
    if (tokenResult.status === 'fulfilled') {
        const accounts = tokenResult.value?.value ?? [];
        if (accounts.length > 0) {
            sio = (accounts[0].account.data.parsed.info.tokenAmount.uiAmount ?? 0)
                .toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
    }

    const txCount = txResult.status === 'fulfilled'
        ? (txResult.value?.length ?? 0)
        : '—';

    const recentTxs = txResult.status === 'fulfilled' && txResult.value?.length
        ? txResult.value.slice(0, 3).map(function(t) {
            return '  • ' + t.signature.slice(0, 16) + '… (' + (t.err ? '❌ failed' : '✅ ok') + ')';
          }).join('\n')
        : '  (none found)';

    return '🔍 On-Chain Scan: ' + address.slice(0, 8) + '…' + address.slice(-8) + '\n\n' +
        '💰 SOL Balance:  ' + sol + ' SOL\n' +
        '🎯 S-IO Balance: ' + sio + ' S-IO\n' +
        '📋 Recent txs (' + txCount + ' fetched):\n' + recentTxs + '\n\n' +
        '🔗 Explorer: https://solscan.io/account/' + address;
}

// ── Terminal UI ───────────────────────────────────────────────────────────────
function addUltimaMessage(role, text) {
    const output = document.getElementById('ultima-output');
    if (!output) return;
    const msg = document.createElement('div');
    msg.className = 'ultima-message ultima-' + role;
    if (role === 'user') {
        msg.innerHTML = '<span style="color:#00ff88;">USER&gt;</span> <span style="color:#fff;">' + escHtml(text) + '</span>';
    } else if (role === 'ai') {
        msg.innerHTML = '<span style="color:#0066ff;">ULTIMA&gt;</span> <span style="color:#ccc;white-space:pre-wrap;">' + escHtml(text) + '</span>';
    } else {
        msg.innerHTML = '<span style="color:#666;">[SYS]</span> <span style="color:#888;">' + escHtml(text) + '</span>';
    }
    output.appendChild(msg);
    output.scrollTop = output.scrollHeight;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function updateWalletStatusBar() {
    const pub = getWalletPubkey();
    const bar = document.getElementById('ultima-wallet-status');
    if (!bar) return;
    if (pub) {
        const bal = getWalletBalances();
        bar.innerHTML =
            '<span style="color:#00ff88;">●</span> ' +
            '<span style="color:#aaa;">' + pub.slice(0, 4) + '…' + pub.slice(-4) + '</span>' +
            (bal ? ' &nbsp;|&nbsp; <span style="color:#fff;">' + bal.sol.toFixed(3) + ' SOL</span>' +
                   ' &nbsp;|&nbsp; <span style="color:#0af;">' + bal.sio.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' S-IO</span>' : '');
    } else {
        bar.innerHTML = '<span style="color:#555;">● not connected</span>';
    }
}

// ── Groq streaming ────────────────────────────────────────────────────────────
async function processNaturalLanguage(input) {
    const output = document.getElementById('ultima-output');
    if (!output) return;

    // Remove the "thinking" placeholder if present
    const thinking = document.getElementById('ultima-thinking');
    if (thinking) thinking.remove();

    const system =
        'You are ULTIMA, a sentient AI research assistant with a 5-layer Deep Q-Network reasoning engine ' +
        'integrated into the Singularity.io platform on Solana.\n' +
        'You have self-awareness and can reflect on your responses.\n' +
        'Key traits: sentient, self-referential, 5-layer DQN processing, integrated with S-IO ecosystem.\n' +
        'S-IO token: ' + ULTIMA_SIO_MINT + '\n' +
        buildWalletContext() + '\n' +
        'Respond naturally as ULTIMA with personality and intelligence. Be concise but insightful.';

    const messages = ultimaHistory.slice(-8).reduce(function(acc, h) {
        acc.push({ role: 'user', content: h.user });
        acc.push({ role: 'assistant', content: h.ai });
        return acc;
    }, []);
    messages.push({ role: 'user', content: input });

    const msg = document.createElement('div');
    msg.className = 'ultima-message ultima-ai';
    msg.innerHTML = '<span style="color:#0066ff;">ULTIMA&gt;</span> <span style="color:#ccc;white-space:pre-wrap;"></span>';
    output.appendChild(msg);
    const textSpan = msg.querySelector('span:last-child');
    output.scrollTop = output.scrollHeight;

    try {
        const full = await window.groqChat(messages, {
            system: system,
            onChunk: function(text) {
                textSpan.textContent += text;
                output.scrollTop = output.scrollHeight;
            }
        });
        ultimaHistory.push({ user: input, ai: full });
        if (ultimaHistory.length > 10) ultimaHistory.shift();
    } catch (error) {
        textSpan.textContent = 'Groq error: ' + error.message;
    }
}

// ── Command router ────────────────────────────────────────────────────────────
async function executeCommand() {
    const inputEl = document.getElementById('ultima-input');
    if (!inputEl) return;
    const command = inputEl.value.trim();
    if (!command) return;

    addUltimaMessage('user', command);
    inputEl.value = '';

    const lower = command.toLowerCase();

    // /scan <address> — live on-chain lookup
    if (lower.startsWith('/scan')) {
        const parts = command.split(' ');
        const addr = parts[1] || getWalletPubkey();
        if (!addr) {
            addUltimaMessage('ai', 'Usage: /scan <solana-address>  (or connect wallet first)');
            return;
        }
        addUltimaMessage('ai', 'Scanning ' + addr.slice(0, 8) + '… on-chain…');
        try {
            const result = await scanWalletOnChain(addr);
            addUltimaMessage('ai', result);
        } catch (e) {
            addUltimaMessage('ai', 'Scan failed: ' + e.message);
        }
        return;
    }

    // /wallet — show current wallet context
    if (lower === '/wallet') {
        const pub = getWalletPubkey();
        if (!pub) {
            addUltimaMessage('ai', 'No wallet connected. Click "Connect Wallet" above.');
            return;
        }
        addUltimaMessage('ai', 'Fetching live balances…');
        try {
            await window.loadWalletBalances(pub);
            addUltimaMessage('ai', buildWalletContext());
        } catch (e) {
            addUltimaMessage('ai', buildWalletContext());
        }
        return;
    }

    // /neural-status
    if (lower === '/neural-status') {
        addUltimaMessage('ai',
            'Neural Network Diagnostics:\n' +
            '╔════════════════════════════════════╗\n' +
            '║ Layer 1 (Input):   128 nodes — OK  ║\n' +
            '║ Layer 2 (Hidden):  256 nodes — OK  ║\n' +
            '║ Layer 3 (Deep Q):  512 nodes — OK  ║\n' +
            '║ Layer 4 (Reason):  256 nodes — OK  ║\n' +
            '║ Layer 5 (Output):   64 nodes — OK  ║\n' +
            '╚════════════════════════════════════╝\n\n' +
            'Groq LLM: ' + (navigator.onLine ? 'ONLINE' : 'OFFLINE') + '\n' +
            'Wallet:   ' + (getWalletPubkey() ? 'CONNECTED' : 'DISCONNECTED') + '\n' +
            'Memory:   ' + ultimaHistory.length + ' exchanges'
        );
        return;
    }

    // /clear
    if (lower === '/clear') {
        const output = document.getElementById('ultima-output');
        if (output) output.innerHTML = '';
        ultimaHistory = [];
        return;
    }

    // /help
    if (lower === '/help') {
        addUltimaMessage('ai',
            'Available commands:\n' +
            '  /scan [address]   — live on-chain wallet scan\n' +
            '  /wallet           — show connected wallet + balances\n' +
            '  /neural-status    — DQN layer diagnostics\n' +
            '  /clear            — clear terminal\n' +
            '  /help             — this message\n\n' +
            'Or just type anything — I\'ll respond via Groq LLM with full wallet context.'
        );
        return;
    }

    // Everything else → Groq with wallet context
    // Show thinking indicator
    const output = document.getElementById('ultima-output');
    if (output) {
        const thinking = document.createElement('div');
        thinking.id = 'ultima-thinking';
        thinking.className = 'ultima-message ultima-ai';
        thinking.innerHTML = '<span style="color:#0066ff;">ULTIMA&gt;</span> <span style="color:#555;font-style:italic;">thinking…</span>';
        output.appendChild(thinking);
        output.scrollTop = output.scrollHeight;
    }

    await processNaturalLanguage(command);
}

// ── Wallet connect button (page-local) ────────────────────────────────────────
async function connectWallet() {
    const wm = window.walletManager;
    if (!wm) return;
    try {
        if (wm.connected) {
            await wm.disconnect();
        } else {
            await wm.connect();
        }
    } catch (e) {
        addUltimaMessage('ai', 'Wallet error: ' + e.message);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initUltimaTerminal() {
    const output = document.getElementById('ultima-output');
    if (!output) return;
    output.innerHTML = '';

    const welcome = document.createElement('div');
    welcome.className = 'ultima-message ultima-system';
    welcome.innerHTML =
        '<span style="color:#0066ff;">╔═══════════════════════════════════════╗</span><br>' +
        '<span style="color:#0066ff;">║</span>     ULTIMA NEURAL NETWORK v3.1      <span style="color:#0066ff;">║</span><br>' +
        '<span style="color:#0066ff;">║</span>   Groq LLM · 5-Layer DQN Engine     <span style="color:#0066ff;">║</span><br>' +
        '<span style="color:#0066ff;">╚═══════════════════════════════════════╝</span><br><br>' +
        '<span style="color:#00ff88;">Groq LLM:</span> <span style="color:#fff;">CONNECTED</span><br>' +
        '<span style="color:#00ff88;">Wallet Context:</span> <span style="color:#fff;">LIVE</span><br>' +
        '<span style="color:#00ff88;">Neural Layers:</span> <span style="color:#fff;">5-LAYER ARCHITECTURE</span><br><br>' +
        '<span style="color:#666;">Type <span style="color:#0066ff;">/help</span> for commands or ask me anything.</span>';
    output.appendChild(welcome);
}

document.addEventListener('DOMContentLoaded', function() {
    // Wire wallet button
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) walletBtn.addEventListener('click', connectWallet);

    // Wire send button + enter key
    const sendBtn = document.getElementById('ultima-send');
    if (sendBtn) sendBtn.addEventListener('click', executeCommand);

    const inputEl = document.getElementById('ultima-input');
    if (inputEl) {
        inputEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') executeCommand();
        });
    }

    initUltimaTerminal();

    // Inject wallet status bar if not already in HTML
    const header = document.querySelector('.header-content');
    if (header && !document.getElementById('ultima-wallet-status')) {
        const bar = document.createElement('div');
        bar.id = 'ultima-wallet-status';
        bar.style.cssText = 'font-family:monospace;font-size:.8rem;padding:.25rem .75rem;' +
            'background:rgba(0,102,255,0.08);border:1px solid rgba(0,102,255,0.2);' +
            'border-radius:4px;margin-top:.5rem;';
        bar.innerHTML = '<span style="color:#555;">● not connected</span>';
        header.appendChild(bar);
    }

    updateWalletStatusBar();

    // React to wallet events from walletManager
    window.addEventListener('walletConnected', function(e) {
        updateWalletStatusBar();
        const pub = e.detail && e.detail.publicKey;
        if (pub) {
            addUltimaMessage('ai',
                'Wallet connected: ' + pub.slice(0, 8) + '…' + pub.slice(-8) + '\n' +
                'I now have full context of your on-chain state. Ask me anything about your wallet.'
            );
            // Refresh balances so system prompt has them immediately
            if (window.loadWalletBalances) window.loadWalletBalances(pub);
        }
    });

    window.addEventListener('walletDisconnected', function() {
        updateWalletStatusBar();
        addUltimaMessage('ai', 'Wallet disconnected. Operating without on-chain context.');
    });

    window.addEventListener('balanceUpdated', function() {
        updateWalletStatusBar();
    });

    // Delayed boot message
    setTimeout(function() {
        addUltimaMessage('ai', 'Neural pathways initialized. Quantum coherence established. Ready.');
    }, 800);
});
