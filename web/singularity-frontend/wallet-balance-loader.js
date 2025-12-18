// Universal wallet balance loader using cached RPC
async function loadWalletBalances() {
    const wallet = window.globalWallet || window.walletAdapter?.getPublicKey();
    if (!wallet) return;
    
    const walletStr = wallet.toString ? wallet.toString() : wallet;

    try {
        const sioResponse = await fetch(`/api/sio/balance/${walletStr}`);
        if (sioResponse.ok) {
            const sioData = await sioResponse.json();
            const sioElement = document.getElementById('sio-balance');
            if (sioElement) {
                sioElement.textContent = sioData.balance.toLocaleString(undefined, {
                    maximumFractionDigits: 6
                });
            }
        }
        
        const solResponse = await fetch(`/api/wallet/analytics/${walletStr}`);
        if (solResponse.ok) {
            const solData = await solResponse.json();
            const solElement = document.getElementById('sol-balance');
            if (solElement) {
                solElement.textContent = solData.sol_balance.toFixed(4);
            }
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