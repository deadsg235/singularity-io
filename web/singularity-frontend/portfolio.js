/**
 * portfolio.js — fully client-side, no /api/* calls
 */

let walletPubkey = null;
let solBalance = 0;
let sioBalance = 0;
let solPrice = 0;
let sioPrice = 0;

const MOCK_HOLDINGS_EXTRA = [
    { symbol: 'RAY',  amount: 120,   price: 2.85,  change24h: -1.4 },
    { symbol: 'USDC', amount: 500,   price: 1.00,  change24h:  0.0 }
];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', handleWalletClick);

    window.addEventListener('balanceUpdated', (e) => {
        solBalance = e.detail.sol;
        sioBalance = e.detail.sio;
        buildHoldings();
    });

    drawPerformanceChart();
    loadTransactions();
    fetchPrices();
    setInterval(fetchPrices, 30000);

    // Auto-connect if Phantom already trusted
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
        solBalance = 0;
        sioBalance = 0;
        const btn = document.getElementById('wallet-btn');
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        document.getElementById('balance-display').classList.add('hidden');
        buildHoldings();
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
}

async function fetchPrices() {
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const d = await r.json();
        solPrice = d?.solana?.usd || solPrice;
    } catch {}

    try {
        const r = await fetch('https://price.jup.ag/v6/price?ids=Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump');
        const d = await r.json();
        sioPrice = d?.data?.['Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump']?.price || sioPrice;
    } catch {}

    buildHoldings();
}

function buildHoldings() {
    const holdings = [];

    if (walletPubkey) {
        holdings.push({ symbol: 'SOL',  amount: solBalance, price: solPrice,  change24h: (Math.random()-0.3)*6 });
        holdings.push({ symbol: 'S-IO', amount: sioBalance, price: sioPrice,  change24h: (Math.random()-0.3)*8 });
    }

    MOCK_HOLDINGS_EXTRA.forEach(h => holdings.push({ ...h, value: h.amount * h.price }));

    holdings.forEach(h => { if (!h.value) h.value = h.amount * h.price; });

    const totalValue = holdings.reduce((s, h) => s + h.value, 0);
    const dailyChangeDollar = holdings.reduce((s, h) => s + h.value * (h.change24h / 100), 0);
    const dailyChangePct = totalValue > 0 ? (dailyChangeDollar / totalValue) * 100 : 0;

    document.getElementById('total-value').textContent = `$${totalValue.toLocaleString(undefined, {maximumFractionDigits:2})}`;
    const dcEl = document.getElementById('daily-change');
    dcEl.textContent = `${dailyChangePct >= 0 ? '+' : ''}${dailyChangePct.toFixed(2)}%`;
    dcEl.style.color = dailyChangePct >= 0 ? '#00ff88' : '#ff4444';
    document.getElementById('asset-count').textContent = holdings.length;
    const pnlEl = document.getElementById('total-pnl');
    pnlEl.textContent = `${dailyChangeDollar >= 0 ? '+' : ''}$${Math.abs(dailyChangeDollar).toFixed(2)}`;
    pnlEl.style.color = dailyChangeDollar >= 0 ? '#00ff88' : '#ff4444';

    displayHoldings(holdings);
}

function displayHoldings(holdings) {
    const html = holdings.map(h => `
        <div class="asset-row">
            <div>
                <div style="color:#fff;font-weight:bold;">${h.symbol}</div>
                <div style="color:#666;font-size:.9rem;">${h.amount.toLocaleString(undefined,{maximumFractionDigits:4})}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:#fff;">$${h.value.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                <div style="color:${h.change24h >= 0 ? '#00ff88' : '#ff4444'};font-size:.9rem;">
                    ${h.change24h >= 0 ? '+' : ''}${h.change24h.toFixed(2)}%
                </div>
            </div>
        </div>`).join('');
    document.getElementById('holdings-list').innerHTML = html || '<p style="color:#666;text-align:center;">Connect wallet to see holdings</p>';
}

function loadTransactions() {
    let txs = [];
    try {
        const saved = localStorage.getItem('recent-swaps');
        if (saved) {
            const swaps = JSON.parse(saved);
            txs = swaps.slice(0, 5).map(s => ({
                type: 'SWAP', symbol: `${s.from} → ${s.to}`, amount: '', price: '', time: s.time,
                sig: s.signature
            }));
        }
    } catch {}

    if (!txs.length) {
        txs = [
            { type: 'BUY',  symbol: 'SOL',      amount: '2.5',  price: '$188.50', time: '2h ago',  sig: null },
            { type: 'SELL', symbol: 'RAY',       amount: '50',   price: '$3.45',   time: '5h ago',  sig: null },
            { type: 'SWAP', symbol: 'USDC→SOL',  amount: '500',  price: '$187.20', time: '1d ago',  sig: null }
        ];
    }

    const html = txs.map(tx => {
        const color = tx.type === 'BUY' ? '#00ff88' : tx.type === 'SELL' ? '#ff8800' : '#0066ff';
        const link = tx.sig
            ? `<a href="https://solscan.io/tx/${tx.sig}" target="_blank" style="color:#dc2626;font-size:.8rem;">[tx]</a>`
            : '';
        return `
            <div style="display:flex;justify-content:space-between;padding:1rem 0;border-bottom:1px solid #333;">
                <div>
                    <span style="color:${color};font-weight:bold;">${tx.type}</span>
                    <span style="color:#fff;margin-left:1rem;">${tx.symbol}</span>
                    ${link}
                </div>
                <div style="text-align:right;">
                    <div style="color:#fff;">${tx.amount}${tx.price ? ' @ ' + tx.price : ''}</div>
                    <div style="color:#666;font-size:.9rem;">${tx.time}</div>
                </div>
            </div>`;
    }).join('');
    document.getElementById('transactions-list').innerHTML = html;
}

function drawPerformanceChart() {
    const canvas = document.getElementById('performance-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const base = 5000;
    const data = Array.from({length: 30}, (_, i) =>
        base + Math.sin(i * 0.3) * 600 + Math.random() * 300 + i * 40);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(220,38,38,0.3)');
    grad.addColorStop(1, 'rgba(220,38,38,0.02)');

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const range = maxV - minV || 1;

    const toX = i => (i / (data.length - 1)) * canvas.width;
    const toY = v => canvas.height - ((v - minV) / range) * (canvas.height - 20) - 10;

    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
}
