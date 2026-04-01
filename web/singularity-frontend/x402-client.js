/**
 * x402-client.js — Singularity.io X402 Payment Protocol Client v2
 *
 * Implements the canonical x402 flow as defined by coinbase/x402:
 *   1. Make request → receive HTTP 402 with PAYMENT-REQUIRED header (JSON body)
 *   2. Parse PaymentRequirements from 402 response
 *   3. Build ExactSvmPayloadV2 (Solana SPL TransferChecked)
 *   4. Sign with Phantom wallet
 *   5. Serialize as base64 JSON → X-Payment header
 *   6. Retry original request with X-Payment header
 *   7. Read X-Payment-Response receipt on 200
 *
 * Spec refs:
 *   https://docs.cdp.coinbase.com/x402/quickstart-for-buyers
 *   https://github.com/coinbase/x402
 */
(function (global) {
    'use strict';

    // ── Constants ─────────────────────────────────────────────
    var X402_VERSION = 2;

    var NETWORKS = {
        mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        devnet:  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
    };

    var TOKENS = {
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        SIO:  'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump',
        SOL:  'So11111111111111111111111111111111111111112'
    };

    var TOKEN_PROGRAM    = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    var ASSOC_TOKEN_PROG = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRS';

    var RPC_POOL = [
        'https://api.mainnet-beta.solana.com',
        'https://mainnet.helius-rpc.com/?api-key=public',
        'https://solana-rpc.publicnode.com',
        'https://rpc.hellomoon.io/public'
    ];

    // ── RPC helper ────────────────────────────────────────────
    async function rpcCall(method, params) {
        var lastErr;
        for (var i = 0; i < RPC_POOL.length; i++) {
            try {
                var res = await fetch(RPC_POOL[i], {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params }),
                    signal: AbortSignal.timeout(8000)
                });
                var json = await res.json();
                if (json.error) throw new Error(json.error.message);
                return json.result;
            } catch (e) { lastErr = e; }
        }
        throw lastErr || new Error('All RPC endpoints failed');
    }

    // ── ATA derivation ────────────────────────────────────────
    async function deriveATA(owner, mint) {
        var ownerKey  = new solanaWeb3.PublicKey(owner);
        var mintKey   = new solanaWeb3.PublicKey(mint);
        var tokenProg = new solanaWeb3.PublicKey(TOKEN_PROGRAM);
        var ataProg   = new solanaWeb3.PublicKey(ASSOC_TOKEN_PROG);
        var result    = await solanaWeb3.PublicKey.findProgramAddress(
            [ownerKey.toBuffer(), tokenProg.toBuffer(), mintKey.toBuffer()],
            ataProg
        );
        return result[0].toString();
    }

    // ── TransferChecked instruction data ──────────────────────
    function buildTransferCheckedData(amount, decimals) {
        var buf  = new Uint8Array(10);
        var view = new DataView(buf.buffer);
        buf[0] = 12; // TransferChecked opcode
        view.setBigUint64(1, BigInt(amount), true);
        buf[9] = decimals;
        return buf;
    }

    async function getTokenDecimals(mint) {
        if (mint === TOKENS.USDC || mint === TOKENS.SIO) return 6;
        try {
            var info = await rpcCall('getAccountInfo', [mint, { encoding: 'base64' }]);
            var data = atob(info.value.data[0]);
            return data.charCodeAt(44);
        } catch (_) { return 6; }
    }

    // ── Serialize / deserialize X-Payment header ──────────────
    /**
     * Serialize an ExactSvmPayloadV2 to base64 JSON for the X-Payment header.
     * Round-trip guarantee: deserialize(serialize(p)) deep-equals p.
     */
    function serializePayload(payload) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    }

    function deserializePayload(b64) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch (_) {
            return JSON.parse(atob(b64));
        }
    }

    // ── Build ExactSvmPayloadV2 ───────────────────────────────
    /**
     * Build and sign a Solana SPL TransferChecked transaction.
     * Returns the full ExactSvmPayloadV2 object.
     *
     * @param {object} requirements - from the 402 response accepts[] entry
     * @param {string} payerPubkey
     * @returns {Promise<{payloadObj, blockhash, lastValidBlockHeight}>}
     */
    async function buildSvmPayload(requirements, payerPubkey) {
        if (!global.solana || !global.solana.isPhantom) throw new Error('Phantom wallet not connected');
        if (!global.solanaWeb3) throw new Error('@solana/web3.js not loaded');

        var asset    = requirements.asset;
        var amount   = requirements.maxAmountRequired || requirements.amount;
        var payTo    = requirements.payTo;
        var decimals = await getTokenDecimals(asset);

        var srcAta = await deriveATA(payerPubkey, asset);
        var dstAta = await deriveATA(payTo, asset);

        var blockhashResult = await rpcCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
        var blockhash            = blockhashResult.value ? blockhashResult.value.blockhash : blockhashResult.blockhash;
        var lastValidBlockHeight = blockhashResult.value ? blockhashResult.value.lastValidBlockHeight : blockhashResult.lastValidBlockHeight;

        var payer   = new solanaWeb3.PublicKey(payerPubkey);
        var mintKey = new solanaWeb3.PublicKey(asset);
        var srcKey  = new solanaWeb3.PublicKey(srcAta);
        var dstKey  = new solanaWeb3.PublicKey(dstAta);
        var tokProg = new solanaWeb3.PublicKey(TOKEN_PROGRAM);

        var ix = new solanaWeb3.TransactionInstruction({
            programId: tokProg,
            keys: [
                { pubkey: srcKey,  isSigner: false, isWritable: true  },
                { pubkey: mintKey, isSigner: false, isWritable: false },
                { pubkey: dstKey,  isSigner: false, isWritable: true  },
                { pubkey: payer,   isSigner: true,  isWritable: false }
            ],
            data: buildTransferCheckedData(BigInt(amount), decimals)
        });

        var tx = new solanaWeb3.Transaction({ recentBlockhash: blockhash, feePayer: payer });
        tx.add(ix);

        var signed    = await global.solana.signTransaction(tx);
        var txBytes   = signed.serialize();
        var txBase64  = btoa(String.fromCharCode.apply(null, txBytes));

        // ExactSvmPayloadV2 schema
        var payloadObj = {
            x402Version: X402_VERSION,
            scheme:      'exact',
            network:     requirements.network || NETWORKS.mainnet,
            payload: {
                transaction: txBase64
            }
        };

        return { payloadObj: payloadObj, blockhash: blockhash, lastValidBlockHeight: lastValidBlockHeight };
    }

    // ── Send + confirm ────────────────────────────────────────
    async function sendAndConfirm(txBase64) {
        var sig = await rpcCall('sendTransaction', [
            txBase64,
            { encoding: 'base64', skipPreflight: false, maxRetries: 3 }
        ]);

        for (var i = 0; i < 30; i++) {
            await new Promise(function (r) { setTimeout(r, 1000); });
            var status = await rpcCall('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]);
            var conf = status && status.value && status.value[0] && status.value[0].confirmationStatus;
            if (conf === 'confirmed' || conf === 'finalized') {
                if (status.value[0].err) throw new Error('Transaction failed on-chain');
                return sig;
            }
        }
        throw new Error('Transaction confirmation timeout');
    }

    // ── x402Fetch — drop-in fetch wrapper ────────────────────
    /**
     * Wraps fetch() with automatic x402 payment handling.
     * Mirrors the @x402/fetch package behaviour:
     *   1. Make the request
     *   2. If 402, parse requirements, build+sign payment, retry
     *   3. Return the final response
     *
     * @param {string} url
     * @param {RequestInit} [opts]
     * @param {object} [x402Opts] - { payerPubkey, onStatus, preferredAsset }
     */
    async function x402Fetch(url, opts, x402Opts) {
        opts     = opts     || {};
        x402Opts = x402Opts || {};

        var payerPubkey = x402Opts.payerPubkey
            || (global.walletManager && global.walletManager.publicKey)
            || (global.solana && global.solana.publicKey && global.solana.publicKey.toString());

        var onStatus = x402Opts.onStatus || function () {};

        // Initial request
        var res = await fetch(url, opts);

        if (res.status !== 402) return res;

        // Parse 402 body
        var body;
        try { body = await res.json(); } catch (_) { throw new Error('Invalid 402 response body'); }

        if (!body || !Array.isArray(body.accepts) || !body.accepts.length) {
            throw new Error('Malformed PaymentRequired response');
        }

        // Pick the best accepted payment option (prefer Solana mainnet)
        var requirements = body.accepts.find(function (a) {
            return a.network === NETWORKS.mainnet && a.scheme === 'exact';
        }) || body.accepts[0];

        if (!payerPubkey) throw new Error('No wallet connected — cannot pay');

        onStatus('Building payment…');
        var built = await buildSvmPayload(requirements, payerPubkey);

        onStatus('Signing with Phantom…');
        var xPayment = serializePayload(built.payloadObj);

        onStatus('Retrying request with payment…');
        var retryOpts = Object.assign({}, opts, {
            headers: Object.assign({}, opts.headers || {}, { 'X-Payment': xPayment })
        });
        var retryRes = await fetch(url, retryOpts);

        if (retryRes.ok) {
            var receipt = retryRes.headers.get('X-Payment-Response');
            if (receipt) {
                try {
                    var parsed = deserializePayload(receipt);
                    onStatus('Payment confirmed: ' + (parsed.signature || '').slice(0, 8) + '…');
                    _persistPayment(requirements, built, parsed.signature || '', payerPubkey);
                } catch (_) {}
            }
        }

        return retryRes;
    }

    // ── x402Pay — explicit payment flow ──────────────────────
    /**
     * Explicit payment flow for UI-triggered payments (e.g. paywall button).
     * Builds, signs, sends, and confirms the transaction directly.
     *
     * @param {object} opts
     *   { serviceName, asset, amount, payTo, payerPubkey, onStatus }
     */
    async function x402Pay(opts) {
        var serviceName = opts.serviceName || 'service';
        var asset       = opts.asset       || TOKENS.USDC;
        var amount      = opts.amount      || '1000';
        var payTo       = opts.payTo;
        var payerPubkey = opts.payerPubkey
            || (global.walletManager && global.walletManager.publicKey);
        var onStatus    = opts.onStatus    || function () {};

        if (!payTo)       throw new Error('payTo address required');
        if (!payerPubkey) throw new Error('No wallet connected');

        var requirements = {
            scheme:            'exact',
            network:           NETWORKS.mainnet,
            asset:             asset,
            maxAmountRequired: String(amount),
            payTo:             payTo,
            maxTimeoutSeconds: 300
        };

        onStatus('Building transaction…');
        var built = await buildSvmPayload(requirements, payerPubkey);

        onStatus('Sending transaction…');
        var sig = await sendAndConfirm(built.payloadObj.payload.transaction);

        onStatus('Confirmed: ' + sig.slice(0, 8) + '…');
        _persistPayment(requirements, built, sig, payerPubkey);

        return { signature: sig, payload: built.payloadObj };
    }

    // ── Persistence helpers ───────────────────────────────────
    function _persistPayment(requirements, built, sig, pubkey) {
        try {
            var histKey = 'sio-payments-' + pubkey;
            var history = JSON.parse(localStorage.getItem(histKey) || '[]');
            history.unshift({
                service:   requirements.extra && requirements.extra.name || 'service',
                amount:    parseInt(requirements.maxAmountRequired || requirements.amount || 0),
                asset:     requirements.asset,
                status:    'confirmed',
                timestamp: Date.now(),
                signature: sig,
                id:        sig.slice(0, 16)
            });
            localStorage.setItem(histKey, JSON.stringify(history.slice(0, 50)));

            var svcKey  = 'sio-services-' + pubkey;
            var unlocked = JSON.parse(localStorage.getItem(svcKey) || '{}');
            var svcName  = requirements.extra && requirements.extra.name || 'service';
            unlocked[svcName] = {
                unlockedAt: Date.now(),
                expiresAt:  Date.now() + 30 * 24 * 3600 * 1000,
                signature:  sig
            };
            localStorage.setItem(svcKey, JSON.stringify(unlocked));
        } catch (_) {}
    }

    // ── Status helpers ────────────────────────────────────────
    function x402IsUnlocked(serviceId, pubkey) {
        if (!pubkey) return false;
        try {
            var unlocked = JSON.parse(localStorage.getItem('sio-services-' + pubkey) || '{}');
            var entry = unlocked[serviceId];
            return !!(entry && Date.now() < entry.expiresAt);
        } catch (_) { return false; }
    }

    function x402GetUnlocked(pubkey) {
        if (!pubkey) return {};
        try { return JSON.parse(localStorage.getItem('sio-services-' + pubkey) || '{}'); }
        catch (_) { return {}; }
    }

    function x402GetHistory(pubkey) {
        if (!pubkey) return [];
        try { return JSON.parse(localStorage.getItem('sio-payments-' + pubkey) || '[]'); }
        catch (_) { return []; }
    }

    // ── Expose globals ────────────────────────────────────────
    global.x402Fetch        = x402Fetch;
    global.x402Pay          = x402Pay;
    global.x402IsUnlocked   = x402IsUnlocked;
    global.x402GetUnlocked  = x402GetUnlocked;
    global.x402GetHistory   = x402GetHistory;
    global.x402Serialize    = serializePayload;
    global.x402Deserialize  = deserializePayload;
    global.X402_TOKENS      = TOKENS;
    global.X402_NETWORKS    = NETWORKS;
    global.X402_VERSION     = X402_VERSION;

    console.log('[x402] Client v2 loaded — scheme: exact, network: Solana Mainnet');

})(window);
