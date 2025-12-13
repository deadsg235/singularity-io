// Singularity.io Frontend Application
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : '';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC_ENDPOINTS = [
    'https://solana-mainnet.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.api.syndica.io',
    'https://api.metaplex.solana.com',
    'https://solana-mainnet.phantom.tech',
    'https://solana-mainnet-public.allthatnode.com'
];
const SIO_MINT_ADDRESS = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

let canvas, ctx;
let networkData = null;
let walletAddress = null;
let solanaConnection = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Singularity.io initializing...');
    initCanvas();
    initWallet();
    checkSystemStatus();
    setInterval(checkSystemStatus, 30000);
    
    document.getElementById('update-btn').addEventListener('click', updateNetwork);
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    console.log('Wallet button event listener attached');
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    initChatTerminal();
    
    // Initially hide balance display
    document.getElementById('balance-display').classList.add('hidden');
    
    // Load network after short delay to ensure canvas is ready
    setTimeout(() => loadNeuralNetwork(), 500);
});

// Check system status
async function checkSystemStatus() {
    try {
        // Check API health
        const healthResponse = await fetch(`/api/health`);
        const healthData = await healthResponse.json();
        updateStatus('api-status', healthData.status === 'healthy' ? 'Online' : 'Offline', healthData.status === 'healthy');

        // Check network stats
        const networkResponse = await fetch(`/api/health`);
        const networkData = await networkResponse.json();
        updateStatus('network-status', networkData.solana_network || 'Unknown', true);

        // Check SolFunMeme status
        const solfunmemeResponse = await fetch(`/api/health`);
        const solfunmemeData = await solfunmemeResponse.json();
        updateStatus('phase-status', solfunmemeData.phase || 'Unknown', true);

    } catch (error) {
        console.error('Error checking system status:', error);
        updateStatus('api-status', 'Offline', false);
        updateStatus('network-status', 'Disconnected', false);
        updateStatus('phase-status', 'Unknown', false);
    }
}

// Update status display
function updateStatus(elementId, text, isOnline) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
        element.className = 'value ' + (isOnline ? 'online' : 'offline');
    }
}

// Initialize canvas
let animationFrame;
let particles = [];

function initCanvas() {
    canvas = document.getElementById('network-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

// Load neural network
async function loadNeuralNetwork() {
    try {
        const response = await fetch(`/api/network`);
        networkData = await response.json();
        console.log('Network loaded:', networkData);
        if (networkData.nodes && networkData.nodes.length > 0) {
            document.getElementById('node-count').textContent = `Nodes: ${networkData.nodes.length}`;
            initParticles();
            if (!animationFrame) {
                animate();
            }
        } else {
            console.error('No nodes in network data');
        }
    } catch (error) {
        console.error('Error loading network:', error);
    }
}

// Update network
async function updateNetwork() {
    try {
        await fetch(`/api/network`);
        await loadNeuralNetwork();
    } catch (error) {
        console.error('Error updating network:', error);
    }
}

// Initialize particles for animation
function initParticles() {
    particles = [];
    if (!networkData || !networkData.connections) return;
    
    for (let i = 0; i < 20; i++) {
        const conn = networkData.connections[Math.floor(Math.random() * networkData.connections.length)];
        particles.push({
            connection: conn,
            progress: Math.random(),
            speed: 0.002 + Math.random() * 0.003
        });
    }
}

// Animate visualization
function animate() {
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (networkData && networkData.nodes && networkData.nodes.length > 0) {
        drawConnections();
        drawParticles();
        drawNodes();
        drawLayerLabels();
    }
    
    animationFrame = requestAnimationFrame(animate);
}

// Draw connections with gradient
function drawConnections() {
    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    networkData.connections.forEach(conn => {
        const source = networkData.nodes[conn.source];
        const target = networkData.nodes[conn.target];
        const x1 = padding + source.x * width;
        const y1 = padding + source.y * height;
        const x2 = padding + target.x * width;
        const y2 = padding + target.y * height;
        
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, `rgba(0, 102, 255, ${0.15 * source.value})`);
        gradient.addColorStop(1, `rgba(0, 102, 255, ${0.15 * target.value})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

// Draw animated particles
function drawParticles() {
    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    particles.forEach(particle => {
        const conn = particle.connection;
        const source = networkData.nodes[conn.source];
        const target = networkData.nodes[conn.target];
        
        const x1 = padding + source.x * width;
        const y1 = padding + source.y * height;
        const x2 = padding + target.x * width;
        const y2 = padding + target.y * height;
        
        const x = x1 + (x2 - x1) * particle.progress;
        const y = y1 + (y2 - y1) * particle.progress;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
        gradient.addColorStop(0, 'rgba(0, 102, 255, 1)');
        gradient.addColorStop(1, 'rgba(0, 102, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        particle.progress += particle.speed;
        if (particle.progress > 1) {
            particle.progress = 0;
            particle.connection = networkData.connections[Math.floor(Math.random() * networkData.connections.length)];
        }
    });
}

// Draw nodes with 3D effect
function drawNodes() {
    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    networkData.nodes.forEach(node => {
        const x = padding + node.x * width;
        const y = padding + node.y * height;
        const radius = 5 + node.value * 8;
        
        // Outer glow
        const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        outerGlow.addColorStop(0, `rgba(0, 102, 255, ${0.4 * node.value})`);
        outerGlow.addColorStop(1, 'rgba(0, 102, 255, 0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Main node with gradient
        const nodeGradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        nodeGradient.addColorStop(0, 'rgba(100, 150, 255, 1)');
        nodeGradient.addColorStop(0.5, `rgba(0, 102, 255, ${0.9})`);
        nodeGradient.addColorStop(1, `rgba(0, 80, 200, ${0.7})`);
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * node.value})`;
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = `rgba(0, 102, 255, ${0.8 + node.value * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    });
}

// Draw layer labels
function drawLayerLabels() {
    const padding = 60;
    const height = canvas.height - padding * 2;
    const layerNames = ['Input', 'Hidden 1', 'Hidden 2', 'Output'];
    
    ctx.font = '12px Orbitron, monospace';
    ctx.textAlign = 'left';
    
    networkData.layers.forEach((size, idx) => {
        const y = padding + (idx / (networkData.layers.length - 1)) * height;
        ctx.fillStyle = 'rgba(0, 102, 255, 0.8)';
        ctx.fillText(`${layerNames[idx] || `Layer ${idx}`} (${size})`, 10, y + 5);
    });
}

// Phantom Wallet Integration
function initWallet() {
    if (window.solana && window.solana.isPhantom) {
        console.log('Phantom wallet detected');
    }
}

async function connectWallet() {
    console.log('connectWallet: Function called');
    try {
        if (walletAddress) {
            // If already connected, disconnect
            console.log('connectWallet: Disconnecting wallet');
            if (window.solana && window.solana.isPhantom) {
                await window.solana.disconnect();
            }
            walletAddress = null;
            solanaConnection = null;

            const btn = document.getElementById('wallet-btn');
            btn.textContent = 'Connect Wallet';
            btn.classList.remove('connected');

            document.getElementById('balance-display').classList.add('hidden');
            updateStatus('wallet-status', 'Not Connected', false);
            if (window.setWalletConnected) window.setWalletConnected(false);

            console.log('Wallet disconnected');
            return;
        }

        console.log('connectWallet: Checking for Phantom wallet');
        if (!window.solana || !window.solana.isPhantom) {
            console.log('connectWallet: Phantom not detected');
            alert('Phantom wallet not detected. Please install Phantom wallet from https://phantom.app/');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        console.log('connectWallet: Connecting to Phantom');
        const resp = await window.solana.connect();
        walletAddress = resp.publicKey.toString();
        
        console.log('connectWallet: Wallet connected:', walletAddress);
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        btn.classList.add('connected');
        
        updateStatus('wallet-status', 'Connected', true);
        if (window.setWalletConnected) window.setWalletConnected(true);
        
        // Show balance display and load balances
        document.getElementById('balance-display').classList.remove('hidden');
        loadWalletBalances();
        
        console.log('Wallet connected:', walletAddress);
    } catch (error) {
        console.error('Wallet connection error:', error);
        updateStatus('wallet-status', 'Connection Failed', false);
        if (window.setWalletConnected) window.setWalletConnected(false);
    }
}

// Chat Terminal
let chatHistory = [];

function initChatTerminal() {
    const output = document.getElementById('chat-output');
    output.innerHTML = '';
    
    const welcome = document.createElement('div');
    welcome.className = 'chat-message system';
    welcome.innerHTML = `<span style="color: #0066ff;">╔═══════════════════════════════════════╗</span><br>
<span style="color: #0066ff;">║</span>  SINGULARITY.IO AI TERMINAL v0.2.0  <span style="color: #0066ff;">║</span><br>
<span style="color: #0066ff;">╚═══════════════════════════════════════╝</span><br><br>
<span style="color: #666;">Connected to Groq Llama 3.3 70B</span><br>
<span style="color: #666;">Type your message or try:</span><br>
<span style="color: #0066ff;">• "Create a token called MyToken"</span><br>
<span style="color: #0066ff;">• "What is my wallet status?"</span><br>
<span style="color: #0066ff;">• "Explain the neural network"</span><br><br>
<span style="color: #00ff00;">Ready ></span>`;
    output.appendChild(welcome);
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    
    addChatMessage('user', message);
    input.value = '';
    
    try {
        const response = await fetch(`/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message, 
                wallet: walletAddress,
                history: chatHistory 
            })
        });
        const data = await response.json();
        if (!response.ok) {
            addChatMessage('assistant', data.response || `Error ${response.status}`);
        } else {
            const resp = data.response;
            
            try {
                const parsed = JSON.parse(resp);
                if (parsed.action === 'create_token') {
                    addChatMessage('assistant', parsed.message);
                    await executeTokenCreation(parsed.params);
                    return;
                } else if (parsed.action === 'get_wallet_balance') {
                    // Call loadWalletBalances() instead, or handle directly
                    await loadWalletBalances();
                    addChatMessage('assistant', 'Wallet balances loaded in header.');
                    return;
                }
            } catch (e) {
                // Not JSON, regular message
            }
            
            addChatMessage('assistant', resp);
            chatHistory.push({ user: message, assistant: resp });
        }
    } catch (error) {
        console.error('Chat error:', error);
        addChatMessage('assistant', `Connection error: ${error.message}`);
    }
}

function addChatMessage(role, text) {
    const output = document.getElementById('chat-output');
    const msg = document.createElement('div');
    msg.className = `chat-message ${role}`;
    
    if (role === 'user') {
        msg.innerHTML = `<span style="color: #fff;">> ${text}</span>`;
    } else if (role === 'assistant') {
        msg.innerHTML = `<span style="color: #0066ff;">AI:</span> <span style="color: #ccc;">${text}</span>`;
    } else {
        msg.innerHTML = text;
    }
    
    output.appendChild(msg);
    output.scrollTop = output.scrollHeight;
}

// Execute token creation from agent
async function executeTokenCreation(params) {
    if (!walletAddress) {
        addChatMessage('assistant', 'Please connect your wallet first to create tokens.');
        return;
    }
    
    try {
        addChatMessage('assistant', 'Creating token on Solana devnet...');
        
        // Generate mint address
        const mintKeypair = generateMintAddress();
        
        const tokenData = {
            mint: mintKeypair,
            name: params.name || 'Unknown Token',
            symbol: params.symbol || 'UNK',
            decimals: parseInt(params.decimals) || 9,
            supply: parseInt(params.supply) || 0,
            description: params.description || 'Created via AI chat',
            creator: walletAddress,
            timestamp: Date.now(),
            status: 'created'
        };
        
        console.log('Saving token:', tokenData);
        
        // Store token info
        let tokens = [];
        try {
            tokens = JSON.parse(localStorage.getItem('tokens') || '[]');
        } catch (e) {
            console.error('Error parsing tokens:', e);
            tokens = [];
        }
        
        tokens.push(tokenData);
        localStorage.setItem('tokens', JSON.stringify(tokens));
        console.log('Token saved. Total tokens:', tokens.length);
        
        // Trigger storage event for launchpad page
        window.dispatchEvent(new Event('storage'));
        
        addChatMessage('assistant', `✅ Token created successfully!\n\nName: ${params.name}\nSymbol: ${params.symbol}\nSupply: ${params.supply.toLocaleString()}\nMint: ${mintKeypair.slice(0, 8)}...${mintKeypair.slice(-8)}\n\nView all tokens on the <a href="launchpad.html" style="color: #0066ff;">Token Launchpad</a>`);
    } catch (error) {
        addChatMessage('assistant', `Failed to create token: ${error.message}`);
    }
}

function generateMintAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Load wallet balances
async function loadWalletBalances() {
    if (!walletAddress) {
        console.log('loadWalletBalances: Wallet not connected.');
        return;
    }
    
    console.log('loadWalletBalances: Attempting to load balances for wallet:', walletAddress);

    let lastError = null;
    const allEndpoints = [SOLANA_RPC, ...FALLBACK_RPC_ENDPOINTS];
    
    for (let attempt = 0; attempt < allEndpoints.length; attempt++) {
        const endpoint = allEndpoints[attempt];
        
        try {
            console.log(`loadWalletBalances: Trying RPC endpoint ${attempt + 1}/${allEndpoints.length}: ${endpoint}`);
            
            const connection = new solanaWeb3.Connection(
                endpoint,
                { commitment: 'confirmed', timeout: 10000 } // 10 second timeout
            );

            const owner = new solanaWeb3.PublicKey(walletAddress);

            // ---------- SOL BALANCE ----------
            console.log('loadWalletBalances: Fetching SOL balance...');
            const lamportsPromise = connection.getBalance(owner);
            const lamports = await Promise.race([
                lamportsPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SOL balance fetch timeout')), 10000)
                )
            ]);
            const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;

            document.getElementById('sol-balance').textContent =
                solBalance.toFixed(4);

            console.log('loadWalletBalances: SOL balance fetched successfully.');

            // ---------- SIO TOKEN BALANCE ----------
            console.log('loadWalletBalances: Fetching SIO token balance...');
            const mint = new solanaWeb3.PublicKey(SIO_MINT_ADDRESS);

            const tokenAccountsPromise = connection.getParsedTokenAccountsByOwner(
                owner,
                { mint }
            );
            const tokenAccounts = await Promise.race([
                tokenAccountsPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SIO token balance fetch timeout')), 10000)
                )
            ]);

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

            console.log('loadWalletBalances: Balances updated successfully.');
            console.log('loadWalletBalances: SOL element:', document.getElementById('sol-balance'));
            console.log('loadWalletBalances: SIO element:', document.getElementById('sio-balance'));

            console.log('Balances loaded', {
                sol: solBalance,
                sio: sioBalance,
                endpoint: endpoint
            });

            // Success - update the global connection to use this working endpoint
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

    alert('Unable to load wallet balances. All RPC endpoints are currently busy. Please try again in a few minutes.');
    addChatMessage(
        'assistant',
        '⚠️ Unable to load balances (all RPC endpoints busy). Try again in a few minutes.'
    );
}


// Log initialization
console.log('Singularity.io v0.2.0 - Neural Network Visualization Ready');
