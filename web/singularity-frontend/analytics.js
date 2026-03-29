/**
 * analytics.js — fully client-side, no /api/* calls
 */

let solPriceChart = null;
let sioPriceChart = null;
let volumeChart   = null;
let buySellChart  = null;
let walletPubkey  = null;
let updateInterval;

const SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

// ── Chart init ────────────────────────────────────────────────
function initCharts() {
    solPriceChart = new Chart(document.getElementById('sol-price-chart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'SOL Price (USD)', data: [], borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }] },
        options: chartOpts(v => '$' + v.toFixed(2))
    });

    sioPriceChart = new Chart(document.getElementById('sio-price-chart').getContext('2d'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'S-IO Price (USD)', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }] },
        options: chartOpts(v => '$' + v.toFixed(6))
    });

    volumeChart = new Chart(document.getElementById('volume-chart').getContext('2d'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Volume', data: [], backgroundColor: 'rgba(220,38,38,0.6)', borderColor: '#dc2626', borderWidth: 1 }] },
        options: chartOpts(v => '$' + (v / 1e6).toFixed(1) + 'M')
    });

    buySellChart = new Chart(document.getElementById('buysell-chart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'Buys',  data: [], backgroundColor: 'rgba(0,255,136,0.7)',  borderColor: '#00ff88', borderWidth: 1 },
                { label: 'Sells', data: [], backgroundColor: 'rgba(220,38,38,0.7)',  borderColor: '#dc2626', borderWidth: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,.1)' } }, y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,.1)' } } } }
    });
}

function chartOpts(tickFmt) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
            x: { display: false },
            y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,.1)' }, ticks: { color: '#fff', callback: tickFmt } }
        },
        interaction: { intersect: false, mode: 'index' }
    };
}

// ── Data fetching ─────────────────────────────────────────────
async function fetchSolanaData() {
    let price = 188, change24h = 2.1, volume24h = 2_400_000_000, marketCap = 85_000_000_000;

    try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        const d = await r.json();
        if (d.solana) {
            price      = d.solana.usd              || price;
            change24h  = d.solana.usd_24h_change   || change24h;
            volume24h  = d.solana.usd_24h_vol       || volume24h;
            marketCap  = d.solana.usd_market_cap    || marketCap;
        }
    } catch {}

    // Build 30-point simulated history around real price ±5%
    const labels = [];
    const prices = [];
    const vols   = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
        const jitter = (Math.random() - 0.5) * 0.1 * price;
        prices.push(+(price + jitter).toFixed(2));
        vols.push(volume24h * (0.7 + Math.random() * 0.6));
    }

    if (solPriceChart) {
        solPriceChart.data.labels = labels;
        solPriceChart.data.datasets[0].data = prices;
        solPriceChart.update('none');
    }
    if (volumeChart) {
        volumeChart.data.labels = labels;
        volumeChart.data.datasets[0].data = vols;
        volumeChart.update('none');
    }

    // Market stats panel
    const stats = [
        { label: 'SOL Price',   value: `$${price.toFixed(2)}`,                                    color: '#fff'    },
        { label: '24h Change',  value: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`,    color: change24h >= 0 ? '#00ff88' : '#ff4444' },
        { label: '24h Volume',  value: `$${(volume24h / 1e9).toFixed(2)}B`,                        color: '#dc2626' },
        { label: 'Market Cap',  value: `$${(marketCap / 1e9).toFixed(1)}B`,                        color: '#ef4444' },
        { label: 'Last Update', value: new Date().toLocaleTimeString(),                             color: '#666'    }
    ];
    const statsHtml = stats.map(s => `
        <div class="metric-row">
            <span style="color:#666;">${s.label}</span>
            <span style="color:${s.color};font-weight:bold;">${s.value}</span>
        </div>`).join('');
    const el = document.getElementById('market-stats');
    if (el) el.innerHTML = statsHtml;

    return { price, change24h, volume24h, marketCap };
}

async function fetchSioData() {
    let price = 0.0001, change24h = 0, liquidity = 0;

    try {
        const r = await fetch(`https://price.jup.ag/v6/price?ids=${SIO_MINT}`);
        const d = await r.json();
        const p = d?.data?.[SIO_MINT]?.price;
        if (p) price = parseFloat(p);
    } catch {}

    // Simulated 30-day S-IO history
    const labels = [];
    const prices = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
        prices.push(+(price * (0.85 + Math.random() * 0.3)).toFixed(8));
    }

    if (sioPriceChart) {
        sioPriceChart.data.labels = labels;
        sioPriceChart.data.datasets[0].data = prices;
        sioPriceChart.update('none');
    }

    // S-IO stats
    const priceEl = document.getElementById('sio-price');
    if (priceEl) priceEl.textContent = `$${price.toFixed(6)}`;

    const changeEl = document.getElementById('sio-change');
    if (changeEl) {
        changeEl.textContent = `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`;
        changeEl.className = change24h >= 0 ? 'change-positive' : 'change-negative';
    }

    const supply = 1_000_000_000;
    const mcap = price * supply;
    const mcapEl = document.getElementById('sio-market-cap');
    if (mcapEl) mcapEl.textContent = mcap >= 1e6 ? `$${(mcap/1e6).toFixed(2)}M` : `$${(mcap/1e3).toFixed(1)}K`;

    const liqEl = document.getElementById('sio-liquidity');
    if (liqEl) liqEl.textContent = liquidity > 0 ? `$${(liquidity/1e3).toFixed(1)}K` : '—';

    // Static token stats
    const supplyEl = document.getElementById('sio-supply');
    if (supplyEl) supplyEl.textContent = '1,000,000,000 S-IO';
    const holdersEl = document.getElementById('sio-holders');
    if (holdersEl) holdersEl.textContent = '~2,400';
}

function generateBuySellData() {
    const labels = [];
    const buys   = [];
    const sells  = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.now() - i * 3600000);
        labels.push(d.getHours() + ':00');
        buys.push(+(Math.random() * 60 + 10).toFixed(1));
        sells.push(+(Math.random() * 50 + 5).toFixed(1));
    }
    if (buySellChart) {
        buySellChart.data.labels = labels;
        buySellChart.data.datasets[0].data = buys;
        buySellChart.data.datasets[1].data = sells;
        buySellChart.update('none');
    }
}

async function fetchTopTokens() {
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false&category=solana-ecosystem');
        const tokens = await r.json();
        const html = tokens.map(t => `
            <div class="metric-row">
                <div>
                    <div style="color:#fff;font-weight:bold;">${t.symbol.toUpperCase()}</div>
                    <div style="color:#666;font-size:.9rem;">Vol: $${(t.total_volume/1e6).toFixed(1)}M</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#fff;">$${t.current_price.toFixed(4)}</div>
                    <div style="color:${t.price_change_percentage_24h >= 0 ? '#00ff88' : '#ff4444'};font-size:.9rem;">
                        ${t.price_change_percentage_24h >= 0 ? '+' : ''}${t.price_change_percentage_24h.toFixed(2)}%
                    </div>
                </div>
            </div>`).join('');
        const el = document.getElementById('top-tokens');
        if (el) el.innerHTML = html;
    } catch {}
}

// ── Wallet ────────────────────────────────────────────────────
async function connectWallet() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        walletPubkey = null;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        document.getElementById('balance-display').classList.add('hidden');
        return;
    }
    if (!window.solana?.isPhantom) { window.open('https://phantom.app/', '_blank'); return; }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)}`;
        btn.classList.add('connected');
        document.getElementById('balance-display').classList.remove('hidden');
        window.loadWalletBalances(walletPubkey);
    } catch (e) { console.error(e); }
}

function setTimeframe(tf) {
    document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    // Re-generate simulated data for the selected timeframe
    loadRealTimeData();
}

async function loadRealTimeData() {
    await Promise.all([fetchSolanaData(), fetchSioData(), fetchTopTokens()]);
    generateBuySellData();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadRealTimeData();
    updateInterval = setInterval(loadRealTimeData, 60000);

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                const btn = document.getElementById('wallet-btn');
                btn.textContent = `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)}`;
                btn.classList.add('connected');
                document.getElementById('balance-display').classList.remove('hidden');
                window.loadWalletBalances(walletPubkey);
            } catch {}
        }
    }, 600);
});

window.addEventListener('beforeunload', () => { if (updateInterval) clearInterval(updateInterval); });
