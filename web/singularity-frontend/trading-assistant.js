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
        this.getWalletAddress();
    }

    getWalletAddress() {
        this.walletAddress = localStorage.getItem('walletAddress');
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

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: `Trading Assistant: ${message}`, 
                    wallet: this.walletAddress,
                    history: this.chatHistory 
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                this.addMessage('assistant', data.response || `Error ${response.status}`);
            } else {
                const resp = data.response;
                this.addMessage('assistant', resp);
                this.chatHistory.push({ user: message, assistant: resp });
            }
        } catch (error) {
            console.error('Trading chat error:', error);
            this.addMessage('assistant', `Connection error: ${error.message}`);
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