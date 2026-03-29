/**
 * social.js — fully client-side, no /api/* calls
 */

let walletPubkey = null;
let following    = [];
let copyPnL      = 0;

const TOP_TRADERS = [
    { name: 'CryptoKing',    roi: '+156.7%', followers: 2847, verified: true,  avatar: '👑', pnl: 15600 },
    { name: 'SolanaWhale',   roi: '+134.2%', followers: 1923, verified: true,  avatar: '🐋', pnl: 13400 },
    { name: 'DeFiMaster',    roi: '+98.5%',  followers: 1456, verified: false, avatar: '🚀', pnl: 9850  },
    { name: 'MoonShot',      roi: '+87.3%',  followers: 1234, verified: true,  avatar: '🌙', pnl: 8730  },
    { name: 'DiamondHands',  roi: '+76.8%',  followers: 987,  verified: false, avatar: '💎', pnl: 7680  }
];

const TOKENS_LIST = ['SOL', 'BONK', 'JUP', 'RAY', 'S-IO', 'USDC'];

let tradingSignals = generateSignals();
let communityPosts = loadPosts();

function generateSignals() {
    return Array.from({ length: 5 }, () => {
        const trader = TOP_TRADERS[Math.floor(Math.random() * TOP_TRADERS.length)];
        const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const token  = TOKENS_LIST[Math.floor(Math.random() * TOKENS_LIST.length)];
        const price  = '$' + (Math.random() * 200 + 0.001).toFixed(token === 'BONK' ? 6 : 2);
        return { trader: trader.name, action, token, price, confidence: Math.floor(Math.random() * 20) + 80, time: 'just now' };
    });
}

function loadPosts() {
    const defaults = [
        { user: 'CryptoKing',   content: 'SOL looking bullish above $185 support. Target $200+',          likes: 47, time: '15m ago' },
        { user: 'SolanaWhale',  content: 'Taking profits on BONK. Market showing signs of weakness',       likes: 23, time: '32m ago' },
        { user: 'DeFiMaster',   content: 'JUP breakout incoming. Volume increasing significantly',          likes: 31, time: '1h ago'  },
        { user: 'MoonShot',     content: 'S-IO accumulation zone. Long-term hold confirmed.',               likes: 18, time: '2h ago'  },
        { user: 'DiamondHands', content: 'Never selling. Diamond hands through the dip. 💎',               likes: 55, time: '3h ago'  }
    ];
    try {
        const saved = JSON.parse(localStorage.getItem('social-posts') || '[]');
        return [...saved.slice(0, 5), ...defaults].slice(0, 10);
    } catch { return defaults; }
}

function savePosts(posts) {
    try { localStorage.setItem('social-posts', JSON.stringify(posts.filter(p => p._user))); } catch {}
}

function loadFollowing() {
    try { following = JSON.parse(localStorage.getItem('social-following') || '[]'); } catch {}
}

function saveFollowing() {
    try { localStorage.setItem('social-following', JSON.stringify(following)); } catch {}
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadFollowing();
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);
    renderAll();
    setInterval(() => {
        tradingSignals = generateSignals();
        renderSignals();
    }, 30000);

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
        renderAll();
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
    copyPnL = 450 + Math.random() * 200;
    const el = document.getElementById('copy-pnl');
    if (el) { el.textContent = `+$${copyPnL.toFixed(2)}`; el.style.color = '#ef4444'; }
    renderAll();
}

function renderAll() {
    renderTopTraders();
    renderFollowing();
    renderSignals();
    renderFeed();
}

function renderTopTraders() {
    const html = TOP_TRADERS.map((t, i) => `
        <div class="leaderboard-item">
            <div style="display:flex;align-items:center;gap:1rem;">
                <div style="font-size:1.5rem;">${t.avatar}</div>
                <div>
                    <div style="color:#fff;font-weight:bold;">
                        #${i+1} ${t.name}
                        ${t.verified ? '<span style="color:#00ff88;">✓</span>' : ''}
                    </div>
                    <div style="color:#ccc;font-size:.9rem;">${t.followers.toLocaleString()} followers</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="color:#ef4444;font-weight:bold;">${t.roi}</div>
                <button onclick="followTrader('${t.name}')" class="follow-btn" style="margin-top:.4rem;">
                    ${following.includes(t.name) ? 'Following ✓' : 'Follow'}
                </button>
            </div>
        </div>`).join('');
    const el = document.getElementById('top-traders');
    if (el) el.innerHTML = html;
}

function renderFollowing() {
    const el = document.getElementById('following-list');
    if (!el) return;
    if (!following.length) {
        el.innerHTML = '<p style="color:#666;text-align:center;">Not following anyone yet</p>';
        return;
    }
    el.innerHTML = following.map(name => {
        const t = TOP_TRADERS.find(x => x.name === name);
        if (!t) return '';
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid #333;">
                <div>
                    <span style="color:#fff;">${t.avatar} ${t.name}</span>
                    <div style="color:#ef4444;font-size:.9rem;">${t.roi}</div>
                </div>
                <button onclick="unfollowTrader('${name}')" style="padding:.3rem .8rem;background:#ff4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:.8rem;">Unfollow</button>
            </div>`;
    }).join('');
}

function renderSignals() {
    const html = tradingSignals.map(s => {
        const color = s.action === 'BUY' ? '#00ff88' : '#ff8800';
        return `
            <div class="signal-card">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="color:#fff;font-weight:bold;">${s.trader}</div>
                        <div style="color:${color};font-size:1.1rem;margin:.5rem 0;">${s.action} ${s.token} @ ${s.price}</div>
                        <div style="color:#ccc;font-size:.9rem;">Confidence: ${s.confidence}%</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#666;font-size:.9rem;">${s.time}</div>
                        <button onclick="copyTrade('${s.action}','${s.token}','${s.price}')" style="padding:.5rem 1rem;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-top:.5rem;">Copy Trade</button>
                    </div>
                </div>
            </div>`;
    }).join('');
    const el = document.getElementById('trading-signals');
    if (el) el.innerHTML = html;
}

function renderFeed() {
    const html = communityPosts.slice(0, 10).map((post, idx) => `
        <div style="padding:1rem;border-bottom:1px solid #333;">
            <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
                <span style="color:#dc2626;font-weight:bold;">${post.user}</span>
                <span style="color:#666;font-size:.9rem;">${post.time}</span>
            </div>
            <p style="color:#ccc;margin-bottom:.5rem;">${post.content}</p>
            <div style="display:flex;align-items:center;gap:1rem;">
                <button onclick="likePost(${idx})" style="background:none;border:none;color:#ff4444;cursor:pointer;">❤️ ${post.likes}</button>
            </div>
        </div>`).join('');
    const el = document.getElementById('community-feed');
    if (el) el.innerHTML = html;
}

// ── Actions ───────────────────────────────────────────────────
function followTrader(name) {
    if (!walletPubkey) { alert('Connect wallet to follow traders'); return; }
    if (!following.includes(name)) {
        following.push(name);
        saveFollowing();
    }
    renderTopTraders();
    renderFollowing();
}

function unfollowTrader(name) {
    following = following.filter(n => n !== name);
    saveFollowing();
    renderTopTraders();
    renderFollowing();
}

function copyTrade(action, token, price) {
    if (!walletPubkey) { alert('Connect wallet to copy trades'); return; }
    const pnlChange = (Math.random() - 0.3) * 50;
    copyPnL += pnlChange;
    const el = document.getElementById('copy-pnl');
    if (el) { el.textContent = `${copyPnL >= 0 ? '+' : ''}$${copyPnL.toFixed(2)}`; el.style.color = copyPnL >= 0 ? '#ef4444' : '#ff4444'; }
    alert(`Copy trade queued: ${action} ${token} @ ${price}\n(Simulated — connect to Jupiter to execute real trades)`);
}

function sharePost() {
    if (!walletPubkey) { alert('Connect wallet to share posts'); return; }
    const content = document.getElementById('trade-post').value.trim();
    if (!content) { alert('Enter some content'); return; }

    const newPost = {
        user: `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)}`,
        content,
        likes: 0,
        time: 'just now',
        _user: true
    };

    communityPosts.unshift(newPost);
    savePosts(communityPosts);
    document.getElementById('trade-post').value = '';
    renderFeed();
}

function likePost(idx) {
    if (communityPosts[idx]) {
        communityPosts[idx].likes++;
        renderFeed();
    }
}
