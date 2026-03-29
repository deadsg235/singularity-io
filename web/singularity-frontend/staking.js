/**
 * staking.js — S-IO Token Staking (fully client-side, no backend)
 */
const BASE_APY = 24.5;
let stakingData = { balance: 0, staked: 0, rewards: 0, apy: BASE_APY };
let walletPubkey = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn')?.addEventListener('click', handleWalletClick);
    document.getElementById('refresh-balance-btn')?.addEventListener('click', () => {
        if (walletPubkey) window.loadWalletBalances?.(walletPubkey);
    });
    document.getElementById('max-stake-btn')?.addEventListener('click', () => {
        const el = document.getElementById('stake-amount');
        if (el) el.value = stakingData.balance.toFixed(2);
    });

    stakingData.apy = BASE_APY + (Math.random() - 0.5) * 2;
    const apyEl = document.getElementById('current-apy');
    if (apyEl) apyEl.textContent = `${stakingData.apy.toFixed(1)}%`;

    window.addEventListener('balanceUpdated', (e) => {
        const { sol, sio } = e.detail;
        stakingData.balance = sio;
        const el = document.getElementById('stake-sio-balance');
        if (el) el.textContent = `${sio.toLocaleString(undefined, { maximumFractionDigits: 2 })} S-IO`;
        const solEl = document.getElementById('sol-balance');
        if (solEl) solEl.textContent = sol.toFixed(4);
        const sioEl = document.getElementById('sio-balance');
        if (sioEl) sioEl.textContent = sio.toLocaleString(undefined, { maximumFractionDigits: 2 });
    });

    setInterval(tickRewards, 5000);
    setTimeout(syncWallet, 700);
});

window.addEventListener('walletConnected', syncWallet);
window.addEventListener('walletDisconnected', onDisconnect);

async function handleWalletClick() {
    if (walletPubkey) {
        await window.solana?.disconnect();
        onDisconnect();
    } else {
        if (!window.solana?.isPhantom) { alert('Install Phantom Wallet'); return; }
        try {
            const resp = await window.solana.connect();
            walletPubkey = resp.publicKey.toString();
            onConnect(walletPubkey);
        } catch (e) { alert('Connection failed: ' + e.message); }
    }
}

function syncWallet() {
    const pub = window.walletManager?.publicKey
        || window.walletAdapter?.getPublicKey?.()?.toString()
        || window.solana?.publicKey?.toString();
    if (pub && !walletPubkey) { walletPubkey = pub; onConnect(pub); }
}

function onConnect(pub) {
    walletPubkey = pub;
    const btn = document.getElementById('wallet-btn');
    if (btn) { btn.textContent = `${pub.slice(0,4)}…${pub.slice(-4)}`; btn.classList.add('connected'); }
    document.getElementById('balance-display')?.classList.remove('hidden');
    loadPosition();
    window.loadWalletBalances?.(pub);
}

function onDisconnect() {
    walletPubkey = null;
    const btn = document.getElementById('wallet-btn');
    if (btn) { btn.textContent = 'Connect Wallet'; btn.classList.remove('connected'); }
    document.getElementById('balance-display')?.classList.add('hidden');
    stakingData = { balance: 0, staked: 0, rewards: 0, apy: stakingData.apy };
    renderPosition();
}

function posKey() { return `sio-stake-${walletPubkey}`; }

function loadPosition() {
    if (!walletPubkey) return;
    const saved = localStorage.getItem(posKey());
    if (saved) {
        const p = JSON.parse(saved);
        stakingData.staked = p.staked || 0;
        stakingData.rewards = p.rewards || 0;
        const elapsed = (Date.now() - (p.savedAt || Date.now())) / 1000;
        const ratePerSec = (stakingData.apy / 100) / (365 * 24 * 3600);
        stakingData.rewards += stakingData.staked * ratePerSec * elapsed;
    }
    renderPosition();
}

function savePosition() {
    if (!walletPubkey) return;
    localStorage.setItem(posKey(), JSON.stringify({
        staked: stakingData.staked,
        rewards: stakingData.rewards,
        savedAt: Date.now()
    }));
}

function renderPosition() {
    const fmt = (n, d=2) => n.toLocaleString(undefined, { maximumFractionDigits: d });
    const el = (id) => document.getElementById(id);
    if (el('stake-sio-balance')) el('stake-sio-balance').textContent = `${fmt(stakingData.balance)} S-IO`;
    if (el('staked-amount')) el('staked-amount').textContent = `${fmt(stakingData.staked)} S-IO`;
    if (el('pending-rewards')) el('pending-rewards').textContent = `${fmt(stakingData.rewards, 6)} S-IO`;
    const daily = (stakingData.staked * stakingData.apy / 100) / 365;
    if (el('daily-rewards')) el('daily-rewards').textContent = `${fmt(daily, 4)} S-IO`;
}

function tickRewards() {
    if (!walletPubkey || stakingData.staked <= 0) return;
    const ratePerTick = (stakingData.apy / 100) / (365 * 24 * 720);
    stakingData.rewards += stakingData.staked * ratePerTick;
    const el = document.getElementById('pending-rewards');
    if (el) el.textContent = `${stakingData.rewards.toFixed(6)} S-IO`;
}

async function stakeTokens() {
    if (!walletPubkey) { alert('Connect your wallet first'); return; }
    const amount = parseFloat(document.getElementById('stake-amount')?.value);
    if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
    if (amount > stakingData.balance) { alert('Insufficient S-IO balance'); return; }

    const btn = document.querySelector('button[onclick="stakeTokens()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Staking…'; }
    try {
        stakingData.balance -= amount;
        stakingData.staked += amount;
        savePosition();
        renderPosition();
        const el = document.getElementById('stake-amount');
        if (el) el.value = '';
        showTxSuccess('Staked', amount, 'S-IO', 'sim_' + Math.random().toString(36).slice(2,14));
        window.Toast?.success?.(`Staked ${amount.toLocaleString()} S-IO`);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Stake S-IO'; }
    }
}

async function unstakeTokens() {
    if (!walletPubkey) { alert('Connect your wallet first'); return; }
    if (stakingData.staked <= 0) { alert('Nothing staked'); return; }
    const input = prompt(`Unstake amount (max ${stakingData.staked.toLocaleString(undefined,{maximumFractionDigits:2})} S-IO):`);
    const amount = parseFloat(input);
    if (!amount || amount <= 0) return;
    if (amount > stakingData.staked) { alert('Exceeds staked amount'); return; }
    stakingData.staked -= amount;
    stakingData.balance += amount;
    savePosition();
    renderPosition();
    showTxSuccess('Unstaked', amount, 'S-IO', 'sim_' + Math.random().toString(36).slice(2,14));
    window.Toast?.success?.(`Unstaked ${amount.toLocaleString()} S-IO`);
}

async function claimRewards() {
    if (!walletPubkey) { alert('Connect your wallet first'); return; }
    if (stakingData.rewards < 0.000001) { alert('No rewards to claim yet'); return; }
    const claimed = stakingData.rewards;
    stakingData.balance += claimed;
    stakingData.rewards = 0;
    savePosition();
    renderPosition();
    showTxSuccess('Claimed', claimed, 'S-IO', 'sim_' + Math.random().toString(36).slice(2,14));
    window.Toast?.success?.(`Claimed ${claimed.toFixed(6)} S-IO`);
}

function showTxSuccess(action, amount, symbol, sig) {
    const isSim = sig.startsWith('sim_');
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9999';
    d.innerHTML = `<div style="background:#141414;border:1px solid #dc2626;border-radius:12px;padding:2rem;max-width:360px;text-align:center;color:#f0f0f0">
        <div style="font-size:2.5rem;margin-bottom:.75rem">✅</div>
        <h3 style="color:#dc2626;margin-bottom:.75rem">${action} Successful</h3>
        <p style="font-size:1.1rem;margin-bottom:.5rem">${amount.toLocaleString(undefined,{maximumFractionDigits:6})} ${symbol}</p>
        ${isSim ? '<p style="color:#888;font-size:.8rem;margin:.5rem 0">Simulated — staking contract coming soon</p>'
                : `<a href="https://solscan.io/tx/${sig}" target="_blank" style="color:#60a5fa;font-size:.85rem;display:block;margin:.75rem 0">View on Solscan ↗</a>`}
        <button onclick="this.closest('div[style]').remove()" style="background:#dc2626;color:#fff;border:none;padding:.6rem 1.5rem;border-radius:6px;cursor:pointer;margin-top:.5rem">Close</button>
    </div>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 12000);
}
