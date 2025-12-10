let proposals = [
    {
        id: 1,
        title: "Reduce Trading Fees to 0.05%",
        description: "Lower trading fees to increase volume and competitiveness",
        yesVotes: 12500000,
        noVotes: 3200000,
        totalVotes: 15700000,
        endTime: Date.now() + 86400000 * 3,
        status: "active"
    },
    {
        id: 2,
        title: "Add Ethereum Bridge Support",
        description: "Implement cross-chain bridge for ETH and ERC-20 tokens",
        yesVotes: 8900000,
        noVotes: 6100000,
        totalVotes: 15000000,
        endTime: Date.now() + 86400000 * 5,
        status: "active"
    },
    {
        id: 3,
        title: "Increase Bot Revenue Share to 15%",
        description: "Share more trading profits with S-IO token holders",
        yesVotes: 14200000,
        noVotes: 1800000,
        totalVotes: 16000000,
        endTime: Date.now() + 86400000 * 2,
        status: "active"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    loadGovernanceData();
    setInterval(updateProposals, 30000);
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
        await loadUserData();
        if (window.updateSIODisplay) await window.updateSIODisplay();
    }, 1000);
}

function loadGovernanceData() {
    loadUserData();
    displayProposals();
}

async function loadUserData() {
    if (window.globalWallet && window.getSIOBalance) {
        // Get real S-IO balance
        const sioBalance = await window.getSIOBalance(window.globalWallet.toString());
        
        // Get staked amount from localStorage
        const savedStaking = localStorage.getItem(`sio-staking-${window.globalWallet.toString()}`);
        let stakedAmount = 0;
        if (savedStaking) {
            const data = JSON.parse(savedStaking);
            stakedAmount = data.staked || 0;
        }
        
        const votingPower = (stakedAmount / 25000000) * 100; // Total circulating supply
        
        document.getElementById('sio-balance').textContent = `${sioBalance.toLocaleString()} S-IO`;
        document.getElementById('staked-amount').textContent = `${stakedAmount.toLocaleString()} S-IO`;
        document.getElementById('voting-power').textContent = `${votingPower.toFixed(3)}%`;
    } else {
        document.getElementById('sio-balance').textContent = '0 S-IO';
        document.getElementById('staked-amount').textContent = '0 S-IO';
        document.getElementById('voting-power').textContent = '0%';
    }
}

function displayProposals() {
    const html = proposals.map(proposal => {
        const yesPercent = (proposal.yesVotes / proposal.totalVotes) * 100;
        const noPercent = (proposal.noVotes / proposal.totalVotes) * 100;
        const timeLeft = Math.max(0, proposal.endTime - Date.now());
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return `
            <div class="proposal-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="color: #00ff88; margin-bottom: 0.5rem;">${proposal.title}</h4>
                        <p style="color: #ccc; margin-bottom: 1rem;">${proposal.description}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #0066ff; font-size: 0.9rem;">${daysLeft}d ${hoursLeft}h left</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #00ff88;">Yes: ${yesPercent.toFixed(1)}%</span>
                        <span style="color: #ff4444;">No: ${noPercent.toFixed(1)}%</span>
                    </div>
                    <div class="vote-bar">
                        <div class="vote-progress" style="width: ${yesPercent}%;"></div>
                    </div>
                    <div style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                        ${proposal.totalVotes.toLocaleString()} S-IO voted
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button onclick="vote(${proposal.id}, true)" style="flex: 1; padding: 0.8rem; background: #00ff88; color: #000; border: none; border-radius: 4px; cursor: pointer;">Vote Yes</button>
                    <button onclick="vote(${proposal.id}, false)" style="flex: 1; padding: 0.8rem; background: #ff4444; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Vote No</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('proposals-list').innerHTML = html;
}

async function vote(proposalId, isYes) {
    if (!window.globalWallet) {
        alert('Please connect your wallet to vote');
        return;
    }
    
    // Check 1% minimum requirement
    const sioBalance = await window.getSIOBalance(window.globalWallet.toString());
    const totalSupply = await window.getSIOTotalSupply();
    const onePercent = totalSupply * 0.01;
    
    if (sioBalance < onePercent) {
        alert(`Minimum 1% of total supply (${onePercent.toLocaleString()} S-IO) required for voting`);
        return;
    }
    
    const voteAmount = prompt('Enter S-IO amount to vote with:');
    if (!voteAmount || parseFloat(voteAmount) <= 0) return;
    
    try {
        const response = await fetch('/api/governance/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proposal_id: proposalId.toString(),
                wallet: window.globalWallet.toString(),
                vote: isYes,
                amount: parseFloat(voteAmount)
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`${result.message}\nTransaction: ${result.transaction_id}`);
            loadGovernanceData(); // Refresh data
        } else {
            alert('Vote failed: ' + result.message);
        }
    } catch (error) {
        alert('Vote failed: ' + error.message);
    }
}

function createProposal() {
    if (!window.globalWallet) {
        alert('Please connect your wallet to create proposals');
        return;
    }
    
    const title = document.getElementById('proposal-title').value.trim();
    const description = document.getElementById('proposal-description').value.trim();
    
    if (!title || !description) {
        alert('Please fill in all fields');
        return;
    }
    
    const newProposal = {
        id: proposals.length + 1,
        title,
        description,
        yesVotes: 0,
        noVotes: 0,
        totalVotes: 0,
        endTime: Date.now() + 86400000 * 7,
        status: "active"
    };
    
    proposals.unshift(newProposal);
    displayProposals();
    
    document.getElementById('proposal-title').value = '';
    document.getElementById('proposal-description').value = '';
    
    alert('Proposal created successfully! Voting period: 7 days');
}

function updateProposals() {
    // Simulate ongoing voting
    proposals.forEach(proposal => {
        if (proposal.status === 'active' && Math.random() > 0.7) {
            const voteAmount = Math.random() * 1000;
            if (Math.random() > 0.5) {
                proposal.yesVotes += voteAmount;
            } else {
                proposal.noVotes += voteAmount;
            }
            proposal.totalVotes += voteAmount;
        }
    });
    
    displayProposals();
}