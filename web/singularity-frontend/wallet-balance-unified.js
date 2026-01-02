// Unified Wallet Balance Loader with RPC Caching
class WalletBalanceLoader {
    constructor() {
        this.cache = new Map();
        this.rpcCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.rpcTimeout = 60000; // 1 minute for RPC cache
        this.isLoading = false;
        this.endpoints = [
            'https://solana-mainnet.phantom.tech',
            'https://api.metaplex.solana.com',
            'https://solana-mainnet-public.allthatnode.com'
        ];
        this.currentEndpoint = 0;
    }

    async loadBalances(walletAddress) {
        if (!walletAddress) return { sol: 0, sio: 0 };

        const cacheKey = walletAddress;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        if (this.isLoading) return cached?.data || { sol: 0, sio: 0 };
        
        this.isLoading = true;
        
        try {
            // Try cached analytics endpoint first
            const balances = await this.tryAnalyticsEndpoint(walletAddress) || 
                            await this.tryDirectRPC(walletAddress);
            
            this.cache.set(cacheKey, {
                data: balances,
                timestamp: Date.now()
            });
            
            return balances;
        } catch (error) {
            console.warn('Balance load failed:', error);
            return cached?.data || { sol: 0, sio: 0 };
        } finally {
            this.isLoading = false;
        }
    }

    async tryAnalyticsEndpoint(walletAddress) {
        // Use backend API for balance
        try {
            const response = await fetch(`/api/sio/balance/${walletAddress}`);
            if (!response.ok) return null;
            
            const data = await response.json();
            return {
                sol: 0,
                sio: data.balance || 0
            };
        } catch (error) {
            return null;
        }
    }

    async tryDirectRPC(walletAddress) {
        // Use backend API instead of direct RPC
        try {
            const response = await fetch(`/api/sio/balance/${walletAddress}`);
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            return {
                sol: 0, // SOL balance not needed for S-IO services
                sio: data.balance || 0
            };
        } catch (error) {
            console.warn('Backend API failed:', error.message);
            throw new Error('Backend API failed');
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
        
        const balances = await this.loadBalances(walletAddress);
        this.updateBalanceDisplay(balances);
        
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
            detail: { address: walletAddress, balances } 
        }));
    }

    clearCache() {
        this.cache.clear();
        this.rpcCache.clear();
    }
}

// Global instance
window.walletBalanceLoader = new WalletBalanceLoader();

// Auto-refresh when wallet connects
window.addEventListener('walletConnected', (event) => {
    const walletAddress = event.detail.publicKey;
    if (walletAddress) {
        window.walletBalanceLoader.refreshBalances(walletAddress);
        // Set up periodic refresh
        setInterval(() => {
            window.walletBalanceLoader.refreshBalances(walletAddress);
        }, 30000);
    }
});

// Manual refresh button
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-balance-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const walletAddress = localStorage.getItem('walletAddress');
            if (walletAddress) {
                window.walletBalanceLoader.cache.delete(walletAddress);
                window.walletBalanceLoader.refreshBalances(walletAddress);
            }
        });
    }
    
    // Auto-load on page load if wallet connected
    const walletAddress = localStorage.getItem('walletAddress');
    if (walletAddress) {
        window.walletBalanceLoader.refreshBalances(walletAddress);
    }
});

// Clear cache every 5 minutes to prevent memory buildup
setInterval(() => {
    window.walletBalanceLoader.clearCache();
}, 300000);