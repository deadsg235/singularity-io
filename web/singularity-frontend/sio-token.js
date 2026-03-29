/**
 * sio-token.js — S-IO token utilities (no backend required)
 */
const SIO_TOKEN_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
window.SIO_TOKEN_MINT = SIO_TOKEN_MINT;

async function getSIOBalance(walletAddress) {
    try {
        return await window.fetchSioBalance?.(walletAddress) ?? 0;
    } catch { return 0; }
}

async function getSIOPrice() {
    try {
        const r = await fetch('https://price.jup.ag/v6/price?ids=' + SIO_TOKEN_MINT);
        const d = await r.json();
        return d?.data?.[SIO_TOKEN_MINT]?.price ?? 0.001;
    } catch { return 0.001; }
}

async function getSIOTotalSupply() { return 1_000_000_000; }

async function updateSIODisplay() {
    if (!window.globalWallet) return;
    const balance = await getSIOBalance(window.globalWallet.toString());
    const price = await getSIOPrice();
    document.querySelectorAll('[id*="sio-balance"],[id*="s-io-balance"]').forEach(el => {
        el.textContent = balance.toLocaleString() + ' S-IO';
    });
    document.querySelectorAll('[id*="sio-value"]').forEach(el => {
        el.textContent = (balance * price).toFixed(2);
    });
    return { balance, price, value: balance * price };
}

function hasMinimumSIO(totalSupply = 1_000_000_000) {
    const cached = window._cachedBalances?.sio ?? 0;
    return cached >= totalSupply * 0.01;
}

window.getSIOBalance = getSIOBalance;
window.getSIOPrice = getSIOPrice;
window.getSIOTotalSupply = getSIOTotalSupply;
window.updateSIODisplay = updateSIODisplay;
window.hasMinimumSIO = hasMinimumSIO;
