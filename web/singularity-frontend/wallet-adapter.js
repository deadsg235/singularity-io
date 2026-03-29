// Enhanced S-IO Wallet Adapter with RPC Cache Integration

class EnhancedWalletAdapter {
    constructor() {
        this.wallet = null;
        this.connected = false;
        this.connecting = false;
        this.publicKey = null;
        this.walletType = null;
        
        // Initialize RPC cache
        this.rpcCache = window.sioRPCCache || new BrowserRPCCache();
        
        // Wallet configurations
        this.wallets = {
            phantom: {
                name: 'Phantom',
                check: () => window.solana?.isPhantom,
                adapter: () => window.solana,
                icon: 'https://phantom.app/img/phantom-logo.svg'
            },
            solflare: {
                name: 'Solflare', 
                check: () => window.solflare?.isSolflare,
                adapter: () => window.solflare,
                icon: 'https://solflare.com/img/logo.svg'
            },
            backpack: {
                name: 'Backpack',
                check: () => window.backpack?.isBackpack,
                adapter: () => window.backpack,
                icon: 'https://backpack.app/img/logo.svg'
            }
        };
        
        this.init();
    }

    async init() {
        this.detectWallets();
        this.bindEvents();
        
        // Auto-connect if previously connected
        const lastWallet = localStorage.getItem('lastWallet');
        if (lastWallet && this.wallets[lastWallet]?.check()) {
            try {
                await this.connect(lastWallet);
            } catch (error) {
                console.log('Auto-connect failed:', error);
            }
        }
    }

    detectWallets() {
        this.availableWallets = Object.entries(this.wallets)
            .filter(([_, config]) => config.check())
            .map(([key, config]) => ({
                key,
                name: config.name,
                icon: config.icon,
                available: true
            }));
    }

    async connect(walletKey = 'phantom') {
        if (this.connecting || this.connected) return;
        
        const config = this.wallets[walletKey];
        if (!config || !config.check()) {
            throw new Error(`${config?.name || walletKey} wallet not available`);
        }
        
        this.connecting = true;
        
        try {
            const adapter = config.adapter();
            const response = await adapter.connect();
            
            this.wallet = adapter;
            this.walletType = walletKey;
            this.publicKey = response.publicKey;
            this.connected = true;
            
            // Cache connection
            this.rpcCache.set(`wallet:${walletKey}`, {
                connected: true,
                publicKey: this.publicKey.toString(),
                timestamp: Date.now()
            }, 3600);
            
            localStorage.setItem('lastWallet', walletKey);
            
            window.globalWallet = {
                publicKey: this.publicKey,
                adapter: this.wallet,
                connected: true,
                type: walletKey
            };

            this.onConnect();
            return response;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        } finally {
            this.connecting = false;
        }
    }

    async getBalance(tokenMint = null) {
        if (!this.connected) return { balance: 0, error: 'Not connected' };
        
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

    async _fetchBalance(tokenMint) {
        if (!window.solanaWeb3) {
            throw new Error('Solana Web3 not available');
        }
        
        const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
        
        if (!tokenMint) {
            const balance = await connection.getBalance(this.publicKey);
            return balance / 1e9; // Convert lamports to SOL
        } else {
            // Get SPL token balance
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                this.publicKey,
                { mint: new solanaWeb3.PublicKey(tokenMint) }
            );
            
            if (tokenAccounts.value.length === 0) return 0;
            
            return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
    }

    async signTransaction(transaction) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const signedTransaction = await this.wallet.signTransaction(transaction);
            return { success: true, transaction: signedTransaction };
        } catch (error) {
            console.error('Transaction signing failed:', error);
            return { success: false, error: error.message };
        }
    }

    async signAndSendTransaction(transaction) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

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
            console.error('Transaction failed:', error);
            return { success: false, error: error.message };
        }
    }

    async disconnect() {
        try {
            if (this.wallet) {
                await this.wallet.disconnect();
            }
            
            this.rpcCache.delete(`wallet:${this.walletType}`);
            localStorage.removeItem('lastWallet');
            
            this.wallet = null;
            this.publicKey = null;
            this.connected = false;
            this.walletType = null;
            
            window.globalWallet = null;
            
            this.onDisconnect();
            
        } catch (error) {
            console.error('Wallet disconnection failed:', error);
        }
    }

    bindEvents() {
        Object.values(this.wallets).forEach(config => {
            if (config.check()) {
                const adapter = config.adapter();
                adapter.on?.('connect', () => this.onConnect());
                adapter.on?.('disconnect', () => this.onDisconnect());
                adapter.on?.('accountChanged', (publicKey) => this.onAccountChanged(publicKey));
            }
        });
    }

    onConnect() {
        const address = this.publicKey?.toString();
        console.log(`${this.walletType} wallet connected:`, address);
        
        if (address) {
            localStorage.setItem('walletAddress', address);
            // Use unified balance loader
            if (window.walletBalanceLoader) {
                window.walletBalanceLoader.refreshBalances(address);
            }
        }
        
        this.updateUI();
        this.dispatchEvent('walletConnected', { 
            publicKey: address, 
            walletType: this.walletType 
        });
    }

    onDisconnect() {
        console.log('Wallet disconnected');
        
        localStorage.removeItem('walletAddress');
        
        const balanceDisplay = document.getElementById('balance-display');
        if (balanceDisplay) {
            balanceDisplay.classList.add('hidden');
        }
        
        this.updateUI();
        this.dispatchEvent('walletDisconnected');
    }

    onAccountChanged(publicKey) {
        console.log('Account changed:', publicKey?.toString());
        this.publicKey = publicKey;
        if (window.globalWallet) {
            window.globalWallet.publicKey = publicKey;
        }
        this.updateUI();
        this.dispatchEvent('accountChanged', { publicKey });
    }

    updateUI() {
        const walletBtn = document.getElementById('wallet-btn');
        const balanceDisplay = document.getElementById('balance-display');
        
        if (walletBtn) {
            if (this.connected) {
                walletBtn.textContent = `Disconnect ${this.walletType || 'Wallet'}`;
                walletBtn.classList.add('connected');
                if (balanceDisplay) {
                    balanceDisplay.classList.remove('hidden');
                }
            } else {
                walletBtn.textContent = 'Connect Wallet';
                walletBtn.classList.remove('connected');
                if (balanceDisplay) {
                    balanceDisplay.classList.add('hidden');
                }
            }
        }
    }

    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    isConnected() {
        return this.connected && this.wallet && this.publicKey;
    }

    getPublicKey() {
        return this.publicKey;
    }

    getWalletName() {
        return this.wallets[this.walletType]?.name || 'Unknown';
    }

    getAvailableWallets() {
        return this.availableWallets || [];
    }
}

// Browser RPC Cache for wallet integration
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
}

// Initialize enhanced wallet adapter
window.sioRPCCache = window.sioRPCCache || new BrowserRPCCache();
const walletAdapter = new EnhancedWalletAdapter();
window.walletAdapter = walletAdapter;