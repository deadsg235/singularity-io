const { Connection, PublicKey, VersionedTransaction } = solanaWeb3;

let wallet = null;
let connection;
let recentSwaps = [];
let solanaConnection = null; // Add solanaConnection for this page
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint


const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://mainnet.helius-rpc.com/?api-key=00000000-0000-0000-0000-000000000000',
    'https://ssc-dao.genesysgo.net',
    'https://solana-api.genesis.com'
];

let currentRpcIndex = 0;

const tokens = {
    'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', decimals: 6 },
    'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump': { symbol: 'S-IO', decimals: 6 }
};

document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection(RPC_ENDPOINTS[0], 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('from-amount').addEventListener('input', updateQuote);
    document.getElementById('from-token').addEventListener('change', updateQuote);
    document.getElementById('to-token').addEventListener('change', updateQuote);
    
    loadRecentSwaps();
});

function switchRPC() {
    currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    connection = new Connection(RPC_ENDPOINTS[currentRpcIndex], 'confirmed');
    console.log('Switched to RPC:', RPC_ENDPOINTS[currentRpcIndex]);
}

async function connectWallet() {
    try {
        if (wallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            wallet = null;
            solanaConnection = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

            document.getElementById('swap-btn').textContent = 'Connect Wallet';
            document.getElementById('swap-btn').disabled = true;

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana?.isPhantom) {
            alert('Install Phantom Wallet');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        document.getElementById('swap-btn').textContent = 'Get Quote';
        document.getElementById('swap-btn').disabled = false;
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances(); // Call loadWalletBalances
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!wallet) return;

    let lastError = null;
    const allEndpoints = [RPC_ENDPOINTS[currentRpcIndex], ...FALLBACK_RPC_ENDPOINTS];
    
    for (let attempt = 0; attempt < allEndpoints.length; attempt++) {
        const endpoint = allEndpoints[attempt];
        
        try {
            console.log(`loadWalletBalances: Trying RPC endpoint ${attempt + 1}/${allEndpoints.length}: ${endpoint}`);
            
            const connection = new solanaWeb3.Connection(
                endpoint,
                { commitment: 'confirmed' }
            );

            const owner = new solanaWeb3.PublicKey(wallet);

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

async function updateBalances() {
    if (!wallet) return;
    
    try {
        const response = await fetch(`/api/wallet/analytics/${wallet.toString()}`);
        const data = await response.json();
        
        const fromToken = document.getElementById('from-token').value;
        
        if (fromToken === 'So11111111111111111111111111111111111111112') {
            document.getElementById('from-balance').textContent = `Balance: ${data.sol_balance.toFixed(4)}`;
        } else if (fromToken === 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump') {
            document.getElementById('from-balance').textContent = `Balance: ${data.sio_balance.toLocaleString()}`;
        } else {
            document.getElementById('from-balance').textContent = 'Balance: 0';
        }
        
    } catch (error) {
        console.error('Failed to get balance:', error);
        document.getElementById('from-balance').textContent = 'Balance: Unable to load';
    }
}

async function updateQuote() {
    const fromAmount = document.getElementById('from-amount').value;
    const fromToken = document.getElementById('from-token').value;
    const toToken = document.getElementById('to-token').value;
    
    if (!fromAmount || fromAmount <= 0 || fromToken === toToken) {
        document.getElementById('to-amount').value = '';
        return;
    }
    
    try {
        const fromDecimals = tokens[fromToken].decimals;
        const inputAmount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromDecimals));
        
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${inputAmount}&slippageBps=50`;
        const response = await fetch(quoteUrl);
        const quote = await response.json();
        
        if (quote.error) {
            throw new Error(quote.error);
        }
        
        const toDecimals = tokens[toToken].decimals;
        const outputAmount = quote.outAmount / Math.pow(10, toDecimals);
        
        document.getElementById('to-amount').value = outputAmount.toFixed(6);
        
        const rate = outputAmount / parseFloat(fromAmount);
        document.getElementById('exchange-rate').textContent = 
            `1 ${tokens[fromToken].symbol} = ${rate.toFixed(4)} ${tokens[toToken].symbol}`;
        
        document.getElementById('swap-btn').textContent = 'Execute Swap';
        document.getElementById('swap-btn').onclick = () => executeSwap(quote);
        
    } catch (error) {
        console.error('Quote failed:', error);
        document.getElementById('to-amount').value = 'Error';
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
    if (!wallet || !quote) {
        alert('Connect wallet and get quote first');
        return;
    }
    
    try {
        document.getElementById('swap-btn').textContent = 'Swapping...';
        document.getElementById('swap-btn').disabled = true;
        
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto'
            })
        });
        
        const { swapTransaction } = await swapResponse.json();
        const txBuf = Buffer.from(swapTransaction, 'base64');
        const tx = VersionedTransaction.deserialize(txBuf);
        
        const signed = await window.solana.signTransaction(tx);
        const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        
        await connection.confirmTransaction(signature, 'confirmed');
        
        const fromToken = document.getElementById('from-token').value;
        const toToken = document.getElementById('to-token').value;
        const fromAmount = document.getElementById('from-amount').value;
        const toAmount = document.getElementById('to-amount').value;
        
        recentSwaps.unshift({
            from: `${fromAmount} ${tokens[fromToken].symbol}`,
            to: `${toAmount} ${tokens[toToken].symbol}`,
            signature: signature,
            time: new Date().toLocaleTimeString()
        });
        
        displayRecentSwaps();
        
        alert(`Swap successful!\\nTransaction: ${signature}`);
        
        document.getElementById('from-amount').value = '';
        document.getElementById('to-amount').value = '';
        await updateBalances();
        
    } catch (error) {
        alert('Swap failed: ' + error.message);
    } finally {
        document.getElementById('swap-btn').textContent = 'Get Quote';
        document.getElementById('swap-btn').disabled = false;
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