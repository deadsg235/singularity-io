/**
 * token-launchpad.js — SPL token creation without @solana/spl-token
 * Builds all instructions manually using raw data buffers.
 */

const TOKEN_PROGRAM_ID        = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSVAR_RENT_PUBKEY       = new solanaWeb3.PublicKey('SysvarRent111111111111111111111111111111111');
const MINT_SIZE = 82;

let connection;
let walletPubkey = null;
let tokens = [];

// ── RPC init ──────────────────────────────────────────────────
async function initConnection() {
    const endpoints = [
        'https://api.mainnet-beta.solana.com',
        'https://rpc.ankr.com/solana',
        'https://solana-mainnet.phantom.tech',
        'https://api.metaplex.solana.com',
        'https://solana-mainnet-public.allthatnode.com'
    ];
    for (const ep of endpoints) {
        try {
            connection = new solanaWeb3.Connection(ep, 'confirmed');
            await Promise.race([
                connection.getVersion(),
                new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000))
            ]);
            console.log('Connected to', ep);
            return true;
        } catch { /* try next */ }
    }
    throw new Error('All RPC endpoints failed');
}

// ── Wallet ────────────────────────────────────────────────────
async function connectWallet() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        walletPubkey = null;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.style.background = '';
        document.getElementById('balance-display').classList.add('hidden');
        return;
    }
    if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)}`;
        btn.style.background = '#dc2626';
        document.getElementById('balance-display').classList.remove('hidden');
        window.loadWalletBalances(walletPubkey);
    } catch (e) { alert('Wallet connection failed: ' + e.message); }
}

// ── ATA derivation (manual PDA) ───────────────────────────────
async function findATA(owner, mint) {
    const [ata] = await solanaWeb3.PublicKey.findProgramAddress(
        [
            new solanaWeb3.PublicKey(owner).toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new solanaWeb3.PublicKey(mint).toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM
    );
    return ata;
}

// ── Instruction builders ──────────────────────────────────────
function buildInitializeMintIx(mintPubkey, decimals, mintAuthority, freezeAuthority) {
    // InitializeMint instruction: discriminator = 0
    const data = Buffer.alloc(67);
    data.writeUInt8(0, 0);                                    // instruction index
    data.writeUInt8(decimals, 1);                             // decimals
    new solanaWeb3.PublicKey(mintAuthority).toBuffer().copy(data, 2);  // mint authority (32 bytes)
    data.writeUInt8(1, 34);                                   // freeze authority option = Some
    new solanaWeb3.PublicKey(freezeAuthority).toBuffer().copy(data, 35); // freeze authority (32 bytes)

    return {
        keys: [
            { pubkey: new solanaWeb3.PublicKey(mintPubkey), isSigner: false, isWritable: true },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
        ],
        programId: TOKEN_PROGRAM_ID,
        data
    };
}

function buildCreateATAIx(payer, ata, owner, mint) {
    return {
        keys: [
            { pubkey: new solanaWeb3.PublicKey(payer),  isSigner: true,  isWritable: true  },
            { pubkey: ata,                               isSigner: false, isWritable: true  },
            { pubkey: new solanaWeb3.PublicKey(owner),  isSigner: false, isWritable: false },
            { pubkey: new solanaWeb3.PublicKey(mint),   isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID,                 isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY,               isSigner: false, isWritable: false }
        ],
        programId: ASSOCIATED_TOKEN_PROGRAM,
        data: Buffer.from([])
    };
}

function buildMintToIx(mint, destination, authority, amount) {
    // MintTo instruction: discriminator = 7
    const data = Buffer.alloc(9);
    data.writeUInt8(7, 0);
    data.writeBigUInt64LE(BigInt(amount), 1);
    return {
        keys: [
            { pubkey: new solanaWeb3.PublicKey(mint),        isSigner: false, isWritable: true  },
            { pubkey: destination,                            isSigner: false, isWritable: true  },
            { pubkey: new solanaWeb3.PublicKey(authority),   isSigner: true,  isWritable: false }
        ],
        programId: TOKEN_PROGRAM_ID,
        data
    };
}

// ── Create token ──────────────────────────────────────────────
async function createToken(name, symbol, decimals, supply, description) {
    if (!walletPubkey) throw new Error('Wallet not connected');

    const mintKeypair = solanaWeb3.Keypair.generate();
    const mintPubkey  = mintKeypair.publicKey;

    // Rent for mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // Derive ATA
    const ata = await findATA(walletPubkey, mintPubkey.toString());

    const tx = new solanaWeb3.Transaction();

    // 1. Create mint account
    tx.add(solanaWeb3.SystemProgram.createAccount({
        fromPubkey:         new solanaWeb3.PublicKey(walletPubkey),
        newAccountPubkey:   mintPubkey,
        space:              MINT_SIZE,
        lamports:           mintRent,
        programId:          TOKEN_PROGRAM_ID
    }));

    // 2. InitializeMint
    tx.add(buildInitializeMintIx(mintPubkey.toString(), decimals, walletPubkey, walletPubkey));

    // 3. Create ATA
    tx.add(buildCreateATAIx(walletPubkey, ata, walletPubkey, mintPubkey.toString()));

    // 4. MintTo
    const rawAmount = BigInt(supply) * BigInt(Math.pow(10, decimals));
    tx.add(buildMintToIx(mintPubkey.toString(), ata, walletPubkey, rawAmount));

    tx.feePayer = new solanaWeb3.PublicKey(walletPubkey);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    // Partial sign with mint keypair, then wallet signs
    tx.partialSign(mintKeypair);
    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, 'confirmed');

    const tokenData = {
        name, symbol, decimals, supply, description,
        mint: mintPubkey.toString(),
        createdAt: new Date().toISOString(),
        status: 'success',
        sig
    };

    tokens.push(tokenData);
    saveTokens();
    displayTokens();
    return tokenData;
}

// ── Persistence ───────────────────────────────────────────────
function saveTokens() {
    localStorage.setItem('singularity-tokens', JSON.stringify(tokens));
}

function loadTokens() {
    const saved = localStorage.getItem('singularity-tokens');
    if (saved) { tokens = JSON.parse(saved); displayTokens(); }
}

function displayTokens() {
    const container = document.getElementById('token-list');
    if (!container) return;
    if (!tokens.length) {
        container.innerHTML = '<p style="text-align:center;color:#666;">No tokens created yet.</p>';
        return;
    }
    container.innerHTML = tokens.map(t => `
        <div class="token-card">
            <h3>${t.name} (${t.symbol})</h3>
            <div class="token-info">
                <div><strong>Mint:</strong> ${t.mint.slice(0,8)}...${t.mint.slice(-8)}</div>
                <div><strong>Supply:</strong> ${Number(t.supply).toLocaleString()}</div>
                <div><strong>Decimals:</strong> ${t.decimals}</div>
                <div><strong>Created:</strong> ${new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
            <div style="margin-top:1rem;">
                <span class="status ${t.status}">${t.status.toUpperCase()}</span>
                ${t.sig ? `<a href="https://solscan.io/tx/${t.sig}" target="_blank" style="color:#dc2626;font-size:.8rem;margin-left:1rem;">View tx ↗</a>` : ''}
            </div>
        </div>`).join('');
}

function debugTokens() {
    console.log('Tokens:', tokens);
    alert(`${tokens.length} token(s) in storage. Check console for details.`);
}

// ── Generate wallet (no QRCode dep) ──────────────────────────
function generateWallet() {
    const kp = solanaWeb3.Keypair.generate();
    const pub = kp.publicKey.toString();
    const sec = JSON.stringify(Array.from(kp.secretKey));

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:rgba(15,15,15,0.98);border:1px solid rgba(220,38,38,0.4);padding:2rem;border-radius:8px;max-width:480px;width:90%;backdrop-filter:blur(10px);">
            <h3 style="color:#dc2626;margin-bottom:1rem;">New Wallet Generated</h3>
            <p style="color:#ccc;font-size:.85rem;margin-bottom:.5rem;"><strong style="color:#dc2626;">Public Key:</strong></p>
            <p style="color:#fff;font-size:.8rem;word-break:break-all;background:#111;padding:.5rem;border-radius:4px;margin-bottom:1rem;">${pub}</p>
            <p style="color:#ccc;font-size:.85rem;margin-bottom:.5rem;"><strong style="color:#dc2626;">Secret Key (array):</strong></p>
            <textarea readonly style="width:100%;height:80px;background:#111;color:#fff;border:1px solid #333;border-radius:4px;padding:.5rem;font-size:.75rem;resize:none;">${sec}</textarea>
            <p style="color:#ff4444;font-size:.8rem;margin:.75rem 0;">⚠️ Save your secret key securely! Never share it.</p>
            <button onclick="this.closest('div[style]').remove()" style="width:100%;padding:.75rem;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:'Orbitron',sans-serif;">Close</button>
        </div>`;
    document.body.appendChild(modal);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initConnection();
    } catch (e) {
        console.error('RPC init failed:', e);
    }

    document.getElementById('wallet-btn').addEventListener('click', connectWallet);

    document.getElementById('token-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('create-btn');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        try {
            const name        = document.getElementById('token-name').value;
            const symbol      = document.getElementById('token-symbol').value;
            const decimals    = parseInt(document.getElementById('token-decimals').value);
            const supply      = parseInt(document.getElementById('token-supply').value);
            const description = document.getElementById('token-description').value;
            const token = await createToken(name, symbol, decimals, supply, description);
            alert(`Token "${token.name}" created!\nMint: ${token.mint}\nTx: ${token.sig}`);
            document.getElementById('token-form').reset();
        } catch (err) {
            console.error(err);
            alert('Failed to create token: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Token';
        }
    });

    loadTokens();

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                const btn = document.getElementById('wallet-btn');
                btn.textContent = `${walletPubkey.slice(0,4)}...${walletPubkey.slice(-4)}`;
                btn.style.background = '#dc2626';
                document.getElementById('balance-display').classList.remove('hidden');
                window.loadWalletBalances(walletPubkey);
            } catch {}
        }
    }, 600);
});
