// Analytics Dashboard - Chart.js Implementation
let solPriceChart = null;
let sioPriceChart = null;
let volumeChart = null;
let currentTimeframe = '1D';
let updateInterval;
let walletAddress = null;

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://api.metaplex.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://solana-mainnet-public.allthatnode.com'
];

// Chart data storage
let solPriceData = [];
let sioPriceData = [];
let volumeData = [];

// Initialize charts
function initCharts() {
    initSolPriceChart();
    initSioPriceChart();
    initVolumeChart();
}

function initSolPriceChart() {
    const ctx = document.getElementById('sol-price-chart').getContext('2d');
    solPriceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'SOL Price (USD)',
                data: [],
                borderColor: '#0066ff',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function initSioPriceChart() {
    const ctx = document.getElementById('sio-price-chart').getContext('2d');
    sioPriceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'S-IO Price (USD)',
                data: [],
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toFixed(6);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return '$' + value.toFixed(6);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function initVolumeChart() {
    const ctx = document.getElementById('volume-chart').getContext('2d');
    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Volume (24h)',
                data: [],
                backgroundColor: 'rgba(0, 255, 136, 0.6)',
                borderColor: '#00ff88',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + (context.parsed.y / 1000000).toFixed(1) + 'M';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return '$' + (value / 1000000).toFixed(0) + 'M';
                        }
                    }
                }
            }
        }
    });
}

// Data fetching functions
async function fetchSolanaData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        const data = await response.json();

        const price = data.solana.usd;
        const change24h = data.solana.usd_24h_change;
        const volume24h = data.solana.usd_24h_vol;
        const marketCap = data.solana.usd_market_cap;

        const timestamp = new Date().toLocaleTimeString();

        solPriceData.push({
            time: timestamp,
            price: price,
            change: change24h,
            volume: volume24h,
            marketCap: marketCap
        });

        // Keep only last 50 data points
        if (solPriceData.length > 50) {
            solPriceData.shift();
        }

        updateSolChart();
        updateMarketStats();

        return { price, change24h, volume24h, marketCap };
    } catch (error) {
        console.error('SOL data fetch error:', error);
        return null;
    }
}

async function fetchSioTokenData() {
    try {
        // Try to get S-IO data from DexScreener API
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${SIO_MINT_ADDRESS}`);
        const data = await response.json();

        if (data.pairs && data.pairs.length > 0) {
            // Find the most liquid pair
            const bestPair = data.pairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0];

            const price = parseFloat(bestPair.priceUsd);
            const change24h = ((bestPair.priceChange.h24 || 0) / 100);
            const volume24h = bestPair.volume.h24 || 0;
            const marketCap = bestPair.marketCap || 0;
            const liquidity = bestPair.liquidity.usd || 0;

            const timestamp = new Date().toLocaleTimeString();

            sioPriceData.push({
                time: timestamp,
                price: price,
                change: change24h,
                volume: volume24h,
                marketCap: marketCap,
                liquidity: liquidity
            });

            // Keep only last 50 data points
            if (sioPriceData.length > 50) {
                sioPriceData.shift();
            }

            updateSioChart();
            updateSioStats();

            return { price, change24h, volume24h, marketCap, liquidity };
        }
    } catch (error) {
        console.error('S-IO data fetch error:', error);
    }

    // Fallback: Try to get basic token info from Solana RPC
    try {
        await fetchSioTokenInfo();
    } catch (error) {
        console.error('S-IO fallback fetch error:', error);
    }

    return null;
}

async function fetchSioTokenInfo() {
    let connection = null;

    for (const endpoint of [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS]) {
        try {
            connection = new solanaWeb3.Connection(endpoint, 'confirmed');
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

            // Get token supply
            const supply = await connection.getTokenSupply(mint);
            const totalSupply = supply.value.uiAmount || 0;

            // Try to get holder count (approximate)
            const largestAccounts = await connection.getTokenLargestAccounts(mint);
            const holderCount = largestAccounts.value.length;

            document.getElementById('sio-supply').textContent = totalSupply.toLocaleString();
            document.getElementById('sio-holders').textContent = holderCount.toString();

            break;
        } catch (error) {
            console.error(`Failed to fetch S-IO info from ${endpoint}:`, error);
        }
    }
}

async function fetchTopTokens() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&category=solana-ecosystem');
        const tokens = await response.json();
        updateTopTokens(tokens.slice(0, 5));
    } catch (error) {
        console.error('Top tokens fetch error:', error);
    }
}
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

// Chart update functions
function updateSolChart() {
    if (!solPriceChart || solPriceData.length === 0) return;

    const labels = solPriceData.map(d => d.time);
    const prices = solPriceData.map(d => d.price);

    solPriceChart.data.labels = labels;
    solPriceChart.data.datasets[0].data = prices;
    solPriceChart.update('none');
}

function updateSioChart() {
    if (!sioPriceChart || sioPriceData.length === 0) return;

    const labels = sioPriceData.map(d => d.time);
    const prices = sioPriceData.map(d => d.price);

    sioPriceChart.data.labels = labels;
    sioPriceChart.data.datasets[0].data = prices;
    sioPriceChart.update('none');
}

function updateVolumeChart() {
    if (!volumeChart || solPriceData.length === 0) return;

    const labels = solPriceData.map(d => d.time);
    const volumes = solPriceData.map(d => d.volume);

    volumeChart.data.labels = labels;
    volumeChart.data.datasets[0].data = volumes;
    volumeChart.update('none');
}

function updateMarketStats() {
    const latest = solPriceData[solPriceData.length - 1];
    if (!latest) return;

    const stats = [
        { label: 'SOL Price', value: `$${latest.price.toFixed(2)}`, color: '#fff' },
        { label: '24h Change', value: `${latest.change >= 0 ? '+' : ''}${latest.change.toFixed(2)}%`, color: latest.change >= 0 ? '#00ff88' : '#ff4444' },
        { label: '24h Volume', value: `$${(latest.volume / 1000000).toFixed(1)}M`, color: '#0066ff' },
        { label: 'Market Cap', value: `$${(latest.marketCap / 1000000000).toFixed(1)}B`, color: '#00ff88' },
        { label: 'Last Updated', value: new Date().toLocaleTimeString(), color: '#666' }
    ];

    const html = stats.map(stat => `
        <div class="metric-row">
            <span style="color: #666;">${stat.label}</span>
            <span style="color: ${stat.color}; font-weight: bold;">${stat.value}</span>
        </div>
    `).join('');

    document.getElementById('market-stats').innerHTML = html;
}

function updateSioStats() {
    const latest = sioPriceData[sioPriceData.length - 1];
    if (!latest) return;

    // Update price display
    document.getElementById('sio-price').textContent = `$${latest.price.toFixed(6)}`;

    // Update change
    const changeElement = document.getElementById('sio-change');
    changeElement.textContent = `${latest.change >= 0 ? '+' : ''}${(latest.change * 100).toFixed(2)}%`;
    changeElement.className = latest.change >= 0 ? 'change-positive' : 'change-negative';

    // Update market cap
    document.getElementById('sio-market-cap').textContent = latest.marketCap ? `$${(latest.marketCap / 1000000).toFixed(1)}M` : '--';

    // Update liquidity
    document.getElementById('sio-liquidity').textContent = latest.liquidity ? `$${(latest.liquidity / 1000).toFixed(1)}K` : '--';
}

function updateTopTokens(tokens) {
    const html = tokens.map(token => `
        <div class="metric-row">
            <div>
                <div style="color: #fff; font-weight: bold;">${token.symbol.toUpperCase()}</div>
                <div style="color: #666; font-size: 0.9rem;">Vol: $${(token.total_volume / 1000000).toFixed(1)}M</div>
            </div>
            <div style="text-align: right;">
                <div style="color: #fff;">$${token.current_price.toFixed(4)}</div>
                <div style="color: ${token.price_change_percentage_24h >= 0 ? '#00ff88' : '#ff4444'}; font-size: 0.9rem;">
                    ${token.price_change_percentage_24h >= 0 ? '+' : ''}${token.price_change_percentage_24h.toFixed(2)}%
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('top-tokens').innerHTML = html;
}}

async function loadWalletBalances() {
    if (!walletAddress) return;

    try {
        if (!solanaConnection) {
            solanaConnection = new solanaWeb3.Connection(
                SOLANA_RPC,
                { commitment: 'confirmed' }
            );
        }

        const owner = new solanaWeb3.PublicKey(walletAddress);

        // ---------- SOL BALANCE ----------
        const lamports = await solanaConnection.getBalance(owner);
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

        document.getElementById('sol-balance').textContent =
            solBalance.toFixed(4);

        // ---------- SIO TOKEN BALANCE ----------
        const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

        const tokenAccounts =
            await solanaConnection.getParsedTokenAccountsByOwner(
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

        // This page doesn't have addChatMessage, so just log to console
        console.warn('⚠️ Unable to load balances (RPC busy). Try again shortly.');
    }
}

async function loadRealTimeData() {
    await fetchSolanaPrice();
    await fetchTokenData();
    drawPriceChart();
    drawVolumeChart();
    updateMarketStats();
    updateTopTokens();
}

async function fetchSolanaPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true');
        const data = await response.json();
        
        const currentPrice = data.solana.usd;
        const volume24h = data.solana.usd_24h_vol;
        const change24h = data.solana.usd_24h_change;
        
        const now = Date.now();
        priceData.push({ time: now, price: currentPrice, volume: volume24h, change: change24h });
        volumeData.push(volume24h);
        
        if (priceData.length > 100) {
            priceData.shift();
            volumeData.shift();
        }
    } catch (error) {
        console.error('Price fetch error:', error);
    }
}

async function fetchTokenData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&category=solana-ecosystem');
        const tokens = await response.json();
        window.topTokensData = tokens.slice(0, 5);
    } catch (error) {
        console.error('Token data fetch error:', error);
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

// Wallet functions
async function loadWalletBalances() {
    if (!walletAddress) return;

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

            const owner = new solanaWeb3.PublicKey(walletAddress);

            // SOL BALANCE
            const lamports = await connection.getBalance(owner);
            const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
            document.getElementById('sol-balance').textContent = solBalance.toFixed(4);

            // S-IO TOKEN BALANCE
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });

            if (tokenAccounts.value.length > 0) {
                const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].account.owner);
                document.getElementById('sio-balance').textContent = tokenAccountInfo.value.uiAmountString || '0';
            } else {
                document.getElementById('sio-balance').textContent = '0';
            }

            return; // Success, exit the loop
        } catch (error) {
            console.error(`RPC endpoint ${endpoint} failed:`, error);
            lastError = error;
        }
    }

    // All endpoints failed
    console.error('All RPC endpoints failed for wallet balance loading');
    document.getElementById('sol-balance').textContent = '—';
    document.getElementById('sio-balance').textContent = '—';
}

async function connectWallet() {
    try {
        if (walletAddress) {
            // Disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            walletAddress = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');
            document.getElementById('balance-display').classList.add('hidden');

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana || !window.solana.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }

        const resp = await window.solana.connect();
        walletAddress = resp.publicKey.toString();

        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        btn.classList.add('connected');

        document.getElementById('balance-display').classList.remove('hidden');
        await loadWalletBalances();

        console.log('Wallet connected:', walletAddress);
    } catch (error) {
        console.error('Wallet connection error:', error);
    }
}

// Timeframe and control functions
function setTimeframe(timeframe) {
    currentTimeframe = timeframe;

    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // In a real implementation, this would fetch different timeframes
    // For now, just update the UI
    console.log('Timeframe changed to:', timeframe);
}

// Main initialization
async function loadRealTimeData() {
    // Show loading state
    document.getElementById('sio-price').textContent = 'Loading...';
    document.getElementById('sio-change').textContent = 'Loading...';

    await Promise.all([
        fetchSolanaData(),
        fetchSioTokenData(),
        fetchTopTokens()
    ]);

    updateVolumeChart();
}

function startRealTimeUpdates() {
    updateInterval = setInterval(async () => {
        await Promise.all([
            fetchSolanaData(),
            fetchSioTokenData(),
            fetchTopTokens()
        ]);
        updateVolumeChart();
    }, 30000); // Update every 30 seconds
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadRealTimeData();
    startRealTimeUpdates();
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (updateInterval) clearInterval(updateInterval);
});