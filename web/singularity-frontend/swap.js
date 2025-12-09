const { Connection, PublicKey, VersionedTransaction, clusterApiUrl } = solanaWeb3;

let connection;
let wallet = null;
let currentQuote = null;

const SOL_MINT = 'So11111111111111111111111111111111111111112';

document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('quote-btn').addEventListener('click', getQuote);
    document.getElementById('swap-btn').addEventListener('click', executeSwap);
    document.getElementById('from-amount').addEventListener('input', debounce(getQuote, 500));
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    wallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
}

function setSOL(field) {
    document.getElementById(`${field}-token`).value = SOL_MINT;
}

function swapDirection() {
    const from = document.getElementById('from-token').value;
    const to = document.getElementById('to-token').value;
    document.getElementById('from-token').value = to;
    document.getElementById('to-token').value = from;
    currentQuote = null;
    document.getElementById('to-amount').textContent = '~';
    document.getElementById('route-info').style.display = 'none';
}

async function getQuote() {
    const fromMint = document.getElementById('from-token').value.trim();
    const toMint = document.getElementById('to-token').value.trim();
    const amount = document.getElementById('from-amount').value;
    
    if (!fromMint || !toMint || !amount || amount <= 0) {
        document.getElementById('to-amount').textContent = '~';
        document.getElementById('swap-btn').disabled = true;
        return;
    }
    
    const btn = document.getElementById('quote-btn');
    btn.disabled = true;
    btn.textContent = 'Getting Quote...';
    
    try {
        // Get decimals
        const fromDecimals = fromMint === SOL_MINT ? 9 : await getTokenDecimals(fromMint);
        const inputAmount = Math.floor(amount * Math.pow(10, fromDecimals));
        
        // Get quote from Jupiter
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromMint}&outputMint=${toMint}&amount=${inputAmount}&slippageBps=50`;
        const response = await fetch(quoteUrl);
        const quote = await response.json();
        
        if (quote.error) {
            throw new Error(quote.error);
        }
        
        currentQuote = quote;
        
        // Display output amount
        const toDecimals = toMint === SOL_MINT ? 9 : await getTokenDecimals(toMint);
        const outAmount = quote.outAmount / Math.pow(10, toDecimals);
        document.getElementById('to-amount').textContent = `≈ ${outAmount.toFixed(6)}`;
        
        // Display route info
        const routeText = quote.routePlan?.map(r => r.swapInfo?.label || 'Unknown').join(' → ') || 'Direct';
        document.getElementById('route-text').textContent = routeText;
        document.getElementById('price-impact').textContent = `${(quote.priceImpactPct || 0).toFixed(2)}%`;
        document.getElementById('route-info').style.display = 'block';
        
        document.getElementById('swap-btn').disabled = false;
    } catch (error) {
        console.error('Quote error:', error);
        document.getElementById('to-amount').textContent = 'Error: ' + error.message;
        document.getElementById('swap-btn').disabled = true;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Get Quote';
    }
}

async function executeSwap() {
    if (!wallet) {
        alert('Connect wallet first');
        return;
    }
    
    if (!currentQuote) {
        alert('Get a quote first');
        return;
    }
    
    const btn = document.getElementById('swap-btn');
    btn.disabled = true;
    btn.textContent = 'Swapping...';
    
    try {
        // Get swap transaction
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: currentQuote,
                userPublicKey: wallet.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto'
            })
        });
        
        const { swapTransaction } = await swapResponse.json();
        
        // Deserialize and sign
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            maxRetries: 2
        });
        
        await connection.confirmTransaction(signature, 'confirmed');
        
        alert(`Swap successful!\\n\\nSignature: ${signature}\\n\\nView on Solscan: https://solscan.io/tx/${signature}`);
        
        // Reset
        document.getElementById('from-amount').value = '';
        document.getElementById('to-amount').textContent = '~';
        document.getElementById('route-info').style.display = 'none';
        currentQuote = null;
        
    } catch (error) {
        console.error('Swap error:', error);
        alert('Swap failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Execute Swap';
    }
}

async function getTokenDecimals(mint) {
    try {
        const mintPubkey = new PublicKey(mint);
        const info = await connection.getAccountInfo(mintPubkey);
        return info.data.readUInt8(44);
    } catch {
        return 9;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
