// AI Trading Assistant with LLM Backend
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : '';

class TradingAssistant {
    constructor() {
        this.chatHistory = [];
        this.walletAddress = null;
        this.init();
    }

    init() {
        this.initChat();
        this.bindEvents();
        this._syncWallet();

        // Stay in sync with wallet events
        window.addEventListener('walletConnected', (e) => {
            this._syncWallet();
            const pub = e.detail && e.detail.publicKey;
            if (pub) this._appendSystem('Wallet connected: ' + pub.slice(0, 8) + '…' + pub.slice(-4));
        });
        window.addEventListener('walletDisconnected', () => {
            this._syncWallet();
            this._appendSystem('Wallet disconnected.');
        });
        window.addEventListener('balanceUpdated', () => { this._syncWallet(); });
    }

    _syncWallet() {
        // Read from walletManager (canonical) → globalWallet → solana → localStorage
        this.walletAddress = window.walletManager?.publicKey
            || (window.globalWallet && window.globalWallet.publicKey.toString())
            || window.solana?.publicKey?.toString()
            || localStorage.getItem('walletAddress')
            || null;

        const bal = window._cachedBalances;
        this.solBalance = bal ? bal.sol : 0;
        this.sioBalance = bal ? bal.sio : 0;
    }

    _appendSystem(text) {
        const chat = document.getElementById('trading-chat');
        if (!chat) return;
        const el = document.createElement('div');
        el.className = 'chat-message system';
        el.innerHTML = '<span style="color:#555;">[SYS]</span> <span style="color:#888;">' + text + '</span>';
        chat.appendChild(el);
        chat.scrollTop = chat.scrollHeight;
    }

    initChat() {
        const chat = document.getElementById('trading-chat');
        chat.innerHTML = '';
        
        const welcome = document.createElement('div');
        welcome.className = 'chat-message system';
        welcome.innerHTML = `<span style="color: #dc2626;">╔═══════════════════════════════════════╗</span><br>
<span style="color: #dc2626;">║</span>  AI TRADING ASSISTANT v1.0           <span style="color: #dc2626;">║</span><br>
<span style="color: #dc2626;">╚═══════════════════════════════════════╝</span><br><br>
<span style="color: #666;">Connected to Groq Llama 3.3 70B</span><br>
<span style="color: #666;">Try commands like:</span><br>
<span style="color: #dc2626;">• "Buy 0.1 SOL"</span><br>
<span style="color: #dc2626;">• "What's the SOL price?"</span><br>
<span style="color: #dc2626;">• "Show my portfolio"</span><br><br>
<span style="color: #ef4444;">Ready for trading ></span>`;
        chat.appendChild(welcome);

        // Fetch DQN signal asynchronously and append to chat
        this.getDQNSignal().then(signal => {
            if (!signal) return;
            const sigEl = document.createElement('div');
            sigEl.className = 'chat-message assistant';
            sigEl.innerHTML = `<span style="color:#dc2626;">DQN Signal:</span> <span style="color:${signal.color};font-weight:700">${signal.actionLabel}</span> <span style="color:#888;font-size:.85rem">(${(signal.confidence*100).toFixed(0)}% confidence · ${signal.source})</span>`;
            chat.appendChild(sigEl);
        });
    }

    async getDQNSignal() {
        try {
            await window.dqnReady;
            if (!window.dqnInfer) return null;
            const solPrice = window._cachedSolPrice || 150;
            const result = await window.dqnInfer({
                price: solPrice,
                volume: 500_000_000,
                rsi: 45 + Math.random() * 30,
                macd: (Math.random() - 0.5) * 3,
                bbUpper: solPrice * 1.04,
                bbLower: solPrice * 0.96,
                solTps: 3200,
                walletBalance: (window._cachedBalances && window._cachedBalances.sol) || 0
            });
            return result;
        } catch { return null; }
    }

    bindEvents() {
        const input = document.getElementById('trading-input');
        const sendBtn = document.getElementById('trading-send');
        const quickActions = document.querySelectorAll('.quick-action');

        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        quickActions.forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.dataset.command;
                input.value = command;
                this.sendMessage();
            });
        });
    }

    async sendMessage() {
        const input = document.getElementById('trading-input');
        const message = input.value.trim();
        if (!message) return;

        this.addMessage('user', message);
        input.value = '';

        const system = 'You are an AI trading assistant for the Singularity.io platform on Solana. ' +
            'Help users with trading decisions, market analysis, and DeFi strategies. ' +
            (this.walletAddress
                ? 'Connected wallet: ' + this.walletAddress + '. ' +
                  'SOL balance: ' + (this.solBalance || 0).toFixed(4) + ' SOL. ' +
                  'S-IO balance: ' + (this.sioBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' S-IO. '
                : 'No wallet connected. ') +
            'Be concise and actionable. Focus on Solana/DeFi trading.';

        const messages = [
            ...this.chatHistory.map(h => ([
                { role: 'user', content: h.user },
                { role: 'assistant', content: h.assistant }
            ])).flat(),
            { role: 'user', content: `Trading Assistant: ${message}` }
        ];

        // Create streaming element
        const chat = document.getElementById('trading-chat');
        const msg = document.createElement('div');
        msg.className = 'chat-message assistant';
        msg.innerHTML = `<span style="color: #dc2626;">AI:</span> <span style="color: #ccc;"></span>`;
        chat.appendChild(msg);
        const textSpan = msg.querySelector('span:last-child');

        try {
            const resp = await window.groqChat(messages, {
                system,
                onChunk: (text) => {
                    textSpan.textContent += text;
                    chat.scrollTop = chat.scrollHeight;
                }
            });
            this.chatHistory.push({ user: message, assistant: resp });
        } catch (error) {
            textSpan.textContent = `Error: ${error.message}`;
        }
    }

    addMessage(role, text) {
        const chat = document.getElementById('trading-chat');
        const msg = document.createElement('div');
        msg.className = `chat-message ${role}`;
        
        if (role === 'user') {
            msg.innerHTML = `<span style="color: #fff;">> ${text}</span>`;
        } else if (role === 'assistant') {
            msg.innerHTML = `<span style="color: #dc2626;">AI:</span> <span style="color: #ccc;">${text}</span>`;
        }
        
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TradingAssistant();
});