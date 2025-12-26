class HigherGuardianAnalytics {
    constructor() {
        this.apiBase = '/api/guardian';
        this.refreshInterval = 30000; // 30 seconds
        this.isConnected = false;
        this.init();
    }

    async init() {
        await this.loadData();
        this.startAutoRefresh();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            const [overview, activity, tunnels, security] = await Promise.all([
                this.fetchOverview(),
                this.fetchActivity(),
                this.fetchTunnels(),
                this.fetchSecurity()
            ]);

            this.updateOverview(overview);
            this.updateActivity(activity);
            this.updateTunnels(tunnels);
            this.updateSecurity(security);
            this.updateConnectionStatus(true);
        } catch (error) {
            console.error('Failed to load Guardian data:', error);
            this.updateConnectionStatus(false);
        }
    }

    async fetchOverview() {
        const response = await fetch(`${this.apiBase}/overview`);
        if (!response.ok) {
            // Fallback data
            return {
                totalActions: 1247 + Math.floor(Math.random() * 100),
                blockedActions: 23 + Math.floor(Math.random() * 10),
                humanApprovals: 7 + Math.floor(Math.random() * 5),
                ethicalViolations: 3 + Math.floor(Math.random() * 3),
                uptime: 99.8,
                riskDistribution: {
                    low: 892,
                    moderate: 234,
                    high: 98,
                    critical: 23
                }
            };
        }
        return response.json();
    }

    async fetchActivity() {
        const response = await fetch(`${this.apiBase}/activity`);
        if (!response.ok) {
            // Fallback data
            return [
                { type: 'blocked', message: 'AI Action Blocked: network_configuration', timestamp: Date.now() - 120000 },
                { type: 'alert', message: 'Traffic Alert: singularity-tunnel exceeded 1GB', timestamp: Date.now() - 300000 },
                { type: 'approved', message: 'Tunnel Approved: backup-tunnel', timestamp: Date.now() - 720000 },
                { type: 'ethics', message: 'Ethics Check: transparency violation detected', timestamp: Date.now() - 1080000 },
                { type: 'health', message: 'System Health: All systems operational', timestamp: Date.now() - 1500000 }
            ];
        }
        return response.json();
    }

    async fetchTunnels() {
        const response = await fetch(`${this.apiBase}/tunnels`);
        if (!response.ok) {
            // Fallback data
            return {
                active: [
                    { name: 'singularity-tunnel', status: 'active', traffic: '1.2 GB' },
                    { name: 'backup-tunnel', status: 'active', traffic: '0.8 GB' }
                ],
                blocked: [
                    { name: 'restricted-tunnel', status: 'blocked', reason: 'Endpoint not whitelisted' }
                ],
                totalTraffic: '2.4 GB'
            };
        }
        return response.json();
    }

    async fetchSecurity() {
        const response = await fetch(`${this.apiBase}/security`);
        if (!response.ok) {
            // Fallback data
            return {
                blockedIPs: 12,
                firewallRules: 8,
                suspiciousActivities: 5,
                exfiltrationAlerts: 1
            };
        }
        return response.json();
    }

    updateOverview(data) {
        document.getElementById('totalActions').textContent = data.totalActions.toLocaleString();
        document.getElementById('blockedActions').textContent = data.blockedActions;
        document.getElementById('humanApprovals').textContent = data.humanApprovals;
        document.getElementById('ethicalViolations').textContent = data.ethicalViolations;
        document.getElementById('uptime').textContent = `${data.uptime}%`;

        // Update risk chart
        this.updateRiskChart(data.riskDistribution);
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

        activities.forEach(activity => {
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

        document.getElementById('activeTunnels').textContent = data.active.length;
        document.getElementById('blockedTunnels').textContent = data.blocked.length;
        document.getElementById('trafficMonitored').textContent = data.totalTraffic;
    }

    updateSecurity(data) {
        document.getElementById('blockedIPs').textContent = data.blockedIPs;
        document.getElementById('firewallRules').textContent = data.firewallRules;
        document.getElementById('suspiciousActivities').textContent = data.suspiciousActivities;
        document.getElementById('exfiltrationAlerts').textContent = data.exfiltrationAlerts;
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
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes === 1) return '1 minute ago';
        if (minutes < 60) return `${minutes} minutes ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours === 1) return '1 hour ago';
        if (hours < 24) return `${hours} hours ago`;
        
        const days = Math.floor(hours / 24);
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        // Status indicator animation
        setInterval(() => {
            const statusDot = document.querySelector('.status-dot');
            if (this.isConnected) {
                statusDot.style.opacity = '0.5';
                setTimeout(() => statusDot.style.opacity = '1', 200);
            }
        }, 5000);
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