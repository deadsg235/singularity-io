const { Connection, PublicKey, clusterApiUrl } = solanaWeb3;

let connection;
let tokens = [];

document.addEventListener('DOMContentLoaded', () => {
    connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    document.getElementById('token-select').addEventListener('change', loadAnalytics);
    loadTokens();
});

function loadTokens() {
    const stored = localStorage.getItem('tokens');
    if (stored) tokens = JSON.parse(stored);
    
    document.getElementById('token-select').innerHTML = '<option value="">-- Select Token --</option>' + 
        tokens.map((t, i) => `<option value="${i}">${t.name} (${t.symbol})</option>`).join('');
}

async function loadAnalytics() {
    const idx = document.getElementById('token-select').value;
    if (!idx) return;
    
    const token = tokens[idx];
    const mint = new PublicKey(token.mint);
    
    try {
        // Get mint info
        const mintInfo = await connection.getAccountInfo(mint);
        if (!mintInfo) {
            alert('Token not found on-chain');
            return;
        }
        
        // Parse supply
        const supply = Number(mintInfo.data.readBigUInt64LE(36));
        const decimals = mintInfo.data.readUInt8(44);
        const actualSupply = supply / Math.pow(10, decimals);
        
        document.getElementById('supply-info').innerHTML = `
            <p><strong>Total Supply:</strong> ${actualSupply.toLocaleString()}</p>
            <p><strong>Decimals:</strong> ${decimals}</p>
            <p><strong>Mint Address:</strong> ${token.mint.slice(0, 8)}...${token.mint.slice(-8)}</p>
        `;
        
        // Get token accounts (holders)
        const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
            filters: [
                { dataSize: 165 },
                { memcmp: { offset: 0, bytes: mint.toBase58() } }
            ]
        });
        
        const holders = accounts.filter(acc => {
            const amount = Number(acc.account.data.readBigUInt64LE(64));
            return amount > 0;
        });
        
        document.getElementById('holder-info').innerHTML = `
            <p><strong>Total Holders:</strong> ${holders.length}</p>
            <p><strong>Token Accounts:</strong> ${accounts.length}</p>
        `;
        
        // Get recent transactions
        const signatures = await connection.getSignaturesForAddress(mint, { limit: 10 });
        
        document.getElementById('tx-info').innerHTML = `
            <p><strong>Recent Transactions:</strong> ${signatures.length}</p>
        `;
        
        document.getElementById('tx-list').innerHTML = signatures.length > 0 
            ? signatures.map(sig => `
                <div style="padding: 0.5rem; border-bottom: 1px solid #333; font-size: 0.85rem;">
                    <a href="https://solscan.io/tx/${sig.signature}" target="_blank" style="color: #0066ff; text-decoration: none;">
                        ${sig.signature.slice(0, 16)}...${sig.signature.slice(-16)}
                    </a>
                    <span style="color: #666; margin-left: 1rem;">${new Date(sig.blockTime * 1000).toLocaleString()}</span>
                </div>
            `).join('')
            : '<p style="color: #666;">No transactions found</p>';
            
    } catch (error) {
        console.error('Analytics error:', error);
        alert('Failed to load analytics: ' + error.message);
    }
}
