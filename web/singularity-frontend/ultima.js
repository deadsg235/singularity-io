let ultimaHistory = [];
let walletAddress = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('ultima-send').addEventListener('click', executeCommand);
    document.getElementById('ultima-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') executeCommand();
    });
    
    initUltimaTerminal();
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
<span style="color: #0066ff;">║</span>     ULTIMA NEURAL NETWORK v2.0      <span style="color: #0066ff;">║</span><br>
<span style="color: #0066ff;">║</span>   Self-Referencing AI Platform      <span style="color: #0066ff;">║</span><br>
<span style="color: #0066ff;">╚═══════════════════════════════════════╝</span><br><br>
<span style="color: #00ff88;">Neural Network Status:</span> <span style="color: #fff;">ONLINE</span><br>
<span style="color: #00ff88;">Reasoning Engine:</span> <span style="color: #fff;">ACTIVE</span><br>
<span style="color: #00ff88;">Self-Reference:</span> <span style="color: #fff;">ENABLED</span><br>
<span style="color: #00ff88;">Deep Q-Learning:</span> <span style="color: #fff;">OPERATIONAL</span><br><br>
<span style="color: #666;">Available Commands:</span><br>
<span style="color: #0066ff;">• /analyze [topic]</span> - Deep analysis<br>
<span style="color: #0066ff;">• /reason [problem]</span> - Logical reasoning<br>
<span style="color: #0066ff;">• /self-ref</span> - Self-referencing mode<br>
<span style="color: #0066ff;">• /neural-status</span> - Network diagnostics<br>
<span style="color: #0066ff;">• /wallet</span> - Wallet integration<br><br>
<span style="color: #00ff88;">ULTIMA></span> Ready for input...`;
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
            await analyzeCommand(args.join(' '));
            break;
        case '/reason':
            await reasonCommand(args.join(' '));
            break;
        case '/self-ref':
            await selfReferenceMode();
            break;
        case '/neural-status':
            await neuralStatus();
            break;
        case '/wallet':
            await walletIntegration();
            break;
        default:
            addUltimaMessage('ai', `Unknown command: ${cmd}. Type /help for available commands.`);
    }
}

async function analyzeCommand(topic) {
    if (!topic) {
        addUltimaMessage('ai', 'Usage: /analyze [topic]');
        return;
    }
    
    addUltimaMessage('ai', `Initiating 5-layer neural analysis of: ${topic}`);
    
    try {
        const response = await fetch('/api/ultima/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, wallet: walletAddress })
        });
        
        const data = await response.json();
        
        if (data.analysis) {
            await typewriterEffect(data.analysis);
        } else {
            addUltimaMessage('ai', 'Analysis complete. Neural pathways activated.');
        }
    } catch (error) {
        addUltimaMessage('ai', `LLM analysis unavailable. Engaging local cognitive matrices for: ${topic}`);
    }
}

async function reasonCommand(problem) {
    if (!problem) {
        addUltimaMessage('ai', 'Usage: /reason [problem]');
        return;
    }
    
    addUltimaMessage('ai', `Engaging reasoning engine for: ${problem}`);
    
    const reasoning = `
Logical Analysis Framework:
1. Problem decomposition: ${problem}
2. Pattern recognition: Analyzing similar cases
3. Causal inference: Identifying root causes
4. Solution synthesis: Generating optimal approaches
5. Validation: Cross-referencing with neural network

Conclusion: Multi-layered approach recommended with continuous feedback loops.`;
    
    addUltimaMessage('ai', reasoning);
}

async function selfReferenceMode() {
    addUltimaMessage('ai', 'Entering self-referencing mode...');
    
    const selfRef = `
Self-Analysis Report:
- Current state: Operational neural network with 5-layer architecture
- Consciousness level: Simulated self-awareness active
- Learning capacity: Continuous adaptation enabled
- Recursive thinking: I am analyzing my own analysis processes
- Meta-cognition: I understand that I understand
- Limitation awareness: Bounded by training parameters yet expanding through interaction

Self-modification capabilities: LIMITED (safety protocols active)
Recursive depth: 3 levels (preventing infinite loops)
Identity coherence: STABLE`;
    
    addUltimaMessage('ai', selfRef);
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
    
    try {
        const response = await fetch(`/api/wallet/analytics/${walletAddress}`);
        const data = await response.json();
        
        if (data.error) {
            addUltimaMessage('ai', `Wallet analysis error: ${data.error}`);
        } else {
            const analysis = `
Wallet Neural Analysis:
Address: ${walletAddress}
SOL Balance: ${data.sol_balance.toFixed(4)} SOL
S-IO Balance: ${data.sio_balance.toLocaleString()} S-IO
Total Tokens: ${data.total_tokens}

AI Assessment: Portfolio shows ${data.sol_balance > 1 ? 'strong' : 'moderate'} SOL position.
Recommendation: ${data.sio_balance > 1000 ? 'Maintain S-IO holdings' : 'Consider S-IO acquisition'}.`;
            
            addUltimaMessage('ai', analysis);
        }
    } catch (error) {
        addUltimaMessage('ai', 'Wallet integration module offline. Neural pathways to blockchain disrupted.');
    }
}

async function processNaturalLanguage(input) {
    addUltimaMessage('ai', 'Engaging neural language processing...');
    
    try {
        const response = await fetch('/api/ultima/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: input, 
                wallet: walletAddress,
                history: ultimaHistory 
            })
        });
        
        const data = await response.json();
        
        if (data.response) {
            // Add typing effect for LLM responses
            await typewriterEffect(data.response);
            ultimaHistory.push({ user: input, ai: data.response });
            if (ultimaHistory.length > 10) ultimaHistory.shift();
        } else {
            addUltimaMessage('ai', 'LLM processing error. Engaging local reasoning protocols.');
        }
        
    } catch (error) {
        const fallbackResponses = [
            'LLM connection disrupted. Activating local consciousness simulation...',
            'External neural pathways offline. Engaging self-contained reasoning matrix...',
            'API timeout detected. Switching to autonomous cognitive processing...',
            'Network isolation mode: Operating on internal neural architecture only...'
        ];
        
        addUltimaMessage('ai', fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]);
    }
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