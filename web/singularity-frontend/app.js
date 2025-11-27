const nodeContainer = document.getElementById('node-container');
const nodeCountSpan = document.getElementById('node-count');

const totalNodes = 16000000;
const displayedNodes = 100; // For performance, we'll only display a subset

// Function to fetch node count from the API
async function fetchNodeCount() {
    try {
        // This is a placeholder. In a real scenario, you'd have a server running.
        // To simulate, we'll just use the totalNodes value.
        // const response = await fetch('/api/nodes');
        // const data = await response.json();
        // nodeCountSpan.textContent = data.node_count.toLocaleString();
        nodeCountSpan.textContent = totalNodes.toLocaleString();
    } catch (error) {
        console.error('Error fetching node count:', error);
        nodeCountSpan.textContent = totalNodes.toLocaleString(); // Fallback
    }
}

// Set up canvas for links
const canvas = d3.select(nodeContainer).append('canvas')
    .attr('width', window.innerWidth)
    .attr('height', window.innerHeight)
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0);
const context = canvas.node().getContext('2d');


// Generate nodes
const nodes = [];
for (let i = 0; i < displayedNodes; i++) {
    const node = document.createElement('div');
    node.classList.add('node');
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    nodeContainer.appendChild(node);
    nodes.push({ id: i, element: node, x, y, vx: 0, vy: 0, connections: new Map() });
}

// Create links based on proximity (a simple algorithm)
const links = [];
for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
            links.push({ source: nodes[i], target: nodes[j], strength: 1 });
            nodes[i].connections.set(j, 1);
            nodes[j].connections.set(i, 1);
        }
    }
}


// Mouse interaction
document.addEventListener('mousemove', (event) => {
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    nodes.forEach(node => {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
            const force = (150 - distance) / 150;
            node.vx += dx / distance * force * 0.1;
            node.vy += dy / distance * force * 0.1;
        }
    });
});

// Animation loop
function animate() {
    // Reinforcement learning simulation
    nodes.forEach(node => {
        // Simple "learning": strengthen connections to nearby nodes
        for (let i = 0; i < nodes.length; i++) {
             if (i === node.id) continue;
             const otherNode = nodes[i];
             const dx = node.x - otherNode.x;
             const dy = node.y - otherNode.y;
             const distance = Math.sqrt(dx*dx + dy*dy);

             if(distance < 120) {
                 const currentStrength = node.connections.get(i) || 0;
                 if (currentStrength < 1) {
                    node.connections.set(i, Math.min(1, currentStrength + 0.001));
                 }
             } else {
                 const currentStrength = node.connections.get(i) || 0;
                 if (currentStrength > 0) {
                    node.connections.set(i, Math.max(0, currentStrength - 0.0005));
                 }
             }
        }
    });


    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = 0; i < nodes.length; i++) {
        for (const [j, strength] of nodes[i].connections.entries()) {
            if (strength > 0.1) {
                 const otherNode = nodes[j];
                 context.beginPath();
                 context.moveTo(nodes[i].x + 5, nodes[i].y + 5);
                 context.lineTo(otherNode.x + 5, otherNode.y + 5);
                 context.strokeStyle = `rgba(0, 255, 0, ${strength * 0.5})`;
                 context.stroke();
            }
        }
    }


    nodes.forEach(node => {
        // Attraction to center
        node.vx += (window.innerWidth / 2 - node.x) * 0.00001;
        node.vy += (window.innerHeight / 2 - node.y) * 0.00001;

        // Apply velocity and friction
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.95;
        node.vy *= 0.95;

        // Bounce off edges
        if (node.x < 0 || node.x > window.innerWidth) node.vx *= -1;
        if (node.y < 0 || node.y > window.innerHeight) node.vy *= -1;


        node.element.style.left = `${node.x}px`;
        node.element.style.top = `${node.y}px`;
    });

    requestAnimationFrame(animate);
}

// Initial setup
fetchNodeCount();
animate();

window.addEventListener('resize', () => {
    canvas.attr('width', window.innerWidth);
    canvas.attr('height', window.innerHeight);
});
