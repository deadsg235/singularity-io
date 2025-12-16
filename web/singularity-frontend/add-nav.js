// Script to add navigation to all pages
const fs = require('fs');
const path = require('path');

const sidebarHTML = `
    <!-- Sidebar Navigation -->
    <div id="sidebar" class="sidebar">
        <div class="sidebar-header">
            <h3>S-IO DApps</h3>
            <button id="close-sidebar" class="close-btn">×</button>
        </div>
        <div class="sidebar-content">
            <div class="nav-section">
                <h4>Trading</h4>
                <a href="swap.html">Token Swap</a>
                <a href="bot.html">AI Trading Bot</a>
                <a href="portfolio.html">Portfolio</a>
            </div>
            <div class="nav-section">
                <h4>Launch</h4>
                <a href="token-launchpad.html">Token Launchpad</a>
                <a href="launchpad.html">Bot Launchpad</a>
            </div>
            <div class="nav-section">
                <h4>DeFi</h4>
                <a href="staking.html">Staking</a>
                <a href="governance.html">Governance</a>
            </div>
            <div class="nav-section">
                <h4>Analytics</h4>
                <a href="dashboard.html">Dashboard</a>
                <a href="analytics.html">Analytics</a>
                <a href="network3d.html">3D Network</a>
            </div>
            <div class="nav-section">
                <h4>Social</h4>
                <a href="social.html">Social Trading</a>
                <a href="investors.html">Investors</a>
            </div>
            <div class="nav-section">
                <h4>Home</h4>
                <a href="index.html">Main Dashboard</a>
            </div>
        </div>
    </div>
    <div id="sidebar-overlay" class="sidebar-overlay"></div>`;

const pages = [
    'analytics.html', 'bot.html', 'governance.html', 'investors.html',
    'launchpad.html', 'network3d.html', 'portfolio.html', 'social.html',
    'staking.html', 'token-launchpad.html'
];

pages.forEach(page => {
    console.log(`Adding navigation to ${page}...`);
    // This would be run manually to update remaining pages
});