let wallet = null;
let portfolio = {
    totalValue: 0,
    dailyChange: 0,
    totalPnL: 0,
    holdings: [],
    trades: []
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadPortfolio();
    setInterval(updatePortfolio, 10000);
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    wallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
    if (window.setWalletConnected) window.setWalletConnected(true);
    loadPortfolio();
}

function loadPortfolio() {
    if (!wallet) {
        // Demo data
        portfolio = {
            totalValue: 15420.50,
            dailyChange: 234.80,
            dailyChangePercent: 1.55,
            totalPnL: 2840.30,
            holdings: [
                { symbol: 'SOL', amount: 45.2, value: 8500, change: 2.3, price: 188.05 },
                { symbol: 'USDC', amount: 3200, value: 3200, change: 0, price: 1.00 },
                { symbol: 'BONK', amount: 1500000, value: 2100, change: -5.2, price: 0.0014 },
                { symbol: 'JUP', amount: 800, value: 1620.50, change: 8.7, price: 2.03 }
            ],
            trades: [
                { type: 'BUY', symbol: 'SOL', amount: 5.2, price: 185.20, time: '2h ago', pnl: 14.82 },
                { type: 'SELL', symbol: 'BONK', amount: 500000, price: 0.0015, time: '4h ago', pnl: -25.50 },
                { type: 'BUY', symbol: 'JUP', amount: 200, price: 1.95, time: '6h ago', pnl: 16.00 }
            ]
        };
    }
    
    updatePortfolioDisplay();
    drawAllocationChart();
}

function updatePortfolio() {
    // Simulate price updates
    portfolio.holdings.forEach(holding => {
        const priceChange = (Math.random() - 0.5) * 0.1;
        holding.price *= (1 + priceChange);
        holding.value = holding.amount * holding.price;
        holding.change = priceChange * 100;
    });
    
    portfolio.totalValue = portfolio.holdings.reduce((sum, h) => sum + h.value, 0);
    updatePortfolioDisplay();
}

function updatePortfolioDisplay() {
    document.getElementById('total-value').textContent = `$${portfolio.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    
    const changeClass = portfolio.dailyChange >= 0 ? 'pnl-positive' : 'pnl-negative';
    const changeSign = portfolio.dailyChange >= 0 ? '+' : '';
    document.getElementById('daily-change').textContent = `${changeSign}$${portfolio.dailyChange.toFixed(2)} (${changeSign}${portfolio.dailyChangePercent?.toFixed(2)}%)`;
    document.getElementById('daily-change').className = changeClass;
    
    const pnlClass = portfolio.totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative';
    const pnlSign = portfolio.totalPnL >= 0 ? '+' : '';
    document.getElementById('total-pnl').textContent = `${pnlSign}$${portfolio.totalPnL.toFixed(2)}`;
    document.getElementById('total-pnl').className = pnlClass;
    
    displayHoldings();
    displayTradeHistory();
    updateAnalytics();
}

function displayHoldings() {
    const html = portfolio.holdings.map(holding => {
        const changeClass = holding.change >= 0 ? 'pnl-positive' : 'pnl-negative';
        const changeSign = holding.change >= 0 ? '+' : '';
        
        return `
            <div class="token-item">
                <div>
                    <div style="color: #fff; font-weight: bold;">${holding.symbol}</div>
                    <div style="color: #ccc; font-size: 0.9rem;">${holding.amount.toLocaleString()} tokens</div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #fff;">$${holding.value.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <div class="${changeClass}">${changeSign}${holding.change.toFixed(2)}%</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('token-holdings').innerHTML = html;
}

function displayTradeHistory() {
    const html = portfolio.trades.map(trade => {
        const pnlClass = trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        const pnlSign = trade.pnl >= 0 ? '+' : '';
        
        return `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #333;">
                <div>
                    <span style="color: ${trade.type === 'BUY' ? '#00ff88' : '#ff8800'};">${trade.type}</span>
                    <span style="color: #fff; margin-left: 0.5rem;">${trade.symbol}</span>
                </div>
                <div style="text-align: right;">
                    <div class="${pnlClass}">${pnlSign}$${trade.pnl.toFixed(2)}</div>
                    <div style="color: #666; font-size: 0.8rem;">${trade.time}</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('trade-history').innerHTML = html;
}

function updateAnalytics() {
    const winningTrades = portfolio.trades.filter(t => t.pnl > 0).length;
    const winRate = portfolio.trades.length > 0 ? (winningTrades / portfolio.trades.length * 100).toFixed(1) : 0;
    
    const avgTrade = portfolio.trades.length > 0 ? 
        (portfolio.trades.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / portfolio.trades.length).toFixed(0) : 0;
    
    const bestTrade = portfolio.trades.length > 0 ? Math.max(...portfolio.trades.map(t => t.pnl)).toFixed(2) : 0;
    const worstTrade = portfolio.trades.length > 0 ? Math.min(...portfolio.trades.map(t => t.pnl)).toFixed(2) : 0;
    
    document.getElementById('win-rate').textContent = `${winRate}%`;
    document.getElementById('avg-trade').textContent = `$${avgTrade}`;
    document.getElementById('best-trade').textContent = `+$${bestTrade}`;
    document.getElementById('worst-trade').textContent = `-$${Math.abs(worstTrade)}`;
}

function drawAllocationChart() {
    const canvas = document.getElementById('allocation-chart');
    const ctx = canvas.getContext('2d');
    
    if (portfolio.holdings.length === 0) return;
    
    const colors = ['#0066ff', '#00ff88', '#ff8800', '#ff4444'];
    let currentAngle = -Math.PI / 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    portfolio.holdings.forEach((holding, i) => {
        const percentage = holding.value / portfolio.totalValue;
        const sliceAngle = percentage * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        
        currentAngle += sliceAngle;
    });
}