let wallet = null;
let following = [];
let copyPnL = 0;
let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
    'https://api.mainnet.solana.com'
];


const topTraders = [
    { name: 'CryptoKing', roi: '+156.7%', followers: 2847, verified: true, avatar: '👑' },
    { name: 'SolanaWhale', roi: '+134.2%', followers: 1923, verified: true, avatar: '🐋' },
    { name: 'DeFiMaster', roi: '+98.5%', followers: 1456, verified: false, avatar: '🚀' },
    { name: 'MoonShot', roi: '+87.3%', followers: 1234, verified: true, avatar: '🌙' },
    { name: 'DiamondHands', roi: '+76.8%', followers: 987, verified: false, avatar: '💎' }
];

const tradingSignals = [
    { trader: 'CryptoKing', action: 'BUY', token: 'SOL', price: '$188.50', confidence: 95, time: '2m ago' },
    { trader: 'SolanaWhale', action: 'SELL', token: 'BONK', price: '$0.0014', confidence: 88, time: '5m ago' },
    { trader: 'DeFiMaster', action: 'BUY', token: 'JUP', price: '$2.03', confidence: 92, time: '8m ago' }
];

const communityPosts = [
    { user: 'CryptoKing', content: 'SOL looking bullish above $185 support. Target $200+', likes: 47, time: '15m ago' },
    { user: 'SolanaWhale', content: 'Taking profits on BONK. Market showing signs of weakness', likes: 23, time: '32m ago' },
    { user: 'DeFiMaster', content: 'JUP breakout incoming. Volume increasing significantly', likes: 31, time: '1h ago' }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadSocialData();
    setInterval(updateSignals, 30000);
});

async function connectWallet() {
    try {
        if (wallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            wallet = null;
            solanaConnection = null;

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
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances(); // Call loadWalletBalances
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!wallet) return;

    let lastError = null;
    const allEndpoints = [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS];
    
    for (let attempt = 0; attempt < allEndpoints.length; attempt++) {
        const endpoint = allEndpoints[attempt];
        
        try {
            console.log(`loadWalletBalances: Trying RPC endpoint ${attempt + 1}/${allEndpoints.length}: ${endpoint}`);
            
            const connection = new solanaWeb3.Connection(
                endpoint,
                { commitment: 'confirmed' }
            );

            const owner = new solanaWeb3.PublicKey(wallet);

            // ---------- SOL BALANCE ----------
            const lamports = await connection.getBalance(owner);
            const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

            document.getElementById('sol-balance').textContent =
                solBalance.toFixed(4);

            // ---------- SIO TOKEN BALANCE ----------
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

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
                sio: sioBalance,
                endpoint: endpoint
            });

            // Success - update the global connection
            solanaConnection = connection;
            return;

        } catch (err) {
            lastError = err;
            console.warn(`loadWalletBalances: RPC endpoint ${endpoint} failed:`, err.message);
            
            // If this is not the last endpoint, wait before trying the next one
            if (attempt < allEndpoints.length - 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
                console.log(`loadWalletBalances: Waiting ${delay}ms before trying next endpoint...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All endpoints failed
    console.error('loadWalletBalances: All RPC endpoints failed. Last error:', lastError);

    document.getElementById('sol-balance').textContent = '—';
    document.getElementById('sio-balance').textContent = '—';

    // This page doesn't have addChatMessage, so just log to console
    console.warn('⚠️ Unable to load balances (all RPC endpoints busy). Try again in a few minutes.');
}

function loadSocialData() {
    displayTopTraders();
    displayTradingSignals();
    displayCommunityFeed();
    loadUserData();
}

function loadUserData() {
    if (wallet) {
        // Simulate user following data
        copyPnL = 450 + Math.random() * 200;
        document.getElementById('copy-pnl').textContent = `+$${copyPnL.toFixed(2)}`;
    }
    displayFollowing();
}

function displayTopTraders() {
    const html = topTraders.map((trader, index) => `
        <div class="leaderboard-item">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="font-size: 1.5rem;">${trader.avatar}</div>
                <div>
                    <div style="color: #fff; font-weight: bold;">
                        #${index + 1} ${trader.name}
                        ${trader.verified ? '<span style="color: #00ff88;">✓</span>' : ''}
                    </div>
                    <div style="color: #ccc; font-size: 0.9rem;">${trader.followers} followers</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="color: #00ff88; font-weight: bold;">${trader.roi}</div>
                <button onclick="followTrader('${trader.name}')" class="follow-btn">
                    ${following.includes(trader.name) ? 'Following' : 'Follow'}
                </button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('top-traders').innerHTML = html;
}

function displayFollowing() {
    if (following.length === 0) {
        document.getElementById('following-list').innerHTML = '<p style="color: #666; text-align: center;">Not following anyone yet</p>';
        return;
    }
    
    const html = following.map(traderName => {
        const trader = topTraders.find(t => t.name === traderName);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #333;">
                <div>
                    <span style="color: #fff;">${trader.avatar} ${trader.name}</span>
                    <div style="color: #00ff88; font-size: 0.9rem;">${trader.roi}</div>
                </div>
                <button onclick="unfollowTrader('${traderName}')" style="padding: 0.3rem 0.8rem; background: #ff4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Unfollow</button>
            </div>
        `;
    }).join('');
    
    document.getElementById('following-list').innerHTML = html;
}

function displayTradingSignals() {
    const html = tradingSignals.map(signal => {
        const actionColor = signal.action === 'BUY' ? '#00ff88' : '#ff8800';
        return `
            <div class="signal-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #fff; font-weight: bold;">${signal.trader}</div>
                        <div style="color: ${actionColor}; font-size: 1.1rem; margin: 0.5rem 0;">
                            ${signal.action} ${signal.token} @ ${signal.price}
                        </div>
                        <div style="color: #ccc; font-size: 0.9rem;">Confidence: ${signal.confidence}%</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #666; font-size: 0.9rem;">${signal.time}</div>
                        <button onclick="copyTrade('${signal.action}', '${signal.token}', '${signal.price}')" style="padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-top: 0.5rem;">Copy Trade</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('trading-signals').innerHTML = html;
}

function displayCommunityFeed() {
    const html = communityPosts.map(post => `
        <div style="padding: 1rem; border-bottom: 1px solid #333;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="color: #0066ff; font-weight: bold;">${post.user}</span>
                <span style="color: #666; font-size: 0.9rem;">${post.time}</span>
            </div>
            <p style="color: #ccc; margin-bottom: 0.5rem;">${post.content}</p>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <button onclick="likePost('${post.user}')" style="background: none; border: none; color: #ff4444; cursor: pointer;">❤️ ${post.likes}</button>
                <button style="background: none; border: none; color: #0066ff; cursor: pointer;">💬 Reply</button>
            </div>
        </div>
    `).join('');
    
    document.getElementById('community-feed').innerHTML = html;
}

async function followTrader(traderName) {
    if (!wallet) {
        alert('Please connect your wallet to follow traders');
        return;
    }
    
    try {
        const response = await fetch('/api/social/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trader_name: traderName,
                wallet: wallet.toString()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (!following.includes(traderName)) {
                following.push(traderName);
            }
            alert(result.message);
            displayTopTraders();
            displayFollowing();
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert('Failed to follow trader: ' + error.message);
    }
}

function unfollowTrader(traderName) {
    following = following.filter(name => name !== traderName);
    displayTopTraders();
    displayFollowing();
    alert(`Unfollowed ${traderName}`);
}

async function copyTrade(action, token, price) {
    if (!wallet) {
        alert('Please connect your wallet to copy trades');
        return;
    }
    
    const amount = prompt(`Enter amount to ${action} ${token} at ${price}:`);
    if (amount && parseFloat(amount) > 0) {
        try {
            const response = await fetch('/api/social/copy-trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    token,
                    price,
                    amount: parseFloat(amount),
                    wallet: wallet.toString()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`Copy trade executed: ${action} ${amount} ${token} at ${price}\nTx: ${result.transaction_id}`);
                
                // Update P&L
                const pnlChange = (Math.random() - 0.3) * 50;
                copyPnL += pnlChange;
                document.getElementById('copy-pnl').textContent = `${copyPnL >= 0 ? '+' : ''}$${copyPnL.toFixed(2)}`;
                document.getElementById('copy-pnl').style.color = copyPnL >= 0 ? '#00ff88' : '#ff4444';
            } else {
                alert('Trade failed: ' + result.message);
            }
        } catch (error) {
            alert('Copy trade failed: ' + error.message);
        }
    }
}

function sharePost() {
    if (!wallet) {
        alert('Please connect your wallet to share posts');
        return;
    }
    
    const content = document.getElementById('trade-post').value.trim();
    if (!content) {
        alert('Please enter some content');
        return;
    }
    
    const newPost = {
        user: `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`,
        content,
        likes: 0,
        time: 'now'
    };
    
    communityPosts.unshift(newPost);
    document.getElementById('trade-post').value = '';
    displayCommunityFeed();
    
    alert('Post shared successfully!');
}

function likePost(user) {
    const post = communityPosts.find(p => p.user === user);
    if (post) {
        post.likes++;
        displayCommunityFeed();
    }
}

function updateSignals() {
    // Simulate new trading signals
    const newSignal = {
        trader: topTraders[Math.floor(Math.random() * topTraders.length)].name,
        action: Math.random() > 0.5 ? 'BUY' : 'SELL',
        token: ['SOL', 'BONK', 'JUP', 'USDC'][Math.floor(Math.random() * 4)],
        price: '$' + (Math.random() * 200).toFixed(2),
        confidence: Math.floor(Math.random() * 20) + 80,
        time: 'now'
    };
    
    tradingSignals.unshift(newSignal);
    if (tradingSignals.length > 5) tradingSignals.pop();
    
    displayTradingSignals();
}