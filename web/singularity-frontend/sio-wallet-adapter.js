/**
 * Enhanced S-IO Wallet Integration
 * Unified wallet adapter with RPC caching and multi-wallet support
 */

class SIOWalletAdapter {
    constructor(rpcCache) {
        this.rpcCache = rpcCache;
        this.wallet = null;
        this.walletType = null;
        this.publicKey = null;
        
        // Wallet configurations
        this.wallets = {
            phantom: {
                name: 'Phantom',
                check: () => window.solana?.isPhantom,
                adapter: () => window.solana
            },
            solflare: {
                name: 'Solflare',
                check: () => window.solflare?.isSolflare,
                adapter: () => window.solflare
            },
            backpack: {
                name: 'Backpack',
                check: () => window.backpack?.isBackpack,
                adapter: () => window.backpack
            },
            glow: {
                name: 'Glow',
                check: () => window.glow,
                adapter: () => window.glow
            }
        };
    }
    
    // Detect available wallets
    detectWallets() {
        return Object.entries(this.wallets)
            .filter(([_, config]) => config.check())
            .map(([key, config]) => ({
                key,
                name: config.name,
                available: true
            }));
    }
    
    // Connect to wallet
    async connect(walletKey = 'phantom') {
        const config = this.wallets[walletKey];
        if (!config || !config.check()) {
            throw new Error(`${config?.name || walletKey} wallet not available`);
        }
        
        try {
            const adapter = config.adapter();
            const response = await adapter.connect();
            
            this.wallet = adapter;
            this.walletType = walletKey;
            this.publicKey = response.publicKey.toString();
            
            // Cache connection
            this.rpcCache.set(`wallet:${walletKey}`, {
                connected: true,
                publicKey: this.publicKey,
                timestamp: Date.now()
            }, 3600);
            
            // Setup event listeners
            this._setupEventListeners();
            
            return {
                success: true,
                publicKey: this.publicKey,
                walletType: this.walletType
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get balance with caching
    async getBalance(tokenMint = null) {
        if (!this.wallet) throw new Error('Wallet not connected');
        
        const cacheKey = `balance:${this.publicKey}:${tokenMint || 'SOL'}`;
        const cached = this.rpcCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < 30000) {
            return cached;
        }
        
        try {
            const balance = await this._fetchBalance(tokenMint);
            const balanceData = {
                balance,
                tokenMint: tokenMint || 'SOL',
                timestamp: Date.now()
            };
            
            this.rpcCache.set(cacheKey, balanceData, 30);
            return balanceData;
        } catch (error) {
            console.error('Balance fetch failed:', error);
            return cached || { balance: 0, error: error.message };
        }
    }
    
    // Sign transaction
    async signTransaction(transaction) {
        if (!this.wallet) throw new Error('Wallet not connected');
        
        try {
            const signed = await this.wallet.signTransaction(transaction);
            return { success: true, transaction: signed };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Sign and send transaction
    async signAndSendTransaction(transaction) {
        if (!this.wallet) throw new Error('Wallet not connected');
        
        try {
            const { signature } = await this.wallet.signAndSendTransaction(transaction);
            
            // Cache transaction
            this.rpcCache.set(`tx:${signature}`, {
                signature,
                timestamp: Date.now(),
                status: 'pending'
            }, 300);
            
            return { success: true, signature };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Disconnect wallet
    async disconnect() {
        if (this.wallet) {
            await this.wallet.disconnect();
            this.rpcCache.delete(`wallet:${this.walletType}`);
            this.wallet = null;
            this.walletType = null;
            this.publicKey = null;
        }
    }
    
    // Private methods
    _setupEventListeners() {
        if (!this.wallet) return;
        
        this.wallet.on('disconnect', () => {
            this.disconnect();
        });
        
        this.wallet.on('accountChanged', (publicKey) => {
            if (publicKey) {
                this.publicKey = publicKey.toString();
                this.rpcCache.delete(`balance:${this.publicKey}:SOL`);
            } else {
                this.disconnect();
            }
        });
    }
    
    async _fetchBalance(tokenMint) {
        // Use RPC cache for balance fetching
        const connection = new solanaWeb3.Connection(
            this.rpcCache.rpcUrl || 'https://api.mainnet-beta.solana.com'
        );
        
        if (!tokenMint) {
            const balance = await connection.getBalance(
                new solanaWeb3.PublicKey(this.publicKey)
            );
            return balance / 1e9; // Convert lamports to SOL
        } else {
            // Get SPL token balance
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                new solanaWeb3.PublicKey(this.publicKey),
                { mint: new solanaWeb3.PublicKey(tokenMint) }
            );
            
            if (tokenAccounts.value.length === 0) return 0;
            
            return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
    }
}

// RPC Cache implementation for browser
class BrowserRPCCache {
    constructor() {
        this.cache = new Map();
        this.rpcUrl = 'https://api.mainnet-beta.solana.com';
    }
    
    set(key, value, ttl) {
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttl * 1000)
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    delete(key) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
}

// Initialize global instances
window.sioRPCCache = window.sioRPCCache || new BrowserRPCCache();
window.sioWallet = window.sioWallet || new SIOWalletAdapter(window.sioRPCCache);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SIOWalletAdapter, BrowserRPCCache };
}