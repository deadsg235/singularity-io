const { Connection, PublicKey } = solanaWeb3;

// S-IO Token Contract Address
const SIO_TOKEN_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

// Free reliable RPC endpoints
const RPC_ENDPOINTS = [
    'https://api.devnet.solana.com', // Use devnet for testing
    'https://api.testnet.solana.com',
    'https://solana-mainnet.g.alchemy.com/v2/demo' // Alchemy demo endpoint
];

let connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
let rpcIndex = 0;

// Global S-IO balance tracking
let sioBalance = 0;
window.globalWallet = null;

async function getSIOBalance(walletAddress) {
    try {
        const response = await fetch(`/api/sio/balance/${walletAddress}`);
        
        if (response.ok) {
            const data = await response.json();
            return data.balance || 0;
        }
        
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
        
    } catch (error) {
        console.error('S-IO balance fetch failed:', error);
        return 0; // Return 0 instead of throwing to prevent UI breaks
    }
}



// Get total supply for 1% calculation
async function getSIOTotalSupply() {
    try {
        const response = await fetch('/api/sio/stats');
        const data = await response.json();
        return data.total_supply || 100000000; // Fallback to 100M
    } catch (error) {
        console.error('Failed to get total supply:', error);
        return 100000000; // Fallback
    }
}

// Export functions globally
window.getSIOTotalSupply = getSIOTotalSupply;

async function getSIOPrice() {
    try {
        // Try backend API first
        const response = await fetch('/api/sio/price');
        const data = await response.json();
        
        if (data.price_usd) {
            return data.price_usd;
        }
        
        // Fallback to Jupiter API
        const jupResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${SIO_TOKEN_MINT}&outputMint=So11111111111111111111111111111111111111112&amount=1000000&slippageBps=50`);
        const quote = await jupResponse.json();
        
        if (quote.outAmount) {
            const solPrice = 188.50;
            const sioInSol = quote.outAmount / 1e9;
            return sioInSol * solPrice;
        }
        
        return 0.001;
    } catch (error) {
        console.error('Error getting S-IO price:', error);
        return 0.001;
    }
}

async function updateSIODisplay() {
    if (!window.globalWallet) return;
    
    const balance = await getSIOBalance(window.globalWallet.toString());
    const price = await getSIOPrice();
    
    sioBalance = balance;
    
    // Update all S-IO balance displays
    const balanceElements = document.querySelectorAll('[id*="sio-balance"], [id*="s-io-balance"]');
    balanceElements.forEach(el => {
        el.textContent = `${balance.toLocaleString()} S-IO`;
    });
    
    // Update value displays
    const valueElements = document.querySelectorAll('[id*="sio-value"]');
    valueElements.forEach(el => {
        el.textContent = `$${(balance * price).toFixed(2)}`;
    });
    
    return { balance, price, value: balance * price };
}

// Check if user has minimum S-IO for features (1% of total supply)
function hasMinimumSIO(totalSupply = 100000000) {
    const onePercent = totalSupply * 0.01;
    return sioBalance >= onePercent;
}

// Export for global use
window.getSIOBalance = getSIOBalance;
window.getSIOPrice = getSIOPrice;
window.updateSIODisplay = updateSIODisplay;
window.hasMinimumSIO = hasMinimumSIO;
window.SIO_TOKEN_MINT = SIO_TOKEN_MINT;