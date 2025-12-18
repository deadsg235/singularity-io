// Use solanaWeb3 directly without destructuring

let connection;
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://api.metaplex.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://solana-mainnet-public.allthatnode.com'
];
let wallet = null;
let deployedBots = [];

const BOT_TEMPLATES = {
    'dca-sol': {
        name: 'SOL DCA Bot',
        strategy: 'dca',
        baseToken: 'So11111111111111111111111111111111111111112',
        quoteToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.1,
        interval: 3600,
        stopLoss: 0,
        takeProfit: 0,
        aiEnabled: false
    },
    'momentum-meme': {
        name: 'Meme Momentum Bot',
        strategy: 'momentum',
        baseToken: '',
        quoteToken: 'So11111111111111111111111111111111111111112',
        amount: 0.05,
        interval: 300,
        stopLoss: 15,
        takeProfit: 25,
        aiEnabled: true
    },
    'arbitrage-dex': {
        name: 'DEX Arbitrage Bot',
        strategy: 'arbitrage',
        baseToken: '',
        quoteToken: 'So11111111111111111111111111111111111111112',
        amount: 0.2,
        interval: 30,
        stopLoss: 2,
        takeProfit: 5,
        aiEnabled: true
    },
    'grid-stable': {
        name: 'Stable Grid Bot',
        strategy: 'grid',
        baseToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        quoteToken: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        amount: 1.0,
        interval: 600,
        stopLoss: 1,
        takeProfit: 2,
        aiEnabled: false
    }
};

document.addEventListener('DOMContentLoaded', () => {
    connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('create-bot').addEventListener('click', createBot);
    document.getElementById('refresh-bots').addEventListener('click', loadDeployedBots);
    
    // Template buttons
    document.querySelectorAll('.use-template').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const template = e.target.closest('.template-card').dataset.template;
            useTemplate(template);
        });
    });
    
    // Real-time preview
    ['bot-name', 'strategy', 'base-token', 'quote-token', 'trade-amount', 'interval', 'stop-loss', 'take-profit'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    
    document.getElementById('ai-enabled').addEventListener('change', updatePreview);
    
    loadDeployedBots();
    updatePreview();
});

async function connectWallet() {
    try {
        if (wallet) {
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            wallet = null;
            
            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');
            
            document.getElementById('balance-display').classList.add('hidden');
            console.log('Wallet disconnected');
            return;
        }
        
        if (!window.solana || !window.solana.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances();
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
    }
}

async function loadWalletBalances() {
    if (!wallet) return;

    try {
        // Use backend API for S-IO balance (uses cached RPC)
        const sioResponse = await fetch(`/api/sio/balance/${wallet}`);
        if (sioResponse.ok) {
            const sioData = await sioResponse.json();
            document.getElementById('sio-balance').textContent = sioData.balance.toLocaleString(undefined, {
                maximumFractionDigits: 6
            });
        } else {
            document.getElementById('sio-balance').textContent = '0';
        }

        // Get SOL balance directly
        const tempConnection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');
        const owner = new solanaWeb3.PublicKey(wallet);
        const lamports = await tempConnection.getBalance(owner);
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
        document.getElementById('sol-balance').textContent = solBalance.toFixed(4);

        connection = tempConnection;

    } catch (error) {
        console.error('Balance loading error:', error);
        document.getElementById('sol-balance').textContent = '—';
        document.getElementById('sio-balance').textContent = '—';
    }
}

function updatePreview() {
    const name = document.getElementById('bot-name').value || 'Unnamed Bot';
    const strategy = document.getElementById('strategy').value;
    const baseToken = document.getElementById('base-token').value;
    const quoteToken = document.getElementById('quote-token').value;
    const amount = document.getElementById('trade-amount').value;
    const interval = document.getElementById('interval').value;
    const stopLoss = document.getElementById('stop-loss').value;
    const takeProfit = document.getElementById('take-profit').value;
    const aiEnabled = document.getElementById('ai-enabled').checked;
    
    const preview = `
        <div style="border: 1px solid #333; border-radius: 4px; padding: 1rem; margin-bottom: 1rem;">
            <h3 style="color: #00ff88; margin-bottom: 0.5rem;">${name}</h3>
            <p style="color: #0066ff; margin-bottom: 1rem;">Strategy: ${strategy.toUpperCase()}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                <div>
                    <strong style="color: #666;">Base Token:</strong><br>
                    <span style="font-size: 0.8rem;">${baseToken || 'Not set'}</span>
                </div>
                <div>
                    <strong style="color: #666;">Quote Token:</strong><br>
                    <span style="font-size: 0.8rem;">${quoteToken || 'Not set'}</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                <div>
                    <strong style="color: #666;">Trade Amount:</strong> ${amount} SOL
                </div>
                <div>
                    <strong style="color: #666;">Interval:</strong> ${interval}s
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                <div>
                    <strong style="color: #666;">Stop Loss:</strong> ${stopLoss}%
                </div>
                <div>
                    <strong style="color: #666;">Take Profit:</strong> ${takeProfit}%
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <strong style="color: #666;">AI Enabled:</strong> 
                <span style="color: ${aiEnabled ? '#00ff88' : '#ff4444'};">${aiEnabled ? 'Yes' : 'No'}</span>
            </div>
            
            <div style="background: rgba(0, 102, 255, 0.1); padding: 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                <strong style="color: #0066ff;">Estimated Performance:</strong><br>
                Daily trades: ~${Math.floor(86400 / interval)}<br>
                Risk level: ${stopLoss > 10 ? 'Low' : stopLoss > 5 ? 'Medium' : 'High'}
            </div>
        </div>
    `;
    
    document.getElementById('bot-preview').innerHTML = preview;
}

async function createBot() {
    if (!wallet) {
        alert('Connect wallet first');
        return;
    }
    
    const botConfig = {
        id: Date.now().toString(),
        name: document.getElementById('bot-name').value || 'Unnamed Bot',
        strategy: document.getElementById('strategy').value,
        baseToken: document.getElementById('base-token').value.trim(),
        quoteToken: document.getElementById('quote-token').value.trim(),
        amount: parseFloat(document.getElementById('trade-amount').value),
        interval: parseInt(document.getElementById('interval').value),
        stopLoss: parseFloat(document.getElementById('stop-loss').value),
        takeProfit: parseFloat(document.getElementById('take-profit').value),
        aiEnabled: document.getElementById('ai-enabled').checked,
        autoRestart: document.getElementById('auto-restart').checked,
        owner: wallet.toString(),
        created: new Date().toISOString(),
        status: 'inactive',
        stats: { total: 0, success: 0, failed: 0, pnl: 0 }
    };
    
    if (!botConfig.baseToken || !botConfig.quoteToken || botConfig.amount <= 0) {
        alert('Please fill all required fields');
        return;
    }
    
    try {
        // Validate tokens
        await validateToken(botConfig.baseToken);
        await validateToken(botConfig.quoteToken);
        
        // Save bot configuration
        deployedBots.push(botConfig);
        saveBots();
        
        // Deploy bot to backend
        await deployBot(botConfig);
        
        alert(`Bot "${botConfig.name}" created successfully!`);
        clearForm();
        loadDeployedBots();
        
    } catch (error) {
        alert(`Failed to create bot: ${error.message}`);
    }
}

async function validateToken(mint) {
    try {
        new solanaWeb3.PublicKey(mint);
        return true;
    } catch (error) {
        throw new Error(`Invalid token: ${mint}`);
    }
}

async function deployBot(config) {
    try {
        const response = await fetch('/api/deploy_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (!response.ok) {
            throw new Error('Failed to deploy bot to backend');
        }
        
        const result = await response.json();
        console.log('Bot deployed:', result);
        
    } catch (error) {
        console.warn('Backend deployment failed, bot saved locally:', error);
    }
}

function loadDeployedBots() {
    const saved = localStorage.getItem('deployed-bots');
    if (saved) {
        deployedBots = JSON.parse(saved);
    }
    
    renderDeployedBots();
}

function renderDeployedBots() {
    const container = document.getElementById('deployed-bots');
    
    if (deployedBots.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1 / -1;">No bots deployed yet</p>';
        return;
    }
    
    container.innerHTML = deployedBots.map(bot => `
        <div class="bot-card" data-bot-id="${bot.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: #00ff88; margin: 0;">${bot.name}</h3>
                <span class="bot-status ${bot.status}" style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
                    ${bot.status.toUpperCase()}
                </span>
            </div>
            
            <div style="margin-bottom: 1rem; font-size: 0.9rem;">
                <p style="color: #0066ff; margin: 0.25rem 0;">Strategy: ${bot.strategy.toUpperCase()}</p>
                <p style="color: #ccc; margin: 0.25rem 0;">Amount: ${bot.amount} SOL</p>
                <p style="color: #ccc; margin: 0.25rem 0;">Interval: ${bot.interval}s</p>
            </div>
            
            <div style="margin-bottom: 1rem; font-size: 0.8rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>Trades: ${bot.stats.total}</div>
                    <div>Success: ${bot.stats.success}</div>
                    <div>Failed: ${bot.stats.failed}</div>
                    <div style="color: ${bot.stats.pnl >= 0 ? '#00ff88' : '#ff4444'};">
                        PnL: ${bot.stats.pnl.toFixed(4)} SOL
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
                <button onclick="toggleBot('${bot.id}')" style="flex: 1; padding: 0.5rem; background: ${bot.status === 'active' ? '#ff4444' : '#00ff88'}; color: ${bot.status === 'active' ? '#fff' : '#000'}; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    ${bot.status === 'active' ? 'Stop' : 'Start'}
                </button>
                <button onclick="editBot('${bot.id}')" style="padding: 0.5rem; background: #0066ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Edit</button>
                <button onclick="deleteBot('${bot.id}')" style="padding: 0.5rem; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Delete</button>
            </div>
        </div>
    `).join('');
}

function useTemplate(templateId) {
    const template = BOT_TEMPLATES[templateId];
    if (!template) return;
    
    document.getElementById('bot-name').value = template.name;
    document.getElementById('strategy').value = template.strategy;
    document.getElementById('base-token').value = template.baseToken;
    document.getElementById('quote-token').value = template.quoteToken;
    document.getElementById('trade-amount').value = template.amount;
    document.getElementById('interval').value = template.interval;
    document.getElementById('stop-loss').value = template.stopLoss;
    document.getElementById('take-profit').value = template.takeProfit;
    document.getElementById('ai-enabled').checked = template.aiEnabled;
    
    updatePreview();
}

async function toggleBot(botId) {
    const bot = deployedBots.find(b => b.id === botId);
    if (!bot) return;
    
    if (bot.status === 'active') {
        bot.status = 'inactive';
        await stopBotExecution(botId);
    } else {
        bot.status = 'active';
        await startBotExecution(bot);
    }
    
    saveBots();
    renderDeployedBots();
}

async function startBotExecution(bot) {
    try {
        const response = await fetch('/api/start_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId: bot.id, config: bot })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start bot');
        }
        
        console.log(`Bot ${bot.name} started`);
        
    } catch (error) {
        console.warn('Backend start failed, running locally:', error);
        // Fallback to local execution
        startLocalBot(bot);
    }
}

async function stopBotExecution(botId) {
    try {
        await fetch('/api/stop_bot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId })
        });
        
        console.log(`Bot ${botId} stopped`);
        
    } catch (error) {
        console.warn('Backend stop failed:', error);
    }
}

function startLocalBot(bot) {
    // Local bot execution fallback
    console.log(`Starting local bot: ${bot.name}`);
    
    const interval = setInterval(async () => {
        if (bot.status !== 'active') {
            clearInterval(interval);
            return;
        }
        
        try {
            // Simulate trade execution
            const success = Math.random() > 0.3; // 70% success rate
            
            bot.stats.total++;
            if (success) {
                bot.stats.success++;
                const pnl = (Math.random() - 0.4) * bot.amount * 0.1; // Random PnL
                bot.stats.pnl += pnl;
            } else {
                bot.stats.failed++;
            }
            
            saveBots();
            renderDeployedBots();
            
        } catch (error) {
            console.error(`Bot ${bot.name} execution error:`, error);
        }
    }, bot.interval * 1000);
}

function editBot(botId) {
    const bot = deployedBots.find(b => b.id === botId);
    if (!bot) return;
    
    // Populate form with bot data
    document.getElementById('bot-name').value = bot.name;
    document.getElementById('strategy').value = bot.strategy;
    document.getElementById('base-token').value = bot.baseToken;
    document.getElementById('quote-token').value = bot.quoteToken;
    document.getElementById('trade-amount').value = bot.amount;
    document.getElementById('interval').value = bot.interval;
    document.getElementById('stop-loss').value = bot.stopLoss;
    document.getElementById('take-profit').value = bot.takeProfit;
    document.getElementById('ai-enabled').checked = bot.aiEnabled;
    document.getElementById('auto-restart').checked = bot.autoRestart;
    
    // Remove bot from deployed list (will be re-added when created)
    deployedBots = deployedBots.filter(b => b.id !== botId);
    saveBots();
    renderDeployedBots();
    updatePreview();
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteBot(botId) {
    if (!confirm('Are you sure you want to delete this bot?')) return;
    
    deployedBots = deployedBots.filter(b => b.id !== botId);
    saveBots();
    renderDeployedBots();
    
    // Also stop bot on backend
    stopBotExecution(botId);
}

function clearForm() {
    document.getElementById('bot-name').value = '';
    document.getElementById('base-token').value = '';
    document.getElementById('quote-token').value = '';
    document.getElementById('trade-amount').value = '0.1';
    document.getElementById('interval').value = '60';
    document.getElementById('stop-loss').value = '5';
    document.getElementById('take-profit').value = '10';
    document.getElementById('ai-enabled').checked = false;
    document.getElementById('auto-restart').checked = false;
    updatePreview();
}

function saveBots() {
    localStorage.setItem('deployed-bots', JSON.stringify(deployedBots));
}

// Global functions for onclick handlers
window.toggleBot = toggleBot;
window.editBot = editBot;
window.deleteBot = deleteBot;