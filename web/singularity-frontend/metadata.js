// Token Metadata Editor
let wallet = null;
let tokens = [];
let selectedToken = null;
let uploadedImage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('image-upload').addEventListener('click', () => {
        document.getElementById('image-input').click();
    });
    document.getElementById('image-input').addEventListener('change', handleImageUpload);
    document.getElementById('update-btn').addEventListener('click', updateMetadata);
    
    // Auto-update preview
    ['meta-name', 'meta-symbol', 'meta-description', 'meta-url', 'meta-attributes'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });
    
    loadTokens();
});

// Connect Wallet
async function connectWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            alert('Please install Phantom Wallet');
            window.open('https://phantom.app/', '_blank');
            return;
        }
        
        const resp = await window.solana.connect();
        wallet = resp.publicKey;
        
        const btn = document.getElementById('wallet-btn');
        btn.textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
        btn.classList.add('connected');
        
        console.log('Wallet connected:', wallet.toString());
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Failed to connect wallet');
    }
}

// Load tokens
function loadTokens() {
    try {
        const stored = localStorage.getItem('tokens');
        if (stored) {
            tokens = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading tokens:', e);
        tokens = [];
    }
    displayTokens();
}

// Display tokens
function displayTokens() {
    const list = document.getElementById('token-list');
    
    if (tokens.length === 0) {
        list.innerHTML = '<p style="color: #666;">No tokens found. Create one on the <a href="launchpad.html" style="color: #0066ff;">Launchpad</a></p>';
        return;
    }
    
    list.innerHTML = tokens.map((token, index) => `
        <div class="token-option" onclick="selectToken(${index})">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #fff;">${token.name || 'Unknown'} (${token.symbol || 'N/A'})</strong>
                    <p style="color: #666; font-size: 0.85rem; margin: 0.25rem 0 0 0;">Mint: ${token.mint ? token.mint.slice(0, 8) + '...' + token.mint.slice(-8) : 'N/A'}</p>
                </div>
                <span style="color: #0066ff;">→</span>
            </div>
        </div>
    `).join('');
}

// Select token
function selectToken(index) {
    selectedToken = tokens[index];
    
    // Update UI
    document.querySelectorAll('.token-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });
    
    // Show editor
    document.getElementById('metadata-editor').classList.add('active');
    
    // Load existing metadata
    document.getElementById('meta-name').value = selectedToken.name || '';
    document.getElementById('meta-symbol').value = selectedToken.symbol || '';
    document.getElementById('meta-description').value = selectedToken.description || '';
    document.getElementById('meta-url').value = selectedToken.external_url || '';
    document.getElementById('meta-attributes').value = selectedToken.attributes ? JSON.stringify(selectedToken.attributes, null, 2) : '';
    
    // Load image if exists
    if (selectedToken.image) {
        document.getElementById('image-preview').src = selectedToken.image;
        document.getElementById('image-preview').style.display = 'block';
    } else {
        document.getElementById('image-preview').style.display = 'none';
    }
    
    updatePreview();
}

// Handle image upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadedImage = event.target.result;
        document.getElementById('image-preview').src = uploadedImage;
        document.getElementById('image-preview').style.display = 'block';
        updatePreview();
    };
    reader.readAsDataURL(file);
}

// Update preview
function updatePreview() {
    if (!selectedToken) return;
    
    const metadata = {
        name: document.getElementById('meta-name').value || selectedToken.name,
        symbol: document.getElementById('meta-symbol').value || selectedToken.symbol,
        description: document.getElementById('meta-description').value || selectedToken.description,
        image: uploadedImage || selectedToken.image || '',
        external_url: document.getElementById('meta-url').value || '',
        attributes: []
    };
    
    try {
        const attrs = document.getElementById('meta-attributes').value;
        if (attrs) {
            metadata.attributes = JSON.parse(attrs);
        }
    } catch (e) {
        metadata.attributes = [];
    }
    
    document.getElementById('metadata-json').textContent = JSON.stringify(metadata, null, 2);
}

// Update metadata
async function updateMetadata() {
    if (!selectedToken) {
        alert('Please select a token first');
        return;
    }
    
    if (!wallet) {
        alert('Please connect your wallet');
        return;
    }
    
    const btn = document.getElementById('update-btn');
    btn.disabled = true;
    btn.textContent = 'Updating...';
    
    try {
        // Get metadata
        const metadata = {
            name: document.getElementById('meta-name').value,
            symbol: document.getElementById('meta-symbol').value,
            description: document.getElementById('meta-description').value,
            image: uploadedImage || selectedToken.image || '',
            external_url: document.getElementById('meta-url').value,
            attributes: []
        };
        
        try {
            const attrs = document.getElementById('meta-attributes').value;
            if (attrs) {
                metadata.attributes = JSON.parse(attrs);
            }
        } catch (e) {
            alert('Invalid JSON in attributes field');
            throw e;
        }
        
        // Update token in storage
        const tokenIndex = tokens.findIndex(t => t.mint === selectedToken.mint);
        if (tokenIndex !== -1) {
            tokens[tokenIndex] = {
                ...tokens[tokenIndex],
                ...metadata,
                metadata_updated: Date.now()
            };
            localStorage.setItem('tokens', JSON.stringify(tokens));
        }
        
        alert('Metadata updated successfully!\\n\\nNote: To publish on-chain, you need to upload to IPFS/Arweave and update the token metadata account.');
        
        loadTokens();
        selectToken(tokenIndex);
        
    } catch (error) {
        console.error('Metadata update error:', error);
        alert('Failed to update metadata: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update Metadata';
    }
}

console.log('Metadata editor initialized');
