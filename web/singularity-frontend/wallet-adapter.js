// Phantom Wallet Adapter for S-IO Platform

class PhantomWalletAdapter {
    constructor() {
        this.wallet = null;
        this.connected = false;
        this.connecting = false;
        this.publicKey = null;
        this.init();
    }

    async init() {
        this.detectWallets();
        this.bindEvents();
        
        // Auto-connect if previously connected
        if (this.isPhantomAvailable() && window.solana.isConnected) {
            try {
                await this.connect();
            } catch (error) {
                console.log('Auto-connect failed:', error);
            }
        }
    }

    isPhantomAvailable() {
        return window.solana && window.solana.isPhantom;
    }

    detectWallets() {
        this.availableWallets = [];
        
        if (this.isPhantomAvailable()) {
            this.availableWallets.push({
                name: 'Phantom',
                adapter: window.solana,
                icon: 'https://phantom.app/img/phantom-logo.svg'
            });
        }
    }

    async connect() {
        if (this.connecting || this.connected) return;
        
        if (!this.isPhantomAvailable()) {
            throw new Error('Phantom wallet not found. Please install Phantom.');
        }
        
        this.connecting = true;
        
        try {
            const response = await window.solana.connect();
            
            this.wallet = window.solana;
            this.publicKey = response.publicKey;
            this.connected = true;
            
            window.globalWallet = {
                publicKey: this.publicKey,
                adapter: this.wallet,
                connected: true
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

    async disconnect() {
        try {
            if (this.wallet) {
                await this.wallet.disconnect();
            }
            
            this.wallet = null;
            this.publicKey = null;
            this.connected = false;
            
            window.globalWallet = null;
            
            this.onDisconnect();
            
        } catch (error) {
            console.error('Wallet disconnection failed:', error);
        }
    }

    async signTransaction(transaction) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const signedTransaction = await this.wallet.signTransaction(transaction);
            return signedTransaction;
        } catch (error) {
            console.error('Transaction signing failed:', error);
            throw error;
        }
    }

    async signAndSendTransaction(transaction) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await this.wallet.signAndSendTransaction(transaction);
            return signature;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    async signMessage(message) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await this.wallet.signMessage(encodedMessage);
            return signedMessage;
        } catch (error) {
            console.error('Message signing failed:', error);
            throw error;
        }
    }

    bindEvents() {
        if (this.isPhantomAvailable()) {
            window.solana.on('connect', () => this.onConnect());
            window.solana.on('disconnect', () => this.onDisconnect());
            window.solana.on('accountChanged', (publicKey) => this.onAccountChanged(publicKey));
        }
    }

    onConnect() {
        const address = this.publicKey?.toString();
        console.log('Wallet connected:', address);
        
        if (address) {
            localStorage.setItem('walletAddress', address);
            // Use unified balance loader
            if (window.walletBalanceLoader) {
                window.walletBalanceLoader.refreshBalances(address);
            }
        }
        
        this.updateUI();
        this.dispatchEvent('walletConnected', { publicKey: address });
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
                walletBtn.textContent = 'Disconnect';
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
        return this.wallet?.isPhantom ? 'Phantom' : 'Unknown';
    }

    getAvailableWallets() {
        return this.availableWallets || [];
    }
}

// Initialize wallet adapter
const walletAdapter = new PhantomWalletAdapter();
window.walletAdapter = walletAdapter;