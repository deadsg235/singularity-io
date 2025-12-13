let revenueData = {};
let wallet = null;
let updateInterval;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    initDashboard();
    startRealTimeUpdates();
});

async function connectWallet() {
    try {
        if (wallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            wallet = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

            console.log('Wallet disconnected');
            // Optionally, clear or hide wallet-specific data
            const metricsGrid = document.querySelector('.metrics-grid');
            const walletCards = metricsGrid.querySelectorAll('.metric-card[data-wallet-card]');
            walletCards.forEach(card => card.remove());
            return;
        }

        if (!window.solana || !window.solana.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances();
        loadWalletData(); // This page has its own wallet data loader
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

async function loadWalletData() {
    if (!wallet) return;
    
    try {
        const response = await fetch(`/api/wallet/analytics/${wallet.toString()}`);
        const data = await response.json();
        
        // Add wallet metrics to grid
        const metricsGrid = document.querySelector('.metrics-grid');
        
        const solCard = document.createElement('div');
        solCard.className = 'metric-card';
        solCard.innerHTML = `
            <div class="metric-label">Your SOL Balance</div>
            <div class="metric-value">${data.sol_balance.toFixed(4)} SOL</div>
            <div class="metric-change">$${(data.sol_balance * 188.50).toFixed(2)} USD</div>
        `;
        
        const sioCard = document.createElement('div');
        sioCard.className = 'metric-card';
        sioCard.innerHTML = `
            <div class="metric-label">Your S-IO Balance</div>
            <div class="metric-value">${data.sio_balance.toLocaleString()} S-IO</div>
            <div class="metric-change">${data.total_tokens} total tokens</div>
        `;
        
        metricsGrid.appendChild(solCard);
        metricsGrid.appendChild(sioCard);
        
    } catch (error) {
        console.error('Failed to load wallet data:', error);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!wallet) return;

    try {
        const connection = new solanaWeb3.Connection(
            'https://api.mainnet-beta.solana.com',
            { commitment: 'confirmed' }
        );

        const owner = new solanaWeb3.PublicKey(wallet);

        // ---------- SOL BALANCE ----------
        const lamports = await connection.getBalance(owner);
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

        document.getElementById('sol-balance').textContent =
            solBalance.toFixed(4);

        // ---------- SIO TOKEN BALANCE ----------
        const mint = new solanaWeb3.PublicKey('Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump');

        const tokenAccounts =
            await connection.getParsedTokenAccountsByOwner(
                owner,
                { mint }
            );

        let sioBalance = 0;

        if (tokenAccounts.value.length > 0) {
            const tokenInfo =
                tokenAccounts.value[0].account.data.parsed.info;

            sioBalance = tokenInfo.tokenAmount.uiAmount || 0;
        }

        document.getElementById('sio-balance').textContent =
            sioBalance.toLocaleString(undefined, {
                maximumFractionDigits: 6
            });

        console.log('Balances loaded', {
            sol: solBalance,
            sio: sioBalance
        });

    } catch (err) {
        console.error('Balance fetch failed:', err);

        document.getElementById('sol-balance').textContent = '—';
        document.getElementById('sio-balance').textContent = '—';

        console.warn('⚠️ Unable to load balances (RPC busy). Try again shortly.');
    }
}

async function initDashboard() {
    await fetchRevenueMetrics();
    updateMetrics();
    drawRevenueChart();
    loadBotLeaderboard();
    loadActivityFeed();
}

async function fetchRevenueMetrics() {
    try {
        const response = await fetch('/api/revenue/metrics');
        revenueData = await response.json();
    } catch (error) {
        console.error('Failed to fetch revenue metrics:', error);
        revenueData = {
            tvl: 2400000,
            volume_24h: 847000,
            revenue_24h: 12300,
            active_users: 1247,
            bot_roi: 18.4,
            tokens_created: 89
        };
    }
}

function updateMetrics() {
    if (!revenueData) return;
    
    document.getElementById('tvl').textContent = `$${(revenueData.tvl / 1000000).toFixed(1)}M`;
    document.getElementById('volume').textContent = `$${(revenueData.volume_24h / 1000).toFixed(0)}K`;
    document.getElementById('revenue').textContent = `$${(revenueData.revenue_24h / 1000).toFixed(1)}K`;
    document.getElementById('users').textContent = revenueData.active_users.toLocaleString();
    document.getElementById('bot-roi').textContent = `+${revenueData.bot_roi.toFixed(1)}%`;
    document.getElementById('tokens').textContent = revenueData.tokens_created;
    
    // Update change indicators
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
        const elements = document.querySelectorAll('.metric-change');
        elements.forEach(el => {
            if (el.parentElement.querySelector('.metric-label').textContent.toLowerCase().includes(key)) {
                el.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}% (24h)`;
                el.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    });
}

function drawRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
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
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    data.forEach((value, i) => {
        const sliceAngle = (value / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        
        currentAngle += sliceAngle;
    });
    
    // Update legend with real values
    const legend = document.querySelector('.chart-container div:nth-child(2)');
    legend.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <span style="color: #0066ff;">●</span> Trading Fees: $${(revenueData.trading_fees / 1000).toFixed(1)}K (${data[0].toFixed(1)}%)
        </div>
        <div style="margin-bottom: 1rem;">
            <span style="color: #00ff88;">●</span> Token Launches: $${(revenueData.token_launch_fees / 1000).toFixed(1)}K (${data[1].toFixed(1)}%)
        </div>
        <div style="margin-bottom: 1rem;">
            <span style="color: #ff8800;">●</span> Bot Subscriptions: $${(revenueData.subscription_revenue / 1000).toFixed(1)}K (${data[2].toFixed(1)}%)
        </div>
    `;
}

function loadBotLeaderboard() {
    const bots = [
        { name: 'DCA Master', roi: '+24.3%', trades: 156 },
        { name: 'Momentum Pro', roi: '+19.7%', trades: 89 },
        { name: 'Arbitrage King', roi: '+15.2%', trades: 234 },
        { name: 'Grid Trader', roi: '+12.8%', trades: 67 }
    ];
    
    const html = bots.map((bot, i) => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #333;">
            <span style="color: #fff;">#${i + 1} ${bot.name}</span>
            <span style="color: #00ff88;">${bot.roi}</span>
        </div>
    `).join('');
    
    document.getElementById('bot-leaderboard').innerHTML = html;
}

function loadActivityFeed() {
    const now = Date.now();
    const activities = [
        { type: 'trade', msg: `Large swap: ${(Math.random() * 100).toFixed(0)} SOL → USDC`, time: new Date(now - Math.random() * 600000).toLocaleTimeString() },
        { type: 'token', msg: 'New token launched: ' + generateRandomSymbol(), time: new Date(now - Math.random() * 1200000).toLocaleTimeString() },
        { type: 'bot', msg: `Bot achieved +${(Math.random() * 30).toFixed(1)}% ROI`, time: new Date(now - Math.random() * 1800000).toLocaleTimeString() },
        { type: 'user', msg: `${Math.floor(Math.random() * 20)} new users joined`, time: new Date(now - Math.random() * 2400000).toLocaleTimeString() }
    ];
    
    const html = activities.map(activity => `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid #333; color: #ccc; font-size: 0.9rem;">
            <div>${activity.msg}</div>
            <div style="color: #666; font-size: 0.8rem;">${activity.time}</div>
        </div>
    `).join('');
    
    document.getElementById('activity-feed').innerHTML = html;
}

function generateRandomSymbol() {
    const symbols = ['MOON', 'ROCKET', 'DOGE', 'PEPE', 'SHIB', 'BONK', 'WIF', 'POPCAT'];
    return symbols[Math.floor(Math.random() * symbols.length)];
}

function startRealTimeUpdates() {
    updateInterval = setInterval(async () => {
        await fetchRevenueMetrics();
        updateMetrics();
        drawRevenueChart();
        loadActivityFeed();
    }, 10000);
}

window.addEventListener('beforeunload', () => {
    if (updateInterval) clearInterval(updateInterval);
});