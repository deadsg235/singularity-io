let wallet = null;
let tokens = [];
let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('token-select').addEventListener('change', showMetadata);
    document.getElementById('upload-btn').addEventListener('click', uploadToIPFS);
    loadTokens();
});

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

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana || !window.solana.isPhantom) {
            alert('Install Phantom Wallet');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
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

    try {
        if (!solanaConnection) {
            solanaConnection = new solanaWeb3.Connection(
                SOLANA_RPC,
                { commitment: 'confirmed' }
            );
        }

        const owner = new solanaWeb3.PublicKey(wallet);

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

function loadTokens() {
    const stored = localStorage.getItem('tokens');
    if (stored) tokens = JSON.parse(stored);
    
    const select = document.getElementById('token-select');
    select.innerHTML = '<option value="">-- Select Token --</option>' + 
        tokens.map((t, i) => `<option value="${i}">${t.name} (${t.symbol})</option>`).join('');
}

function showMetadata() {
    const idx = document.getElementById('token-select').value;
    if (!idx) return;
    
    const token = tokens[idx];
    const metadata = {
        name: token.name,
        symbol: token.symbol,
        description: token.description || '',
        image: token.image || '',
        external_url: token.external_url || '',
        attributes: token.attributes || []
    };
    
    document.getElementById('json-preview').textContent = JSON.stringify(metadata, null, 2);
    document.getElementById('metadata-preview').style.display = 'block';
}

async function uploadToIPFS() {
    const key = document.getElementById('pinata-key').value;
    const idx = document.getElementById('token-select').value;
    
    if (!key || !idx) {
        alert('Enter Pinata API key and select token');
        return;
    }
    
    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    try {
        const token = tokens[idx];
        const metadata = {
            name: token.name,
            symbol: token.symbol,
            description: token.description || '',
            image: token.image || '',
            external_url: token.external_url || '',
            attributes: token.attributes || []
        };
        
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: { name: `${token.name}-metadata` }
            })
        });
        
        const result = await response.json();
        
        if (result.IpfsHash) {
            const uri = `https://ipfs.io/ipfs/${result.IpfsHash}`;
            document.getElementById('ipfs-uri').value = uri;
            document.getElementById('result').style.display = 'block';
            
            tokens[idx].metadata_uri = uri;
            tokens[idx].ipfs_hash = result.IpfsHash;
            localStorage.setItem('tokens', JSON.stringify(tokens));
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        alert('Upload failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload to IPFS';
    }
}
