class HigherGuardianAnalytics {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/guardian';
        this.refreshInterval = 2000;
        this.isConnected = false;
        this.lastUpdate = Date.now();
        this.init();
    }

    async init() {
        await this.loadData();
        this.startAutoRefresh();
        this.setupEventListeners();
        this.startRealTimeUpdates();
    }

    async loadData() {
        try {
            console.log('Fetching Guardian data...');
            const [overview, activity, tunnels, security, aiSystems] = await Promise.all([
                fetch(`${this.apiBase}/overview`).then(r => r.json()),
                fetch(`${this.apiBase}/activity`).then(r => r.json()),
                fetch(`${this.apiBase}/tunnels`).then(r => r.json()),
                fetch(`${this.apiBase}/security`).then(r => r.json()),
                fetch(`${this.apiBase}/ai-systems`).then(r => r.json())
            ]);

            console.log('Data received:', { overview, activity, tunnels, security, aiSystems });
            
            this.updateOverview(overview);
            this.updateActivity(activity);
            this.updateTunnels(tunnels);
            this.updateSecurity(security);
            this.updateAISystems(aiSystems);
            this.updateConnectionStatus(true);
            this.lastUpdate = Date.now();
        } catch (error) {
            console.error('Failed to load Guardian data:', error);
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
        setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    }

    startRealTimeUpdates() {
        // Remove simulation - just refresh data
    }

    async simulateEvent() {
        const events = ['blocked', 'alert', 'approved', 'ethics', 'tunnel'];
        const eventType = events[Math.floor(Math.random() * events.length)];
        
        try {
            await fetch(`${this.apiBase}/simulate-event?event_type=${eventType}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.log('Simulation event failed:', error);
        }
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

        // Real-time status indicator
        setInterval(() => {
            const statusDot = document.querySelector('.status-dot');
            if (this.isConnected) {
                statusDot.style.opacity = '0.5';
                setTimeout(() => statusDot.style.opacity = '1', 200);
            }
        }, 3000);
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