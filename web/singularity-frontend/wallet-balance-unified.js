/**
 * wallet-balance-unified.js
 * Drop-in for pages that reference this file.
 * Delegates to wallet-balance-loader.js which must be loaded first.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Auto-load balances if wallet already connected
    const tryLoad = () => {
        const pub = window.walletManager?.publicKey
            || window.walletAdapter?.getPublicKey()?.toString()
            || window.solana?.publicKey?.toString();
        if (pub) window.loadWalletBalances?.(pub);
    };

    tryLoad();

    // Re-load on wallet events
    window.addEventListener('walletConnected', tryLoad);
    window.addEventListener('balanceRefresh',  tryLoad);
});
