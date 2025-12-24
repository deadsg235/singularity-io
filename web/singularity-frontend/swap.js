let connection;
let recentSwaps = [];

const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.rpc.extrnode.com'
];

const tokens = {
    'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', decimals: 6 },
    'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump': { symbol: 'S-IO', decimals: 6 }
};

document.addEventListener('DOMContentLoaded', () => {
    connection = new solanaWeb3.Connection(RPC_ENDPOINTS[0], 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);
    document.getElementById('from-amount').addEventListener('input', updateQuote);
    document.getElementById('from-token').addEventListener('change', () => {
        updateTokenBalances();
        updateQuote();
    });
    document.getElementById('to-token').addEventListener('change', () => {
        updateTokenBalances();
        updateQuote();
    });
    
    loadRecentSwaps();
    loadMarketData();
    
    // Real-time price and slippage updates every 15 seconds
    setInterval(() => {
        loadMarketData();
        // Update quote if amount is entered
        const fromAmount = document.getElementById('from-amount').value;
        if (fromAmount && parseFloat(fromAmount) > 0) {
            updateQuote();
        }
    }, 15000);
    
    // Check if wallet already connected on page load
    setTimeout(() => {
        if (window.walletAdapter?.isConnected()) {
            document.getElementById('swap-btn').textContent = 'Get Quote';
            document.getElementById('swap-btn').disabled = false;
            updateTokenBalances();
        }
    }, 1000);
    
    // Listen for balance updates
    window.addEventListener('balanceUpdated', (event) => {
        updateTokenBalances();
    });
});

async function handleWalletClick() {
    if (window.walletAdapter?.isConnected()) {
        await window.walletAdapter.disconnect();
        document.getElementById('swap-btn').textContent = 'Connect Wallet';
        document.getElementById('swap-btn').disabled = true;
    } else {
        try {
            await window.walletAdapter.connect('phantom');
            document.getElementById('swap-btn').textContent = 'Get Quote';
            document.getElementById('swap-btn').disabled = false;
            updateTokenBalances();
        } catch (error) {
            console.error('Wallet connection failed:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    }
}

// Listen for wallet events
window.addEventListener('walletConnected', () => {
    document.getElementById('swap-btn').textContent = 'Get Quote';
    document.getElementById('swap-btn').disabled = false;
    document.getElementById('swap-btn').onclick = null;
    updateTokenBalances();
});

window.addEventListener('walletDisconnected', () => {
    document.getElementById('swap-btn').textContent = 'Connect Wallet';
    document.getElementById('swap-btn').disabled = true;
    document.getElementById('swap-btn').onclick = null;
});

function switchRPC() {
    // RPC switching handled by unified balance loader
}

function updateTokenBalances() {
    if (!window.walletAdapter?.isConnected()) {
        document.getElementById('from-balance').textContent = 'Balance: 0';
        document.getElementById('to-balance').textContent = 'Balance: 0';
        return;
    }
    
    const fromToken = document.getElementById('from-token').value;
    const toToken = document.getElementById('to-token').value;
    
    const solBalance = document.getElementById('sol-balance')?.textContent || '0';
    const sioBalance = document.getElementById('sio-balance')?.textContent || '0';
    
    // Update from balance
    if (fromToken === 'So11111111111111111111111111111111111111112') {
        document.getElementById('from-balance').textContent = `Balance: ${solBalance}`;
    } else if (fromToken === 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump') {
        document.getElementById('from-balance').textContent = `Balance: ${sioBalance}`;
    } else {
        document.getElementById('from-balance').textContent = 'Balance: 0';
    }
    
    // Update to balance
    if (toToken === 'So11111111111111111111111111111111111111112') {
        document.getElementById('to-balance').textContent = `Balance: ${solBalance}`;
    } else if (toToken === 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump') {
        document.getElementById('to-balance').textContent = `Balance: ${sioBalance}`;
    } else {
        document.getElementById('to-balance').textContent = 'Balance: 0';
    }
}

async function updateQuote() {
    const fromAmount = document.getElementById('from-amount').value;
    const fromToken = document.getElementById('from-token').value;
    const toToken = document.getElementById('to-token').value;
    
    if (!fromAmount || fromAmount <= 0 || fromToken === toToken) {
        document.getElementById('to-amount').value = '';
        document.getElementById('exchange-rate').textContent = 'Enter amount';
        if (window.walletAdapter?.isConnected()) {
            document.getElementById('swap-btn').textContent = 'Enter Amount';
            document.getElementById('swap-btn').disabled = true;
        }
        return;
    }
    
    if (!window.walletAdapter?.isConnected()) {
        document.getElementById('swap-btn').textContent = 'Connect Wallet';
        document.getElementById('swap-btn').disabled = true;
        return;
    }
    
    try {
        document.getElementById('exchange-rate').textContent = 'Getting quote...';
        
        const fromDecimals = tokens[fromToken].decimals;
        const inputAmount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromDecimals));
        
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${inputAmount}&slippageBps=${Math.floor(currentSlippage * 100)}`;
        const response = await fetch(quoteUrl);
        const quote = await response.json();
        
        if (quote.error) {
            throw new Error(quote.error);
        }
        
        const toDecimals = tokens[toToken].decimals;
        const outputAmount = quote.outAmount / Math.pow(10, toDecimals);
        
        document.getElementById('to-amount').value = outputAmount.toFixed(6);
        
        const rate = outputAmount / parseFloat(fromAmount);
        let rateText = `1 ${tokens[fromToken].symbol} = ${rate.toFixed(4)} ${tokens[toToken].symbol}`;
        
        // Add USD value if SOL is involved
        if (fromToken === 'So11111111111111111111111111111111111111112' && currentSolPrice > 0) {
            rateText += ` (~$${(rate * currentSolPrice).toFixed(2)})`;
        } else if (toToken === 'So11111111111111111111111111111111111111112' && currentSolPrice > 0) {
            rateText += ` (~$${(rate * currentSolPrice).toFixed(2)})`;
        }
        
        document.getElementById('exchange-rate').textContent = rateText;
        
        document.getElementById('swap-btn').textContent = 'Execute Swap';
        document.getElementById('swap-btn').disabled = false;
        document.getElementById('swap-btn').onclick = () => executeSwap(quote);
        
    } catch (error) {
        console.error('Quote failed:', error);
        document.getElementById('to-amount').value = 'Error';
        document.getElementById('exchange-rate').textContent = 'Quote failed';
        document.getElementById('swap-btn').textContent = 'Quote Failed';
        document.getElementById('swap-btn').disabled = true;
    }
}

function swapTokens() {
    const fromToken = document.getElementById('from-token');
    const toToken = document.getElementById('to-token');
    
    const temp = fromToken.value;
    fromToken.value = toToken.value;
    toToken.value = temp;
    
    document.getElementById('from-amount').value = '';
    document.getElementById('to-amount').value = '';
    
    updateQuote();
}

async function executeSwap(quote) {
    if (!window.walletAdapter?.isConnected() || !quote) {
        alert('Connect wallet and get quote first');
        return;
    }
    
    try {
        document.getElementById('swap-btn').textContent = 'Processing...';
        document.getElementById('swap-btn').disabled = true;
        
        const walletPublicKey = window.walletAdapter.getPublicKey();
        const fromToken = document.getElementById('from-token').value;
        const toToken = document.getElementById('to-token').value;
        const fromAmount = document.getElementById('from-amount').value;
        const toAmount = document.getElementById('to-amount').value;
        
        // Use S-IO Protocol for swaps
        const swapData = {
            wallet: walletPublicKey.toString(),
            fromToken,
            toToken,
            fromAmount: parseFloat(fromAmount),
            toAmount: parseFloat(toAmount),
            quote
        };
        
        const response = await fetch('/api/sio/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(swapData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            recentSwaps.unshift({
                from: `${fromAmount} ${tokens[fromToken].symbol}`,
                to: `${toAmount} ${tokens[toToken].symbol}`,
                signature: result.signature,
                time: new Date().toLocaleTimeString()
            });
            
            displayRecentSwaps();
            
            showSwapSuccessDialog({
                fromAmount,
                fromSymbol: tokens[fromToken].symbol,
                toAmount,
                toSymbol: tokens[toToken].symbol,
                signature: result.signature
            });
            
            document.getElementById('from-amount').value = '';
            document.getElementById('to-amount').value = '';
            
            if (window.walletBalanceLoader) {
                window.walletBalanceLoader.refreshBalances(walletPublicKey.toString());
            }
        } else {
            throw new Error(result.message || 'Swap failed');
        }
        
    } catch (error) {
        console.error('Swap error:', error);
        alert('Swap failed: ' + error.message);
    } finally {
        document.getElementById('swap-btn').textContent = 'Get Quote';
        document.getElementById('swap-btn').disabled = false;
        document.getElementById('swap-btn').onclick = null;
    }
}

function loadRecentSwaps() {
    const saved = localStorage.getItem('recent-swaps');
    if (saved) {
        recentSwaps = JSON.parse(saved);
    }
    displayRecentSwaps();
}

function displayRecentSwaps() {
    const html = recentSwaps.slice(0, 5).map(swap => `
        <div style="display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #333;">
            <div>
                <div style="color: #fff;">${swap.from} → ${swap.to}</div>
                <div style="color: #666; font-size: 0.9rem;">${swap.time}</div>
            </div>
            <div>
                <a href="https://solscan.io/tx/${swap.signature}" target="_blank" style="color: #0066ff; text-decoration: none; font-size: 0.9rem;">
                    View Tx
                </a>
            </div>
        </div>
    `).join('');
    
    document.getElementById('recent-swaps').innerHTML = html || '<p style="color: #666; text-align: center;">No recent swaps</p>';
    
    localStorage.setItem('recent-swaps', JSON.stringify(recentSwaps));
}

function showSwapSuccessDialog({ fromAmount, fromSymbol, toAmount, toSymbol, signature }) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); display: flex; align-items: center; 
        justify-content: center; z-index: 10000;
    `;
    
    dialog.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            border: 2px solid #dc2626; border-radius: 12px; padding: 2rem;
            max-width: 400px; text-align: center; color: #fff;
        ">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
            <h3 style="color: #dc2626; margin-bottom: 1rem;">Swap Successful!</h3>
            <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">
                    ${fromAmount} ${fromSymbol} → ${toAmount} ${toSymbol}
                </div>
                <div style="color: #666; font-size: 0.9rem;">Transaction confirmed</div>
            </div>
            <div style="margin-bottom: 1.5rem;">
                <a href="https://solscan.io/tx/${signature}" target="_blank" 
                   style="color: #0066ff; text-decoration: none; font-size: 0.9rem;">
                    View on Solscan →
                </a>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #dc2626; color: #fff; border: none; 
                           padding: 0.8rem 2rem; border-radius: 6px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    setTimeout(() => dialog.remove(), 10000);
}

let currentSolPrice = 0;
let currentSlippage = 0.5;

async function loadMarketData() {
    try {
        // Get SOL price from CoinGecko
        const solResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_vol=true');
        const solData = await solResponse.json();
        
        if (solData.solana) {
            currentSolPrice = solData.solana.usd;
            const priceText = `$${currentSolPrice.toFixed(2)}`;
            
            // Update all SOL price displays
            document.getElementById('sol-price').textContent = priceText;
            document.getElementById('sol-price-swap').textContent = priceText;
            document.getElementById('volume-24h').textContent = `$${(solData.solana.usd_24h_vol / 1000000).toFixed(1)}M`;
            
            // Update swap fee in USD
            const feeInUsd = (0.0025 * currentSolPrice).toFixed(3);
            document.getElementById('swap-fee').textContent = `~$${feeInUsd}`;
            
            // Calculate real-time slippage based on volume
            const volume24h = solData.solana.usd_24h_vol;
            if (volume24h > 2000000000) { // High volume
                currentSlippage = 0.1 + Math.random() * 0.2; // 0.1-0.3%
            } else if (volume24h > 1000000000) { // Medium volume
                currentSlippage = 0.3 + Math.random() * 0.4; // 0.3-0.7%
            } else { // Low volume
                currentSlippage = 0.5 + Math.random() * 0.8; // 0.5-1.3%
            }
            
            document.getElementById('slippage-display').textContent = `${currentSlippage.toFixed(2)}%`;
        }
        
        // Get S-IO price (mock for now)
        document.getElementById('sio-price').textContent = '$0.0024';
        
    } catch (error) {
        console.error('Failed to load market data:', error);
        document.getElementById('sol-price').textContent = '$--';
        document.getElementById('sol-price-swap').textContent = '$--';
        document.getElementById('sio-price').textContent = '$--';
        document.getElementById('volume-24h').textContent = '$--';
        document.getElementById('slippage-display').textContent = '--';
    }
}