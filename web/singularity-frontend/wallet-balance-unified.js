// Unified Wallet Balance Loader - Uses cached RPC endpoint
class WalletBalanceLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.isLoading = false;
    }

    async loadBalances(walletAddress) {
        if (!walletAddress) return { sol: 0, sio: 0 };

        const cacheKey = walletAddress;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        if (this.isLoading) return { sol: 0, sio: 0 };
        
        this.isLoading = true;
        
        try {
            // Use cached analytics endpoint
            const response = await fetch(`/api/wallet/analytics/${walletAddress}`);
            const data = await response.json();
            
            const balances = {
                sol: data.sol_balance || 0,
                sio: data.sio_balance || 0
            };
            
            this.cache.set(cacheKey, {
                data: balances,
                timestamp: Date.now()
            });
            
            return balances;
        } catch (error) {
            console.warn('Balance load failed:', error);
            return { sol: 0, sio: 0 };
        } finally {
            this.isLoading = false;
        }
    }

    updateBalanceDisplay(balances) {
        const solElement = document.getElementById('sol-balance');
        const sioElement = document.getElementById('sio-balance');
        const balanceDisplay = document.getElementById('balance-display');
        
        if (solElement) solElement.textContent = balances.sol.toFixed(4);
        if (sioElement) sioElement.textContent = balances.sio.toFixed(2);
        
        if (balanceDisplay) {
            balanceDisplay.classList.remove('hidden');
        }
    }

    async refreshBalances(walletAddress) {
        if (!walletAddress) return;
        
        this.cache.delete(walletAddress);
        const balances = await this.loadBalances(walletAddress);
        this.updateBalanceDisplay(balances);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
            detail: { address: walletAddress, balances } 
        }));
    }
}

// Global instance
window.walletBalanceLoader = new WalletBalanceLoader();

// Auto-refresh every 60 seconds if wallet connected
setInterval(() => {
    const walletAddress = localStorage.getItem('walletAddress');
    if (walletAddress) {
        window.walletBalanceLoader.refreshBalances(walletAddress);
    }
}, 60000);