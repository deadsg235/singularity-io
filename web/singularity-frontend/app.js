const nodeContainer = document.getElementById('node-container');
const nodeCountSpan = document.getElementById('node-count');

let nodes = [];
let connections = [];

// Function to fetch node count from the API
async function fetchNodeCount() {
    try {
        const response = await fetch('/api/nodes');
        const data = await response.json();
        nodeCountSpan.textContent = data.node_count.toLocaleString();
    } catch (error) {
        console.error('Error fetching node count:', error);
        nodeCountSpan.textContent = '16,000,000'; // Fallback
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

async function fetchNetworkState() {
    try {
        const response = await fetch('/api/q_network/state');
        const data = await response.json();
        nodes = data.nodes;
        connections = data.connections;
        // Initial render
        render();
    } catch (error) {
        console.error('Error fetching network state:', error);
    }
}

function render() {
    // Clear existing nodes
    nodeContainer.innerHTML = '';
    nodeContainer.appendChild(canvas.node()); // Re-append canvas

    // Render new nodes
    nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node');
        // The backend will need to provide position data.
        // For now, using random positions.
        const x = node.x || Math.random() * window.innerWidth;
        const y = node.y || Math.random() * window.innerHeight;
        node.x = x;
        node.y = y;
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;
        nodeContainer.appendChild(nodeEl);
        node.element = nodeEl;
    });

    // Render connections
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    connections.forEach(conn => {
        const source = nodes[conn.source];
        const target = nodes[conn.target];
        context.beginPath();
        context.moveTo(source.x + 5, source.y + 5);
        context.lineTo(target.x + 5, target.y + 5);
        context.strokeStyle = `rgba(0, 255, 0, ${conn.strength || 0.5})`;
        context.stroke();
    });
}


// Mouse interaction - simplified to just trigger an update
document.addEventListener('mousemove', (event) => {
    // This could be enhanced to send mouse coordinates to the backend
    // for a more direct perturbation of the Q-network.
});

async function updateAndFetch() {
    try {
        await fetch('/api/q_network/update', { method: 'POST' });
        await fetchNetworkState();
    } catch (error) {
        console.error('Error updating network:', error);
    }
}


// Animation loop - now driven by backend updates
function animate() {
    updateAndFetch();
    requestAnimationFrame(animate);
}

// Initial setup
fetchNodeCount();
fetchNetworkState(); // Initial fetch
setInterval(updateAndFetch, 2000); // Update every 2 seconds


window.addEventListener('resize', () => {
    canvas.attr('width', window.innerWidth);
    canvas.attr('height', window.innerHeight);
    render(); // Re-render on resize
});
