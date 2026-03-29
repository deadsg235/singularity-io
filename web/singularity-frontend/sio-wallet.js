// S-IO Token Integration
class SIOWallet {
    constructor() {
        this.tokenAddress = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
        this.connection = null;
        this.wallet = null;
        this.balance = 0;
    }

    async connect() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const response = await window.solana.connect();
                this.wallet = response.publicKey.toString();
                
                // Initialize Solana connection
                this.connection = new solanaWeb3.Connection(
                    'https://api.mainnet-beta.solana.com',
                    'confirmed'
                );
                
                await this.updateBalance();
                return this.wallet;
            } catch (error) {
                throw new Error('Failed to connect wallet: ' + error.message);
            }
        } else {
            throw new Error('Phantom wallet not found');
        }
    }

    async updateBalance() {
        if (!this.wallet || !this.connection) return 0;

        try {
            // Get token accounts for the wallet
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                new solanaWeb3.PublicKey(this.wallet),
                { mint: new solanaWeb3.PublicKey(this.tokenAddress) }
            );

            if (tokenAccounts.value.length > 0) {
                const tokenAccount = tokenAccounts.value[0];
                this.balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            } else {
                this.balance = 0;
            }

            return this.balance;
        } catch (error) {
            console.error('Error fetching S-IO balance:', error);
            return 0;
        }
    }

    async getTransactionHistory() {
        if (!this.wallet || !this.connection) return [];

        try {
            // Get recent transactions for the wallet
            const signatures = await this.connection.getSignaturesForAddress(
                new solanaWeb3.PublicKey(this.wallet),
                { limit: 50 }
            );

            const transactions = [];
            
            for (const sig of signatures.slice(0, 10)) { // Get last 10 transactions
                try {
                    const tx = await this.connection.getParsedTransaction(sig.signature);
                    
                    if (tx && tx.meta && tx.meta.postTokenBalances) {
                        // Check if this transaction involves S-IO token
                        const sioTransfer = tx.meta.postTokenBalances.find(
                            balance => balance.mint === this.tokenAddress
                        );
                        
                        if (sioTransfer) {
                            transactions.push({
                                signature: sig.signature,
                                timestamp: sig.blockTime * 1000,
                                status: sig.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
                                amount: this.calculateTransferAmount(tx),
                                type: 'transfer'
                            });
                        }
                    }
                } catch (txError) {
                    console.error('Error parsing transaction:', txError);
                }
            }

            return transactions;
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            return [];
        }
    }

    calculateTransferAmount(transaction) {
        // Simplified amount calculation - in production, this would be more sophisticated
        if (transaction.meta && transaction.meta.preTokenBalances && transaction.meta.postTokenBalances) {
            const preBalance = transaction.meta.preTokenBalances.find(b => b.mint === this.tokenAddress);
            const postBalance = transaction.meta.postTokenBalances.find(b => b.mint === this.tokenAddress);
            
            if (preBalance && postBalance) {
                return Math.abs(postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount);
            }
        }
        return 0;
    }

    async sendPayment(recipientAddress, amount, memo = '') {
        if (!this.wallet || !window.solana) {
            throw new Error('Wallet not connected');
        }

        try {
            // Create transfer instruction
            const transaction = new solanaWeb3.Transaction();
            
            // Get or create associated token accounts
            const fromTokenAccount = await this.getAssociatedTokenAccount(this.wallet);
            const toTokenAccount = await this.getAssociatedTokenAccount(recipientAddress);
            
            // Add transfer instruction
            const transferInstruction = splToken.createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                new solanaWeb3.PublicKey(this.wallet),
                amount * Math.pow(10, 9), // Convert to token decimals
                [],
                splToken.TOKEN_PROGRAM_ID
            );
            
            transaction.add(transferInstruction);
            
            // Add memo if provided
            if (memo) {
                transaction.add(
                    new solanaWeb3.TransactionInstruction({
                        keys: [],
                        programId: new solanaWeb3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                        data: Buffer.from(memo, 'utf8')
                    })
                );
            }

            // Sign and send transaction
            const { signature } = await window.solana.signAndSendTransaction(transaction);
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature);
            
            return signature;
        } catch (error) {
            throw new Error('Payment failed: ' + error.message);
        }
    }

    async getAssociatedTokenAccount(walletAddress) {
        const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(this.tokenAddress),
            new solanaWeb3.PublicKey(walletAddress)
        );
        
        return associatedTokenAddress;
    }

    formatBalance(balance) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(balance);
    }

    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
    }
}

// Global S-IO wallet instance
window.sioWallet = new SIOWallet();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SIOWallet;
}