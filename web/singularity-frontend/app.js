// Singularity.io Frontend Application
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : '';

let canvas, ctx;
let networkData = null;
let walletAddress = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Singularity.io initializing...');
    initCanvas();
    initWallet();
    loadNeuralNetwork();
    checkSystemStatus();
    setInterval(checkSystemStatus, 30000);
    
    document.getElementById('update-btn').addEventListener('click', updateNetwork);
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
});

// Check system status
async function checkSystemStatus() {
    try {
        // Check API health
        const healthResponse = await fetch(`${API_BASE}/api/health`);
        const healthData = await healthResponse.json();
        updateStatus('api-status', healthData.status === 'healthy' ? 'Online' : 'Offline', healthData.status === 'healthy');

        // Check network stats
        const networkResponse = await fetch(`${API_BASE}/api/network/stats`);
        const networkData = await networkResponse.json();
        updateStatus('network-status', networkData.solana_network || 'Unknown', true);

        // Check SolFunMeme status
        const solfunmemeResponse = await fetch(`${API_BASE}/api/solfunmeme/status`);
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
function initCanvas() {
    canvas = document.getElementById('network-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    if (networkData) drawNetwork();
}

// Load neural network
async function loadNeuralNetwork() {
    try {
        const response = await fetch(`${API_BASE}/api/neural/network`);
        networkData = await response.json();
        document.getElementById('node-count').textContent = `Nodes: ${networkData.nodes.length}`;
        drawNetwork();
    } catch (error) {
        console.error('Error loading network:', error);
    }
}

// Update network
async function updateNetwork() {
    try {
        await fetch(`${API_BASE}/api/neural/update`, { method: 'POST' });
        await loadNeuralNetwork();
    } catch (error) {
        console.error('Error updating network:', error);
    }
}

// Draw neural network
function drawNetwork() {
    if (!networkData || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 50;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    
    // Draw connections
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    networkData.connections.forEach(conn => {
        const source = networkData.nodes[conn.source];
        const target = networkData.nodes[conn.target];
        const x1 = padding + source.x * width;
        const y1 = padding + source.y * height;
        const x2 = padding + target.x * width;
        const y2 = padding + target.y * height;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
    
    // Draw nodes
    networkData.nodes.forEach(node => {
        const x = padding + node.x * width;
        const y = padding + node.y * height;
        const radius = 4 + node.value * 4;
        
        ctx.fillStyle = `rgba(0, ${100 + node.value * 155}, 255, ${0.6 + node.value * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

// Phantom Wallet Integration
function initWallet() {
    if (window.solana && window.solana.isPhantom) {
        console.log('Phantom wallet detected');
    }
}

async function connectWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const resp = await window.solana.connect();
        walletAddress = resp.publicKey.toString();
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        btn.classList.add('connected');
        
        updateStatus('wallet-status', 'Connected', true);
        console.log('Wallet connected:', walletAddress);
    } catch (error) {
        console.error('Wallet connection error:', error);
        updateStatus('wallet-status', 'Connection Failed', false);
    }
}

// Log initialization
console.log('Singularity.io v0.1.0 - Ready');
