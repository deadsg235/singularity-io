// Phantom SDK Integration for S-IO Platform

class PhantomWalletAdapter {
    constructor() {
        this.sdk = null;
        this.connected = false;
        this.connecting = false;
        this.addresses = [];
        this.init();
    }

    async init() {
        try {
            this.sdk = new BrowserSDK({
                appId: 'singularity-io',
                providers: ['phantom', 'injected'],
                addressTypes: ['solana'],
                embeddedWalletType: 'user-wallet'
            });
            
            this.bindEvents();
            await this.sdk.autoConnect();
        } catch (error) {
            console.error('Phantom SDK initialization failed:', error);
            this.fallbackToInjected();
        }
    }

    fallbackToInjected() {
        this.detectWallets();
        this.bindEvents();
    }

    detectWallets() {
        this.availableWallets = [];
        
        // Check for Phantom
        if (window.solana && window.solana.isPhantom) {
            this.availableWallets.push({
                name: 'Phantom',
                adapter: window.solana,
                icon: 'https://phantom.app/img/phantom-logo.svg'
            });
        }
    }

    async connect(walletName = 'Phantom') {
        if (this.connecting) return;
        
        this.connecting = true;
        
        try {
            // Use direct Phantom connection
            const walletAdapter = this.getWalletAdapter(walletName);
            if (!walletAdapter) {
                throw new Error(`${walletName} wallet not found`);
            }

            const response = await walletAdapter.connect();
            
            this.wallet = walletAdapter;
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
            if (this.sdk) {
                const signedTransaction = await this.sdk.solana.signTransaction(transaction);
                return signedTransaction;
            } else {
                const signedTransaction = await this.wallet.signTransaction(transaction);
                return signedTransaction;
            }
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
            if (this.sdk) {
                const signature = await this.sdk.solana.signAndSendTransaction(transaction);
                return signature;
            } else {
                const signature = await this.wallet.signAndSendTransaction(transaction);
                return signature;
            }
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
            if (this.sdk) {
                const signedMessage = await this.sdk.solana.signMessage(encodedMessage);
                return signedMessage;
            } else {
                const signedMessage = await this.wallet.signMessage(encodedMessage);
                return signedMessage;
            }
        } catch (error) {
            console.error('Message signing failed:', error);
            throw error;
        }
    }

    getWalletAdapter(walletName) {
        const wallet = this.availableWallets.find(w => 
            w.name.toLowerCase() === walletName.toLowerCase()
        );
        return wallet ? wallet.adapter : null;
    }

    bindEvents() {
        if (this.sdk) {
            this.sdk.on('connect', () => this.onConnect());
            this.sdk.on('disconnect', () => this.onDisconnect());
        } else if (window.solana) {
            window.solana.on('connect', () => this.onConnect());
            window.solana.on('disconnect', () => this.onDisconnect());
            window.solana.on('accountChanged', (publicKey) => this.onAccountChanged(publicKey));
        }
    }

    onConnect() {
        const address = this.sdk ? this.addresses[0]?.address : this.publicKey?.toString();
        console.log('Wallet connected:', address);
        this.updateUI();
        this.dispatchEvent('walletConnected', { publicKey: address });
    }

    onDisconnect() {
        console.log('Wallet disconnected');
        this.updateUI();
        this.dispatchEvent('walletDisconnected');
    }

    onAccountChanged(publicKey) {
        console.log('Account changed:', publicKey?.toString());
        if (this.sdk) {
            // SDK handles account changes internally
        } else {
            this.publicKey = publicKey;
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

    // Utility methods
    isConnected() {
        return this.connected && this.wallet && this.publicKey;
    }

    getPublicKey() {
        return this.sdk ? this.addresses[0]?.address : this.publicKey;
    }

    getWalletName() {
        if (this.sdk) return 'Phantom';
        if (!this.wallet) return null;
        
        if (this.wallet.isPhantom) return 'Phantom';
        return 'Unknown';
    }

    getAvailableWallets() {
        return this.availableWallets;
    }
}

// Initialize wallet adapter
const walletAdapter = new PhantomWalletAdapter();

// Export for global use
window.walletAdapter = walletAdapter;

// Auto-connect if previously connected
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // SDK handles auto-connect internally
        if (!walletAdapter.sdk && window.solana && window.solana.isConnected) {
            await walletAdapter.connect();
        }
    } catch (error) {
        console.log('Auto-connect failed:', error);
    }
});