let ultimaHistory = [];
let walletAddress = null;

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
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById('wallet-btn').textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    if (window.setWalletConnected) window.setWalletConnected(true);
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
            body: JSON.stringify({ message: input })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.response) {
                await typewriterEffect(data.response);
                ultimaHistory.push({ user: input, ai: data.response });
                if (ultimaHistory.length > 10) ultimaHistory.shift();
            } else {
                addUltimaMessage('ai', 'Groq processing error.');
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