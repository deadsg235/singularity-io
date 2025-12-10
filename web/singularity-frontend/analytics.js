let currentTimeframe = '1D';
let priceData = [];
let volumeData = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadAnalyticsData();
    setInterval(updateData, 60000);
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    document.getElementById('wallet-btn').textContent = `${resp.publicKey.toString().slice(0, 4)}...${resp.publicKey.toString().slice(-4)}`;
    if (window.setWalletConnected) window.setWalletConnected(true);
}

function loadAnalyticsData() {
    generateMockData();
    drawPriceChart();
    drawVolumeChart();
    updateMarketStats();
    updateTopTokens();
}

function generateMockData() {
    priceData = [];
    volumeData = [];
    
    let basePrice = 188.50;
    let baseVolume = 50000000;
    
    const points = currentTimeframe === '1H' ? 60 : currentTimeframe === '1D' ? 24 : currentTimeframe === '1W' ? 7 : 30;
    
    for (let i = 0; i < points; i++) {
        const volatility = 0.02;
        const change = (Math.random() - 0.5) * volatility;
        basePrice *= (1 + change);
        
        const volumeChange = (Math.random() - 0.5) * 0.3;
        baseVolume *= (1 + volumeChange);
        
        priceData.push({
            time: Date.now() - (points - i) * getTimeInterval(),
            price: basePrice,
            volume: baseVolume
        });
        
        volumeData.push(baseVolume);
    }
}

function getTimeInterval() {
    switch (currentTimeframe) {
        case '1H': return 60 * 1000; // 1 minute
        case '1D': return 60 * 60 * 1000; // 1 hour
        case '1W': return 24 * 60 * 60 * 1000; // 1 day
        case '1M': return 24 * 60 * 60 * 1000; // 1 day
        default: return 60 * 60 * 1000;
    }
}

function drawPriceChart() {
    const canvas = document.getElementById('price-chart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (priceData.length === 0) return;
    
    const minPrice = Math.min(...priceData.map(d => d.price));
    const maxPrice = Math.max(...priceData.map(d => d.price));
    const priceRange = maxPrice - minPrice;
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = (i / 5) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw price line
    ctx.strokeStyle = '#0066ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    priceData.forEach((point, i) => {
        const x = (i / (priceData.length - 1)) * canvas.width;
        const y = canvas.height - ((point.price - minPrice) / priceRange) * canvas.height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Fill area
    ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw price labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px Orbitron';
    ctx.fillText(`$${maxPrice.toFixed(2)}`, 10, 15);
    ctx.fillText(`$${minPrice.toFixed(2)}`, 10, canvas.height - 5);
}

function drawVolumeChart() {
    const canvas = document.getElementById('volume-chart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (volumeData.length === 0) return;
    
    const maxVolume = Math.max(...volumeData);
    const barWidth = canvas.width / volumeData.length;
    
    volumeData.forEach((volume, i) => {
        const barHeight = (volume / maxVolume) * canvas.height;
        const x = i * barWidth;
        const y = canvas.height - barHeight;
        
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
}

function updateMarketStats() {
    const currentPrice = priceData[priceData.length - 1]?.price || 188.50;
    const previousPrice = priceData[priceData.length - 2]?.price || 188.00;
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    const volume24h = volumeData.reduce((sum, vol) => sum + vol, 0) / volumeData.length;
    
    const stats = [
        { label: 'Current Price', value: `$${currentPrice.toFixed(2)}`, color: '#fff' },
        { label: '24h Change', value: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, color: change >= 0 ? '#00ff88' : '#ff4444' },
        { label: '24h Volume', value: `$${(volume24h / 1000000).toFixed(1)}M`, color: '#0066ff' },
        { label: 'Market Cap', value: `$${(currentPrice * 400000000 / 1000000000).toFixed(1)}B`, color: '#00ff88' },
        { label: 'Circulating Supply', value: '400M SOL', color: '#fff' }
    ];
    
    const html = stats.map(stat => `
        <div class="metric-row">
            <span style="color: #666;">${stat.label}</span>
            <span style="color: ${stat.color}; font-weight: bold;">${stat.value}</span>
        </div>
    `).join('');
    
    document.getElementById('market-stats').innerHTML = html;
}

function updateTopTokens() {
    const tokens = [
        { symbol: 'SOL', price: 188.50, change: 5.2, volume: '245M' },
        { symbol: 'USDC', price: 1.00, change: 0.1, volume: '1.2B' },
        { symbol: 'RAY', price: 3.45, change: -2.3, volume: '45M' },
        { symbol: 'ORCA', price: 2.40, change: 8.7, volume: '12M' },
        { symbol: 'MNGO', price: 0.045, change: 15.3, volume: '8M' }
    ];
    
    const html = tokens.map(token => `
        <div class="metric-row">
            <div>
                <div style="color: #fff; font-weight: bold;">${token.symbol}</div>
                <div style="color: #666; font-size: 0.9rem;">Vol: $${token.volume}</div>
            </div>
            <div style="text-align: right;">
                <div style="color: #fff;">$${token.price}</div>
                <div style="color: ${token.change >= 0 ? '#00ff88' : '#ff4444'}; font-size: 0.9rem;">
                    ${token.change >= 0 ? '+' : ''}${token.change}%
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('top-tokens').innerHTML = html;
}

function setTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    generateMockData();
    drawPriceChart();
    drawVolumeChart();
}

function updateData() {
    // Add new data point
    const lastPrice = priceData[priceData.length - 1]?.price || 188.50;
    const change = (Math.random() - 0.5) * 0.02;
    const newPrice = lastPrice * (1 + change);
    
    priceData.push({
        time: Date.now(),
        price: newPrice,
        volume: 50000000 * (1 + (Math.random() - 0.5) * 0.3)
    });
    
    // Keep only recent data
    const maxPoints = currentTimeframe === '1H' ? 60 : 100;
    if (priceData.length > maxPoints) {
        priceData.shift();
        volumeData.shift();
    }
    
    volumeData.push(priceData[priceData.length - 1].volume);
    
    drawPriceChart();
    drawVolumeChart();
    updateMarketStats();
}