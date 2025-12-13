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

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com',
    'https://api.mainnet.solana.com'
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
    document.getElementById('wallet-btn').classList.add('connected');
    if (window.setWalletConnected) window.setWalletConnected(true);
    
    // Show balance display and load balances
    document.getElementById('balance-display').classList.remove('hidden');
    loadWalletBalances();
    
    // Wait for S-IO functions to be available
    setTimeout(async () => {
        await loadUserData();
        if (window.updateSIODisplay) await window.updateSIODisplay();
    }, 1000);
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
            const mint = new solanaWeb3.PublicKey('Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump');

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

            document.getElementById('header-sio-balance').textContent =
                sioBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 6
                });

            console.log('Balances loaded', {
                sol: solBalance,
                sio: sioBalance,
                endpoint: endpoint
            });

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
    document.getElementById('header-sio-balance').textContent = '—';

    console.warn('⚠️ Unable to load balances (all RPC endpoints busy). Try again in a few minutes.');
}

function loadGovernanceData() {
    loadUserData();
    displayProposals();
}

async function loadUserData() {
    if (window.globalWallet) {
        try {
            // Get real wallet analytics
            const response = await fetch(`/api/wallet/analytics/${window.globalWallet.toString()}`);
            const data = await response.json();
            
            const solBalance = data.sol_balance;
            const sioBalance = data.sio_balance;
            
            // Get staked amount from localStorage
            const savedStaking = localStorage.getItem(`sio-staking-${window.globalWallet.toString()}`);
            let stakedAmount = 0;
            if (savedStaking) {
                const stakingInfo = JSON.parse(savedStaking);
                stakedAmount = stakingInfo.staked || 0;
            }
            
            const votingPower = (stakedAmount / 25000000) * 100;
            
            // Update body balances
            document.getElementById('sio-balance').textContent = `${sioBalance.toLocaleString()} S-IO`;
            document.getElementById('staked-amount').textContent = `${stakedAmount.toLocaleString()} S-IO`;
            document.getElementById('voting-power').textContent = `${votingPower.toFixed(3)}%`;

            // Update header balances
            document.getElementById('sol-balance').textContent = solBalance.toFixed(4);
            document.getElementById('header-sio-balance').textContent = sioBalance.toLocaleString();
            document.getElementById('balance-display').style.display = 'flex';

        } catch (error) {
            console.error('Failed to load governance data:', error);
            document.getElementById('sio-balance').textContent = '0 S-IO';
            document.getElementById('staked-amount').textContent = '0 S-IO';
            document.getElementById('voting-power').textContent = '0%';
        }
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