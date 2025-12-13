let currentTab = 'daily';

const leaderboardData = {
    daily: [
        { rank: 1, name: 'CryptoKing', pnl: 2847.32, roi: 24.3, trades: 15, winRate: 86.7, followers: 1247 },
        { rank: 2, name: 'SolanaWhale', pnl: 1923.45, roi: 19.7, trades: 23, winRate: 78.3, followers: 892 },
        { rank: 3, name: 'DeFiMaster', pnl: 1456.78, roi: 15.2, trades: 31, winRate: 74.2, followers: 634 },
        { rank: 4, name: 'TokenHunter', pnl: 1234.56, roi: 12.8, trades: 18, winRate: 72.2, followers: 456 },
        { rank: 5, name: 'MemeTrader', pnl: 987.65, roi: 11.4, trades: 27, winRate: 70.4, followers: 321 }
    ],
    weekly: [
        { rank: 1, name: 'CryptoKing', pnl: 15847.32, roi: 124.3, trades: 89, winRate: 84.3, followers: 1247 },
        { rank: 2, name: 'DeFiMaster', pnl: 12456.78, roi: 98.7, trades: 156, winRate: 76.9, followers: 634 },
        { rank: 3, name: 'SolanaWhale', pnl: 9823.45, roi: 87.2, trades: 134, winRate: 73.1, followers: 892 }
    ],
    monthly: [
        { rank: 1, name: 'CryptoKing', pnl: 67847.32, roi: 456.7, trades: 423, winRate: 82.7, followers: 1247 },
        { rank: 2, name: 'DeFiMaster', pnl: 54321.09, roi: 387.4, trades: 567, winRate: 78.2, followers: 634 }
    ],
    'all-time': [
        { rank: 1, name: 'CryptoKing', pnl: 234567.89, roi: 1234.5, trades: 2341, winRate: 81.4, followers: 1247 },
        { rank: 2, name: 'DeFiMaster', pnl: 187654.32, roi: 987.6, trades: 1876, winRate: 77.8, followers: 634 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadLeaderboard();
    loadTopStrategies();
    loadMarketLeaders();
});

async function connectWallet() {
    try {
        if (window.globalWallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            window.globalWallet = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana?.isPhantom) {
            alert('Install Phantom Wallet');
            return;
        }
        
        const resp = await window.solana.connect();
        window.globalWallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${window.globalWallet.toString().slice(0, 4)}...${window.globalWallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances();
        
        console.log('Wallet connected:', window.globalWallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!window.globalWallet) return;

    try {
        const connection = new solanaWeb3.Connection(
            'https://api.mainnet-beta.solana.com',
            { commitment: 'confirmed' }
        );

        const owner = new solanaWeb3.PublicKey(window.globalWallet);

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

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    loadLeaderboard();
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`/api/leaderboard/${currentTab}`);
        const result = await response.json();
        const data = result.leaderboard;
        
        const tbody = document.getElementById('leaderboard-body');
        
        tbody.innerHTML = data.map(trader => `
            <tr>
                <td class="rank">#${trader.rank}</td>
                <td>${trader.name}</td>
                <td class="${trader.pnl > 0 ? 'profit' : 'loss'}">$${trader.pnl.toLocaleString()}</td>
                <td class="${trader.roi > 0 ? 'profit' : 'loss'}">+${trader.roi.toFixed(1)}%</td>
                <td>${trader.trades}</td>
                <td>${trader.winRate}%</td>
                <td>${trader.followers}</td>
                <td><button onclick="followTrader('${trader.name}')" style="padding: 0.5rem 1rem; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer;">Follow</button></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        // Fallback to static data
        const data = leaderboardData[currentTab] || leaderboardData.daily;
        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = data.map(trader => `
            <tr>
                <td class="rank">#${trader.rank}</td>
                <td>${trader.name}</td>
                <td class="${trader.pnl > 0 ? 'profit' : 'loss'}">$${trader.pnl.toLocaleString()}</td>
                <td class="${trader.roi > 0 ? 'profit' : 'loss'}">+${trader.roi}%</td>
                <td>${trader.trades}</td>
                <td>${trader.winRate}%</td>
                <td>${trader.followers}</td>
                <td><button onclick="followTrader('${trader.name}')" style="padding: 0.5rem 1rem; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer;">Follow</button></td>
            </tr>
        `).join('');
    }
}

async function loadTopStrategies() {
    try {
        const response = await fetch('/api/leaderboard/strategies');
        const result = await response.json();
        const strategies = result.strategies;
        
        const html = strategies.map(strategy => `
            <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #333;">
                <div>
                    <div style="color: #fff; font-weight: bold;">${strategy.name}</div>
                    <div style="color: #666; font-size: 0.9rem;">${strategy.users} users</div>
                </div>
                <div style="color: #00ff88; font-weight: bold;">+${strategy.roi.toFixed(1)}%</div>
            </div>
        `).join('');
        
        document.getElementById('top-strategies').innerHTML = html;
    } catch (error) {
        console.error('Failed to load strategies:', error);
    }
}

async function loadMarketLeaders() {
    try {
        const response = await fetch('/api/leaderboard/market-leaders');
        const result = await response.json();
        const leaders = result.market_leaders;
        
        const html = leaders.map(leader => `
            <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #333;">
                <div>
                    <div style="color: #0066ff; font-weight: bold;">${leader.token}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">${leader.leader}</div>
                </div>
                <div style="color: #00ff88; font-weight: bold;">+$${(leader.pnl/1000).toFixed(1)}K</div>
            </div>
        `).join('');
        
        document.getElementById('market-leaders').innerHTML = html;
    } catch (error) {
        console.error('Failed to load market leaders:', error);
    }
}

function followTrader(traderName) {
    alert(`Now following ${traderName}! Copy trading activated.`);
}