// Add Higher Guardian Analytics to navigation
document.addEventListener('DOMContentLoaded', function() {
    // Find the navigation container
    const nav = document.querySelector('nav') || document.querySelector('.nav') || document.querySelector('#nav');
    
    if (nav) {
        // Create Higher Guardian link
        const guardianLink = document.createElement('a');
        guardianLink.href = 'higher-guardian.html';
        guardianLink.textContent = '🛡️ Guardian Analytics';
        guardianLink.className = 'nav-link guardian-link';
        guardianLink.style.cssText = `
            color: #00d4ff;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        // Add hover effect
        guardianLink.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(0, 212, 255, 0.1)';
            this.style.transform = 'translateY(-1px)';
        });
        
        guardianLink.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
            this.style.transform = 'translateY(0)';
        });
        
        // Insert into navigation
        nav.appendChild(guardianLink);
        
        console.log('Higher Guardian Analytics link added to navigation');
    }
    
    // Add to sidebar if exists
    const sidebar = document.querySelector('.sidebar') || document.querySelector('#sidebar');
    if (sidebar) {
        const sidebarLink = guardianLink.cloneNode(true);
        sidebarLink.style.cssText += 'display: block; margin: 0.5rem 0;';
        sidebar.appendChild(sidebarLink);
    }
});