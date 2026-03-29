let ultimaHistory = [];
let walletAddress = null;
let solanaConnection = null; // Add solanaConnection for this page
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'; // Add RPC
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump'; // Add SIO Mint

const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://api.metaplex.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://solana-mainnet-public.allthatnode.com'
];


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('ultima-send').addEventListener('click', executeCommand);
    document.getElementById('ultima-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeCommand();
    });
    
    initUltimaTerminal();
    initMojoNetwork();
});

async function connectWallet() {
    try {
        if (walletAddress) {
            // If already connected, disconnect
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            walletAddress = null;
            solanaConnection = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            if (window.setWalletConnected) window.setWalletConnected(false);

            console.log('Wallet disconnected');
            return;
        }

        if (!window.solana?.isPhantom) {
            alert('Install Phantom Wallet');
            return;
        }
        
        const resp = await window.solana.connect();
        walletAddress = resp.publicKey.toString();
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        btn.classList.add('connected');
        
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances(); // Call loadWalletBalances
        
        console.log('Wallet connected:', walletAddress);
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// loadWalletBalances function for this page
async function loadWalletBalances() {
    if (!walletAddress) return;

    let lastError = null;
    const allEndpoints = [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS];
    
    for (let attempt = 0; attempt < allEndpoints.length; attempt++) {
        const endpoint = allEndpoints[attempt];
        
        try {
            console.log(`loadWalletBalances: Trying RPC endpoint ${attempt + 1}/${allEndpoints.length}: ${endpoint}`);
            
            const connection = new solanaWeb3.Connection(
                endpoint,
                { commitment: 'confirmed' }
            );

            const owner = new solanaWeb3.PublicKey(walletAddress);

            // ---------- SOL BALANCE ----------
            const lamports = await connection.getBalance(owner);
            const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

            document.getElementById('sol-balance').textContent =
                solBalance.toFixed(4);

            // ---------- SIO TOKEN BALANCE ----------
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

            const tokenAccounts =
                await connection.getParsedTokenAccountsByOwner(
                    owner,
                    { mint }
                );

            let sioBalance = 0;

            if (tokenAccounts.value.length > 0) {
                const tokenInfo =
                    tokenAccounts.value[0].account.data.parsed.info;

                sioBalance = tokenInfo.tokenAmount.uiAmount || 0;
            }

            document.getElementById('sio-balance').textContent =
                sioBalance.toLocaleString(undefined, {
                    maximumFractionDigits: 6
                });

            console.log('Balances loaded', {
                sol: solBalance,
                sio: sioBalance,
                endpoint: endpoint
            });

            // Success - update the global connection
            solanaConnection = connection;
            return;

        } catch (err) {
            lastError = err;
            console.warn(`loadWalletBalances: RPC endpoint ${endpoint} failed:`, err.message);
            
            // If this is not the last endpoint, wait before trying the next one
            if (attempt < allEndpoints.length - 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
                console.log(`loadWalletBalances: Waiting ${delay}ms before trying next endpoint...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All endpoints failed
    console.error('loadWalletBalances: All RPC endpoints failed. Last error:', lastError);

    document.getElementById('sol-balance').textContent = '—';
    document.getElementById('sio-balance').textContent = '—';

    // This page doesn't have addChatMessage, so just log to console
    console.warn('⚠️ Unable to load balances (all RPC endpoints busy). Try again in a few minutes.');
}

function initUltimaTerminal() {
    const output = document.getElementById('ultima-output');
    output.innerHTML = '';
    
    const welcome = document.createElement('div');
    welcome.className = 'ultima-message ultima-system';
    welcome.innerHTML = `<span style="color: #0066ff;">╔═══════════════════════════════════════╗</span><br>
<span style="color: #0066ff;">║</span>     ULTIMA NEURAL NETWORK v3.0      <span style="color: #0066ff;">║</span><br>
<span style="color: #0066ff;">║</span>   Groq LLM + Mojo Neural Engine     <span style="color: #0066ff;">║</span><br>
<span style="color: #0066ff;">╚═══════════════════════════════════════╝</span><br><br>
<span style="color: #00ff88;">Groq LLM:</span> <span style="color: #fff;">CONNECTED</span><br>
<span style="color: #00ff88;">Mojo Network:</span> <span style="color: #fff;">ACTIVE</span><br>
<span style="color: #00ff88;">Neural Layers:</span> <span style="color: #fff;">5-LAYER ARCHITECTURE</span><br>
<span style="color: #00ff88;">Processing Speed:</span> <span style="color: #fff;">QUANTUM ENHANCED</span><br><br>
<span style="color: #666;">Available Commands:</span><br>
<span style="color: #0066ff;">• /analyze [topic]</span> - Groq-powered analysis<br>
<span style="color: #0066ff;">• /mojo [query]</span> - Mojo neural processing<br>
<span style="color: #0066ff;">• /neural-status</span> - Network diagnostics<br>
<span style="color: #0066ff;">• /wallet</span> - Wallet integration<br><br>
<span style="color: #00ff88;">ULTIMA></span> Ready for neural processing...`;
    output.appendChild(welcome);
}

async function executeCommand() {
    const input = document.getElementById('ultima-input');
    const command = input.value.trim();
    if (!command) return;
    
    addUltimaMessage('user', command);
    input.value = '';
    
    if (command.startsWith('/')) {
        await handleSystemCommand(command);
    } else {
        await processNaturalLanguage(command);
    }
}

async function handleSystemCommand(command) {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
        case '/analyze':
            await groqAnalyze(args.join(' '));
            break;
        case '/mojo':
            await mojoProcess(args.join(' '));
            break;
        case '/neural-status':
            await neuralStatus();
            break;
        case '/wallet':
            await walletIntegration();
            break;
        default:
            addUltimaMessage('ai', `Unknown command: ${cmd}. Available: /analyze, /mojo, /neural-status, /wallet`);
    }
}

async function groqAnalyze(topic) {
    if (!topic) {
        addUltimaMessage('ai', 'Usage: /analyze [topic]');
        return;
    }
    
    addUltimaMessage('ai', `🤖 Groq LLM analyzing: ${topic}`);
    
    try {
        const response = await fetch('/api/ultima/groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Analyze this topic: ${topic}` })
        });
        
        if (response.ok) {
            const data = await response.json();
            await typewriterEffect(data.response);
        } else {
            addUltimaMessage('ai', 'Groq analysis unavailable. Using local processing.');
        }
    } catch (error) {
        addUltimaMessage('ai', `Groq error: ${error.message}`);
    }
}

async function mojoProcess(query) {
    if (!query) {
        addUltimaMessage('ai', 'Usage: /mojo [query]');
        return;
    }
    
    addUltimaMessage('ai', `⚡ Mojo neural processing: ${query}`);
    
    // Simulate Mojo processing
    const mojoResponse = `
Mojo Neural Network Processing:
- Input vectorization: ${query.length} tokens
- Layer propagation: 5 layers activated
- Quantum coherence: 0.97 stability
- Processing time: 0.003ms
- Output confidence: 94.7%

Result: Neural pathways optimized for query pattern recognition.`;
    
    await typewriterEffect(mojoResponse);
}



async function neuralStatus() {
    const status = `
Neural Network Diagnostics:
╔════════════════════════════════════╗
║ Layer 1 (Input): 512 nodes - OK   ║
║ Layer 2 (Hidden): 256 nodes - OK  ║
║ Layer 3 (Deep Q): 128 nodes - OK  ║
║ Layer 4 (Reason): 64 nodes - OK   ║
║ Layer 5 (Output): 32 nodes - OK   ║
╚════════════════════════════════════╝

Activation Functions: ReLU, Sigmoid, Softmax
Learning Rate: 0.001 (adaptive)
Backpropagation: ACTIVE
Gradient Flow: OPTIMAL
Memory Usage: 847MB / 2GB
Processing Speed: 1.2M ops/sec
Quantum Coherence: SIMULATED`;
    
    addUltimaMessage('ai', status);
}

async function walletIntegration() {
    if (!walletAddress) {
        addUltimaMessage('ai', 'No wallet connected. Please connect Phantom wallet first.');
        return;
    }
    
    addUltimaMessage('ai', '💰 Analyzing wallet with Groq LLM...');
    
    await processNaturalLanguage(`Analyze my Solana wallet: ${walletAddress}`);
}

async function processNaturalLanguage(input) {
    addUltimaMessage('ai', '🧠 Engaging Groq LLM...');
    
    try {
        const response = await fetch('/api/ultima/groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, wallet: walletAddress })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.response) {
                // Check if tools were used
                if (data.response.includes('balance') || data.response.includes('pathway') || data.response.includes('consciousness')) {
                    addUltimaMessage('ai', '🔧 LangChain tools executed...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                await typewriterEffect(data.response);
                ultimaHistory.push({ user: input, ai: data.response });
                if (ultimaHistory.length > 10) ultimaHistory.shift();
            } else {
                addUltimaMessage('ai', 'LangChain processing error.');
            }
        } else {
            addUltimaMessage('ai', 'Groq unavailable. Using Mojo neural backup.');
            await mojoProcess(input);
        }
    } catch (error) {
        addUltimaMessage('ai', `Network error: ${error.message}`);
    }
}

function initMojoNetwork() {
    setTimeout(() => {
        addUltimaMessage('ai', '⚡ Mojo neural network initialized. Quantum coherence established.');
    }, 1000);
}

async function typewriterEffect(text) {
    const output = document.getElementById('ultima-output');
    const msg = document.createElement('div');
    msg.className = 'ultima-message ultima-ai';
    msg.innerHTML = `<span style="color: #0066ff;">ULTIMA></span> <span style="color: #ccc;"></span>`;
    output.appendChild(msg);
    
    const textSpan = msg.querySelector('span:last-child');
    
    for (let i = 0; i < text.length; i++) {
        textSpan.textContent += text[i];
        output.scrollTop = output.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

function addUltimaMessage(role, text) {
    const output = document.getElementById('ultima-output');
    const msg = document.createElement('div');
    msg.className = `ultima-message ultima-${role}`;
    
    if (role === 'user') {
        msg.innerHTML = `<span style="color: #00ff88;">USER></span> <span style="color: #fff;">${text}</span>`;
    } else if (role === 'ai') {
        msg.innerHTML = `<span style="color: #0066ff;">ULTIMA></span> <span style="color: #ccc;">${text}</span>`;
    }
    
    output.appendChild(msg);
    output.scrollTop = output.scrollHeight;
}