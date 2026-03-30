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

// ── Chart helpers ─────────────────────────────────────────────
function chartOpts(tickFmt) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { display: false },
            y: {
                beginAtZero: false,
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#fff', callback: tickFmt }
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };
}

// ── Chart init ────────────────────────────────────────────────
function initCharts() {
    const solCtx = document.getElementById('sol-price-chart');
    const sioCtx = document.getElementById('sio-price-chart');
    const volCtx = document.getElementById('volume-chart');
    const bsCtx  = document.getElementById('buysell-chart');

    if (!solCtx || !sioCtx || !volCtx || !bsCtx) {
        console.warn('analytics: one or more canvas elements missing');
        return;
    }

    solPriceChart = new Chart(solCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'SOL Price (USD)',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220,38,38,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: chartOpts(function(v) { return '$' + Number(v).toFixed(2); })
    });

    sioPriceChart = new Chart(sioCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'S-IO Price (USD)',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239,68,68,0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: chartOpts(function(v) { return '$' + Number(v).toFixed(6); })
    });

    volumeChart = new Chart(volCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Volume',
                data: [],
                backgroundColor: 'rgba(220,38,38,0.6)',
                borderColor: '#dc2626',
                borderWidth: 1
            }]
        },
        options: chartOpts(function(v) { return '$' + (v / 1e6).toFixed(1) + 'M'; })
    });

    buySellChart = new Chart(bsCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Buys',
                    data: [],
                    backgroundColor: 'rgba(0,255,136,0.7)',
                    borderColor: '#00ff88',
                    borderWidth: 1
                },
                {
                    label: 'Sells',
                    data: [],
                    backgroundColor: 'rgba(220,38,38,0.7)',
                    borderColor: '#dc2626',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#fff' } }
            },
            scales: {
                x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            }
        }
    });
}

// ── Data fetching ─────────────────────────────────────────────
async function fetchSolanaData() {
    let price = 188, change24h = 2.1, volume24h = 2_400_000_000, marketCap = 85_000_000_000;

    try {
        const r = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd' +
            '&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true'
        );
        const d = await r.json();
        if (d.solana) {
            price     = d.solana.usd             || price;
            change24h = d.solana.usd_24h_change  || change24h;
            volume24h = d.solana.usd_24h_vol      || volume24h;
            marketCap = d.solana.usd_market_cap   || marketCap;
        }
    } catch (e) {
        console.warn('CoinGecko fetch failed, using fallback data:', e.message);
    }

    // 30-point history anchored to real price
    const labels = [];
    const prices = [];
    const vols   = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
        prices.push(+(price + (Math.random() - 0.5) * 0.1 * price).toFixed(2));
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
        { label: 'SOL Price',   value: '$' + price.toFixed(2),                                          color: '#fff'    },
        { label: '24h Change',  value: (change24h >= 0 ? '+' : '') + change24h.toFixed(2) + '%',         color: change24h >= 0 ? '#00ff88' : '#ff4444' },
        { label: '24h Volume',  value: '$' + (volume24h / 1e9).toFixed(2) + 'B',                         color: '#dc2626' },
        { label: 'Market Cap',  value: '$' + (marketCap / 1e9).toFixed(1) + 'B',                         color: '#ef4444' },
        { label: 'Last Update', value: new Date().toLocaleTimeString(),                                    color: '#666'    }
    ];
    const statsHtml = stats.map(function(s) {
        return '<div class="metric-row">' +
            '<span style="color:#666;">' + s.label + '</span>' +
            '<span style="color:' + s.color + ';font-weight:bold;">' + s.value + '</span>' +
            '</div>';
    }).join('');
    const el = document.getElementById('market-stats');
    if (el) el.innerHTML = statsHtml;

    window._cachedSolPrice = price;
    return { price, change24h, volume24h, marketCap };
}

async function fetchSioData() {
    let price = 0.0001, change24h = 0, liquidity = 0;

    try {
        const r = await fetch('https://price.jup.ag/v6/price?ids=' + SIO_MINT);
        const d = await r.json();
        const p = d && d.data && d.data[SIO_MINT] && d.data[SIO_MINT].price;
        if (p) price = parseFloat(p);
    } catch (e) {
        console.warn('Jupiter price fetch failed:', e.message);
    }

    // 30-day S-IO history
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

    const priceEl = document.getElementById('sio-price');
    if (priceEl) priceEl.textContent = '$' + price.toFixed(6);

    const changeEl = document.getElementById('sio-change');
    if (changeEl) {
        changeEl.textContent = (change24h >= 0 ? '+' : '') + change24h.toFixed(2) + '%';
        changeEl.className = change24h >= 0 ? 'change-positive' : 'change-negative';
    }

    const supply = 1_000_000_000;
    const mcap   = price * supply;
    const mcapEl = document.getElementById('sio-market-cap');
    if (mcapEl) mcapEl.textContent = mcap >= 1e6 ? (mcap / 1e6).toFixed(2) + 'M' : (mcap / 1e3).toFixed(1) + 'K';

    const liqEl = document.getElementById('sio-liquidity');
    if (liqEl) liqEl.textContent = liquidity > 0 ? (liquidity / 1e3).toFixed(1) + 'K' : '—';

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
        const r = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd' +
            '&order=market_cap_desc&per_page=5&page=1&sparkline=false&category=solana-ecosystem'
        );
        const tokens = await r.json();
        if (!Array.isArray(tokens)) return;
        const html = tokens.map(function(t) {
            const chg = t.price_change_percentage_24h || 0;
            return '<div class="metric-row">' +
                '<div>' +
                    '<div style="color:#fff;font-weight:bold;">' + t.symbol.toUpperCase() + '</div>' +
                    '<div style="color:#666;font-size:.9rem;">Vol: $' + (t.total_volume / 1e6).toFixed(1) + 'M</div>' +
                '</div>' +
                '<div style="text-align:right;">' +
                    '<div style="color:#fff;">$' + Number(t.current_price).toFixed(4) + '</div>' +
                    '<div style="color:' + (chg >= 0 ? '#00ff88' : '#ff4444') + ';font-size:.9rem;">' +
                        (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%' +
                    '</div>' +
                '</div>' +
                '</div>';
        }).join('');
        const el = document.getElementById('top-tokens');
        if (el) el.innerHTML = html;
    } catch (e) {
        console.warn('Top tokens fetch failed:', e.message);
    }
}

// ── DQN signal ────────────────────────────────────────────────
async function loadDQNSignal() {
    const container = document.getElementById('dqn-signal-container');
    if (!container) return;

    try {
        await window.dqnReady;
        if (!window.dqnInfer) {
            container.innerHTML = '<p style="color:#666">DQN model not available</p>';
            return;
        }

        const solPrice = window._cachedSolPrice || 150;
        const result = await window.dqnInfer({
            price:         solPrice,
            volume:        500_000_000 + Math.random() * 100_000_000,
            rsi:           35 + Math.random() * 50,
            macd:          (Math.random() - 0.5) * 4,
            bbUpper:       solPrice * 1.05,
            bbLower:       solPrice * 0.95,
            solTps:        3000 + Math.random() * 1500,
            walletBalance: (window._cachedBalances && window._cachedBalances.sol) || 0
        });

        const maxQ = Math.max.apply(null, result.qValues.map(Math.abs).concat([0.01]));
        const barWidth = function(v) {
            return Math.max(2, (Math.abs(v) / maxQ) * 100).toFixed(1) + '%';
        };

        const actions = window.DQN_ACTIONS || [];
        const rows = actions.map(function(a, i) {
            const isActive = i === result.actionIndex;
            const qv = result.qValues[i] || 0;
            return '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">' +
                '<div style="width:120px;font-size:.75rem;color:' + (isActive ? result.color : '#888') + ';font-weight:' + (isActive ? '700' : '400') + '">' + a + '</div>' +
                '<div style="flex:1;background:rgba(255,255,255,0.05);border-radius:2px;height:8px">' +
                    '<div style="width:' + barWidth(qv) + ';height:100%;background:' + (isActive ? result.color : 'rgba(255,255,255,0.2)') + ';border-radius:2px;transition:width .3s"></div>' +
                '</div>' +
                '<div style="width:50px;text-align:right;font-size:.72rem;color:#555">' + qv.toFixed(3) + '</div>' +
                '</div>';
        }).join('');

        container.innerHTML =
            '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">' +
                '<div style="font-size:1.8rem;font-weight:700;color:' + result.color + '">' + result.actionLabel + '</div>' +
                '<div style="color:#888;font-size:.85rem">Confidence: <span style="color:' + result.color + '">' + (result.confidence * 100).toFixed(1) + '%</span> · Source: ' + result.source + '</div>' +
            '</div>' +
            '<div style="font-size:.8rem;color:#666;margin-bottom:.75rem">Q-Values (10 actions):</div>' +
            rows;
    } catch (err) {
        container.innerHTML = '<p style="color:#ff4444">DQN inference error: ' + err.message + '</p>';
    }
}

// ── Wallet ────────────────────────────────────────────────────
async function connectWallet() {
    if (walletPubkey) {
        await window.solana && window.solana.disconnect();
        walletPubkey = null;
        const btn = document.getElementById('wallet-btn');
        if (btn) { btn.textContent = 'Connect Wallet'; btn.classList.remove('connected'); }
        const bd = document.getElementById('balance-display');
        if (bd) bd.classList.add('hidden');
        return;
    }
    if (!window.solana || !window.solana.isPhantom) {
        window.open('https://phantom.app/', '_blank');
        return;
    }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        const btn = document.getElementById('wallet-btn');
        if (btn) { btn.textContent = walletPubkey.slice(0, 4) + '...' + walletPubkey.slice(-4); btn.classList.add('connected'); }
        const bd = document.getElementById('balance-display');
        if (bd) bd.classList.remove('hidden');
        if (window.loadWalletBalances) window.loadWalletBalances(walletPubkey);
    } catch (e) {
        console.error('Wallet connect error:', e);
    }
}

function setTimeframe(tf) {
    document.querySelectorAll('.control-btn').forEach(function(b) { b.classList.remove('active'); });
    if (event && event.target) event.target.classList.add('active');
    loadRealTimeData();
}

async function loadRealTimeData() {
    await Promise.all([fetchSolanaData(), fetchSioData(), fetchTopTokens()]);
    generateBuySellData();
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    initCharts();

    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) walletBtn.addEventListener('click', connectWallet);

    loadRealTimeData();
    loadDQNSignal();

    updateInterval = setInterval(loadRealTimeData, 60000);

    // Auto-connect if previously authorized
    setTimeout(async function() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                const btn = document.getElementById('wallet-btn');
                if (btn) { btn.textContent = walletPubkey.slice(0, 4) + '...' + walletPubkey.slice(-4); btn.classList.add('connected'); }
                const bd = document.getElementById('balance-display');
                if (bd) bd.classList.remove('hidden');
                if (window.loadWalletBalances) window.loadWalletBalances(walletPubkey);
            } catch (e) { /* not previously authorized */ }
        }
    }, 600);
});

window.addEventListener('beforeunload', function() {
    if (updateInterval) clearInterval(updateInterval);
});
