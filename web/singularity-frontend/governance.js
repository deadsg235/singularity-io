/**
 * governance.js — fully client-side, no /api/* calls
 */

let walletPubkey = null;
let sioBalanceCached = 0;

const DEFAULT_PROPOSALS = [
    {
        id: 1,
        title: 'Reduce Trading Fees to 0.05%',
        description: 'Lower trading fees to increase volume and competitiveness',
        yesVotes: 12500000,
        noVotes: 3200000,
        endTime: Date.now() + 86400000 * 3,
        status: 'active'
    },
    {
        id: 2,
        title: 'Add Ethereum Bridge Support',
        description: 'Implement cross-chain bridge for ETH and ERC-20 tokens',
        yesVotes: 8900000,
        noVotes: 6100000,
        endTime: Date.now() + 86400000 * 5,
        status: 'active'
    },
    {
        id: 3,
        title: 'Increase Bot Revenue Share to 15%',
        description: 'Share more trading profits with S-IO token holders',
        yesVotes: 14200000,
        noVotes: 1800000,
        endTime: Date.now() + 86400000 * 2,
        status: 'active'
    }
];

let proposals = loadProposals();

function loadProposals() {
    try {
        const saved = localStorage.getItem('gov-proposals');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge: keep defaults by id, append any user-created ones
            const merged = [...DEFAULT_PROPOSALS];
            parsed.forEach(p => {
                if (!merged.find(m => m.id === p.id)) merged.push(p);
            });
            return merged;
        }
    } catch {}
    return [...DEFAULT_PROPOSALS];
}

function saveProposals() {
    localStorage.setItem('gov-proposals', JSON.stringify(proposals));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);

    window.addEventListener('balanceUpdated', (e) => {
        sioBalanceCached = e.detail.sio;
        updateUserPanel();
    });

    displayProposals();
    setInterval(tickProposals, 30000);

    // Auto-connect
    setTimeout(async () => {
        if (window.solana?.isPhantom) {
            try {
                const r = await window.solana.connect({ onlyIfTrusted: true });
                walletPubkey = r.publicKey.toString();
                onConnect(walletPubkey);
            } catch {}
        }
    }, 600);
});

async function handleWalletClick() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        walletPubkey = null;
        sioBalanceCached = 0;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        document.getElementById('balance-display').classList.add('hidden');
        updateUserPanel();
        return;
    }
    if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
    try {
        const r = await window.solana.connect();
        walletPubkey = r.publicKey.toString();
        onConnect(walletPubkey);
    } catch (e) { console.error(e); }
}

function onConnect(pub) {
    const btn = document.getElementById('wallet-btn');
    btn.textContent = `${pub.slice(0,4)}...${pub.slice(-4)}`;
    btn.classList.add('connected');
    document.getElementById('balance-display').classList.remove('hidden');
    window.loadWalletBalances(pub);
    updateUserPanel();
}

function getStakedAmount() {
    if (!walletPubkey) return 0;
    try {
        const raw = localStorage.getItem(`sio-stake-${walletPubkey}`);
        if (raw) return JSON.parse(raw).staked || 0;
    } catch {}
    // Also try the staking.js key format
    try {
        const raw2 = localStorage.getItem(`sio-staking-${walletPubkey}`);
        if (raw2) return JSON.parse(raw2).staked || 0;
    } catch {}
    return 0;
}

function updateUserPanel() {
    const staked = getStakedAmount();
    const votingPower = (staked / 25_000_000) * 100;
    document.getElementById('sio-balance').textContent = `${sioBalanceCached.toLocaleString(undefined,{maximumFractionDigits:2})} S-IO`;
    document.getElementById('staked-amount').textContent = `${staked.toLocaleString()} S-IO`;
    document.getElementById('voting-power').textContent = `${votingPower.toFixed(3)}%`;
}

function displayProposals() {
    const html = proposals.map(proposal => {
        const total = proposal.yesVotes + proposal.noVotes || 1;
        const yesPercent = (proposal.yesVotes / total) * 100;
        const noPercent  = (proposal.noVotes  / total) * 100;
        const timeLeft   = Math.max(0, proposal.endTime - Date.now());
        const daysLeft   = Math.floor(timeLeft / 86400000);
        const hoursLeft  = Math.floor((timeLeft % 86400000) / 3600000);

        // Check if user already voted
        let userVote = null;
        if (walletPubkey) {
            try {
                const votes = JSON.parse(localStorage.getItem(`gov-votes-${walletPubkey}`) || '{}');
                userVote = votes[proposal.id];
            } catch {}
        }

        const votedBadge = userVote !== undefined && userVote !== null
            ? `<span style="color:${userVote ? '#00ff88' : '#ff4444'};font-size:.85rem;margin-left:.5rem;">(You voted ${userVote ? 'Yes' : 'No'})</span>`
            : '';

        return `
            <div class="proposal-card" style="background:rgba(15,15,15,0.92);border:1px solid rgba(220,38,38,0.4);border-radius:8px;padding:1.5rem;margin-bottom:1rem;backdrop-filter:blur(10px);">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
                    <div>
                        <h4 style="color:#00ff88;margin-bottom:.5rem;">${proposal.title}${votedBadge}</h4>
                        <p style="color:#ccc;margin-bottom:.5rem;">${proposal.description}</p>
                    </div>
                    <div style="text-align:right;white-space:nowrap;">
                        <div style="color:#0066ff;font-size:.9rem;">${daysLeft}d ${hoursLeft}h left</div>
                    </div>
                </div>
                <div style="margin-bottom:1rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;">
                        <span style="color:#00ff88;">Yes: ${yesPercent.toFixed(1)}%</span>
                        <span style="color:#ff4444;">No: ${noPercent.toFixed(1)}%</span>
                    </div>
                    <div class="vote-bar">
                        <div class="vote-progress" style="width:${yesPercent}%;"></div>
                    </div>
                    <div style="color:#666;font-size:.9rem;margin-top:.5rem;">
                        ${(proposal.yesVotes + proposal.noVotes).toLocaleString()} S-IO voted
                    </div>
                </div>
                <div style="display:flex;gap:1rem;">
                    <button onclick="vote(${proposal.id}, true)"  style="flex:1;padding:.8rem;background:#00ff88;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Vote Yes</button>
                    <button onclick="vote(${proposal.id}, false)" style="flex:1;padding:.8rem;background:#ff4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Vote No</button>
                </div>
            </div>`;
    }).join('');

    document.getElementById('proposals-list').innerHTML = html;
}

function vote(proposalId, isYes) {
    if (!walletPubkey) {
        alert('Please connect your wallet to vote');
        return;
    }

    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    // Load existing votes
    let votes = {};
    try { votes = JSON.parse(localStorage.getItem(`gov-votes-${walletPubkey}`) || '{}'); } catch {}

    if (votes[proposalId] !== undefined) {
        alert('You have already voted on this proposal.');
        return;
    }

    // Use staked amount as vote weight (minimum 1 for display)
    const staked = getStakedAmount();
    const weight = staked > 0 ? staked : 1000;

    if (isYes) {
        proposal.yesVotes += weight;
    } else {
        proposal.noVotes += weight;
    }

    votes[proposalId] = isYes;
    localStorage.setItem(`gov-votes-${walletPubkey}`, JSON.stringify(votes));
    saveProposals();
    displayProposals();

    // Toast
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:rgba(15,15,15,0.95);border:1px solid rgba(220,38,38,0.6);color:#fff;padding:1rem 1.5rem;border-radius:8px;z-index:9999;font-family:Inter,sans-serif;';
    toast.textContent = `✅ Vote recorded: ${isYes ? 'Yes' : 'No'} on "${proposal.title}"`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function createProposal() {
    if (!walletPubkey) {
        alert('Please connect your wallet to create proposals');
        return;
    }

    const title = document.getElementById('proposal-title').value.trim();
    const description = document.getElementById('proposal-description').value.trim();

    if (!title || !description) {
        alert('Please fill in all fields');
        return;
    }

    const newId = Math.max(...proposals.map(p => p.id), 0) + 1;
    const newProposal = {
        id: newId,
        title,
        description,
        yesVotes: 0,
        noVotes: 0,
        endTime: Date.now() + 86400000 * 7,
        status: 'active'
    };

    proposals.unshift(newProposal);
    saveProposals();
    displayProposals();

    document.getElementById('proposal-title').value = '';
    document.getElementById('proposal-description').value = '';

    alert('Proposal created! Voting period: 7 days');
}

function tickProposals() {
    // Simulate small ongoing vote trickle
    proposals.forEach(p => {
        if (p.status === 'active' && Math.random() > 0.6) {
            const amt = Math.random() * 500;
            if (Math.random() > 0.5) p.yesVotes += amt; else p.noVotes += amt;
        }
    });
    displayProposals();
}
