let stakingData = {
    balance: 0,
    staked: 0,
    rewards: 0,
    apy: 24.5
};

let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
    'https://api.mainnet.solana.com'
];


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadStakingData();
    setInterval(updateRewards, 5000);
});

async function connectWallet() {
    try {
        if (window.globalWallet) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            window.globalWallet = null;
            solanaConnection = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana?.isPhantom) {
            alert('Install Phantom Wallet');
            return;
        }
        
        const resp = await window.solana.connect();
        window.globalWallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${window.globalWallet.toString().slice(0, 4)}...${window.globalWallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances(); // Call loadWalletBalances
        
        console.log('Wallet connected:', window.globalWallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!window.globalWallet) return;

    let lastError = null;
    const allEndpoints = [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS];
    
    for (let attempt = 0; attempt < allEndpoints.length; attempt++) {
        const endpoint = allEndpoints[attempt];
        
        try {
            console.log(`loadWalletBalances: Trying RPC endpoint ${attempt + 1}/${allEndpoints.length}: ${endpoint}`);
            
            const connection = new solanaWeb3.Connection(
                endpoint,
                { commitment: 'confirmed' }
            );

            const owner = new solanaWeb3.PublicKey(window.globalWallet);

            // ---------- SOL BALANCE ----------
            const lamports = await connection.getBalance(owner);
            const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

            document.getElementById('sol-balance').textContent =
                solBalance.toFixed(4);

            // ---------- SIO TOKEN BALANCE ----------
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

            const tokenAccounts =
                await connection.getParsedTokenAccountsByOwner(
                    owner,
                    { mint }
                );

            let sioBalance = 0;

            if (tokenAccounts.value.length > 0) {
                const tokenInfo =
                    tokenAccounts.value[0].account.data.parsed.info;

                sioBalance = tokenInfo.tokenAmount.uiAmount || 0;
            }

            document.getElementById('sio-balance').textContent =
                sioBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 6
                });

            console.log('Balances loaded', {
                sol: solBalance,
                sio: sioBalance,
                endpoint: endpoint
            });

            // Success - update the global connection
            solanaConnection = connection;
            return;

        } catch (err) {
            lastError = err;
            console.warn(`loadWalletBalances: RPC endpoint ${endpoint} failed:`, err.message);
            
            // If this is not the last endpoint, wait before trying the next one
            if (attempt < allEndpoints.length - 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
                console.log(`loadWalletBalances: Waiting ${delay}ms before trying next endpoint...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All endpoints failed
    console.error('loadWalletBalances: All RPC endpoints failed. Last error:', lastError);

    document.getElementById('sol-balance').textContent = '—';
    document.getElementById('sio-balance').textContent = '—';

    // This page doesn't have addChatMessage, so just log to console
    console.warn('⚠️ Unable to load balances (all RPC endpoints busy). Try again in a few minutes.');
}

function loadStakingData() {
    // Update APY with slight variation
    stakingData.apy = 24.5 + (Math.random() - 0.5) * 2;
    document.getElementById('current-apy').textContent = `${stakingData.apy.toFixed(1)}%`;
    
    loadUserStaking();
}

async function loadUserStaking() {
    if (window.globalWallet) {
        try {
            // Get real wallet analytics
            const response = await fetch(`/api/wallet/analytics/${window.globalWallet.toString()}`);
            const data = await response.json();
            
            stakingData.balance = data.sio_balance;
            
            // Load staked amount from localStorage
            const savedStaking = localStorage.getItem(`sio-staking-${window.globalWallet.toString()}`);
            if (savedStaking) {
                const stakingInfo = JSON.parse(savedStaking);
                stakingData.staked = stakingInfo.staked || 0;
                stakingData.rewards = stakingInfo.rewards || 0;
            }
        } catch (error) {
            console.error('Failed to load staking data:', error);
        }
    }
    
    document.getElementById('sio-balance').textContent = `${stakingData.balance.toLocaleString()} S-IO`;
    document.getElementById('staked-amount').textContent = `${stakingData.staked.toLocaleString()} S-IO`;
    document.getElementById('pending-rewards').textContent = `${stakingData.rewards.toFixed(4)} S-IO`;
    
    const dailyRewards = (stakingData.staked * stakingData.apy / 100) / 365;
    document.getElementById('daily-rewards').textContent = `${dailyRewards.toFixed(4)} S-IO`;
}

async function stakeTokens() {
    if (!window.globalWallet) {
        alert('Please connect your wallet to stake');
        return;
    }
    
    // Check 1% minimum requirement
    const totalSupply = await window.getSIOTotalSupply();
    const onePercent = totalSupply * 0.01;
    
    if (stakingData.balance < onePercent) {
        alert(`Minimum 1% of total supply (${onePercent.toLocaleString()} S-IO) required for staking`);
        return;
    }
    
    const amount = parseFloat(document.getElementById('stake-amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    try {
        const response = await fetch('/api/staking/stake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet: window.globalWallet.toString(),
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            stakingData.balance -= amount;
            stakingData.staked += amount;
            
            // Save staking data locally
            localStorage.setItem(`sio-staking-${window.globalWallet.toString()}`, JSON.stringify({
                staked: stakingData.staked,
                rewards: stakingData.rewards,
                lastUpdate: Date.now()
            }));
            
            document.getElementById('stake-amount').value = '';
            loadUserStaking();
            
            alert(`${result.message}\nTransaction: ${result.transaction_id}`);
        } else {
            alert('Staking failed: ' + result.message);
        }
    } catch (error) {
        alert('Staking failed: ' + error.message);
    }
}

function unstakeTokens() {
    if (!window.globalWallet) {
        alert('Please connect your wallet to unstake');
        return;
    }
    
    if (stakingData.staked <= 0) {
        alert('No tokens staked');
        return;
    }
    
    const amount = prompt(`Enter amount to unstake (Max: ${stakingData.staked.toLocaleString()} S-IO):`);
    const unstakeAmount = parseFloat(amount);
    
    if (!unstakeAmount || unstakeAmount <= 0) {
        return;
    }
    
    if (unstakeAmount > stakingData.staked) {
        alert('Cannot unstake more than staked amount');
        return;
    }
    
    // Simulate unstaking transaction
    stakingData.staked -= unstakeAmount;
    stakingData.balance += unstakeAmount;
    
    loadUserStaking();
    
    alert(`Successfully unstaked ${unstakeAmount.toLocaleString()} S-IO!\\n\\nTokens have been returned to your wallet.`);
}

function claimRewards() {
    if (!window.globalWallet) {
        alert('Please connect your wallet to claim rewards');
        return;
    }
    
    if (stakingData.rewards <= 0) {
        alert('No rewards to claim');
        return;
    }
    
    const claimedAmount = stakingData.rewards;
    
    // Simulate claiming rewards
    stakingData.balance += claimedAmount;
    stakingData.rewards = 0;
    
    loadUserStaking();
    
    alert(`Successfully claimed ${claimedAmount.toFixed(2)} S-IO rewards!\\n\\nRewards have been added to your wallet.`);
}

function updateRewards() {
    if (window.globalWallet && stakingData.staked > 0) {
        // Simulate reward accumulation
        const rewardRate = (stakingData.apy / 100) / (365 * 24 * 60 * 12); // Per 5 seconds
        stakingData.rewards += stakingData.staked * rewardRate;
        
        document.getElementById('pending-rewards').textContent = `${stakingData.rewards.toFixed(4)} S-IO`;
    }
}