// 3D Neural Network Visualization
let scene, camera, renderer, networkGroup;
let nodes = [], connections = [];
let animationId;

// Initialize 3D scene
function init3D() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 500);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const container = document.getElementById('network-container');
    container.appendChild(renderer.domElement);

    // Create network group
    networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Add controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x00ff88, 0.8);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    // Load network data
    loadNetwork3D();

    // Start animation
    animate3D();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Load network data from API
async function loadNetwork3D() {
    try {
        const response = await fetch('/api/neural/network');
        const data = await response.json();
        
        if (data.nodes && data.connections) {
            createNetwork3D(data);
        } else {
            createDemoNetwork3D();
        }
    } catch (error) {
        console.error('Error loading network:', error);
        createDemoNetwork3D();
    }
}

// Create 3D network visualization
function createNetwork3D(data) {
    // Clear existing network
    networkGroup.clear();
    nodes = [];
    connections = [];

    // Create nodes
    const nodeGeometry = new THREE.SphereGeometry(2, 16, 16);
    
    data.nodes.forEach(nodeData => {
        const nodeMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(0.6, 1, 0.3 + nodeData.activation * 0.7),
            transparent: true,
            opacity: 0.8
        });
        
        const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
        nodeMesh.position.set(
            (nodeData.x - 400) * 0.5,
            (nodeData.y - 200) * 0.5,
            nodeData.z || 0
        );
        
        nodeMesh.userData = nodeData;
        networkGroup.add(nodeMesh);
        nodes.push(nodeMesh);
    });

    // Create connections
    data.connections.forEach(connData => {
        if (!connData.active) return;
        
        const sourceNode = nodes.find(n => n.userData.id === connData.source);
        const targetNode = nodes.find(n => n.userData.id === connData.target);
        
        if (sourceNode && targetNode) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                sourceNode.position,
                targetNode.position
            ]);
            
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff88,
                transparent: true,
                opacity: Math.abs(connData.weight) * 0.5 + 0.1
            });
            
            const line = new THREE.Line(geometry, material);
            line.userData = connData;
            networkGroup.add(line);
            connections.push(line);
        }
    });
}

// Create demo network when API unavailable
function createDemoNetwork3D() {
    networkGroup.clear();
    nodes = [];
    connections = [];

    const nodeGeometry = new THREE.SphereGeometry(3, 16, 16);
    const nodeMaterial = new THREE.MeshPhongMaterial({ color: 0x0066ff });

    // Create demo nodes in layers
    for (let layer = 0; layer < 4; layer++) {
        const nodesInLayer = [4, 8, 6, 2][layer];
        for (let i = 0; i < nodesInLayer; i++) {
            const angle = (i / nodesInLayer) * Math.PI * 2;
            const radius = 50 + layer * 20;
            
            const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
            nodeMesh.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                (layer - 1.5) * 100
            );
            
            networkGroup.add(nodeMesh);
            nodes.push(nodeMesh);
        }
    }
}

// Animation loop
function animate3D() {
    animationId = requestAnimationFrame(animate3D);
    
    // Rotate network group
    networkGroup.rotation.y += 0.005;
    
    // Animate node colors
    nodes.forEach((node, index) => {
        const time = Date.now() * 0.001;
        const hue = (time + index * 0.1) % 1;
        node.material.color.setHSL(hue, 0.8, 0.5);
    });
    
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update network
async function updateNetwork3D() {
    try {
        await fetch('/api/neural/update', { method: 'POST' });
        await loadNetwork3D();
    } catch (error) {
        console.error('Error updating network:', error);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initMatrix();
    init3D();
    
    // Auto-update every 10 seconds
    setInterval(updateNetwork3D, 10000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});
