let portfolio = {
    totalValue: 0,
    dailyChange: 0,
    totalPnL: 0,
    holdings: [],
    transactions: []
};

let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
    'https://api.mainnet.solana.com'
];


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadPortfolioData();
    setInterval(updatePrices, 30000);
});

async function connectWallet() {
    try {
        if (window.globalWallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            window.globalWallet = null;
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
        window.globalWallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${window.globalWallet.toString().slice(0, 4)}...${window.globalWallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances(); // Call loadWalletBalances
        
        console.log('Wallet connected:', window.globalWallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!window.globalWallet) return;

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

            const owner = new solanaWeb3.PublicKey(window.globalWallet);

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

async function loadRealPortfolio() {
    if (!window.globalWallet) return;
    
    try {
        const response = await fetch(`/api/wallet/portfolio/${window.globalWallet.toString()}`);
        const data = await response.json();
        
        portfolio.holdings = data.holdings.map(holding => ({
            symbol: holding.symbol,
            amount: holding.amount,
            value: holding.value,
            change24h: (Math.random() - 0.3) * 10, // Real price change would need price history
            percentage: holding.percentage
        }));
        
        // Add other tokens from wallet
        const analyticsResponse = await fetch(`/api/wallet/analytics/${window.globalWallet.toString()}`);
        const analytics = await analyticsResponse.json();
        
        analytics.tokens.forEach(token => {
            if (token.mint !== window.SIO_TOKEN_MINT && token.amount > 0) {
                portfolio.holdings.push({
                    symbol: 'Token',
                    amount: token.amount,
                    value: token.amount * 0.001, // Minimal value for unknown tokens
                    change24h: 0,
                    mint: token.mint
                });
            }
        });
        
        updatePortfolioDisplay();
    } catch (error) {
        console.error('Failed to load portfolio:', error);
    }
}

function loadMockData() {
    portfolio.holdings = [
        { symbol: 'SOL', amount: 12.5, value: 2350, change24h: 5.2 },
        { symbol: 'USDC', amount: 1500, value: 1500, change24h: 0.1 },
        { symbol: 'RAY', amount: 250, value: 875, change24h: -2.3 },
        { symbol: 'ORCA', amount: 180, value: 432, change24h: 8.7 }
    ];
    
    portfolio.transactions = [
        { type: 'BUY', symbol: 'SOL', amount: 2.5, price: 188.50, time: '2h ago' },
        { type: 'SELL', symbol: 'RAY', amount: 50, price: 3.45, time: '5h ago' },
        { type: 'SWAP', symbol: 'USDC→SOL', amount: 500, price: 187.20, time: '1d ago' }
    ];
    
    updatePortfolioDisplay();
}

function loadPortfolioData() {
    loadMockData();
    drawPerformanceChart();
}

function updatePortfolioDisplay() {
    portfolio.totalValue = portfolio.holdings.reduce((sum, holding) => sum + holding.value, 0);
    portfolio.dailyChange = portfolio.holdings.reduce((sum, holding) => sum + (holding.value * holding.change24h / 100), 0);
    portfolio.totalPnL = portfolio.dailyChange; // Simplified
    
    document.getElementById('total-value').textContent = `$${portfolio.totalValue.toLocaleString()}`;
    document.getElementById('daily-change').textContent = `${portfolio.dailyChange >= 0 ? '+' : ''}${(portfolio.dailyChange / portfolio.totalValue * 100).toFixed(2)}%`;
    document.getElementById('daily-change').style.color = portfolio.dailyChange >= 0 ? '#00ff88' : '#ff4444';
    document.getElementById('asset-count').textContent = portfolio.holdings.length;
    document.getElementById('total-pnl').textContent = `${portfolio.totalPnL >= 0 ? '+' : ''}$${Math.abs(portfolio.totalPnL).toFixed(2)}`;
    document.getElementById('total-pnl').style.color = portfolio.totalPnL >= 0 ? '#00ff88' : '#ff4444';
    
    displayHoldings();
    displayTransactions();
}

function displayHoldings() {
    const html = portfolio.holdings.map(holding => `
        <div class="asset-row">
            <div>
                <div style="color: #fff; font-weight: bold;">${holding.symbol}</div>
                <div style="color: #666; font-size: 0.9rem;">${holding.amount.toFixed(4)}</div>
            </div>
            <div style="text-align: right;">
                <div style="color: #fff;">$${holding.value.toFixed(2)}</div>
                <div style="color: ${holding.change24h >= 0 ? '#00ff88' : '#ff4444'}; font-size: 0.9rem;">
                    ${holding.change24h >= 0 ? '+' : ''}${holding.change24h.toFixed(2)}%
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('holdings-list').innerHTML = html;
}

function displayTransactions() {
    const html = portfolio.transactions.map(tx => `
        <div style="display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #333;">
            <div>
                <span style="color: ${tx.type === 'BUY' ? '#00ff88' : tx.type === 'SELL' ? '#ff8800' : '#0066ff'}; font-weight: bold;">
                    ${tx.type}
                </span>
                <span style="color: #fff; margin-left: 1rem;">${tx.symbol}</span>
            </div>
            <div style="text-align: right;">
                <div style="color: #fff;">${tx.amount} @ $${tx.price}</div>
                <div style="color: #666; font-size: 0.9rem;">${tx.time}</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('transactions-list').innerHTML = html;
}

function drawPerformanceChart() {
    const canvas = document.getElementById('performance-chart');
    const ctx = canvas.getContext('2d');
    
    const data = [];
    for (let i = 0; i < 30; i++) {
        data.push(5000 + Math.sin(i * 0.2) * 500 + Math.random() * 200);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    data.forEach((value, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - ((value - 4000) / 2000) * canvas.height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Fill area under curve
    ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
}

function updatePrices() {
    portfolio.holdings.forEach(holding => {
        holding.change24h += (Math.random() - 0.5) * 2;
        holding.value *= (1 + holding.change24h / 100 / 24);
    });
    updatePortfolioDisplay();
}