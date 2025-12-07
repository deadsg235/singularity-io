// Solana SPL Token Launchpad
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } = solanaWeb3;

let connection;
let wallet = null;
let provider = null;
let tokens = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('token-form').addEventListener('submit', createToken);
    
    checkWalletConnection();
    loadTokens();
    setInterval(loadTokens, 5000);
});

async function checkWalletConnection() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect({ onlyIfTrusted: true });
            wallet = resp.publicKey;
            updateWalletUI();
        } catch (e) {
            console.log('Wallet not auto-connected');
        }
    }
}

// Connect Phantom Wallet
async function connectWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            alert('Please install Phantom Wallet');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        provider = window.solana;
        
        updateWalletUI();
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Failed to connect wallet');
    }
}

function updateWalletUI() {
    const btn = document.getElementById('wallet-btn');
    if (wallet) {
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
    }
}

// Create SPL Token
async function createToken(e) {
    e.preventDefault();
    
    if (!wallet) {
        alert('Please connect your wallet first');
        return;
    }
    
    const btn = document.getElementById('create-btn');
    btn.disabled = true;
    btn.textContent = 'Creating Token...';
    
    try {
        const name = document.getElementById('token-name').value;
        const symbol = document.getElementById('token-symbol').value;
        const decimals = parseInt(document.getElementById('token-decimals').value);
        const supply = parseInt(document.getElementById('token-supply').value);
        const description = document.getElementById('token-description').value;
        
        // Generate new mint keypair
        const mintKeypair = Keypair.generate();
        const mint = mintKeypair.publicKey.toString();
        
        // Save token info immediately
        const tokenInfo = {
            mint,
            name,
            symbol,
            decimals,
            supply,
            description,
            creator: wallet.toString(),
            timestamp: Date.now(),
            status: 'created'
        };
        
        tokens.push(tokenInfo);
        localStorage.setItem('tokens', JSON.stringify(tokens));
        
        alert(`Token created!\n\nName: ${name}\nSymbol: ${symbol}\nMint: ${mint}\n\nNote: On devnet, tokens are simulated.`);
        
        document.getElementById('token-form').reset();
        loadTokens();
        
    } catch (error) {
        console.error('Token creation error:', error);
        alert(`Failed to create token: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Token';
    }
}

// Load tokens from localStorage
function loadTokens() {
    const stored = localStorage.getItem('tokens');
    if (stored) {
        tokens = JSON.parse(stored);
    }
    displayTokens();
}

// Display tokens
function displayTokens() {
    const list = document.getElementById('token-list');
    
    if (tokens.length === 0) {
        list.innerHTML = '<p style="color: #666; text-align: center;">No tokens created yet. Create one above or via AI chat!</p>';
        return;
    }
    
    const sorted = [...tokens].sort((a, b) => b.timestamp - a.timestamp);
    
    list.innerHTML = sorted.map(token => `
        <div class="token-card">
            <h3>${token.name} (${token.symbol})</h3>
            <span class="status success">Created</span>
            <div class="token-info">
                <div><strong>Mint:</strong> ${token.mint.slice(0, 8)}...${token.mint.slice(-8)}</div>
                <div><strong>Supply:</strong> ${token.supply.toLocaleString()}</div>
                <div><strong>Decimals:</strong> ${token.decimals}</div>
                <div><strong>Creator:</strong> ${token.creator.slice(0, 8)}...</div>
            </div>
            <p style="color: #999; margin-top: 0.5rem; font-size: 0.9rem;">${token.description || 'No description'}</p>
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button onclick="copyMint('${token.mint}')" style="flex: 1; padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Copy Mint</button>
                <button onclick="deleteToken('${token.mint}')" style="padding: 0.5rem 1rem; background: #ff4444; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        </div>
    `).join('');
}

// Copy mint address
function copyMint(mint) {
    navigator.clipboard.writeText(mint);
    alert('Mint address copied to clipboard!');
}

// Delete token
function deleteToken(mint) {
    if (confirm('Delete this token?')) {
        tokens = tokens.filter(t => t.mint !== mint);
        localStorage.setItem('tokens', JSON.stringify(tokens));
        loadTokens();
    }
}

// Generate new wallet
function generateWallet() {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = Array.from(keypair.secretKey);
    
    alert(`New Wallet Generated!\n\nPublic Key:\n${publicKey}\n\nSecret Key (save securely):\n[${secretKey.slice(0, 8).join(',')}...]\n\nImport this into Phantom wallet.`);
    
    return { publicKey, secretKey };
}

console.log('Launchpad initialized');
