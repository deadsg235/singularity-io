let wallet = null;
let tokens = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('wallet-btn').addEventListener('click', connectWallet);
    document.getElementById('token-select').addEventListener('change', showMetadata);
    document.getElementById('upload-btn').addEventListener('click', uploadToIPFS);
    loadTokens();
});

async function connectWallet() {
    if (!window.solana?.isPhantom) {
        alert('Install Phantom Wallet');
        return;
    }
    const resp = await window.solana.connect();
    wallet = resp.publicKey;
    document.getElementById('wallet-btn').textContent = `${wallet.toString().slice(0, 4)}...${wallet.toString().slice(-4)}`;
}

function loadTokens() {
    const stored = localStorage.getItem('tokens');
    if (stored) tokens = JSON.parse(stored);
    
    const select = document.getElementById('token-select');
    select.innerHTML = '<option value="">-- Select Token --</option>' + 
        tokens.map((t, i) => `<option value="${i}">${t.name} (${t.symbol})</option>`).join('');
}

function showMetadata() {
    const idx = document.getElementById('token-select').value;
    if (!idx) return;
    
    const token = tokens[idx];
    const metadata = {
        name: token.name,
        symbol: token.symbol,
        description: token.description || '',
        image: token.image || '',
        external_url: token.external_url || '',
        attributes: token.attributes || []
    };
    
    document.getElementById('json-preview').textContent = JSON.stringify(metadata, null, 2);
    document.getElementById('metadata-preview').style.display = 'block';
}

async function uploadToIPFS() {
    const key = document.getElementById('pinata-key').value;
    const idx = document.getElementById('token-select').value;
    
    if (!key || !idx) {
        alert('Enter Pinata API key and select token');
        return;
    }
    
    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';
    
    try {
        const token = tokens[idx];
        const metadata = {
            name: token.name,
            symbol: token.symbol,
            description: token.description || '',
            image: token.image || '',
            external_url: token.external_url || '',
            attributes: token.attributes || []
        };
        
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: { name: `${token.name}-metadata` }
            })
        });
        
        const result = await response.json();
        
        if (result.IpfsHash) {
            const uri = `https://ipfs.io/ipfs/${result.IpfsHash}`;
            document.getElementById('ipfs-uri').value = uri;
            document.getElementById('result').style.display = 'block';
            
            tokens[idx].metadata_uri = uri;
            tokens[idx].ipfs_hash = result.IpfsHash;
            localStorage.setItem('tokens', JSON.stringify(tokens));
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        alert('Upload failed: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload to IPFS';
    }
}
