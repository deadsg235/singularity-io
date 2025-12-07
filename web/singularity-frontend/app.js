// Singularity.io Frontend Application
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : '/api';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Singularity.io initializing...');
    checkSystemStatus();
    setInterval(checkSystemStatus, 30000); // Update every 30 seconds
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

// Log initialization
console.log('Singularity.io v0.1.0 - Ready');
