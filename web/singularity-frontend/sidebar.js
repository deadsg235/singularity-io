// Sidebar Navigation System
class SidebarNavigation {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.menuBtn = document.getElementById('menu-btn');
        this.closeBtn = document.getElementById('close-sidebar');
        this.ultimaBtn = document.getElementById('ultima-sidebar-btn');
        
        this.init();
    }
    
    init() {
        // Menu button click
        this.menuBtn.addEventListener('click', () => this.openSidebar());
        
        // Close button click
        this.closeBtn.addEventListener('click', () => this.closeSidebar());
        
        // Overlay click
        this.overlay.addEventListener('click', () => this.closeSidebar());
        
        // ULTIMA button in sidebar
        if (this.ultimaBtn) {
            this.ultimaBtn.addEventListener('click', () => {
                this.closeSidebar();
                // Trigger ULTIMA modal if it exists
                const ultimaBtn = document.getElementById('ultima-btn');
                if (ultimaBtn) {
                    ultimaBtn.click();
                }
            });
        }
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
                this.closeSidebar();
            }
        });
    }
    
    openSidebar() {
        this.sidebar.classList.add('open');
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SidebarNavigation();
});