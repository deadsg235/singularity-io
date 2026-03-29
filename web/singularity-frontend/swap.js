/**
 * swap.js — Jupiter-powered token swap for Singularity.io
 * Uses Jupiter Quote API v6 for real quotes + transaction building.
 */

const JUPITER_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP  = 'https://quote-api.jup.ag/v6/swap';
const COINGECKO_SOL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true';

const TOKENS = {
    'So11111111111111111111111111111111111111112':  { symbol: 'SOL',  decimals: 9 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY',  decimals: 6 },
    'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump': { symbol: 'S-IO', decimals: 6 }
};

let currentQuote   = null;
let currentSolPrice = 0;
let recentSwaps    = [];
let walletPubkey   = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSwaps();
    loadMarketData();
    setInterval(loadMarketData, 30_000);

    document.getElementById('from-amount').addEventListener('input', debounce(updateQuote, 400));
    document.getElementById('from-token').addEventListener('change', () => { updateTokenBalances(); updateQuote(); });
    document.getElementById('to-token').addEventListener('change',   () => { updateTokenBalances(); updateQuote(); });

    // Wallet button
    document.getElementById('wallet-btn')?.addEventListener('click', handleWalletClick);

    // Auto-detect already-connected wallet
    setTimeout(syncWalletState, 800);
});

window.addEventListener('walletConnected',    syncWalletState);
window.addEventListener('walletDisconnected', onWalletDisconnect);
window.addEventListener('balanceUpdated',     updateTokenBalances);

// ── Wallet helpers ────────────────────────────────────────────
async function handleWalletClick() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        onWalletDisconnect();
    } else {
        if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
        try {
            const resp = await window.solana.connect();
            walletPubkey = resp.publicKey.toString();
            onWalletConnect(walletPubkey);
        } catch (e) { alert('Wallet connection failed: ' + e.message); }
    }
}

function syncWalletState() {
    const pub = window.walletManager?.publicKey
        || window.walletAdapter?.getPublicKey()?.toString()
        || window.solana?.publicKey?.toString();
    if (pub) { walletPubkey = pub; onWalletConnect(pub); }
}

function onWalletConnect(pub) {
    walletPubkey = pub;
    const btn = document.getElementById('wallet-btn');
    if (btn) { btn.textContent = `${pub.slice(0,4)}…${pub.slice(-4)}`; btn.classList.add('connected'); }
    document.getElementById('balance-display')?.classList.remove('hidden');
    document.getElementById('swap-btn').disabled = false;
    document.getElementById('swap-btn').textContent = 'Get Quote';
    updateTokenBalances();
    window.loadWalletBalances?.(pub);
}

function onWalletDisconnect() {
    walletPubkey = null;
    const btn = document.getElementById('wallet-btn');
    if (btn) { btn.textContent = 'Connect Wallet'; btn.classList.remove('connected'); }
    document.getElementById('balance-display')?.classList.add('hidden');
    document.getElementById('swap-btn').disabled = true;
    document.getElementById('swap-btn').textContent = 'Connect Wallet';
    currentQuote = null;
}

// ── Balance display ───────────────────────────────────────────
function updateTokenBalances() {
    const sol = document.getElementById('sol-balance')?.textContent || '0';
    const sio = document.getElementById('sio-balance')?.textContent || '0';
    const fromMint = document.getElementById('from-token').value;
    const toMint   = document.getElementById('to-token').value;

    const balOf = mint => {
        if (mint === 'So11111111111111111111111111111111111111112') return sol;
        if (mint === 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump') return sio;
        return '0';
    };

    document.getElementById('from-balance').textContent = `Balance: ${balOf(fromMint)}`;
    document.getElementById('to-balance').textContent   = `Balance: ${balOf(toMint)}`;
}

// ── Quote ─────────────────────────────────────────────────────
async function updateQuote() {
    const fromAmount = parseFloat(document.getElementById('from-amount').value);
    const fromMint   = document.getElementById('from-token').value;
    const toMint     = document.getElementById('to-token').value;

    if (!fromAmount || fromAmount <= 0 || fromMint === toMint) {
        document.getElementById('to-amount').value = '';
        document.getElementById('exchange-rate').textContent = 'Enter amount';
        setSwapBtn('Enter Amount', true);
        currentQuote = null;
        return;
    }

    if (!walletPubkey) {
        setSwapBtn('Connect Wallet', true);
        return;
    }

    setSwapBtn('Getting quote…', true);
    document.getElementById('exchange-rate').textContent = 'Fetching…';

    try {
        const decimals   = TOKENS[fromMint].decimals;
        const inputAmt   = Math.floor(fromAmount * Math.pow(10, decimals));
        const slippageBps = Math.round((parseFloat(document.getElementById('slippage-input')?.value || '0.5')) * 100);

        const url = `${JUPITER_QUOTE}?inputMint=${fromMint}&outputMint=${toMint}&amount=${inputAmt}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Jupiter quote error ${res.status}`);
        const quote = await res.json();
        if (quote.error) throw new Error(quote.error);

        currentQuote = quote;

        const outDecimals = TOKENS[toMint]?.decimals ?? 6;
        const outAmount   = quote.outAmount / Math.pow(10, outDecimals);
        document.getElementById('to-amount').value = outAmount.toFixed(6);

        const rate = outAmount / fromAmount;
        let rateText = `1 ${TOKENS[fromMint].symbol} = ${rate.toFixed(4)} ${TOKENS[toMint].symbol}`;
        if (fromMint === 'So11111111111111111111111111111111111111112' && currentSolPrice > 0) {
            rateText += ` (~$${currentSolPrice.toFixed(2)})`;
        }
        document.getElementById('exchange-rate').textContent = rateText;

        // Price impact
        const impact = parseFloat(quote.priceImpactPct || 0);
        const impactEl = document.getElementById('price-impact');
        if (impactEl) {
            impactEl.textContent = `${(impact * 100).toFixed(3)}%`;
            impactEl.style.color = impact > 0.05 ? '#ff4444' : impact > 0.01 ? '#ffaa00' : '#00ff88';
        }

        setSwapBtn('Execute Swap', false);
        document.getElementById('swap-btn').onclick = executeSwap;

    } catch (err) {
        console.error('Quote failed:', err);
        document.getElementById('exchange-rate').textContent = 'Quote unavailable';
        document.getElementById('to-amount').value = '';
        setSwapBtn('Quote Failed — Retry', false);
        document.getElementById('swap-btn').onclick = updateQuote;
        currentQuote = null;
    }
}

// ── Execute swap ──────────────────────────────────────────────
async function executeSwap() {
    if (!walletPubkey || !currentQuote) { alert('Get a quote first'); return; }

    setSwapBtn('Building transaction…', true);

    try {
        // Build swap transaction via Jupiter
        const swapRes = await fetch(JUPITER_SWAP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: currentQuote,
                userPublicKey: walletPubkey,
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto'
            })
        });

        if (!swapRes.ok) throw new Error(`Jupiter swap error ${swapRes.status}`);
        const { swapTransaction } = await swapRes.json();

        setSwapBtn('Awaiting wallet approval…', true);

        // Deserialize + sign
        const txBuf = Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0));
        const tx    = solanaWeb3.VersionedTransaction.deserialize(txBuf);
        const signed = await window.solana.signTransaction(tx);

        setSwapBtn('Sending…', true);

        // Send via RPC
        const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const sig = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            maxRetries: 3
        });

        setSwapBtn('Confirming…', true);
        await connection.confirmTransaction(sig, 'confirmed');

        // Success
        const fromMint = document.getElementById('from-token').value;
        const toMint   = document.getElementById('to-token').value;
        const fromAmt  = document.getElementById('from-amount').value;
        const toAmt    = document.getElementById('to-amount').value;

        recentSwaps.unshift({
            from: `${fromAmt} ${TOKENS[fromMint].symbol}`,
            to:   `${toAmt} ${TOKENS[toMint]?.symbol || '?'}`,
            signature: sig,
            time: new Date().toLocaleTimeString()
        });
        localStorage.setItem('recent-swaps', JSON.stringify(recentSwaps.slice(0, 20)));
        displayRecentSwaps();

        showSuccessDialog({ fromAmt, fromSym: TOKENS[fromMint].symbol, toAmt, toSym: TOKENS[toMint]?.symbol, sig });

        document.getElementById('from-amount').value = '';
        document.getElementById('to-amount').value   = '';
        currentQuote = null;

        // Refresh balances
        setTimeout(() => window.loadWalletBalances?.(walletPubkey), 2000);

    } catch (err) {
        console.error('Swap error:', err);
        const msg = err.message.includes('User rejected') ? 'Transaction cancelled.' : `Swap failed: ${err.message}`;
        alert(msg);
    } finally {
        setSwapBtn('Get Quote', false);
        document.getElementById('swap-btn').onclick = updateQuote;
    }
}

// ── Swap tokens direction ─────────────────────────────────────
function swapTokens() {
    const from = document.getElementById('from-token');
    const to   = document.getElementById('to-token');
    [from.value, to.value] = [to.value, from.value];
    document.getElementById('from-amount').value = '';
    document.getElementById('to-amount').value   = '';
    currentQuote = null;
    updateTokenBalances();
    updateQuote();
}

// ── Market data ───────────────────────────────────────────────
async function loadMarketData() {
    try {
        const res  = await fetch(COINGECKO_SOL);
        const data = await res.json();
        if (data.solana) {
            currentSolPrice = data.solana.usd;
            const p = currentSolPrice.toFixed(2);
            document.getElementById('sol-price')?.setAttribute('data-val', p);
            ['sol-price','sol-price-swap'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = `$${p}`;
            });
            const vol = (data.solana.usd_24h_vol / 1e6).toFixed(1);
            const volEl = document.getElementById('volume-24h');
            if (volEl) volEl.textContent = `$${vol}M`;
        }
    } catch { /* silent */ }

    // S-IO price via Jupiter price API
    try {
        const r = await fetch('https://price.jup.ag/v6/price?ids=Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump');
        const d = await r.json();
        const price = d?.data?.['Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump']?.price;
        if (price) {
            const el = document.getElementById('sio-price');
            if (el) el.textContent = `$${parseFloat(price).toFixed(6)}`;
        }
    } catch { /* silent */ }
}

// ── Recent swaps ──────────────────────────────────────────────
function loadRecentSwaps() {
    const saved = localStorage.getItem('recent-swaps');
    if (saved) recentSwaps = JSON.parse(saved);
    displayRecentSwaps();
}

function displayRecentSwaps() {
    const el = document.getElementById('recent-swaps');
    if (!el) return;
    if (!recentSwaps.length) {
        el.innerHTML = '<p style="color:#555;text-align:center;padding:1rem">No recent swaps</p>';
        return;
    }
    el.innerHTML = recentSwaps.slice(0, 5).map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div>
                <div style="color:#f0f0f0">${s.from} → ${s.to}</div>
                <div style="color:#555;font-size:.8rem">${s.time}</div>
            </div>
            <a href="https://solscan.io/tx/${s.signature}" target="_blank"
               style="color:#dc2626;font-size:.85rem;text-decoration:none">View ↗</a>
        </div>`).join('');
}

// ── Success dialog ────────────────────────────────────────────
function showSuccessDialog({ fromAmt, fromSym, toAmt, toSym, sig }) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9999';
    d.innerHTML = `
        <div style="background:#111;border:1px solid #dc2626;border-radius:12px;padding:2rem;max-width:380px;text-align:center;color:#f0f0f0">
            <div style="font-size:2.5rem;margin-bottom:.75rem">✅</div>
            <h3 style="color:#dc2626;margin-bottom:.75rem">Swap Successful</h3>
            <p style="font-size:1.1rem;margin-bottom:.5rem">${fromAmt} ${fromSym} → ${toAmt} ${toSym}</p>
            <a href="https://solscan.io/tx/${sig}" target="_blank"
               style="color:#60a5fa;font-size:.85rem;display:block;margin:.75rem 0">
               View on Solscan ↗</a>
            <button onclick="this.closest('div[style]').remove()"
                    style="background:#dc2626;color:#fff;border:none;padding:.6rem 1.5rem;border-radius:6px;cursor:pointer;margin-top:.5rem">
                Close
            </button>
        </div>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 15_000);
}

// ── Helpers ───────────────────────────────────────────────────
function setSwapBtn(text, disabled) {
    const btn = document.getElementById('swap-btn');
    if (!btn) return;
    btn.textContent = text;
    btn.disabled    = disabled;
}

function setSlippage(val) {
    const input = document.getElementById('slippage-input');
    if (input) { input.value = val; updateQuote(); }
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
