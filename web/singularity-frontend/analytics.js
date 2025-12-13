let currentTimeframe = '1D';
let priceData = [];
let volumeData = [];
let updateInterval;
let walletAddress = null;
let solanaConnection = null;

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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadRealTimeData();
    startRealTimeUpdates();
});

async function connectWallet() {
    try {
        if (walletAddress) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            walletAddress = null;
            solanaConnection = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

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
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        if(window.loadWalletBalances) loadWalletBalances();
        
        console.log('Wallet connected:', walletAddress);
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

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

function updateMarketStats() {
    const latest = priceData[priceData.length - 1];
    if (!latest) return;
    
    const currentPrice = latest.price;
    const change24h = latest.change || 0;
    const volume24h = latest.volume;
    
    const stats = [
        { label: 'Current Price', value: `$${currentPrice.toFixed(2)}`, color: '#fff' },
        { label: '24h Change', value: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`, color: change24h >= 0 ? '#00ff88' : '#ff4444' },
        { label: '24h Volume', value: `$${(volume24h / 1000000).toFixed(1)}M`, color: '#0066ff' },
        { label: 'Market Cap', value: `$${(currentPrice * 400000000 / 1000000000).toFixed(1)}B`, color: '#00ff88' },
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

function updateTopTokens() {
    const tokens = window.topTokensData || [];
    
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
}

function setTimeframe(timeframe) {
    currentTimeframe = timeframe;
    
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    drawPriceChart();
    drawVolumeChart();
}

function startRealTimeUpdates() {
    updateInterval = setInterval(async () => {
        await fetchSolanaPrice();
        await fetchTokenData();
        drawPriceChart();
        drawVolumeChart();
        updateMarketStats();
        updateTopTokens();
    }, 30000);
}

window.addEventListener('beforeunload', () => {
    if (updateInterval) clearInterval(updateInterval);
});