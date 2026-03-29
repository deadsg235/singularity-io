// Wallet Integration using Cached RPC
class WalletManager {
    constructor() {
        this.wallet = null;
        this.publicKey = null;
        this.isConnected = false;
    }

    async connect() {
        if (!window.solana?.isPhantom) {
            throw new Error('Phantom wallet not found');
        }

        // Show confirmation dialog
        const confirmed = confirm('Connect to Phantom wallet?\n\nThis will allow Singularity.io to:\n• View your wallet address\n• Check your S-IO token balance\n• Request transaction signatures');
        
        if (!confirmed) {
            throw new Error('Connection cancelled by user');
        }

        try {
            const response = await window.solana.connect();
            this.wallet = window.solana;
            this.publicKey = response.publicKey.toString();
            this.isConnected = true;
            
            this.updateUI();
            await this.loadBalance();
            
            return this.publicKey;
        } catch (error) {
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    async loadBalance() {
        if (!this.publicKey) return;

        try {
            const response = await fetch(`/api/sio/balance/${this.publicKey}`);
            
            if (!response.ok) {
                console.error('Balance API error:', response.status);
                this.updateBalanceDisplay(0);
                return;
            }
            
            const data = await response.json();
            this.updateBalanceDisplay(data.balance || 0);
        } catch (error) {
            console.error('Balance load failed:', error);
            this.updateBalanceDisplay(0);
        }
    }

    updateBalanceDisplay(sioBalance) {
        const sioElement = document.getElementById('sio-balance');
        const balanceDisplay = document.getElementById('balance-display');
        
        if (sioElement) sioElement.textContent = sioBalance.toLocaleString();
        if (balanceDisplay) balanceDisplay.classList.remove('hidden');
    }

    updateUI() {
        const walletBtn = document.getElementById('wallet-btn');
        if (walletBtn && this.isConnected) {
            walletBtn.textContent = `${this.publicKey.slice(0, 4)}...${this.publicKey.slice(-4)}`;
        }
    }

    disconnect() {
        this.wallet = null;
        this.publicKey = null;
        this.isConnected = false;
        
        const walletBtn = document.getElementById('wallet-btn');
        const balanceDisplay = document.getElementById('balance-display');
        
        if (walletBtn) walletBtn.textContent = 'Connect Wallet';
        if (balanceDisplay) balanceDisplay.classList.add('hidden');
    }
}

// Global wallet manager
window.walletManager = new WalletManager();

// Auto-connect on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Connect wallet button
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
        walletBtn.addEventListener('click', async () => {
            if (window.walletManager.isConnected) {
                window.walletManager.disconnect();
            } else {
                try {
                    await window.walletManager.connect();
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    }

    // Refresh balance button
    const refreshBtn = document.getElementById('refresh-balance-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.walletManager.loadBalance();
        });
    }
});