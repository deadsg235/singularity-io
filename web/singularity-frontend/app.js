const nodeContainer = document.getElementById('node-container');
const nodeCountSpan = document.getElementById('node-count');
const scoreSpan = document.getElementById('score');
const gameOverDiv = document.getElementById('game-over');
const resetButton = document.getElementById('reset-button');

let nodes = [];
let connections = [];
let gameInterval;

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
        updateGameUI(data.game_state);
        render();
        if (data.game_state.game_over) {
            endGame();
        }
    } catch (error) {
        console.error('Error fetching network state:', error);
    }
}

function updateGameUI(gameState) {
    scoreSpan.textContent = gameState.score;
}

function render() {
    // Clear existing nodes
    const existingNodes = document.querySelectorAll('.node');
    existingNodes.forEach(n => n.remove());

    // Render new nodes
    nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node');
        if (node.state === 'active') {
            nodeEl.classList.add('active');
        } else if (node.state === 'unstable') {
            nodeEl.classList.add('unstable');
        }

        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;

        nodeEl.addEventListener('click', () => {
            perturbNode(node.id);
        });

        nodeContainer.appendChild(nodeEl);
        node.element = nodeEl;
    });

    // Render connections
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    connections.forEach(conn => {
        const source = nodes[conn.source];
        const target = nodes[conn.target];
        if (source && target) {
            context.beginPath();
            context.moveTo(source.x + 5, source.y + 5);
            context.lineTo(target.x + 5, target.y + 5);
            context.strokeStyle = `rgba(0, 255, 0, ${conn.strength || 0.5})`;
            context.stroke();
        }
    });
}

async function perturbNode(nodeId) {
    try {
        await fetch(`/api/q_network/perturb/${nodeId}`, { method: 'POST' });
    } catch (error) {
        console.error(`Error perturbing node ${nodeId}:`, error);
    }
}

async function updateAndFetch() {
    try {
        await fetch('/api/q_network/update', { method: 'POST' });
        await fetchNetworkState();
    } catch (error) {
        console.error('Error updating network:', error);
    }
}

function startGame() {
    gameOverDiv.style.display = 'none';
    fetchNodeCount();
    fetchNetworkState();
    gameInterval = setInterval(updateAndFetch, 500); // Faster updates for gameplay
}

function endGame() {
    clearInterval(gameInterval);
    gameOverDiv.style.display = 'block';
}

resetButton.addEventListener('click', async () => {
    try {
        await fetch('/api/game/reset', { method: 'POST' });
        startGame();
    } catch (error) {
        console.error('Error resetting game:', error);
    }
});


window.addEventListener('resize', () => {
    canvas.attr('width', window.innerWidth);
    canvas.attr('height', window.innerHeight);
    render(); // Re-render on resize
});

// Start the game
startGame();
