// Wallet integration and balance management
let walletConnected = false;
let walletAddress = null;

// Initialize wallet functionality
function initWallet() {
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }
    
    // Check if wallet was previously connected
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
        walletAddress = savedAddress;
        updateWalletUI(true);
        loadBalances();
    }
}

// Connect to Phantom wallet
async function connectWallet() {
    try {
        if (window.solana && window.solana.isPhantom) {
            const response = await window.solana.connect();
            walletAddress = response.publicKey.toString();
            walletConnected = true;
            
            // Save to localStorage
            localStorage.setItem('walletAddress', walletAddress);
            
            updateWalletUI(true);
            loadBalances();
            
            console.log('Wallet connected:', walletAddress);
        } else {
            alert('Phantom wallet not found. Please install Phantom wallet extension.');
            window.open('https://phantom.app/', '_blank');
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

// Disconnect wallet
function disconnectWallet() {
    walletConnected = false;
    walletAddress = null;
    localStorage.removeItem('walletAddress');
    updateWalletUI(false);
    hideBalances();
}

// Update wallet UI
function updateWalletUI(connected) {
    const walletBtn = document.getElementById('wallet-btn');
    const balanceDisplay = document.getElementById('balance-display');
    
    if (connected && walletAddress) {
        walletBtn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        walletBtn.onclick = disconnectWallet;
        if (balanceDisplay) {
            balanceDisplay.style.display = 'flex';
        }
    } else {
        walletBtn.textContent = 'Connect Wallet';
        walletBtn.onclick = connectWallet;
        if (balanceDisplay) {
            balanceDisplay.style.display = 'none';
        }
    }
}

// Load wallet balances
async function loadBalances() {
    if (!walletAddress) return;
    
    try {
        const response = await fetch(`/api/wallet/full-balance/${walletAddress}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            updateBalanceDisplay(data.balances);
        } else {
            console.error('Failed to load balances:', data);
            // Show demo balances if API unavailable
            updateBalanceDisplay({ SOL: 0.0, 'S-IO': 0.0 });
        }
    } catch (error) {
        console.error('Error loading balances:', error);
        // Show demo balances if API unavailable
        updateBalanceDisplay({ SOL: 0.0, 'S-IO': 0.0 });
    }
}

// Update balance display
function updateBalanceDisplay(balances) {
    const solBalance = document.getElementById('sol-balance');
    const sioBalance = document.getElementById('sio-balance');
    
    if (solBalance) {
        solBalance.textContent = parseFloat(balances.SOL || 0).toFixed(4);
    }
    
    if (sioBalance) {
        sioBalance.textContent = parseFloat(balances['S-IO'] || 0).toFixed(2);
    }
}

// Hide balances
function hideBalances() {
    const balanceDisplay = document.getElementById('balance-display');
    if (balanceDisplay) {
        balanceDisplay.style.display = 'none';
    }
}

// Refresh balances
async function refreshBalances() {
    if (walletConnected && walletAddress) {
        await loadBalances();
    }
}

// Auto-refresh balances every 30 seconds
setInterval(refreshBalances, 30000);

// Export functions for use in other scripts
window.walletFunctions = {
    connectWallet,
    disconnectWallet,
    loadBalances,
    refreshBalances,
    getWalletAddress: () => walletAddress,
    isWalletConnected: () => walletConnected
};
