class HigherGuardianAnalytics {
    constructor() {
        // Use relative URL so it works on Vercel and localhost
        this.apiBase = '/api/guardian';
        this.refreshInterval = 30000;  // 30s — was 2s which hammered the API
        this.isConnected = false;
        this.lastUpdate = Date.now();
        this.walletAddress = null;
        this.init();
    }

    async init() {
        this._syncWallet();
        window.addEventListener('walletConnected', (e) => {
            this.walletAddress = e.detail && e.detail.publicKey;
            this.loadWalletAnalysis();
        });
        window.addEventListener('walletDisconnected', () => {
            this.walletAddress = null;
        });
        await this.loadData();
        this.startAutoRefresh();
        this.setupEventListeners();
    }

    _syncWallet() {
        this.walletAddress = window.walletManager?.publicKey
            || window.solana?.publicKey?.toString()
            || localStorage.getItem('walletAddress')
            || null;
    }

    async loadWalletAnalysis() {
        if (!this.walletAddress) return;
        try {
            const res = await fetch('/api/guardian/analyze/' + this.walletAddress);
            if (!res.ok) return;
            const data = await res.json();
            this._renderWalletAnalysis(data);
        } catch (e) {
            console.warn('Guardian wallet analysis failed:', e.message);
        }
    }

    _renderWalletAnalysis(data) {
        const container = document.getElementById('wallet-analysis');
        if (!container) return;
        container.innerHTML =
            '<div style="padding:1rem;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid rgba(220,38,38,0.3)">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:.75rem">' +
            '<span style="color:#888">Risk Score</span>' +
            '<span style="color:' + this._riskColor(data.risk_score) + ';font-weight:700;font-size:1.2rem">' +
            data.risk_score.toFixed(1) + ' — ' + data.risk_label + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:.5rem">' +
            '<span style="color:#888">SOL Balance</span><span style="color:#fff">' + (data.sol_balance || 0).toFixed(4) + ' SOL</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:.5rem">' +
            '<span style="color:#888">Tokens Held</span><span style="color:#fff">' + (data.token_count || 0) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:.5rem">' +
            '<span style="color:#888">Flagged Txs</span>' +
            '<span style="color:' + (data.flagged_transactions.length > 0 ? '#ff4444' : '#00ff88') + '">' +
            data.flagged_transactions.length + '</span></div>' +
            '<div style="display:flex;justify-content:space-between">' +
            '<span style="color:#888">DQN Engine</span>' +
            '<span style="color:' + (data.dqn_available ? '#00ff88' : '#888') + '">' +
            (data.dqn_available ? 'ACTIVE' : 'FALLBACK') + '</span></div>' +
            '</div>';
    }

    _riskColor(score) {
        if (score < 15) return '#00ff88';
        if (score < 35) return '#66ff99';
        if (score < 55) return '#ffaa00';
        if (score < 75) return '#ff6600';
        return '#ff4444';
    }

    async loadData() {
        try {
            const [overview, activity, tunnels, security, aiSystems] = await Promise.all([
                fetch(this.apiBase + '/overview').then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(this.apiBase + '/activity').then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(this.apiBase + '/tunnels').then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(this.apiBase + '/security').then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(this.apiBase + '/ai-systems').then(r => r.ok ? r.json() : null).catch(() => null),
            ]);

            if (overview)  this.updateOverview(overview);
            if (activity)  this.updateActivity(activity);
            if (tunnels)   this.updateTunnels(tunnels);
            if (security)  this.updateSecurity(security);
            if (aiSystems) this.updateAISystems(aiSystems);

            this.updateConnectionStatus(!!(overview || activity));
            this.lastUpdate = Date.now();

            // Also load wallet-specific analysis if connected
            if (this.walletAddress) this.loadWalletAnalysis();
        } catch (error) {
            console.warn('Guardian data load failed:', error.message);
            this.updateConnectionStatus(false);
        }
    }

    async fetchOverview() {
        const response = await fetch(`${this.apiBase}/overview`);
        return response.json();
    }

    async fetchActivity() {
        const response = await fetch(`${this.apiBase}/activity`);
        return response.json();
    }

    async fetchTunnels() {
        const response = await fetch(`${this.apiBase}/tunnels`);
        return response.json();
    }

    async fetchSecurity() {
        const response = await fetch(`${this.apiBase}/security`);
        return response.json();
    }

    async fetchAISystems() {
        const response = await fetch(`${this.apiBase}/ai-systems`);
        return response.json();
    }

    updateOverview(data) {
        this.animateNumber('totalActions', data.totalActions);
        this.animateNumber('blockedActions', data.blockedActions);
        this.animateNumber('humanApprovals', data.humanApprovals);
        this.animateNumber('ethicalViolations', data.ethicalViolations);
        document.getElementById('uptime').textContent = `${data.uptime.toFixed(1)}%`;
        this.updateRiskChart(data.riskDistribution);
    }

    animateNumber(elementId, newValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
        
        if (currentValue !== newValue) {
            element.style.transition = 'color 0.3s ease';
            element.style.color = '#00ff88';
            element.textContent = newValue.toLocaleString();
            
            setTimeout(() => {
                element.style.color = '';
            }, 1000);
        }
    }

    updateRiskChart(distribution) {
        const total = distribution.low + distribution.moderate + distribution.high + distribution.critical;
        const chart = document.getElementById('riskChart');
        
        chart.innerHTML = `
            <div class="bar risk-low" style="height: ${(distribution.low / total) * 100}%" title="Low: ${distribution.low}"></div>
            <div class="bar risk-moderate" style="height: ${(distribution.moderate / total) * 100}%" title="Moderate: ${distribution.moderate}"></div>
            <div class="bar risk-high" style="height: ${(distribution.high / total) * 100}%" title="High: ${distribution.high}"></div>
            <div class="bar risk-critical" style="height: ${(distribution.critical / total) * 100}%" title="Critical: ${distribution.critical}"></div>
        `;
    }

    updateActivity(activities) {
        const log = document.getElementById('activityLog');
        log.innerHTML = '';
        
        activities.slice(0, 10).forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            const icon = this.getActivityIcon(activity.type);
            const timeAgo = this.formatTimeAgo(activity.timestamp);
            
            item.innerHTML = `
                <div>${icon} ${activity.message}</div>
                <div class="timestamp">${timeAgo}</div>
            `;
            
            log.appendChild(item);
        });
    }

    updateTunnels(data) {
        const tunnelList = document.getElementById('tunnelList');
        tunnelList.innerHTML = '';

        [...data.active, ...data.blocked].forEach(tunnel => {
            const item = document.createElement('div');
            item.className = 'tunnel-item';
            const statusClass = tunnel.status === 'active' ? 'status-active' : 'status-blocked';
            const statusText = tunnel.status.toUpperCase();
            
            item.innerHTML = `
                <span>${tunnel.name}</span>
                <span class="tunnel-status ${statusClass}">${statusText}</span>
            `;
            
            tunnelList.appendChild(item);
        });

        this.animateNumber('activeTunnels', data.active.length);
        this.animateNumber('blockedTunnels', data.blocked.length);
        document.getElementById('trafficMonitored').textContent = data.totalTraffic;
    }

    updateSecurity(data) {
        this.animateNumber('blockedIPs', data.blockedIPs);
        this.animateNumber('firewallRules', data.firewallRules);
        this.animateNumber('suspiciousActivities', data.suspiciousActivities);
        this.animateNumber('exfiltrationAlerts', data.exfiltrationAlerts);
    }

    updateAISystems(data) {
        const container = document.querySelector('.card:nth-child(5)');
        if (!container) return;
        
        const metricsHtml = Object.entries(data).map(([system, info]) => `
            <div class="metric">
                <span>${system}</span>
                <span class="metric-value">${info.actions} actions</span>
            </div>
        `).join('');
        
        container.innerHTML = `<h3>🤖 AI Systems</h3>${metricsHtml}`;
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status span');
        
        if (connected) {
            statusDot.style.background = '#00ff88';
            statusText.textContent = 'System Active';
        } else {
            statusDot.style.background = '#ff4444';
            statusText.textContent = 'Connection Lost';
        }
    }

    getActivityIcon(type) {
        const icons = {
            blocked: '🚫',
            alert: '⚠️',
            approved: '✅',
            ethics: '🔍',
            health: '📊',
            tunnel: '🌐',
            security: '🔒'
        };
        return icons[type] || '📋';
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        
        if (seconds < 10) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    startAutoRefresh() {
        setInterval(() => { this.loadData(); }, this.refreshInterval);
    }

    setupEventListeners() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData();
                refreshBtn.style.transform = 'rotate(360deg)';
                setTimeout(() => refreshBtn.style.transform = '', 500);
            });
        }

        // "My Wallet" button
        const myWalletBtn = document.getElementById('scan-my-wallet-btn');
        if (myWalletBtn) {
            myWalletBtn.addEventListener('click', () => {
                const pub = window.walletManager?.publicKey || window.solana?.publicKey?.toString();
                if (!pub) { alert('Connect your wallet first'); return; }
                const input = document.getElementById('guardian-address-input');
                if (input) input.value = pub;
                this.scanAddress(pub);
            });
        }

        // Real-time status indicator
        setInterval(() => {
            const statusDot = document.querySelector('.status-dot');
            if (statusDot && this.isConnected) {
                statusDot.style.opacity = '0.5';
                setTimeout(() => statusDot.style.opacity = '1', 200);
            }
        }, 3000);
    }

    async scanAddress(address) {
        const input = document.getElementById('guardian-address-input');
        const addr = address || (input && input.value.trim());
        if (!addr) { alert('Enter a Solana address'); return; }

        const container = document.getElementById('wallet-analysis');
        if (container) container.innerHTML = '<span style="color:#888">Scanning on-chain…</span>';

        try {
            const res = await fetch('/api/guardian/analyze/' + addr);
            if (!res.ok) throw new Error('API returned ' + res.status);
            const data = await res.json();
            this._renderWalletAnalysis(data);
        } catch (e) {
            if (container) container.innerHTML = '<span style="color:#ff4444">Scan failed: ' + e.message + '</span>';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.guardianAnalytics = new HigherGuardianAnalytics();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HigherGuardianAnalytics;
}