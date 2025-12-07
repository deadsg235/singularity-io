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
let animationFrame;
let particles = [];

function initCanvas() {
    canvas = document.getElementById('network-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

// Load neural network
async function loadNeuralNetwork() {
    try {
        const response = await fetch(`${API_BASE}/api/neural/network`);
        networkData = await response.json();
        document.getElementById('node-count').textContent = `Nodes: ${networkData.nodes.length}`;
        initParticles();
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
    
    ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (networkData) {
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
});

// Log initialization
console.log('Singularity.io v0.2.0 - Neural Network Visualization Ready');
