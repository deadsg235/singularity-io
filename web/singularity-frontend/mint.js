/**
 * mint.js — Mint & Transfer tokens, no inline loadWalletBalances
 */

const { Connection, PublicKey, Transaction, SystemProgram } = solanaWeb3;

let connection;
let walletPubkey = null;
let tokens = [];

document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);
    document.getElementById('mint-btn').addEventListener('click', mintTokens);
    document.getElementById('transfer-btn').addEventListener('click', transferTokens);
    loadTokens();

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                onConnect(walletPubkey);
            } catch {}
        }
    }, 600);
});

async function handleWalletClick() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        walletPubkey = null;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        document.getElementById('balance-display').classList.add('hidden');
        return;
    }
    if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        onConnect(walletPubkey);
    } catch (e) { console.error(e); }
}

function onConnect(pub) {
    const btn = document.getElementById('wallet-btn');
    btn.textContent = `${pub.slice(0,4)}...${pub.slice(-4)}`;
    btn.classList.add('connected');
    document.getElementById('balance-display').classList.remove('hidden');
    window.loadWalletBalances(pub);
}

function loadTokens() {
    const stored = localStorage.getItem('singularity-tokens');
    if (stored) tokens = JSON.parse(stored);

    const opts = '<option value="">-- Select Token --</option>' +
        tokens.map((t, i) => `<option value="${i}">${t.name} (${t.symbol})</option>`).join('');

    document.getElementById('mint-token-select').innerHTML = opts;
    document.getElementById('transfer-token-select').innerHTML = opts;
}

async function mintTokens() {
    if (!walletPubkey) { alert('Connect wallet first'); return; }

    const idx    = document.getElementById('mint-token-select').value;
    const amount = document.getElementById('mint-amount').value;
    if (idx === '' || !amount) { alert('Select token and enter amount'); return; }

    const btn = document.getElementById('mint-btn');
    btn.disabled = true;
    btn.textContent = 'Minting...';

    try {
        const token = tokens[idx];
        const mint  = new PublicKey(token.mint);
        const TOKEN_PROGRAM_ID         = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const walletKey = new PublicKey(walletPubkey);

        const [ata] = await PublicKey.findProgramAddress(
            [walletKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM
        );

        const tx = new Transaction();
        const ataInfo = await connection.getAccountInfo(ata);

        if (!ataInfo) {
            tx.add({
                keys: [
                    { pubkey: walletKey, isSigner: true,  isWritable: true  },
                    { pubkey: ata,       isSigner: false, isWritable: true  },
                    { pubkey: walletKey, isSigner: false, isWritable: false },
                    { pubkey: mint,      isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false }
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM,
                data: Buffer.from([])
            });
        }

        const mintAmount = BigInt(amount) * BigInt(Math.pow(10, token.decimals || 9));
        const mintData = Buffer.alloc(9);
        mintData.writeUInt8(7, 0);
        mintData.writeBigUInt64LE(mintAmount, 1);

        tx.add({
            keys: [
                { pubkey: mint,      isSigner: false, isWritable: true  },
                { pubkey: ata,       isSigner: false, isWritable: true  },
                { pubkey: walletKey, isSigner: true,  isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: mintData
        });

        tx.feePayer = walletKey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signed = await window.solana.signTransaction(tx);
        const sig    = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, 'confirmed');

        alert(`Minted ${amount} tokens!\n\nSignature: ${sig}`);
        window.loadWalletBalances(walletPubkey);
    } catch (err) {
        alert('Mint failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Mint to Wallet';
    }
}

async function transferTokens() {
    if (!walletPubkey) { alert('Connect wallet first'); return; }

    const idx       = document.getElementById('transfer-token-select').value;
    const recipient = document.getElementById('recipient').value.trim();
    const amount    = document.getElementById('transfer-amount').value;
    if (idx === '' || !recipient || !amount) { alert('Fill all fields'); return; }

    const btn = document.getElementById('transfer-btn');
    btn.disabled = true;
    btn.textContent = 'Transferring...';

    try {
        const token        = tokens[idx];
        const mint         = new PublicKey(token.mint);
        const recipientKey = new PublicKey(recipient);
        const walletKey    = new PublicKey(walletPubkey);
        const TOKEN_PROGRAM_ID         = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

        const [senderAta] = await PublicKey.findProgramAddress(
            [walletKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM
        );
        const [recipientAta] = await PublicKey.findProgramAddress(
            [recipientKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM
        );

        const tx = new Transaction();
        const recipientAtaInfo = await connection.getAccountInfo(recipientAta);

        if (!recipientAtaInfo) {
            tx.add({
                keys: [
                    { pubkey: walletKey,    isSigner: true,  isWritable: true  },
                    { pubkey: recipientAta, isSigner: false, isWritable: true  },
                    { pubkey: recipientKey, isSigner: false, isWritable: false },
                    { pubkey: mint,         isSigner: false, isWritable: false },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false }
                ],
                programId: ASSOCIATED_TOKEN_PROGRAM,
                data: Buffer.from([])
            });
        }

        const transferAmount = BigInt(amount) * BigInt(Math.pow(10, token.decimals || 9));
        const transferData = Buffer.alloc(9);
        transferData.writeUInt8(3, 0);
        transferData.writeBigUInt64LE(transferAmount, 1);

        tx.add({
            keys: [
                { pubkey: senderAta,    isSigner: false, isWritable: true  },
                { pubkey: recipientAta, isSigner: false, isWritable: true  },
                { pubkey: walletKey,    isSigner: true,  isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: transferData
        });

        tx.feePayer = walletKey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signed = await window.solana.signTransaction(tx);
        const sig    = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(sig, 'confirmed');

        alert(`Transferred ${amount} tokens!\n\nSignature: ${sig}`);
        document.getElementById('recipient').value = '';
        document.getElementById('transfer-amount').value = '';
        window.loadWalletBalances(walletPubkey);
    } catch (err) {
        alert('Transfer failed: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Transfer';
    }
}
