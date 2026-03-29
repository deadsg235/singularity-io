/**
 * x402-client.js — X402 Payment Protocol client for Singularity.io
 *
 * Implements the client-side X402 payment flow on Solana:
 *   1. Receive a PaymentRequired (402) response with payment requirements
 *   2. Build a Solana SPL token transfer transaction
 *   3. Sign with Phantom wallet
 *   4. Encode as base64 payload
 *   5. Verify on-chain via RPC confirmation
 *
 * Based on the X402 protocol spec:
 *   - x402Version: 2
 *   - scheme: "exact"
 *   - network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" (mainnet)
 *   - asset: SPL token mint address (USDC or S-IO)
 */

const X402_VERSION = 2;

// Solana network CAIP-2 identifiers
const NETWORKS = {
    mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    devnet:  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
};

// Known token mints
const TOKENS = {
    USDC:  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SIO:   'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump',
    SOL:   'So11111111111111111111111111111111111111112',
};

const TOKEN_PROGRAM    = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOC_TOKEN_PROG = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRS';
const RPC_POOL = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://rpc.ankr.com/solana',
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function rpcCall(method, params) {
    for (const url of RPC_POOL) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
                signal: AbortSignal.timeout(8000),
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.result;
        } catch (e) {
            console.warn(`X402 RPC ${url} failed:`, e.message);
        }
    }
    throw new Error('All RPC endpoints failed');
}

/** Derive Associated Token Account address (deterministic, no RPC needed) */
async function deriveATA(owner, mint) {
    const ownerKey  = new solanaWeb3.PublicKey(owner);
    const mintKey   = new solanaWeb3.PublicKey(mint);
    const tokenProg = new solanaWeb3.PublicKey(TOKEN_PROGRAM);
    const ataProg   = new solanaWeb3.PublicKey(ASSOC_TOKEN_PROG);
    const [ata]     = await solanaWeb3.PublicKey.findProgramAddress(
        [ownerKey.toBuffer(), tokenProg.toBuffer(), mintKey.toBuffer()],
        ataProg
    );
    return ata.toString();
}

/** Build SPL TransferChecked instruction data buffer */
function buildTransferCheckedData(amount, decimals) {
    // Instruction 12 = TransferChecked
    const buf  = new Uint8Array(10);
    const view = new DataView(buf.buffer);
    buf[0] = 12;
    view.setBigUint64(1, BigInt(amount), true);
    buf[9] = decimals;
    return buf;
}

/** Get token decimals from on-chain mint account */
async function getTokenDecimals(mint) {
    if (mint === TOKENS.USDC) return 6;
    if (mint === TOKENS.SIO)  return 6;
    try {
        const info = await rpcCall('getAccountInfo', [mint, { encoding: 'base64' }]);
        const data = atob(info.value.data[0]);
        return data.charCodeAt(44); // decimals byte in mint layout
    } catch { return 6; }
}

// ── Core X402 payment flow ─────────────────────────────────────────────────

/**
 * Build and sign an X402 payment payload for a Solana SPL token transfer.
 *
 * @param {object} requirements - PaymentRequirements from the 402 response
 *   { scheme, network, asset, amount, payTo, maxTimeoutSeconds }
 * @param {string} payerPubkey - Payer's Solana public key (base58)
 * @returns {Promise<object>} PaymentPayload ready to send as X-Payment header
 */
async function buildX402Payment(requirements, payerPubkey) {
    if (!window.solana?.isPhantom) throw new Error('Phantom wallet not connected');
    if (!window.solanaWeb3)        throw new Error('Solana Web3 not loaded');

    const { asset, amount, payTo, network } = requirements;
    const decimals   = await getTokenDecimals(asset);
    const rawAmount  = BigInt(amount); // already in smallest units per X402 spec

    // Derive ATAs
    const srcAta  = await deriveATA(payerPubkey, asset);
    const destAta = await deriveATA(payTo, asset);

    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }])
        .then(r => r.value ?? r);

    const payer   = new solanaWeb3.PublicKey(payerPubkey);
    const mintKey = new solanaWeb3.PublicKey(asset);
    const srcKey  = new solanaWeb3.PublicKey(srcAta);
    const dstKey  = new solanaWeb3.PublicKey(destAta);
    const tokProg = new solanaWeb3.PublicKey(TOKEN_PROGRAM);

    // Build TransferChecked instruction
    const ix = new solanaWeb3.TransactionInstruction({
        programId: tokProg,
        keys: [
            { pubkey: srcKey,  isSigner: false, isWritable: true  },
            { pubkey: mintKey, isSigner: false, isWritable: false },
            { pubkey: dstKey,  isSigner: false, isWritable: true  },
            { pubkey: payer,   isSigner: true,  isWritable: false },
        ],
        data: buildTransferCheckedData(rawAmount, decimals),
    });

    const tx = new solanaWeb3.Transaction({
        recentBlockhash: blockhash,
        feePayer: payer,
    });
    tx.add(ix);

    // Sign with Phantom
    const signed = await window.solana.signTransaction(tx);
    const txBase64 = btoa(String.fromCharCode(...signed.serialize()));

    // Build X402 PaymentPayload
    const payload = {
        x402Version: X402_VERSION,
        resource: {
            url:         window.location.href,
            description: 'Singularity.io service payment',
            mimeType:    'application/json',
        },
        accepted: requirements,
        payload: {
            transaction: txBase64,
        },
    };

    return { payload, blockhash, lastValidBlockHeight };
}

/**
 * Send a signed transaction and wait for confirmation.
 * Returns the transaction signature.
 */
async function sendAndConfirmX402(signedTxBase64) {
    const sig = await rpcCall('sendTransaction', [
        signedTxBase64,
        { encoding: 'base64', skipPreflight: false, maxRetries: 3 },
    ]);

    // Poll for confirmation (up to 30s)
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await rpcCall('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]);
        const conf = status?.value?.[0]?.confirmationStatus;
        if (conf === 'confirmed' || conf === 'finalized') return sig;
        if (status?.value?.[0]?.err) throw new Error('Transaction failed: ' + JSON.stringify(status.value[0].err));
    }
    throw new Error('Transaction confirmation timeout');
}

/**
 * Full X402 payment flow:
 *   1. Build payment requirements for a service
 *   2. Sign the transaction
 *   3. Send and confirm on-chain
 *   4. Return signature + payload
 *
 * @param {object} opts
 *   { serviceName, asset, amount, payTo, payerPubkey, onStatus }
 */
async function x402Pay({ serviceName, asset, amount, payTo, payerPubkey, onStatus }) {
    const status = (msg) => { console.log('[X402]', msg); onStatus?.(msg); };

    status('Building payment requirements…');

    const requirements = {
        scheme:            'exact',
        network:           NETWORKS.mainnet,
        asset:             asset || TOKENS.SIO,
        amount:            String(amount),
        payTo:             payTo,
        maxTimeoutSeconds: 300,
        extra:             { serviceName },
    };

    status('Signing transaction with Phantom…');
    const { payload, blockhash } = await buildX402Payment(requirements, payerPubkey);

    status('Sending transaction…');
    const sig = await sendAndConfirmX402(payload.payload.transaction);

    status(`Confirmed: ${sig.slice(0, 8)}…`);

    // Persist to localStorage for transaction history
    const key = `sio-payments-${payerPubkey}`;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift({
        service:     serviceName,
        amount:      parseInt(amount),
        asset:       asset,
        status:      'confirmed',
        timestamp:   Date.now(),
        signature:   sig,
        description: `X402 payment for ${serviceName}`,
        id:          sig.slice(0, 16),
    });
    localStorage.setItem(key, JSON.stringify(history.slice(0, 50)));

    // Mark service as unlocked
    const svcKey = `sio-services-${payerPubkey}`;
    const unlocked = JSON.parse(localStorage.getItem(svcKey) || '{}');
    unlocked[requirements.extra.serviceName] = {
        unlockedAt: Date.now(),
        expiresAt:  Date.now() + 30 * 24 * 3600 * 1000,
        signature:  sig,
    };
    localStorage.setItem(svcKey, JSON.stringify(unlocked));

    return { signature: sig, payload };
}

/**
 * Check if a service is currently unlocked for a wallet.
 */
function x402IsUnlocked(serviceId, pubkey) {
    if (!pubkey) return false;
    const unlocked = JSON.parse(localStorage.getItem(`sio-services-${pubkey}`) || '{}');
    const entry = unlocked[serviceId];
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
}

/**
 * Get all unlocked services for a wallet.
 */
function x402GetUnlocked(pubkey) {
    if (!pubkey) return {};
    return JSON.parse(localStorage.getItem(`sio-services-${pubkey}`) || '{}');
}

// Expose globally
window.x402Pay         = x402Pay;
window.x402IsUnlocked  = x402IsUnlocked;
window.x402GetUnlocked = x402GetUnlocked;
window.X402_TOKENS     = TOKENS;
window.X402_NETWORKS   = NETWORKS;

console.log('[X402] Client loaded — scheme: exact, network: Solana Mainnet');
