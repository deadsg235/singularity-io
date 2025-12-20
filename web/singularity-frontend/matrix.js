let matrixCanvas, matrixCtx;
let drops = [];
let walletConnected = false;

const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

function initMatrix() {
    matrixCanvas = document.createElement('canvas');
    matrixCanvas.id = 'matrix-bg';
    matrixCanvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none;';
    document.body.appendChild(matrixCanvas);
    
    matrixCtx = matrixCanvas.getContext('2d');
    resizeMatrix();
    
    const columns = Math.floor(matrixCanvas.width / 20);
    drops.length = 0;
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * matrixCanvas.height;
    }
    
    window.addEventListener('resize', resizeMatrix);
    animateMatrix();
}

function resizeMatrix() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
}

function animateMatrix() {
    matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    
    const fontSize = 16;
    matrixCtx.font = `${fontSize}px monospace`;
    
    for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 20;
        const y = drops[i] * fontSize;
        
        if (walletConnected) {
            const gradient = matrixCtx.createLinearGradient(x, y - 100, x, y + 100);
            gradient.addColorStop(0, '#ff4400');
            gradient.addColorStop(0.5, '#ff8800');
            gradient.addColorStop(1, '#ffaa00');
            matrixCtx.fillStyle = gradient;
        } else {
            matrixCtx.fillStyle = `hsl(200, 100%, ${50 + Math.sin(y * 0.01) * 30}%)`;
        }
        
        matrixCtx.fillText(char, x, y);
        
        if (y > matrixCanvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
    
    requestAnimationFrame(animateMatrix);
}

function setWalletConnected(connected) {
    walletConnected = connected;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatrix);
} else {
    initMatrix();
}

window.setWalletConnected = setWalletConnected;