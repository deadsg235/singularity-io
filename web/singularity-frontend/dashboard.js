let revenueData = {
    tvl: 2400000,
    volume: 847000,
    revenue: 12300,
    users: 1247,
    botROI: 18.4,
    tokens: 89
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(updateMetrics, 5000);
});

function initDashboard() {
    updateMetrics();
    drawRevenueChart();
    loadBotLeaderboard();
    loadActivityFeed();
}

function updateMetrics() {
    // Simulate real-time updates
    revenueData.tvl += Math.random() * 10000 - 5000;
    revenueData.volume += Math.random() * 5000 - 2500;
    revenueData.revenue += Math.random() * 100;
    revenueData.users += Math.floor(Math.random() * 3);
    
    document.getElementById('tvl').textContent = `$${(revenueData.tvl / 1000000).toFixed(1)}M`;
    document.getElementById('volume').textContent = `$${(revenueData.volume / 1000).toFixed(0)}K`;
    document.getElementById('revenue').textContent = `$${(revenueData.revenue / 1000).toFixed(1)}K`;
    document.getElementById('users').textContent = revenueData.users.toLocaleString();
    document.getElementById('bot-roi').textContent = `+${revenueData.botROI.toFixed(1)}%`;
    document.getElementById('tokens').textContent = revenueData.tokens;
}

function drawRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
    const ctx = canvas.getContext('2d');
    
    const data = [66.7, 22.8, 10.5];
    const colors = ['#0066ff', '#00ff88', '#ff8800'];
    
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
    const activities = [
        { type: 'trade', msg: 'Large swap: 50 SOL → USDC', time: '2m ago' },
        { type: 'token', msg: 'New token launched: MOON', time: '5m ago' },
        { type: 'bot', msg: 'Bot achieved +15% ROI', time: '8m ago' },
        { type: 'user', msg: '10 new users joined', time: '12m ago' }
    ];
    
    const html = activities.map(activity => `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid #333; color: #ccc; font-size: 0.9rem;">
            <div>${activity.msg}</div>
            <div style="color: #666; font-size: 0.8rem;">${activity.time}</div>
        </div>
    `).join('');
    
    document.getElementById('activity-feed').innerHTML = html;
}