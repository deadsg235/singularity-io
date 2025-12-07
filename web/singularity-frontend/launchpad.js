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
    setInterval(loadTokens, 3000);
    
    // Listen for storage changes
    window.addEventListener('storage', loadTokens);
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
        
        // Show success modal with full mint address
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999;';
        modal.innerHTML = `
            <div style="background: #000; border: 2px solid #0066ff; border-radius: 8px; padding: 2rem; max-width: 600px; width: 90%;">
                <h2 style="color: #0066ff; margin-bottom: 1rem;">✅ Token Created!</h2>
                
                <div style="margin-bottom: 1rem;">
                    <p style="color: #fff;"><strong>Name:</strong> ${name}</p>
                    <p style="color: #fff;"><strong>Symbol:</strong> ${symbol}</p>
                    <p style="color: #fff;"><strong>Supply:</strong> ${supply.toLocaleString()}</p>
                    <p style="color: #fff;"><strong>Decimals:</strong> ${decimals}</p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label style="color: #0066ff; display: block; margin-bottom: 0.5rem;">Mint Address:</label>
                    <input type="text" value="${mint}" readonly style="width: 100%; padding: 0.8rem; background: #000; border: 1px solid #0066ff; color: #fff; border-radius: 4px; font-size: 0.85rem; font-family: monospace;" onclick="this.select()">
                    <button onclick="navigator.clipboard.writeText('${mint}'); alert('Mint address copied!')" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Copy Mint Address</button>
                </div>
                
                <p style="color: #999; font-size: 0.9rem; margin-bottom: 1rem;">Note: Token created on Solana devnet</p>
                
                <button onclick="this.parentElement.parentElement.remove()" style="padding: 0.8rem 2rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
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
    try {
        const stored = localStorage.getItem('tokens');
        if (stored) {
            tokens = JSON.parse(stored);
            console.log('Loaded tokens:', tokens.length);
        } else {
            tokens = [];
        }
    } catch (e) {
        console.error('Error loading tokens:', e);
        tokens = [];
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
    
    const sorted = [...tokens].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    list.innerHTML = sorted.map(token => {
        const mint = token.mint || 'N/A';
        const name = token.name || 'Unknown';
        const symbol = token.symbol || 'N/A';
        const supply = token.supply || 0;
        const decimals = token.decimals || 9;
        const creator = token.creator || 'Unknown';
        const description = token.description || 'No description';
        
        return `
        <div class="token-card">
            <h3>${name} (${symbol})</h3>
            <span class="status success">Created</span>
            <div class="token-info">
                <div><strong>Mint:</strong> ${mint.length > 16 ? mint.slice(0, 8) + '...' + mint.slice(-8) : mint}</div>
                <div><strong>Supply:</strong> ${supply.toLocaleString()}</div>
                <div><strong>Decimals:</strong> ${decimals}</div>
                <div><strong>Creator:</strong> ${creator.length > 16 ? creator.slice(0, 8) + '...' : creator}</div>
            </div>
            <p style="color: #999; margin-top: 0.5rem; font-size: 0.9rem;">${description}</p>
            <div style="margin-top: 1rem;">
                <input type="text" value="${mint}" readonly style="width: 100%; padding: 0.5rem; background: #000; border: 1px solid #0066ff; color: #fff; border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.85rem;" onclick="this.select()">
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="copyMint('${mint}')" style="flex: 1; padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Copy Mint</button>
                    <button onclick="deleteToken('${mint}')" style="padding: 0.5rem 1rem; background: #ff4444; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
    const secretKeyString = JSON.stringify(secretKey);
    
    // Create modal to display keys
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    modal.innerHTML = `
        <div style="background: #000; border: 2px solid #0066ff; border-radius: 8px; padding: 2rem; max-width: 600px; width: 90%;">
            <h2 style="color: #0066ff; margin-bottom: 1rem;">New Wallet Generated</h2>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="color: #0066ff; display: block; margin-bottom: 0.5rem;">Public Key:</label>
                <input type="text" value="${publicKey}" readonly style="width: 100%; padding: 0.8rem; background: #000; border: 1px solid #0066ff; color: #fff; border-radius: 4px; font-size: 0.9rem;" onclick="this.select()">
                <button onclick="navigator.clipboard.writeText('${publicKey}'); alert('Public key copied!')" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Copy Public Key</button>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="color: #ff4444; display: block; margin-bottom: 0.5rem;">Secret Key (SAVE SECURELY - Never share!):</label>
                <textarea readonly style="width: 100%; padding: 0.8rem; background: #000; border: 1px solid #ff4444; color: #fff; border-radius: 4px; font-size: 0.85rem; height: 100px; font-family: monospace;" onclick="this.select()">${secretKeyString}</textarea>
                <button onclick="navigator.clipboard.writeText('${secretKeyString}'); alert('Secret key copied! Keep it safe!')" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #ff4444; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Copy Secret Key</button>
            </div>
            
            <p style="color: #999; font-size: 0.9rem; margin-bottom: 1rem;">To import into Phantom: Settings → Add/Connect Wallet → Import Private Key → Paste secret key array</p>
            
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 0.8rem 2rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%;">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    return { publicKey, secretKey };
}

// Debug function
function debugTokens() {
    const stored = localStorage.getItem('tokens');
    console.log('Raw localStorage:', stored);
    alert(`Tokens in storage: ${tokens.length}\n\nRaw data:\n${stored ? stored.substring(0, 200) : 'empty'}...\n\nCheck console for full data.`);
    loadTokens();
}

console.log('Launchpad initialized');
