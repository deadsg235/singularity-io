// Solana SPL Token Launchpad
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = solanaWeb3;
const { Token, TOKEN_PROGRAM_ID } = splToken;

let connection;
let wallet = null;
let tokens = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('token-form').addEventListener('submit', createToken);
    
    loadTokens();
});

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
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Failed to connect wallet');
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
        
        // Create mint account
        const mintKeypair = Keypair.generate();
        
        // Get minimum balance for rent exemption
        const lamports = await connection.getMinimumBalanceForRentExemption(82);
        
        // Create token
        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet,
                newAccountPubkey: mintKeypair.publicKey,
                space: 82,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            })
        );
        
        // Request signature from Phantom
        transaction.feePayer = wallet;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair);
        
        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature);
        
        // Initialize mint
        const token = new Token(
            connection,
            mintKeypair.publicKey,
            TOKEN_PROGRAM_ID,
            wallet
        );
        
        await token.createMint(wallet, null, decimals, TOKEN_PROGRAM_ID);
        
        // Create associated token account
        const tokenAccount = await token.getOrCreateAssociatedAccountInfo(wallet);
        
        // Mint initial supply
        await token.mintTo(tokenAccount.address, wallet, [], supply * Math.pow(10, decimals));
        
        // Save token info
        const tokenInfo = {
            mint: mintKeypair.publicKey.toString(),
            name,
            symbol,
            decimals,
            supply,
            description,
            creator: wallet.toString(),
            timestamp: Date.now()
        };
        
        tokens.push(tokenInfo);
        localStorage.setItem('tokens', JSON.stringify(tokens));
        
        alert(`Token created successfully!\nMint: ${mintKeypair.publicKey.toString()}`);
        
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
        list.innerHTML = '<p style="color: #666; text-align: center;">No tokens created yet</p>';
        return;
    }
    
    list.innerHTML = tokens.map(token => `
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
            <button onclick="copyMint('${token.mint}')" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Copy Mint Address</button>
        </div>
    `).join('');
}

// Copy mint address
function copyMint(mint) {
    navigator.clipboard.writeText(mint);
    alert('Mint address copied to clipboard!');
}

console.log('Launchpad initialized');
