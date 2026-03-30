let revenueData = {};
let wallet = null;
let updateInterval;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    initDashboard();
    startRealTimeUpdates();

    window.addEventListener('balanceUpdated', () => loadWalletData());
    window.addEventListener('walletConnected', (e) => {
        const pub = e.detail && e.detail.publicKey;
        if (pub) { wallet = { toString: () => pub }; loadWalletData(); }
    });
    window.addEventListener('walletDisconnected', () => {
        wallet = null;
        document.querySelector('.metrics-grid')?.querySelectorAll('[data-wallet-card]').forEach(el => el.remove());
    });

    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                wallet = r.publicKey;
                const btn = document.getElementById('wallet-btn');
                btn.textContent = wallet.toString().slice(0,4) + '...' + wallet.toString().slice(-4);
                btn.classList.add('connected');
                document.getElementById('balance-display')?.classList.remove('hidden');
                window.loadWalletBalances?.(wallet.toString());
                loadWalletData();
            } catch {}
        }
    }, 600);
});

async function connectWallet() {
    try {
        if (wallet) {
            if (window.solana?.isPhantom) await window.solana.disconnect();
            wallet = null;
            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');
            document.getElementById('balance-display').classList.add('hidden');
            document.querySelector('.metrics-grid')?.querySelectorAll('[data-wallet-card]').forEach(c => c.remove());
            return;
        }
        if (!window.solana?.isPhantom) { window.open('https://phantom.app/', '_blank'); return; }
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = wallet.toString().slice(0,4) + '...' + wallet.toString().slice(-4);
        btn.classList.add('connected');
        document.getElementById('balance-display').classList.remove('hidden');
        window.loadWalletBalances?.(wallet.toString());
        loadWalletData();
    } catch (error) {
        console.error('Wallet connection error:', error);
    }
}

async function loadWalletData() {
    if (!wallet) return;
    const cached = window._cachedBalances;
    if (!cached) { window.loadWalletBalances?.(wallet.toString()); return; }
    const metricsGrid = document.querySelector('.metrics-grid');
    if (!metricsGrid) return;
    metricsGrid.querySelectorAll('[data-wallet-card]').forEach(el => el.remove());

    const solPrice = window._cachedSolPrice || 188;

    const solCard = document.createElement('div');
    solCard.className = 'metric-card';
    solCard.dataset.walletCard = '1';
    solCard.innerHTML =
        '<div class="metric-label">Your SOL Balance</div>' +
        '<div class="metric-value">' + cached.sol.toFixed(4) + ' SOL</div>' +
        '<div class="metric-change">~$' + (cached.sol * solPrice).toFixed(0) + ' USD</div>';

    const sioCard = document.createElement('div');
    sioCard.className = 'metric-card';
    sioCard.dataset.walletCard = '1';
    sioCard.innerHTML =
        '<div class="metric-label">Your S-IO Balance</div>' +
        '<div class="metric-value">' + cached.sio.toLocaleString() + ' S-IO</div>';

    metricsGrid.appendChild(solCard);
    metricsGrid.appendChild(sioCard);
}

async function initDashboard() {
    await fetchRevenueMetrics();
    updateMetrics();
    drawRevenueChart();
    loadBotLeaderboard();
    loadActivityFeed();
}

async function fetchRevenueMetrics() {
    revenueData = {
        tvl: 2_400_000 + Math.random() * 200_000,
        volume_24h: 847_000 + Math.random() * 50_000,
        revenue_24h: 12_300 + Math.random() * 1_000,
        active_users: 1247 + Math.floor(Math.random() * 50),
        bot_roi: 18.4 + (Math.random() - 0.5) * 2,
        tokens_created: 89 + Math.floor(Math.random() * 5),
        trading_fees: 8_500,
        token_launch_fees: 2_800,
        subscription_revenue: 1_000,
        tvl_change: 3.2, volume_change: 7.1, revenue_change: 5.4, user_change: 2.8
    };
}

function updateMetrics() {
    if (!revenueData) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('tvl',     (revenueData.tvl / 1e6).toFixed(1) + 'M');
    set('volume',  (revenueData.volume_24h / 1e3).toFixed(0) + 'K');
    set('revenue', (revenueData.revenue_24h / 1e3).toFixed(1) + 'K');
    set('users',   revenueData.active_users.toLocaleString());
    set('bot-roi', '+' + revenueData.bot_roi.toFixed(1) + '%');
    set('tokens',  revenueData.tokens_created);
    updateChangeIndicators();
}

function updateChangeIndicators() {
    const changes = { tvl: revenueData.tvl_change, volume: revenueData.volume_change, revenue: revenueData.revenue_change, users: revenueData.user_change };
    Object.entries(changes).forEach(([key, change]) => {
        document.querySelectorAll('.metric-change').forEach(el => {
            if (el.parentElement.querySelector('.metric-label')?.textContent.toLowerCase().includes(key)) {
                el.textContent = (change >= 0 ? '+' : '') + (change || 0).toFixed(1) + '% (24h)';
                el.className = 'metric-change ' + (change >= 0 ? 'positive' : 'negative');
            }
        });
    });
}

function drawRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas || !revenueData.trading_fees) return;
    const ctx = canvas.getContext('2d');
    const total = revenueData.trading_fees + revenueData.token_launch_fees + revenueData.subscription_revenue;
    const data = [revenueData.trading_fees, revenueData.token_launch_fees, revenueData.subscription_revenue].map(v => (v / total) * 100);
    const colors = ['#0066ff', '#00ff88', '#ff8800'];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let angle = -Math.PI / 2;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = 80;
    data.forEach((pct, i) => {
        const slice = (pct / 100) * 2 * Math.PI;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.closePath(); ctx.fillStyle = colors[i]; ctx.fill();
        angle += slice;
    });
    const legend = document.querySelector('.chart-container div:nth-child(2)');
    if (legend) {
        const labels = ['Trading Fees', 'Token Launches', 'Bot Subscriptions'];
        legend.innerHTML = data.map((pct, i) =>
            '<div style="margin-bottom:1rem"><span style="color:' + colors[i] + '">●</span> ' +
            labels[i] + ': ' + (data[i] === data[0] ? revenueData.trading_fees : data[i] === data[1] ? revenueData.token_launch_fees : revenueData.subscription_revenue) / 1000 + 'K (' + pct.toFixed(1) + '%)</div>'
        ).join('');
    }
}

function loadBotLeaderboard() {
    const el = document.getElementById('bot-leaderboard');
    if (!el) return;
    const bots = [
        { name: 'DCA Master', roi: '+24.3%' },
        { name: 'Momentum Pro', roi: '+19.7%' },
        { name: 'Arbitrage King', roi: '+15.2%' },
        { name: 'Grid Trader', roi: '+12.8%' }
    ];
    el.innerHTML = bots.map((b, i) =>
        '<div style="display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #333">' +
        '<span style="color:#fff">#' + (i+1) + ' ' + b.name + '</span>' +
        '<span style="color:#00ff88">' + b.roi + '</span></div>'
    ).join('');
}

function loadActivityFeed() {
    const el = document.getElementById('activity-feed');
    if (!el) return;
    const now = Date.now();
    const syms = ['MOON','ROCKET','PEPE','BONK','WIF','POPCAT'];
    const sym = syms[Math.floor(Math.random() * syms.length)];
    const activities = [
        { msg: 'Large swap: ' + (Math.random() * 100).toFixed(0) + ' SOL → USDC', time: new Date(now - Math.random() * 600000).toLocaleTimeString() },
        { msg: 'New token launched: ' + sym, time: new Date(now - Math.random() * 1200000).toLocaleTimeString() },
        { msg: 'Bot achieved +' + (Math.random() * 30).toFixed(1) + '% ROI', time: new Date(now - Math.random() * 1800000).toLocaleTimeString() },
        { msg: Math.floor(Math.random() * 20) + ' new users joined', time: new Date(now - Math.random() * 2400000).toLocaleTimeString() }
    ];
    el.innerHTML = activities.map(a =>
        '<div style="padding:.5rem 0;border-bottom:1px solid #333;color:#ccc;font-size:.9rem">' +
        '<div>' + a.msg + '</div><div style="color:#666;font-size:.8rem">' + a.time + '</div></div>'
    ).join('');
}

function startRealTimeUpdates() {
    updateInterval = setInterval(async () => {
        await fetchRevenueMetrics();
        updateMetrics();
        drawRevenueChart();
        loadActivityFeed();
    }, 10000);
}

window.addEventListener('beforeunload', () => { if (updateInterval) clearInterval(updateInterval); });
