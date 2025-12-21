// AI Trading Assistant
class TradingAssistant {
    constructor() {
        this.chatHistory = [];
        this.init();
    }

    init() {
        this.initChat();
        this.bindEvents();
    }

    initChat() {
        const chat = document.getElementById('trading-chat');
        chat.innerHTML = '';
        
        const welcome = document.createElement('div');
        welcome.className = 'chat-message system';
        welcome.innerHTML = `<span style="color: #dc2626;">╔═══════════════════════════════════════╗</span><br>
<span style="color: #dc2626;">║</span>  AI TRADING ASSISTANT v1.0           <span style="color: #dc2626;">║</span><br>
<span style="color: #dc2626;">╚═══════════════════════════════════════╝</span><br><br>
<span style="color: #666;">Connected to Solana Mainnet</span><br>
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

        // Simulate AI response
        await this.processCommand(message);
    }

    async processCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        // Simulate processing delay
        this.addMessage('assistant', 'Processing your request...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove processing message
        const chat = document.getElementById('trading-chat');
        chat.removeChild(chat.lastChild);

        let response = '';

        if (lowerCommand.includes('price') && lowerCommand.includes('sol')) {
            response = '📊 SOL Current Price: $185.42 (+2.3% 24h)\\n\\nMarket Cap: $87.2B\\nVolume: $2.1B\\nSupply: 470.8M SOL';
        } else if (lowerCommand.includes('buy') && lowerCommand.includes('sol')) {
            const amount = this.extractAmount(command);
            response = `🛒 Trade Preview:\\n\\nBuy ${amount} SOL\\nEstimated Cost: $${(amount * 185.42).toFixed(2)}\\nSlippage: 0.5%\\nFee: ~$0.25\\n\\n⚠️ Please confirm this trade in your wallet.`;
        } else if (lowerCommand.includes('portfolio') || lowerCommand.includes('balance')) {
            response = '💰 Your Portfolio:\\n\\nSOL: 2.45 ($454.28)\\nUSDC: 1,250.00\\nS-IO: 5,000 ($125.00)\\n\\nTotal Value: $1,829.28\\n24h Change: +$45.67 (+2.56%)';
        } else if (lowerCommand.includes('market') || lowerCommand.includes('trends')) {
            response = '📈 Market Analysis:\\n\\nSOL: Bullish trend, breaking resistance\\nBTC: Consolidating around $95k\\nETH: Following BTC movement\\n\\nSentiment: 72% Bullish\\nFear & Greed Index: 68 (Greed)';
        } else if (lowerCommand.includes('gainers')) {
            response = '🚀 Top Gainers (24h):\\n\\n1. BONK: +15.2%\\n2. JUP: +12.8%\\n3. RAY: +9.4%\\n4. ORCA: +7.1%\\n5. MNGO: +6.8%';
        } else if (lowerCommand.includes('alert')) {
            response = '🔔 Price Alert Set:\\n\\nAsset: SOL\\nTarget: $200\\nCurrent: $185.42\\n\\nYou\\'ll be notified when SOL reaches $200.';
        } else {
            response = 'I can help you with:\\n\\n• Trading commands ("buy", "sell", "swap")\\n• Price checks ("SOL price", "market data")\\n• Portfolio analysis ("show balance")\\n• Market insights ("trends", "gainers")\\n\\nTry asking me something specific!';
        }

        this.addMessage('assistant', response);
    }

    extractAmount(command) {
        const match = command.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : 0.1;
    }

    addMessage(role, text) {
        const chat = document.getElementById('trading-chat');
        const msg = document.createElement('div');
        msg.className = `chat-message ${role}`;
        
        if (role === 'user') {
            msg.innerHTML = `<span style="color: #fff;">> ${text}</span>`;
        } else if (role === 'assistant') {
            msg.innerHTML = `<span style="color: #dc2626;">AI:</span> <span style="color: #ccc;">${text.replace(/\\n/g, '<br>')}</span>`;
        }
        
        chat.appendChild(msg);
        chat.scrollTop = chat.scrollHeight;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TradingAssistant();
});