let stakingData = {
    balance: 0,
    staked: 0,
    rewards: 0,
    apy: 24.5
};


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);
    loadStakingData();
    setInterval(updateRewards, 5000);
    
    // Listen for balance updates
    window.addEventListener('balanceUpdated', (event) => {
        const { balances } = event.detail;
        stakingData.balance = balances.sio;
        document.getElementById('stake-sio-balance').textContent = `${balances.sio.toFixed(2)} S-IO`;
        loadUserStaking();
    });
});

async function handleWalletClick() {
    if (window.walletAdapter?.isConnected()) {
        await window.walletAdapter.disconnect();
    } else {
        try {
            await window.walletAdapter.connect('phantom');
        } catch (error) {
            console.error('Wallet connection failed:', error);
            alert('Failed to connect wallet: ' + error.message);
        }
    }
}

function loadStakingData() {
    // Update APY with slight variation
    stakingData.apy = 24.5 + (Math.random() - 0.5) * 2;
    document.getElementById('current-apy').textContent = `${stakingData.apy.toFixed(1)}%`;
    
    loadUserStaking();
}

function loadUserStaking() {
    if (window.walletAdapter?.isConnected()) {
        const walletAddress = window.walletAdapter.getPublicKey()?.toString();
        if (walletAddress) {
            // Load staked amount from localStorage
            const savedStaking = localStorage.getItem(`sio-staking-${walletAddress}`);
            if (savedStaking) {
                const stakingInfo = JSON.parse(savedStaking);
                stakingData.staked = stakingInfo.staked || 0;
                stakingData.rewards = stakingInfo.rewards || 0;
            }
        }
    }
    
    document.getElementById('stake-sio-balance').textContent = `${stakingData.balance.toFixed(2)} S-IO`;
    document.getElementById('staked-amount').textContent = `${stakingData.staked.toLocaleString()} S-IO`;
    document.getElementById('pending-rewards').textContent = `${stakingData.rewards.toFixed(4)} S-IO`;
    
    const dailyRewards = (stakingData.staked * stakingData.apy / 100) / 365;
    document.getElementById('daily-rewards').textContent = `${dailyRewards.toFixed(4)} S-IO`;
}

async function stakeTokens() {
    if (!window.walletAdapter?.isConnected()) {
        alert('Please connect your wallet to stake');
        return;
    }
    
    const amount = parseFloat(document.getElementById('stake-amount').value);
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount > stakingData.balance) {
        alert('Insufficient balance');
        return;
    }
    
    try {
        const walletAddress = window.walletAdapter.getPublicKey().toString();
        
        stakingData.balance -= amount;
        stakingData.staked += amount;
        
        // Save staking data locally
        localStorage.setItem(`sio-staking-${walletAddress}`, JSON.stringify({
            staked: stakingData.staked,
            rewards: stakingData.rewards,
            lastUpdate: Date.now()
        }));
        
        document.getElementById('stake-amount').value = '';
        loadUserStaking();
        
        alert(`Successfully staked ${amount.toLocaleString()} S-IO!`);
    } catch (error) {
        alert('Staking failed: ' + error.message);
    }
}

function unstakeTokens() {
    if (!window.walletAdapter?.isConnected()) {
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
    
    stakingData.staked -= unstakeAmount;
    stakingData.balance += unstakeAmount;
    
    loadUserStaking();
    
    alert(`Successfully unstaked ${unstakeAmount.toLocaleString()} S-IO!`);
}

function claimRewards() {
    if (!window.walletAdapter?.isConnected()) {
        alert('Please connect your wallet to claim rewards');
        return;
    }
    
    if (stakingData.rewards <= 0) {
        alert('No rewards to claim');
        return;
    }
    
    const claimedAmount = stakingData.rewards;
    
    stakingData.balance += claimedAmount;
    stakingData.rewards = 0;
    
    loadUserStaking();
    
    alert(`Successfully claimed ${claimedAmount.toFixed(2)} S-IO rewards!`);
}

function updateRewards() {
    if (window.walletAdapter?.isConnected() && stakingData.staked > 0) {
        const rewardRate = (stakingData.apy / 100) / (365 * 24 * 60 * 12);
        stakingData.rewards += stakingData.staked * rewardRate;
        
        document.getElementById('pending-rewards').textContent = `${stakingData.rewards.toFixed(4)} S-IO`;
    }
}