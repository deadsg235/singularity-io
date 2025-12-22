// Unified Wallet Balance Loader with RPC Caching
class WalletBalanceLoader {
    constructor() {
        this.cache = new Map();
        this.rpcCache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.rpcTimeout = 60000; // 1 minute for RPC cache
        this.isLoading = false;
        this.endpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://rpc.ankr.com/solana',
            'https://solana-mainnet.rpc.extrnode.com/3a935f34-fd0c-41cd-b423-cf98a2e06df5'
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
        // Skip analytics, use direct RPC
        return null;
    }

    async tryDirectRPC(walletAddress) {
        const SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
        
        for (let i = 0; i < this.endpoints.length; i++) {
            const endpoint = this.endpoints[this.currentEndpoint];
            
            try {
                // Check RPC cache first
                const rpcCacheKey = `${endpoint}:${walletAddress}`;
                const rpcCached = this.rpcCache.get(rpcCacheKey);
                
                if (rpcCached && Date.now() - rpcCached.timestamp < this.rpcTimeout) {
                    return rpcCached.data;
                }
                
                const connection = new solanaWeb3.Connection(endpoint, {
                    commitment: 'confirmed',
                    timeout: 8000
                });
                
                const owner = new solanaWeb3.PublicKey(walletAddress);
                
                // Batch RPC calls for efficiency (x402-style optimization)
                const [solBalance, tokenAccounts] = await Promise.all([
                    connection.getBalance(owner),
                    connection.getParsedTokenAccountsByOwner(owner, {
                        mint: new solanaWeb3.PublicKey(SIO_MINT)
                    })
                ]);
                
                const balances = {
                    sol: solBalance / solanaWeb3.LAMPORTS_PER_SOL,
                    sio: tokenAccounts.value.length > 0 ? 
                        (tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0) : 0
                };
                
                // Cache RPC result
                this.rpcCache.set(rpcCacheKey, {
                    data: balances,
                    timestamp: Date.now()
                });
                
                return balances;
                
            } catch (error) {
                console.warn(`RPC endpoint ${endpoint} failed:`, error.message);
                this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
                
                if (i === this.endpoints.length - 1) {
                    throw new Error('All RPC endpoints failed');
                }
            }
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

// Clear cache every 5 minutes to prevent memory buildup
setInterval(() => {
    window.walletBalanceLoader.clearCache();
}, 300000);