/**
 * leaderboard.js — fully client-side, no /api/* calls
 */

let walletPubkey = null;
let currentTab   = 'daily';

// Static mock traders (10 entries)
const BASE_TRADERS = [
    { addr: 'CrypK...1247', pnl: 2847.32,  roi: 24.3,  trades: 15,  winRate: 86.7, followers: 1247 },
    { addr: 'SolW...0892',  pnl: 1923.45,  roi: 19.7,  trades: 23,  winRate: 78.3, followers: 892  },
    { addr: 'DeFi...0634',  pnl: 1456.78,  roi: 15.2,  trades: 31,  winRate: 74.2, followers: 634  },
    { addr: 'TknH...0456',  pnl: 1234.56,  roi: 12.8,  trades: 18,  winRate: 72.2, followers: 456  },
    { addr: 'Meme...0321',  pnl:  987.65,  roi: 11.4,  trades: 27,  winRate: 70.4, followers: 321  },
    { addr: 'Arb7...0289',  pnl:  876.43,  roi:  9.8,  trades: 42,  winRate: 68.9, followers: 289  },
    { addr: 'Grid...0201',  pnl:  754.21,  roi:  8.3,  trades: 56,  winRate: 66.1, followers: 201  },
    { addr: 'Moon...0178',  pnl:  632.10,  roi:  7.1,  trades: 19,  winRate: 63.2, followers: 178  },
    { addr: 'Diam...0134',  pnl:  521.87,  roi:  5.9,  trades: 33,  winRate: 60.6, followers: 134  },
    { addr: 'Whal...0098',  pnl:  412.34,  roi:  4.7,  trades: 11,  winRate: 54.5, followers: 98   }
];

const PERIOD_MULTIPLIERS = { daily: 1, weekly: 7, monthly: 30, 'all-time': 365 };

const TOP_STRATEGIES = [
    { name: 'DCA Accumulation', users: 342, roi: 34.2 },
    { name: 'Momentum Scalp',   users: 218, roi: 28.7 },
    { name: 'Grid Trading',     users: 189, roi: 22.1 },
    { name: 'Arbitrage Bot',    users: 97,  roi: 18.4 },
    { name: 'Trend Following',  users: 156, roi: 15.9 }
];

const MARKET_LEADERS = [
    { token: 'SOL',  leader: 'CrypK...1247', pnl: 12400 },
    { token: 'JUP',  leader: 'DeFi...0634',  pnl: 8700  },
    { token: 'BONK', leader: 'Meme...0321',  pnl: 6200  },
    { token: 'RAY',  leader: 'Grid...0201',  pnl: 4800  },
    { token: 'S-IO', leader: 'SolW...0892',  pnl: 3100  }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);
    renderLeaderboard();
    renderTopStrategies();
    renderMarketLeaders();

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                onConnect(walletPubkey);
            } catch {}
        }
    }, 600);
});

async function handleWalletClick() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        walletPubkey = null;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        document.getElementById('balance-display').classList.add('hidden');
        renderLeaderboard();
        return;
    }
    if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        onConnect(walletPubkey);
    } catch (e) { console.error(e); }
}

function onConnect(pub) {
    const btn = document.getElementById('wallet-btn');
    btn.textContent = `${pub.slice(0,4)}...${pub.slice(-4)}`;
    btn.classList.add('connected');
    document.getElementById('balance-display').classList.remove('hidden');
    window.loadWalletBalances(pub);
    renderLeaderboard();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderLeaderboard();
}

function renderLeaderboard() {
    const mult = PERIOD_MULTIPLIERS[currentTab] || 1;
    // Scale mock data by period multiplier with slight randomness
    let traders = BASE_TRADERS.map((t, i) => ({
        rank: i + 1,
        addr: t.addr,
        pnl:      +(t.pnl  * mult * (0.9 + Math.random() * 0.2)).toFixed(2),
        roi:      +(t.roi  * Math.sqrt(mult) * (0.9 + Math.random() * 0.2)).toFixed(1),
        trades:   Math.round(t.trades * mult * (0.8 + Math.random() * 0.4)),
        winRate:  +(t.winRate * (0.97 + Math.random() * 0.06)).toFixed(1),
        followers: t.followers
    }));

    // Insert user's wallet at random rank if connected
    if (walletPubkey) {
        let botStats = { total: 0, success: 0, pnl: 0 };
        try { botStats = JSON.parse(localStorage.getItem('bot-stats') || '{}'); } catch {}
        const userRank = Math.floor(Math.random() * 5) + 4; // rank 4-8
        const userEntry = {
            rank: userRank,
            addr: `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)} (You)`,
            pnl:      +(botStats.pnl || 0).toFixed(2),
            roi:      +((botStats.pnl || 0) / 10).toFixed(1),
            trades:   botStats.total || 0,
            winRate:  botStats.total > 0 ? +((botStats.success / botStats.total) * 100).toFixed(1) : 0,
            followers: 0,
            isUser: true
        };
        traders.splice(userRank - 1, 0, userEntry);
        traders = traders.slice(0, 11).map((t, i) => ({ ...t, rank: i + 1 }));
    }

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = traders.map(t => `
        <tr style="${t.isUser ? 'background:rgba(220,38,38,0.1);' : ''}">
            <td class="rank">#${t.rank}</td>
            <td style="color:${t.isUser ? '#ef4444' : '#fff'};">${t.addr}</td>
            <td class="${t.pnl >= 0 ? 'profit' : 'loss'}">$${t.pnl.toLocaleString()}</td>
            <td class="${t.roi >= 0 ? 'profit' : 'loss'}">${t.roi >= 0 ? '+' : ''}${t.roi}%</td>
            <td>${t.trades}</td>
            <td>${t.winRate}%</td>
            <td>${t.followers}</td>
            <td><button onclick="followTrader('${t.addr}')" style="padding:.4rem .9rem;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.85rem;">Follow</button></td>
        </tr>`).join('');
}

function renderTopStrategies() {
    const html = TOP_STRATEGIES.map(s => `
        <div style="display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid #333;">
            <div>
                <div style="color:#fff;font-weight:bold;">${s.name}</div>
                <div style="color:#666;font-size:.9rem;">${s.users} users</div>
            </div>
            <div style="color:#ef4444;font-weight:bold;">+${s.roi}%</div>
        </div>`).join('');
    const el = document.getElementById('top-strategies');
    if (el) el.innerHTML = html;
}

function renderMarketLeaders() {
    const html = MARKET_LEADERS.map(l => `
        <div style="display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid #333;">
            <div>
                <div style="color:#dc2626;font-weight:bold;">${l.token}</div>
                <div style="color:#ccc;font-size:.9rem;">${l.leader}</div>
            </div>
            <div style="color:#ef4444;font-weight:bold;">+$${(l.pnl/1000).toFixed(1)}K</div>
        </div>`).join('');
    const el = document.getElementById('market-leaders');
    if (el) el.innerHTML = html;
}

function followTrader(addr) {
    alert(`Now following ${addr}!`);
}
