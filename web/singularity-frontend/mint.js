const { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } = solanaWeb3;

let connection;
let wallet = null;
let tokens = [];
let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint

const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://mainnet.helius-rpc.com/?api-key=00000000-0000-0000-0000-000000000000',
    'https://ssc-dao.genesysgo.net',
    'https://solana-api.genesis.com'
];


document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('mint-btn').addEventListener('click', mintTokens);
    document.getElementById('transfer-btn').addEventListener('click', transferTokens);
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

        if (!window.solana?.isPhantom) {
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

    let lastError = null;
    const allEndpoints = [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS];
    
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

function loadTokens() {
    const stored = localStorage.getItem('tokens');
    if (stored) tokens = JSON.parse(stored);
    
    const html = '<option value="">-- Select Token --</option>' + 
        tokens.map((t, i) => `<option value="${i}">${t.name} (${t.symbol})</option>`).join('');
    
    document.getElementById('mint-token-select').innerHTML = html;
    document.getElementById('transfer-token-select').innerHTML = html;
}

async function mintTokens() {
    if (!wallet) {
        alert('Connect wallet first');
        return;
    }
    
    const idx = document.getElementById('mint-token-select').value;
    const amount = document.getElementById('mint-amount').value;
    
    if (!idx || !amount) {
        alert('Select token and enter amount');
        return;
    }
    
    const btn = document.getElementById('mint-btn');
    btn.disabled = true;
    btn.textContent = 'Minting...';
    
    try {
        const token = tokens[idx];
        const mint = new PublicKey(token.mint);
        const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        // Find ATA
        const [ata] = await PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // Check if ATA exists
        const ataInfo = await connection.getAccountInfo(ata);
        const transaction = new Transaction();
        
        if (!ataInfo) {
            // Create ATA
            const createAtaIx = {
                keys: [
                    { pubkey: wallet, isSigner: true, isWritable: true },
                    { pubkey: ata, isSigner: false, isWritable: true },
                    { pubkey: wallet, isSigner: false, isWritable: false },
                    { pubkey: mint, isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM_ID,
                data: Buffer.from([])
            };
            transaction.add(createAtaIx);
        }
        
        // Mint instruction
        const mintAmount = BigInt(amount) * BigInt(Math.pow(10, token.decimals || 9));
        const mintData = Buffer.alloc(9);
        mintData.writeUInt8(7, 0); // MintTo instruction
        mintData.writeBigUInt64LE(mintAmount, 1);
        
        const mintIx = {
            keys: [
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: ata, isSigner: false, isWritable: true },
                { pubkey: wallet, isSigner: true, isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: mintData
        };
        
        transaction.add(mintIx);
        transaction.feePayer = wallet;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature, 'confirmed');
        
        alert(`Minted ${amount} tokens!\\n\\nSignature: ${signature}`);
    } catch (error) {
        alert('Mint failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Mint to Wallet';
    }
}

async function transferTokens() {
    if (!wallet) {
        alert('Connect wallet first');
        return;
    }
    
    const idx = document.getElementById('transfer-token-select').value;
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('transfer-amount').value;
    
    if (!idx || !recipient || !amount) {
        alert('Fill all fields');
        return;
    }
    
    const btn = document.getElementById('transfer-btn');
    btn.disabled = true;
    btn.textContent = 'Transferring...';
    
    try {
        const token = tokens[idx];
        const mint = new PublicKey(token.mint);
        const recipientPubkey = new PublicKey(recipient);
        const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        // Find sender ATA
        const [senderAta] = await PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // Find recipient ATA
        const [recipientAta] = await PublicKey.findProgramAddress(
            [recipientPubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const transaction = new Transaction();
        
        // Check if recipient ATA exists
        const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
        if (!recipientAtaInfo) {
            const createAtaIx = {
                keys: [
                    { pubkey: wallet, isSigner: true, isWritable: true },
                    { pubkey: recipientAta, isSigner: false, isWritable: true },
                    { pubkey: recipientPubkey, isSigner: false, isWritable: false },
                    { pubkey: mint, isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM_ID,
                data: Buffer.from([])
            };
            transaction.add(createAtaIx);
        }
        
        // Transfer instruction
        const transferAmount = BigInt(amount) * BigInt(Math.pow(10, token.decimals || 9));
        const transferData = Buffer.alloc(9);
        transferData.writeUInt8(3, 0); // Transfer instruction
        transferData.writeBigUInt64LE(transferAmount, 1);
        
        const transferIx = {
            keys: [
                { pubkey: senderAta, isSigner: false, isWritable: true },
                { pubkey: recipientAta, isSigner: false, isWritable: true },
                { pubkey: wallet, isSigner: true, isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: transferData
        };
        
        transaction.add(transferIx);
        transaction.feePayer = wallet;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(signature, 'confirmed');
        
        alert(`Transferred ${amount} tokens!\\n\\nSignature: ${signature}`);
        document.getElementById('recipient').value = '';
        document.getElementById('transfer-amount').value = '';
    } catch (error) {
        alert('Transfer failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Transfer';
    }
}
