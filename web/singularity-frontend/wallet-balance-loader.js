// Universal wallet balance loader using cached RPC
async function loadWalletBalances() {
    const wallet = window.globalWallet || window.walletAdapter?.getPublicKey();
    if (!wallet) return;

    try {
        // Use backend API for S-IO balance (uses cached RPC)
        const sioResponse = await fetch(`/api/sio/balance/${wallet}`);
        if (sioResponse.ok) {
            const sioData = await sioResponse.json();
            const sioElement = document.getElementById('sio-balance');
            if (sioElement) {
                sioElement.textContent = sioData.balance.toLocaleString(undefined, {
                    maximumFractionDigits: 6
                });
            }
        }

        // Get SOL balance directly
        const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const owner = new solanaWeb3.PublicKey(wallet);
        const lamports = await connection.getBalance(owner);
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
        
        const solElement = document.getElementById('sol-balance');
        if (solElement) {
            solElement.textContent = solBalance.toFixed(4);
        }

    } catch (error) {
        console.error('Balance loading error:', error);
        const solElement = document.getElementById('sol-balance');
        const sioElement = document.getElementById('sio-balance');
        if (solElement) solElement.textContent = '—';
        if (sioElement) sioElement.textContent = '—';
    }
}

// Export for global use
window.loadWalletBalances = loadWalletBalances;