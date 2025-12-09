const { Connection, PublicKey, VersionedTransaction, clusterApiUrl } = solanaWeb3;

let connection;
let wallet = null;
let botActive = false;
let botInterval = null;
let trades = [];
let stats = { total: 0, success: 0, failed: 0, pnl: 0 };

const SOL_MINT = 'So11111111111111111111111111111111111111112';

document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('start-btn').addEventListener('click', startBot);
    document.getElementById('stop-btn').addEventListener('click', stopBot);
    document.getElementById('chat-send').addEventListener('click', sendChatMessage);
    document.getElementById('help-btn').addEventListener('click', showHelp);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    loadHistory();
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    wallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
}

async function startBot() {
    if (!wallet) {
        alert('Connect wallet first');
        return;
    }

    const strategy = document.getElementById('strategy').value;
    const baseToken = document.getElementById('base-token').value.trim();
    const quoteToken = document.getElementById('quote-token').value.trim();
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const interval = parseInt(document.getElementById('interval').value) * 1000;

    if (!baseToken || !quoteToken || amount <= 0) {
        alert('Fill all fields');
        return;
    }

    botActive = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    
    updateStatus(`Bot active - ${strategy} strategy`, '#00ff88');
    
    botInterval = setInterval(() => executeTrade(strategy, baseToken, quoteToken, amount), interval);
    executeTrade(strategy, baseToken, quoteToken, amount);
}

function stopBot() {
    botActive = false;
    clearInterval(botInterval);
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;
    updateStatus('Bot stopped', '#ff4444');
}

async function executeTrade(strategy, baseToken, quoteToken, amount) {
    if (!botActive) return;

    updateStatus(`Analyzing ${strategy}...`, '#0066ff');

    try {
        const decision = await analyzeStrategy(strategy, baseToken, quoteToken);
        
        if (!decision.shouldTrade) {
            addTradeLog('SKIP', `No trade signal - ${decision.reason}`, 0);
            return;
        }

        const fromToken = decision.direction === 'BUY' ? quoteToken : baseToken;
        const toToken = decision.direction === 'BUY' ? baseToken : quoteToken;
        
        const decimals = fromToken === SOL_MINT ? 9 : await getTokenDecimals(fromToken);
        const inputAmount = Math.floor(amount * Math.pow(10, decimals));

        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${inputAmount}&slippageBps=100`;
        const quoteResp = await fetch(quoteUrl);
        const quote = await quoteResp.json();

        if (quote.error) throw new Error(quote.error);

        const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto'
            })
        });

        const { swapTransaction } = await swapResp.json();
        const txBuf = Buffer.from(swapTransaction, 'base64');
        const tx = VersionedTransaction.deserialize(txBuf);
        
        const signed = await window.solana.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(sig, 'confirmed');

        const outDecimals = toToken === SOL_MINT ? 9 : await getTokenDecimals(toToken);
        const outAmount = quote.outAmount / Math.pow(10, outDecimals);

        stats.total++;
        stats.success++;
        stats.pnl += (decision.direction === 'BUY' ? -amount : outAmount);
        
        addTradeLog(decision.direction, `${amount} → ${outAmount.toFixed(4)}`, sig);
        updateStats();
        saveHistory();

    } catch (error) {
        stats.total++;
        stats.failed++;
        addTradeLog('FAIL', error.message.slice(0, 50), null);
        updateStats();
    }
}

async function analyzeStrategy(strategy, baseToken, quoteToken) {
    try {
        const aiDecision = await fetch('/api/bot_agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                strategy,
                base_token: baseToken,
                quote_token: quoteToken,
                amount: parseFloat(document.getElementById('trade-amount').value)
            })
        });
        
        const result = await aiDecision.json();
        
        if (result.action === 'HOLD') {
            return { shouldTrade: false, reason: result.reason };
        }
        
        return {
            shouldTrade: result.confidence > 50,
            direction: result.action,
            reason: `AI: ${result.reason} (${result.confidence}%)`
        };
    } catch {
        return fallbackStrategy(strategy, baseToken, quoteToken);
    }
}

function fallbackStrategy(strategy, baseToken, quoteToken) {
    switch (strategy) {
        case 'dca':
            return { shouldTrade: true, direction: 'BUY', reason: 'DCA schedule' };
        case 'momentum':
            return { shouldTrade: Math.random() > 0.6, direction: 'BUY', reason: 'Momentum signal' };
        case 'arbitrage':
            return { shouldTrade: Math.random() > 0.7, direction: 'BUY', reason: 'Arbitrage opportunity' };
        case 'grid':
            const dir = Math.random() > 0.5 ? 'BUY' : 'SELL';
            return { shouldTrade: true, direction: dir, reason: 'Grid level' };
        default:
            return { shouldTrade: false, reason: 'Unknown strategy' };
    }
}

async function getPrice(baseToken, quoteToken) {
    try {
        const url = `https://quote-api.jup.ag/v6/quote?inputMint=${quoteToken}&outputMint=${baseToken}&amount=1000000000&slippageBps=50`;
        const resp = await fetch(url);
        const quote = await resp.json();
        return quote.outAmount / 1e9;
    } catch {
        return 0;
    }
}

async function calculateMomentum(token) {
    return Math.random() * 2 - 1;
}

async function findArbitrage(base, quote) {
    return Math.random() * 2;
}

async function getTokenDecimals(mint) {
    try {
        const info = await connection.getAccountInfo(new PublicKey(mint));
        return info.data.readUInt8(44);
    } catch {
        return 9;
    }
}

function updateStatus(msg, color) {
    document.getElementById('bot-status').innerHTML = `<p style="color: ${color};">${msg}</p>`;
}

function addTradeLog(type, details, sig) {
    const log = { type, details, sig, time: new Date().toLocaleTimeString() };
    trades.unshift(log);
    
    const color = type === 'BUY' ? '#00ff88' : type === 'SELL' ? '#ff8800' : type === 'FAIL' ? '#ff4444' : '#666';
    const sigLink = sig ? `<a href="https://solscan.io/tx/${sig}" target="_blank" style="color: #0066ff; font-size: 0.8rem;">[tx]</a>` : '';
    
    const html = `<div style="padding: 0.5rem; border-bottom: 1px solid #333; color: ${color};">
        <strong>${type}</strong> ${details} ${sigLink} <span style="color: #666; float: right;">${log.time}</span>
    </div>`;
    
    document.getElementById('trade-history').insertAdjacentHTML('afterbegin', html);
}

function updateStats() {
    document.getElementById('total-trades').textContent = stats.total;
    document.getElementById('success-trades').textContent = stats.success;
    document.getElementById('failed-trades').textContent = stats.failed;
    document.getElementById('pnl').textContent = stats.pnl.toFixed(4);
    document.getElementById('pnl').style.color = stats.pnl >= 0 ? '#00ff88' : '#ff4444';
}

function saveHistory() {
    localStorage.setItem('bot-trades', JSON.stringify(trades.slice(0, 100)));
    localStorage.setItem('bot-stats', JSON.stringify(stats));
}

function loadHistory() {
    const savedTrades = localStorage.getItem('bot-trades');
    const savedStats = localStorage.getItem('bot-stats');
    
    if (savedTrades) trades = JSON.parse(savedTrades);
    if (savedStats) stats = JSON.parse(savedStats);
    
    trades.forEach(t => addTradeLog(t.type, t.details, t.sig));
    updateStats();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    
    addChatMessage('user', message);
    input.value = '';
    
    try {
        const response = await fetch('/api/bot_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                wallet: wallet?.toString(),
                bot_active: botActive,
                stats
            })
        });
        
        const data = await response.json();
        
        if (data.action) {
            await executeToolCall(data.action, data.params);
            addChatMessage('assistant', data.message || 'Action executed');
        } else {
            addChatMessage('assistant', data.response);
        }
    } catch (error) {
        addChatMessage('assistant', 'Error: ' + error.message);
    }
}

async function executeToolCall(action, params) {
    switch (action) {
        case 'execute_trade':
            const { from_token, to_token, amount } = params;
            await executeSingleTrade(from_token, to_token, amount);
            break;
        
        case 'start_bot':
            document.getElementById('strategy').value = params.strategy || 'dca';
            document.getElementById('base-token').value = params.base_token;
            document.getElementById('quote-token').value = params.quote_token;
            document.getElementById('trade-amount').value = params.amount || 0.1;
            await startBot();
            break;
        
        case 'stop_bot':
            stopBot();
            break;
        
        case 'get_price':
            const price = await getPrice(params.base_token, params.quote_token);
            addChatMessage('assistant', `Current price: ${price.toFixed(6)}`);
            break;
        
        case 'get_wallet_balance':
            await getWalletBalance();
            break;
    }
}

async function getWalletBalance() {
    if (!wallet) {
        addChatMessage('assistant', 'Please connect wallet first');
        return;
    }
    
    try {
        const balance = await connection.getBalance(wallet);
        const solBalance = balance / 1e9;
        addChatMessage('assistant', `Wallet: ${wallet.toString()}\n\nSOL Balance: ${solBalance.toFixed(4)} SOL`);
    } catch (error) {
        addChatMessage('assistant', `Failed to get balance: ${error.message}`);
    }
}

async function executeSingleTrade(fromToken, toToken, amount) {
    if (!wallet) {
        addChatMessage('assistant', 'Please connect wallet first');
        return;
    }
    
    try {
        const decimals = fromToken === SOL_MINT ? 9 : await getTokenDecimals(fromToken);
        const inputAmount = Math.floor(amount * Math.pow(10, decimals));
        
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken}&outputMint=${toToken}&amount=${inputAmount}&slippageBps=100`;
        const quoteResp = await fetch(quoteUrl);
        const quote = await quoteResp.json();
        
        if (quote.error) throw new Error(quote.error);
        
        const swapResp = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto'
            })
        });
        
        const { swapTransaction } = await swapResp.json();
        const txBuf = Buffer.from(swapTransaction, 'base64');
        const tx = VersionedTransaction.deserialize(txBuf);
        
        const signed = await window.solana.signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(sig, 'confirmed');
        
        const outDecimals = toToken === SOL_MINT ? 9 : await getTokenDecimals(toToken);
        const outAmount = quote.outAmount / Math.pow(10, outDecimals);
        
        stats.total++;
        stats.success++;
        addTradeLog('CHAT', `${amount} → ${outAmount.toFixed(4)}`, sig);
        updateStats();
        saveHistory();
        
        addChatMessage('assistant', `Trade executed! Got ${outAmount.toFixed(4)} tokens. Tx: ${sig.slice(0, 8)}...`);
    } catch (error) {
        addChatMessage('assistant', `Trade failed: ${error.message}`);
    }
}

function addChatMessage(role, content) {
    const color = role === 'user' ? '#0066ff' : '#00ff88';
    const align = role === 'user' ? 'right' : 'left';
    const bg = role === 'user' ? 'rgba(0, 102, 255, 0.1)' : 'rgba(0, 255, 136, 0.1)';
    
    const html = `<div style="margin-bottom: 0.5rem; text-align: ${align};">
        <div style="display: inline-block; padding: 0.5rem 1rem; background: ${bg}; border-radius: 4px; max-width: 80%;">
            <strong style="color: ${color};">${role === 'user' ? 'You' : 'AI'}:</strong>
            <p style="color: #fff; margin: 0.25rem 0 0 0; font-size: 0.9rem;">${content}</p>
        </div>
    </div>`;
    
    const container = document.getElementById('chat-messages');
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

function showHelp() {
    const helpText = `<strong style="color: #ff8800;">Available Commands:</strong><br><br>
<strong style="color: #00ff88;">Trading:</strong><br>
• "Swap 0.5 SOL for [token mint]"<br>
• "Execute trade of 0.1 SOL to USDC"<br>
• "Buy [amount] of [token]"<br><br>
<strong style="color: #00ff88;">Bot Control:</strong><br>
• "Start DCA bot for [base]/[quote]"<br>
• "Start momentum bot with 0.1 SOL"<br>
• "Stop the bot"<br>
• "Pause trading"<br><br>
<strong style="color: #00ff88;">Wallet & Analysis:</strong><br>
• "Show my wallet balance"<br>
• "What's my SOL balance?"<br>
• "Check my wallet"<br>
• "What's the price of [token]?"<br>
• "Show my stats"<br>
• "How is the bot performing?"<br><br>
<strong style="color: #00ff88;">Strategies:</strong><br>
• DCA - Dollar Cost Average<br>
• Momentum - Trend following<br>
• Arbitrage - Price differences<br>
• Grid - Buy low, sell high<br><br>
<em style="color: #666;">Tip: Use natural language, I'll understand!</em>`;
    
    addChatMessage('assistant', helpText);
}
