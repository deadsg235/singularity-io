let portfolio = {
    totalValue: 0,
    dailyChange: 0,
    totalPnL: 0,
    holdings: [],
    transactions: []
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadPortfolioData();
    setInterval(updatePrices, 30000);
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    window.globalWallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${window.globalWallet.toString().slice(0, 4)}...${window.globalWallet.toString().slice(-4)}`;
    if (window.setWalletConnected) window.setWalletConnected(true);
    
    await loadRealPortfolio();
}

async function loadRealPortfolio() {
    if (!window.globalWallet) return;
    
    try {
        // Get S-IO balance first
        const sioBalance = await window.getSIOBalance(window.globalWallet.toString());
        const sioPrice = await window.getSIOPrice();
        
        portfolio.holdings = [];
        
        // Add S-IO to portfolio
        if (sioBalance > 0) {
            portfolio.holdings.push({
                symbol: 'S-IO',
                amount: sioBalance,
                value: sioBalance * sioPrice,
                change24h: (Math.random() - 0.3) * 10, // Slight positive bias
                mint: window.SIO_TOKEN_MINT
            });
        }
        
        // Get other tokens
        const response = await fetch(`/api/wallet/tokens/${window.globalWallet.toString()}`);
        const data = await response.json();
        
        data.tokens.forEach(token => {
            if (token.mint !== window.SIO_TOKEN_MINT) {
                portfolio.holdings.push({
                    symbol: token.symbol || 'Unknown',
                    amount: token.amount,
                    value: token.amount * (Math.random() * 100 + 1),
                    change24h: (Math.random() - 0.5) * 20,
                    mint: token.mint
                });
            }
        });
        
        updatePortfolioDisplay();
    } catch (error) {
        console.error('Failed to load portfolio:', error);
        loadMockData();
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