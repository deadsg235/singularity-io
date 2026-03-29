let revenueData = {};
let wallet = null;
let updateInterval;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    initDashboard();
    startRealTimeUpdates();

    // Listen for balance updates from wallet-balance-loader
    window.addEventListener('balanceUpdated', () => loadWalletData());

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                wallet = r.publicKey;
                const btn = document.getElementById('wallet-btn');
                btn.textContent = `${wallet.toString().slice(0,4)}...${wallet.toString().slice(-4)}`;
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
            const metricsGrid = document.querySelector('.metrics-grid');
            metricsGrid?.querySelectorAll('.metric-card[data-wallet-card]').forEach(c => c.remove());
            return;
        }

        if (!window.solana?.isPhantom) { window.open('https://phantom.app/', '_blank'); return; }

        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0,4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        document.getElementById('balance-display').classList.remove('hidden');
        window.loadWalletBalances?.(wallet.toString());
        loadWalletData();
        console.log('Wallet connected:', wallet.toString());
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
    const solCard = document.createElement('div');
    solCard.className = 'metric-card'; solCard.dataset.walletCard = '1';
    solCard.innerHTML = '<div class="metric-label">Your SOL Balance</div>' +
        '<div class="metric-value">' + cached.sol.toFixed(4) + ' SOL</div>' +
        '<div class="metric-change">~$' + (cached.sol * 188).toFixed(0) + ' USD</div>';
    const sioCard = document.createElement('div');
    sioCard.className = 'metric-card'; sioCard.dataset.walletCard = '1';
    sioCard.innerHTML = '<div class="metric-label">Your S-IO Balance</div>' +
        '<div class="metric-value">' + cached.sio.toLocaleString() + ' S-IO</div>';
    metricsGrid.appendChild(solCard); metricsGrid.appendChild(sioCard);
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
    document.getElementById('tvl').textContent = (revenueData.tvl / 1000000).toFixed(1) + 'M';
    document.getElementById('volume').textContent = (revenueData.volume_24h / 1000).toFixed(0) + 'K';
    document.getElementById('revenue').textContent = (revenueData.revenue_24h / 1000).toFixed(1) + 'K';
    document.getElementById('users').textContent = revenueData.active_users.toLocaleString();
    document.getElementById('bot-roi').textContent = '+' + revenueData.bot_roi.toFixed(1) + '%';
    document.getElementById('tokens').textContent = revenueData.tokens_created;
    updateChangeIndicators();
}

function updateChangeIndicators() {
    const changes = {
        tvl: revenueData.tvl_change || 0,
        volume: revenueData.volume_change || 0,
        revenue: revenueData.revenue_change || 0,
        users: revenueData.user_change || 0
    };
    Object.entries(changes).forEach(([key, change]) => {
        document.querySelectorAll('.metric-change').forEach(el => {
            if (el.parentElement.querySelector('.metric-label')?.textContent.toLowerCase().includes(key)) {
                el.textContent = (change >= 0 ? '+' : '') + change.toFixed(1) + '% (24h)';
                el.className = 'metric-change ' + (change >= 0 ? 'positive' : 'negative');
            }
        });
    });
}

function drawRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!revenueData.trading_fees) return;
    const total = revenueData.trading_fees + revenueData.token_launch_fees + revenueData.subscription_revenue;
    const data = [
        (revenueData.trading_fees / total) * 100,
        (revenueData.token_launch_fees / total) * 100,
        (revenueData.subscription_revenue / total) * 100
    ];
    const colors = ['#0066ff', '#00ff88', '#ff8800'];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let currentAngle = -Math.PI / 2;
    const centerX = canvas.width / 2, centerY = canvas.height / 2, radius = 80;
    data.forEach((value, i) => {
        const sliceAngle = (value / 100) * 2 * Math.PI;
        ctx.beginPath(); ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath(); ctx.fillStyle = colors[i]; ctx.fill();
        currentAngle += sliceAngle;
    });
    const legend = document.querySelector('.chart-container div:nth-child(2)');
    if (legend) {
        legend.innerHTML =
            '<div style="margin-bottom:1rem"><span style="color:#0066ff">●</span> Trading Fees: ' + (revenueData.trading_fees/1000).toFixed(1) + 'K (' + data[0].toFixed(1) + '%)</div>' +
            '<div style="margin-bottom:1rem"><span style="color:#00ff88">●</span> Token Launches: ' + (revenueData.token_launch_fees/1000).toFixed(1) + 'K (' + data[1].toFixed(1) + '%)</div>' +
            '<div style="margin-bottom:1rem"><span style="color:#ff8800">●</span> Bot Subscriptions: ' + (revenueData.subscription_revenue/1000).toFixed(1) + 'K (' + data[2].toFixed(1) + '%)</div>';
    }
}

function loadBotLeaderboard() {
    const bots = [
        { name: 'DCA Master', roi: '+24.3%' },
        { name: 'Momentum Pro', roi: '+19.7%' },
        { name: 'Arbitrage King', roi: '+15.2%' },
        { name: 'Grid Trader', roi: '+12.8%' }
    ];
    const el = document.getElementById('bot-leaderboard');
    if (!el) return;
    el.innerHTML = bots.map((bot, i) =>
        '<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #333">' +
        '<span style="color:#fff">#' + (i+1) + ' ' + bot.name + '</span>' +
        '<span style="color:#00ff88">' + bot.roi + '</span></div>'
    ).join('');
}

function loadActivityFeed() {
    const now = Date.now();
    const symbols = ['MOON', 'ROCKET', 'PEPE', 'BONK', 'WIF', 'POPCAT'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const activities = [
        { msg: 'Large swap: ' + (Math.random() * 100).toFixed(0) + ' SOL → USDC', time: new Date(now - Math.random() * 600000).toLocaleTimeString() },
        { msg: 'New token launched: ' + sym, time: new Date(now - Math.random() * 1200000).toLocaleTimeString() },
        { msg: 'Bot achieved +' + (Math.random() * 30).toFixed(1) + '% ROI', time: new Date(now - Math.random() * 1800000).toLocaleTimeString() },
        { msg: Math.floor(Math.random() * 20) + ' new users joined', time: new Date(now - Math.random() * 2400000).toLocaleTimeString() }
    ];
    const el = document.getElementById('activity-feed');
    if (!el) return;
    el.innerHTML = activities.map(a =>
        '<div style="padding:0.5rem 0;border-bottom:1px solid #333;color:#ccc;font-size:0.9rem">' +
        '<div>' + a.msg + '</div><div style="color:#666;font-size:0.8rem">' + a.time + '</div></div>'
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
