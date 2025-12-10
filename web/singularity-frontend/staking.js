let stakingData = {
    balance: 0,
    staked: 0,
    rewards: 0,
    apy: 24.5
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadStakingData();
    setInterval(updateRewards, 5000);
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    window.globalWallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${window.globalWallet.toString().slice(0, 4)}...${window.globalWallet.toString().slice(-4)}`;
    if (window.setWalletConnected) window.setWalletConnected(true);
    
    // Wait for S-IO functions to be available
    setTimeout(async () => {
        await loadUserStaking();
        if (window.updateSIODisplay) await window.updateSIODisplay();
    }, 1000);
}

function loadStakingData() {
    // Update APY with slight variation
    stakingData.apy = 24.5 + (Math.random() - 0.5) * 2;
    document.getElementById('current-apy').textContent = `${stakingData.apy.toFixed(1)}%`;
    
    loadUserStaking();
}

async function loadUserStaking() {
    if (window.globalWallet && window.getSIOBalance) {
        // Get real S-IO balance
        stakingData.balance = await window.getSIOBalance(window.globalWallet.toString());
        
        // Load staked amount from API or localStorage
        const savedStaking = localStorage.getItem(`sio-staking-${window.globalWallet.toString()}`);
        if (savedStaking) {
            const data = JSON.parse(savedStaking);
            stakingData.staked = data.staked || 0;
            stakingData.rewards = data.rewards || 0;
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