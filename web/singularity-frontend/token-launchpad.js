// Token Launchpad JavaScript
let connection;
let wallet;
let publicKey;
let tokens = [];

// Initialize connection with retry logic
async function initConnection() {
    const rpcEndpoints = [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana',
        'https://ssc-dao.genesysgo.net',
        'https://solana-mainnet.g.alchemy.com/v2/demo',
        'https://mainnet.helius-rpc.com/?api-key=demo'
    ];

    for (let i = 0; i < rpcEndpoints.length; i++) {
        try {
            console.log(`Trying RPC endpoint ${i + 1}/${rpcEndpoints.length}: ${rpcEndpoints[i]}`);
            connection = new solanaWeb3.Connection(rpcEndpoints[i], 'confirmed');

            // Test connection with timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), 10000)
            );

            await Promise.race([
                connection.getVersion(),
                timeoutPromise
            ]);

            console.log(`✅ Connected to RPC endpoint: ${rpcEndpoints[i]}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed to connect to ${rpcEndpoints[i]}: ${error.message}`);
            if (i === rpcEndpoints.length - 1) {
                throw new Error('All RPC endpoints failed');
            }
        }
    }
}

// Wallet connection
async function connectWallet() {
    try {
        if (!window.solana) {
            alert('Phantom wallet not found. Please install Phantom wallet.');
            return;
        }

        const response = await window.solana.connect();
        wallet = window.solana;
        publicKey = response.publicKey;

        document.getElementById('wallet-btn').textContent = publicKey.toString().slice(0, 8) + '...';
        document.getElementById('wallet-btn').style.background = '#00ff88';
        document.getElementById('balance-display').classList.remove('hidden');

        await loadBalances();
        await loadTokens();
    } catch (error) {
        console.error('Wallet connection failed:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

// Generate new wallet
function generateWallet() {
    const keypair = solanaWeb3.Keypair.generate();
    const secretKey = Array.from(keypair.secretKey);
    const publicKey = keypair.publicKey.toString();

    const qrDiv = document.createElement('div');
    qrDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: #000; border: 1px solid #0066ff; padding: 2rem; border-radius: 8px; max-width: 400px;">
                <h3 style="color: #0066ff; margin-bottom: 1rem;">New Wallet Generated</h3>
                <div id="qr-code" style="margin: 1rem 0;"></div>
                <p style="color: #fff; font-size: 0.9rem; word-break: break-all;"><strong>Public Key:</strong> ${publicKey}</p>
                <p style="color: #fff; font-size: 0.9rem; word-break: break-all;"><strong>Secret Key:</strong> [${secretKey.join(',')}]</p>
                <p style="color: #ff4444; font-size: 0.8rem;">⚠️ Save your secret key securely! Never share it.</p>
                <button onclick="this.parentElement.parentElement.remove()" style="width: 100%; padding: 0.5rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(qrDiv);

    // Generate QR code
    new QRCode(document.getElementById('qr-code'), {
        text: publicKey,
        width: 256,
        height: 256,
        colorDark: '#0066ff',
        colorLight: '#000'
    });
}

// Load wallet balances
async function loadBalances() {
    if (!publicKey) return;

    try {
        // Load SOL balance
        const solBalance = await connection.getBalance(publicKey);
        document.getElementById('sol-balance').textContent = (solBalance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);

        // Load S-IO token balance
        const sioMint = new solanaWeb3.PublicKey('Singularity111111111111111111111111111111111'); // Replace with actual S-IO mint
        const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, { mint: sioMint });

        if (tokenAccounts.value.length > 0) {
            const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].account.owner);
            document.getElementById('sio-balance').textContent = tokenAccountInfo.value.uiAmountString || '0';
        } else {
            document.getElementById('sio-balance').textContent = '0';
        }
    } catch (error) {
        console.error('Failed to load balances:', error);
    }
}

// Create SPL token
async function createToken(name, symbol, decimals, supply, description) {
    if (!wallet || !publicKey) {
        throw new Error('Wallet not connected');
    }

    try {
        // Create mint account
        const mint = solanaWeb3.Keypair.generate();
        const mintRent = await connection.getMinimumBalanceForRentExemption(splToken.MINT_SIZE);

        const createMintTx = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: mint.publicKey,
                space: splToken.MINT_SIZE,
                lamports: mintRent,
                programId: splToken.TOKEN_PROGRAM_ID,
            }),
            splToken.createInitializeMintInstruction(
                mint.publicKey,
                decimals,
                publicKey,
                publicKey,
                splToken.TOKEN_PROGRAM_ID
            )
        );

        await wallet.signAndSendTransaction(createMintTx);

        // Create associated token account
        const associatedTokenAccount = await splToken.getAssociatedTokenAddress(
            mint.publicKey,
            publicKey
        );

        const createAtaTx = new solanaWeb3.Transaction().add(
            splToken.createAssociatedTokenAccountInstruction(
                publicKey,
                associatedTokenAccount,
                publicKey,
                mint.publicKey
            )
        );

        await wallet.signAndSendTransaction(createAtaTx);

        // Mint initial supply
        const mintToTx = new solanaWeb3.Transaction().add(
            splToken.createMintToInstruction(
                mint.publicKey,
                associatedTokenAccount,
                publicKey,
                supply * Math.pow(10, decimals)
            )
        );

        await wallet.signAndSendTransaction(mintToTx);

        const tokenData = {
            name,
            symbol,
            decimals,
            supply,
            description,
            mintAddress: mint.publicKey.toString(),
            createdAt: new Date().toISOString(),
            status: 'success'
        };

        tokens.push(tokenData);
        saveTokens();
        displayTokens();

        return tokenData;
    } catch (error) {
        console.error('Token creation failed:', error);
        throw error;
    }
}

// Save tokens to localStorage
function saveTokens() {
    localStorage.setItem('singularity-tokens', JSON.stringify(tokens));
}

// Load tokens from localStorage
function loadTokens() {
    const saved = localStorage.getItem('singularity-tokens');
    if (saved) {
        tokens = JSON.parse(saved);
        displayTokens();
    }
}

// Display tokens
function displayTokens() {
    const container = document.getElementById('token-list');
    container.innerHTML = '';

    if (tokens.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No tokens created yet.</p>';
        return;
    }

    tokens.forEach(token => {
        const card = document.createElement('div');
        card.className = 'token-card';
        card.innerHTML = `
            <h3>${token.name} (${token.symbol})</h3>
            <div class="token-info">
                <div><strong>Mint:</strong> ${token.mintAddress.slice(0, 8)}...${token.mintAddress.slice(-8)}</div>
                <div><strong>Supply:</strong> ${token.supply.toLocaleString()}</div>
                <div><strong>Decimals:</strong> ${token.decimals}</div>
                <div><strong>Created:</strong> ${new Date(token.createdAt).toLocaleDateString()}</div>
            </div>
            <div style="margin-top: 1rem;">
                <span class="status ${token.status}">${token.status.toUpperCase()}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Debug function to show tokens
function debugTokens() {
    console.log('Current tokens:', tokens);
    alert(`Found ${tokens.length} tokens in storage. Check console for details.`);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initConnection();
        console.log('✅ Connection initialized');
    } catch (error) {
        console.error('❌ Connection failed:', error);
        alert('Failed to connect to Solana network. Please check your internet connection.');
    }

    document.getElementById('wallet-btn').addEventListener('click', connectWallet);

    document.getElementById('token-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('create-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Creating...';

        try {
            const name = document.getElementById('token-name').value;
            const symbol = document.getElementById('token-symbol').value;
            const decimals = parseInt(document.getElementById('token-decimals').value);
            const supply = parseInt(document.getElementById('token-supply').value);
            const description = document.getElementById('token-description').value;

            const token = await createToken(name, symbol, decimals, supply, description);
            alert(`Token "${token.name}" created successfully!\nMint Address: ${token.mintAddress}`);

            // Reset form
            document.getElementById('token-form').reset();
        } catch (error) {
            alert('Failed to create token: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    });

    loadTokens();
});