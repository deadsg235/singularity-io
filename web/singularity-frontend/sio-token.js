const { Connection, PublicKey } = solanaWeb3;

// S-IO Token Contract Address
const SIO_TOKEN_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

// Multiple RPC endpoints for fallback
const RPC_ENDPOINTS = [
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://api.mainnet-beta.solana.com'
];

let connection = new Connection(RPC_ENDPOINTS[0], 'confirmed');
let rpcIndex = 0;

// Global S-IO balance tracking
let sioBalance = 0;
window.globalWallet = null;

async function getSIOBalance(walletAddress) {
    for (let attempt = 0; attempt < RPC_ENDPOINTS.length; attempt++) {
        try {
            const walletPubkey = new PublicKey(walletAddress);
            
            // Get token accounts for the wallet
            const tokenAccounts = await connection.getTokenAccountsByOwner(walletPubkey, {
                mint: new PublicKey(SIO_TOKEN_MINT)
            });
            
            if (tokenAccounts.value.length === 0) {
                return 0;
            }
            
            // Get the balance from the first token account
            const accountInfo = await connection.getAccountInfo(tokenAccounts.value[0].pubkey);
            if (!accountInfo) return 0;
            
            // Parse token account data
            const data = accountInfo.data;
            const amount = data.readBigUInt64LE(64); // Token amount is at offset 64
            
            // S-IO has 6 decimals
            return Number(amount) / 1000000;
            
        } catch (error) {
            console.error(`RPC attempt ${attempt + 1} failed:`, error);
            if (attempt < RPC_ENDPOINTS.length - 1) {
                rpcIndex = (rpcIndex + 1) % RPC_ENDPOINTS.length;
                connection = new Connection(RPC_ENDPOINTS[rpcIndex], 'confirmed');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    console.error('All RPC endpoints failed for S-IO balance');
    return 0;
}

// Get total supply for 1% calculation
async function getSIOTotalSupply() {
    try {
        const response = await fetch('/api/sio/stats');
        const data = await response.json();
        return data.total_supply || 100000000; // Fallback to 100M
    } catch (error) {
        return 100000000; // Fallback
    }
}

async function getSIOPrice() {
    try {
        // Get price from Jupiter API
        const response = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${SIO_TOKEN_MINT}&outputMint=So11111111111111111111111111111111111111112&amount=1000000&slippageBps=50`);
        const quote = await response.json();
        
        if (quote.outAmount) {
            // Convert to USD (assuming SOL = $188.50)
            const solPrice = 188.50;
            const sioInSol = quote.outAmount / 1e9;
            return sioInSol * solPrice;
        }
        
        return 0.001; // Fallback price
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