/**
 * wallet-balance-loader.js
 * Fetches SOL + S-IO balances directly from Solana RPC — no backend required.
 * Tries multiple endpoints with exponential backoff.
 */

const SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

const RPC_POOL = [
    'https://api.mainnet-beta.solana.com',
    'https://mainnet.helius-rpc.com/?api-key=public',
    'https://solana-rpc.publicnode.com',
    'https://rpc.hellomoon.io/public',
    'https://api.metaplex.solana.com'
];

async function _rpcCall(endpoint, method, params) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
}

async function _withFallback(method, params) {
    for (let i = 0; i < RPC_POOL.length; i++) {
        try {
            return await _rpcCall(RPC_POOL[i], method, params);
        } catch (e) {
            if (i < RPC_POOL.length - 1) {
                await new Promise(r => setTimeout(r, Math.min(500 * (i + 1), 2000)));
            }
        }
    }
    throw new Error('All RPC endpoints failed');
}

async function fetchSolBalance(pubkey) {
    const result = await _withFallback('getBalance', [pubkey, { commitment: 'confirmed' }]);
    return (result?.value ?? result ?? 0) / 1e9;
}

async function fetchSioBalance(pubkey) {
    const result = await _withFallback('getTokenAccountsByOwner', [
        pubkey,
        { mint: SIO_MINT },
        { encoding: 'jsonParsed', commitment: 'confirmed' }
    ]);
    const accounts = result?.value ?? [];
    if (!accounts.length) return 0;
    return accounts[0].account.data.parsed.info.tokenAmount.uiAmount ?? 0;
}

/**
 * Main entry — call this after wallet connects.
 * Updates all #sol-balance and #sio-balance elements on the page.
 * Also dispatches a 'balanceUpdated' event with { sol, sio }.
 */
async function loadWalletBalances(pubkeyOverride) {
    const raw = pubkeyOverride
        || window.walletManager?.publicKey
        || window.walletAdapter?.getPublicKey()?.toString()
        || window.globalWallet?.publicKey?.toString()
        || window.solana?.publicKey?.toString();

    if (!raw) return;
    const pubkey = raw.toString ? raw.toString() : raw;

    // Show loading state
    document.querySelectorAll('#sol-balance').forEach(el => el.textContent = '…');
    document.querySelectorAll('#sio-balance').forEach(el => el.textContent = '…');

    try {
        const [sol, sio] = await Promise.all([
            fetchSolBalance(pubkey),
            fetchSioBalance(pubkey)
        ]);

        document.querySelectorAll('#sol-balance').forEach(el =>
            el.textContent = sol.toFixed(4));
        document.querySelectorAll('#sio-balance').forEach(el =>
            el.textContent = sio.toLocaleString(undefined, { maximumFractionDigits: 2 }));

        // Show balance display panels
        document.querySelectorAll('#balance-display').forEach(el =>
            el.classList.remove('hidden'));

        // Broadcast for other components
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { sol, sio, balances: { sol, sio } }
        }));

        // Cache for quick reads
        window._cachedBalances = { sol, sio, ts: Date.now() };

        return { sol, sio };
    } catch (err) {
        console.error('Balance load failed:', err);
        document.querySelectorAll('#sol-balance').forEach(el => el.textContent = '—');
        document.querySelectorAll('#sio-balance').forEach(el => el.textContent = '—');
    }
}

window.loadWalletBalances = loadWalletBalances;
window.fetchSolBalance    = fetchSolBalance;
window.fetchSioBalance    = fetchSioBalance;
