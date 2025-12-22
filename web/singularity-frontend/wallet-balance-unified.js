// Minimal Working Wallet Balance Loader
class WalletBalanceLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 30000;
        this.isLoading = false;
        this.endpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://rpc.ankr.com/solana'
        ];
    }

    async loadBalances(walletAddress) {
        if (!walletAddress) return { sol: 0, sio: 0 };
        
        console.log('Loading balances for:', walletAddress, 'isLoading:', this.isLoading);
        
        if (this.isLoading) {
            console.log('Already loading, returning cached or zero');
            const cached = this.cache.get(walletAddress);
            return cached?.data || { sol: 0, sio: 0 };
        }

        const cached = this.cache.get(walletAddress);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('Returning cached balance:', cached.data);
            return cached.data;
        }

        this.isLoading = true;
        
        try {
            const balances = await this.fetchFromRPC(walletAddress);
            console.log('Fetched fresh balances:', balances);
            
            this.cache.set(walletAddress, {
                data: balances,
                timestamp: Date.now()
            });
            
            return balances;
        } catch (error) {
            console.error('Balance load failed:', error);
            return cached?.data || { sol: 0, sio: 0 };
        } finally {
            this.isLoading = false;
        }
    }

    async fetchFromRPC(walletAddress) {
        const SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
        
        for (const endpoint of this.endpoints) {
            try {
                const connection = new solanaWeb3.Connection(endpoint, 'confirmed');
                const owner = new solanaWeb3.PublicKey(walletAddress);
                
                const [solBalance, tokenAccounts] = await Promise.all([
                    connection.getBalance(owner),
                    connection.getParsedTokenAccountsByOwner(owner, {
                        mint: new solanaWeb3.PublicKey(SIO_MINT)
                    })
                ]);
                
                return {
                    sol: solBalance / solanaWeb3.LAMPORTS_PER_SOL,
                    sio: tokenAccounts.value.length > 0 ? 
                        (tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0) : 0
                };
                
            } catch (error) {
                console.warn(`RPC ${endpoint} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('All RPC endpoints failed');
    }

    updateBalanceDisplay(balances) {
        const solElement = document.getElementById('sol-balance');
        const sioElement = document.getElementById('sio-balance');
        const balanceDisplay = document.getElementById('balance-display');
        
        if (solElement) solElement.textContent = balances.sol.toFixed(4);
        if (sioElement) sioElement.textContent = balances.sio.toFixed(2);
        if (balanceDisplay) balanceDisplay.classList.remove('hidden');
    }

    async refreshBalances(walletAddress) {
        if (!walletAddress) return;
        
        const balances = await this.loadBalances(walletAddress);
        this.updateBalanceDisplay(balances);
        
        window.dispatchEvent(new CustomEvent('balanceUpdated', { 
            detail: { address: walletAddress, balances } 
        }));
        
        return balances;
    }

    startPeriodicRefresh(walletAddress) {
        this.stopPeriodicRefresh();
        if (!walletAddress) return;
        
        console.log('Starting periodic refresh for:', walletAddress);
        
        this.refreshInterval = setInterval(async () => {
            console.log('Periodic refresh triggered');
            try {
                await this.refreshBalances(walletAddress);
            } catch (error) {
                console.error('Periodic refresh error:', error);
            }
        }, 30000);
    }
    
    stopPeriodicRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Global instance
window.walletBalanceLoader = new WalletBalanceLoader();

// Event listeners
window.addEventListener('walletConnected', (event) => {
    const walletAddress = event.detail.publicKey;
    if (walletAddress) {
        window.walletBalanceLoader.startPeriodicRefresh(walletAddress);
        window.walletBalanceLoader.refreshBalances(walletAddress);
    }
});

window.addEventListener('walletDisconnected', () => {
    window.walletBalanceLoader.stopPeriodicRefresh();
});