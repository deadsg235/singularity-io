/**
 * wallet-manager.js — Unified wallet state for Singularity.io v2.0
 * Supports Phantom; scaffold ready for multi-wallet expansion.
 */

class WalletManager {
  constructor() {
    this.publicKey  = null;
    this.connected  = false;
    this._listeners = {};
  }

  // ── Event emitter ─────────────────────────────────────────
  on(event, fn)  { (this._listeners[event] ??= []).push(fn); }
  off(event, fn) { this._listeners[event] = (this._listeners[event]||[]).filter(f=>f!==fn); }
  emit(event, data) { (this._listeners[event]||[]).forEach(fn => fn(data)); }

  // ── Connect ───────────────────────────────────────────────
  async connect() {
    if (!window.solana?.isPhantom) {
      throw new Error('Phantom wallet not found. Install it at phantom.app');
    }
    const resp = await window.solana.connect();
    this.publicKey = resp.publicKey.toString();
    this.connected = true;
    this._updateUI();
    this.emit('connect', { publicKey: this.publicKey });
    await this.loadBalances();
    return this.publicKey;
  }

  // ── Disconnect ────────────────────────────────────────────
  async disconnect() {
    await window.solana?.disconnect();
    this.publicKey = null;
    this.connected = false;
    this._updateUI();
    this.emit('disconnect');
  }

  // ── Load balances ─────────────────────────────────────────
  async loadBalances() {
    if (!this.publicKey) return;
    try {
      const res  = await fetch(`/api/sio/balance/${this.publicKey}`);
      const data = res.ok ? await res.json() : {};
      this._updateBalanceUI(data.sol ?? 0, data.balance ?? 0);
    } catch {
      this._updateBalanceUI(0, 0);
    }
  }

  // ── UI helpers ────────────────────────────────────────────
  _updateUI() {
    const btn     = document.getElementById('wallet-btn');
    const display = document.getElementById('balance-display');
    const wStatus = document.getElementById('wallet-status');
    const statWallet = document.getElementById('stat-wallet');

    if (this.connected) {
      const short = `${this.publicKey.slice(0,4)}…${this.publicKey.slice(-4)}`;
      if (btn)     { btn.textContent = short; btn.classList.add('connected'); }
      if (display) display.classList.remove('hidden');
      if (wStatus) { wStatus.textContent = 'Connected'; wStatus.className = 'status-value online'; }
      if (statWallet) statWallet.textContent = 'ONLINE';
    } else {
      if (btn)     { btn.textContent = 'Connect Wallet'; btn.classList.remove('connected'); }
      if (display) display.classList.add('hidden');
      if (wStatus) { wStatus.textContent = 'Not Connected'; wStatus.className = 'status-value offline'; }
      if (statWallet) statWallet.textContent = 'OFFLINE';
    }
  }

  _updateBalanceUI(sol, sio) {
    const solEl = document.getElementById('sol-balance');
    const sioEl = document.getElementById('sio-balance');
    if (solEl) solEl.textContent = Number(sol).toFixed(4);
    if (sioEl) sioEl.textContent = Number(sio).toLocaleString();
  }
}

window.walletManager = new WalletManager();

// ── Wire up buttons ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('wallet-btn');
  btn?.addEventListener('click', async () => {
    try {
      if (window.walletManager.connected) {
        await window.walletManager.disconnect();
        window.Toast?.info('Wallet disconnected');
      } else {
        await window.walletManager.connect();
        window.Toast?.success('Wallet connected');
      }
    } catch (err) {
      window.Toast?.error(err.message);
    }
  });

  document.getElementById('refresh-balance-btn')?.addEventListener('click', () => {
    window.walletManager.loadBalances();
  });
});
