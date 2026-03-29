/**
 * S-IO Protocol JavaScript Client
 * Browser-based SIO payment handling with Phantom wallet integration
 */

class SIOProtocolClient {
    constructor(options = {}) {
        this.version = 1;
        this.protocol = 's-io';
        this.rpcUrl = options.rpcUrl || 'https://api.mainnet-beta.solana.com';
        this.wallet = null;
        this.sioTokenMint = options.sioTokenMint || 'SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd';
    }

    /**
     * Connect to Phantom wallet
     */
    async connectWallet() {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom wallet not found');
        }

        try {
            const response = await window.solana.connect();
            this.wallet = window.solana;
            return response.publicKey.toString();
        } catch (error) {
            throw new Error(`Wallet connection failed: ${error.message}`);
        }
    }

    /**
     * Create SIO payment for given requirements
     */
    async createPayment(requirements) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        try {
            // Create SPL token transfer instruction
            const transaction = new solanaWeb3.Transaction();
            
            // Get associated token accounts
            const fromTokenAccount = await this.getAssociatedTokenAccount(
                this.wallet.publicKey,
                requirements.token
            );
            
            const toTokenAccount = await this.getAssociatedTokenAccount(
                new solanaWeb3.PublicKey(requirements.recipient),
                requirements.token
            );

            // Add transfer instruction
            transaction.add(
                splToken.createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    this.wallet.publicKey,
                    parseInt(requirements.amount)
                )
            );

            // Get recent blockhash
            const { blockhash } = await this.getRecentBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.wallet.publicKey;

            // Sign transaction
            const signedTransaction = await this.wallet.signTransaction(transaction);
            
            // Create payment payload
            const payload = {
                protocol: this.protocol,
                version: this.version,
                signature: signedTransaction.signatures[0].signature.toString('hex'),
                transaction: signedTransaction.serialize().toString('base64'),
                payer: this.wallet.publicKey.toString(),
                timestamp: Math.floor(Date.now() / 1000)
            };

            return this.encodePayment(payload);
        } catch (error) {
            throw new Error(`Payment creation failed: ${error.message}`);
        }
    }

    /**
     * Make authenticated request with SIO payment
     */
    async makePaymentRequest(url, requirements, options = {}) {
        const paymentHeader = await this.createPayment(requirements);
        
        const headers = {
            'X-SIO-PAYMENT': paymentHeader,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        // Check for settlement response
        const settlementHeader = response.headers.get('X-SIO-SETTLEMENT');
        if (settlementHeader) {
            const settlement = this.parseSettlement(settlementHeader);
            console.log('Payment settled:', settlement);
        }

        return response;
    }

    /**
     * Get SIO token balance
     */
    async getSIOBalance() {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        try {
            const tokenAccount = await this.getAssociatedTokenAccount(
                this.wallet.publicKey,
                this.sioTokenMint
            );

            const balance = await this.getTokenBalance(tokenAccount);
            return balance;
        } catch (error) {
            console.warn('Failed to get SIO balance:', error);
            return 0;
        }
    }

    /**
     * Estimate payment cost
     */
    async estimatePaymentCost(requirements) {
        const baseFee = 5000; // 0.000005 SOL
        const tokenAmount = parseInt(requirements.amount);
        
        return {
            tokenAmount,
            networkFee: baseFee,
            total: tokenAmount + baseFee
        };
    }

    // Utility methods
    async getAssociatedTokenAccount(owner, mint) {
        const [address] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                owner.toBuffer(),
                splToken.TOKEN_PROGRAM_ID.toBuffer(),
                new solanaWeb3.PublicKey(mint).toBuffer(),
            ],
            splToken.ASSOCIATED_TOKEN_PROGRAM_ID
        );
        return address;
    }

    async getTokenBalance(tokenAccount) {
        const connection = new solanaWeb3.Connection(this.rpcUrl);
        const balance = await connection.getTokenAccountBalance(tokenAccount);
        return balance.value.uiAmount || 0;
    }

    async getRecentBlockhash() {
        const connection = new solanaWeb3.Connection(this.rpcUrl);
        return await connection.getRecentBlockhash();
    }

    encodePayment(payload) {
        return btoa(JSON.stringify(payload));
    }

    parseSettlement(settlementHeader) {
        try {
            const decoded = atob(settlementHeader);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Failed to parse settlement:', error);
            return null;
        }
    }
}

/**
 * SIO Payment Widget
 * UI component for handling payments
 */
class SIOPaymentWidget {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.client = new SIOProtocolClient(options);
        this.theme = options.theme || 'dark';
        this.onPaymentSuccess = options.onPaymentSuccess || (() => {});
        this.onPaymentError = options.onPaymentError || (() => {});
    }

    /**
     * Show payment dialog
     */
    async showPaymentDialog(requirements) {
        const dialog = this.createPaymentDialog(requirements);
        this.container.appendChild(dialog);

        try {
            await this.client.connectWallet();
            const balance = await this.client.getSIOBalance();
            const cost = await this.client.estimatePaymentCost(requirements);

            this.updateDialogContent(dialog, {
                balance,
                cost,
                requirements,
                connected: true
            });
        } catch (error) {
            this.showError(dialog, error.message);
        }
    }

    createPaymentDialog(requirements) {
        const dialog = document.createElement('div');
        dialog.className = `sio-payment-dialog ${this.theme}`;
        dialog.innerHTML = `
            <div class="sio-dialog-overlay">
                <div class="sio-dialog-content">
                    <div class="sio-dialog-header">
                        <h3>SIO Payment Required</h3>
                        <button class="sio-close-btn">&times;</button>
                    </div>
                    <div class="sio-dialog-body">
                        <div class="sio-loading">
                            <div class="sio-spinner"></div>
                            <p>Connecting to wallet...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        dialog.querySelector('.sio-close-btn').onclick = () => {
            this.container.removeChild(dialog);
        };

        return dialog;
    }

    updateDialogContent(dialog, data) {
        const body = dialog.querySelector('.sio-dialog-body');
        body.innerHTML = `
            <div class="sio-payment-info">
                <div class="sio-amount">
                    <label>Amount Required:</label>
                    <span>${data.cost.tokenAmount / 1000000} SIO</span>
                </div>
                <div class="sio-balance">
                    <label>Your Balance:</label>
                    <span>${data.balance} SIO</span>
                </div>
                <div class="sio-description">
                    <p>${data.requirements.description}</p>
                </div>
            </div>
            <div class="sio-payment-actions">
                <button class="sio-pay-btn" ${data.balance < data.cost.tokenAmount ? 'disabled' : ''}>
                    Pay with SIO
                </button>
                <button class="sio-cancel-btn">Cancel</button>
            </div>
        `;

        // Add payment handler
        const payBtn = body.querySelector('.sio-pay-btn');
        payBtn.onclick = async () => {
            try {
                payBtn.disabled = true;
                payBtn.textContent = 'Processing...';
                
                const payment = await this.client.createPayment(data.requirements);
                this.onPaymentSuccess(payment);
                this.container.removeChild(dialog);
            } catch (error) {
                this.onPaymentError(error);
                this.showError(dialog, error.message);
            }
        };

        body.querySelector('.sio-cancel-btn').onclick = () => {
            this.container.removeChild(dialog);
        };
    }

    showError(dialog, message) {
        const body = dialog.querySelector('.sio-dialog-body');
        body.innerHTML = `
            <div class="sio-error">
                <p>Error: ${message}</p>
                <button class="sio-retry-btn">Retry</button>
            </div>
        `;
    }
}

// Export for use
window.SIOProtocolClient = SIOProtocolClient;
window.SIOPaymentWidget = SIOPaymentWidget;

// CSS styles
const sioStyles = `
.sio-payment-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
}

.sio-dialog-overlay {
    background: rgba(0, 0, 0, 0.8);
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sio-dialog-content {
    background: #1a1a1a;
    border: 1px solid #dc2626;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
    color: white;
}

.sio-dialog-header {
    padding: 20px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sio-close-btn {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 24px;
    cursor: pointer;
}

.sio-dialog-body {
    padding: 20px;
}

.sio-payment-info {
    margin-bottom: 20px;
}

.sio-payment-info > div {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.sio-pay-btn {
    background: #dc2626;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    margin-right: 10px;
}

.sio-pay-btn:disabled {
    background: #666;
    cursor: not-allowed;
}

.sio-cancel-btn {
    background: transparent;
    color: #dc2626;
    border: 1px solid #dc2626;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
}

.sio-spinner {
    border: 2px solid #333;
    border-top: 2px solid #dc2626;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    margin: 0 auto 10px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = sioStyles;
document.head.appendChild(styleSheet);