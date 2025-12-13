import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

let scene, camera, renderer, controls, dragControls;
let nodes = [];
let connections = [];
let layerLabels = [];
let autoRotate = false;
let showConnections = true;
let showLabels = true;
let selectedNode = null;
let isDragging = false;
let stars = [];

// Easter egg
let clickSequence = [];
const secretCode = [0, 7, 15, 23, 31, 39, 47]; // First and last node of each layer
let gameActive = false;
let score = 0;

const layers = [8, 16, 16, 8];
const layerNames = ['INPUT', 'HIDDEN 1', 'HIDDEN 2', 'OUTPUT'];
const layerSpacing = 8;
const nodeRadius = 0.25;

window.resetCamera = resetCamera;
window.toggleRotation = toggleRotation;
window.toggleConnections = toggleConnections;
window.toggleLabels = toggleLabels;
window.randomizeActivation = randomizeActivation;

init();
animate();

function init() {
    const container = document.getElementById('network-3d');
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(8, 4, 8);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    container.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    
    createStarfield();
    
    const ambientLight = new THREE.AmbientLight(0x0066ff, 0.3);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x0066ff, 2, 50);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x00ff88, 1.5, 50);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);
    
    createNetwork();
    
    dragControls = new DragControls(nodes, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', () => {
        controls.enabled = false;
        isDragging = true;
    });
    dragControls.addEventListener('drag', onNodeDrag);
    dragControls.addEventListener('dragend', () => {
        controls.enabled = true;
        isDragging = false;
    });
    
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onNodeClick);
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    
    for (let i = 0; i < 2000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        starPositions.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    stars.push(starField);
}

function createNetwork() {
    let nodeIndex = 0;
    const allNodes = [];
    
    layers.forEach((layerSize, layerIdx) => {
        const layerNodes = [];
        const x = (layerIdx - layers.length / 2 + 0.5) * layerSpacing;
        
        // Create layer plane
        const planeGeometry = new THREE.PlaneGeometry(6, 10);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.set(x, 0, 0);
        plane.rotation.y = Math.PI / 2;
        scene.add(plane);
        
        // Create layer label
        createLayerLabel(layerNames[layerIdx], x, 6);
        
        for (let i = 0; i < layerSize; i++) {
            const gridSize = Math.ceil(Math.sqrt(layerSize));
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const y = (row - gridSize / 2 + 0.5) * 1.5;
            const z = (col - gridSize / 2 + 0.5) * 1.5;
            
            const activation = Math.random();
            const hue = layerIdx === 0 ? 0.3 : layerIdx === layers.length - 1 ? 0.1 : 0.55;
            const geometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(hue, 1, 0.4 + activation * 0.3),
                emissive: new THREE.Color().setHSL(hue, 1, 0.5),
                emissiveIntensity: activation * 0.6,
                shininess: 100,
                transparent: true,
                opacity: 0.9
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            sphere.userData = { layerIdx, nodeIdx: i, activation, index: nodeIndex++, connections: [] };
            scene.add(sphere);
            
            nodes.push(sphere);
            layerNodes.push(sphere);
            
            const glowGeometry = new THREE.SphereGeometry(nodeRadius * 2, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(hue, 1, 0.5),
                transparent: true,
                opacity: activation * 0.2
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);
            scene.add(glow);
            sphere.userData.glow = glow;
            sphere.userData.hue = hue;
        }
        
        allNodes.push(layerNodes);
    });
    
    for (let l = 0; l < allNodes.length - 1; l++) {
        allNodes[l].forEach(sourceNode => {
            allNodes[l + 1].forEach(targetNode => {
                if (Math.random() > 0.2) {
                    const weight = Math.random();
                    const material = new THREE.LineBasicMaterial({
                        color: new THREE.Color().setHSL(0.55, 1, 0.3 + weight * 0.2),
                        transparent: true,
                        opacity: 0.2 + weight * 0.2,
                        linewidth: 2
                    });
                    const line = new THREE.Line(new THREE.BufferGeometry(), material);
                    line.userData = { source: sourceNode, target: targetNode };
                    scene.add(line);
                    connections.push(line);
                    sourceNode.userData.connections.push(line);
                    targetNode.userData.connections.push(line);
                }
            });
        });
    }
    updateConnections();
}

function updateConnections() {
    connections.forEach(conn => {
        const points = [conn.userData.source.position, conn.userData.target.position];
        conn.geometry.setFromPoints(points);
    });
}

function onNodeDrag(event) {
    event.object.userData.connections.forEach(conn => {
        const points = [conn.userData.source.position, conn.userData.target.position];
        conn.geometry.setFromPoints(points);
    });
}

function createLayerLabel(text, x, y) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = '#0066ff';
    ctx.font = 'bold 32px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, 0);
    sprite.scale.set(4, 1, 1);
    scene.add(sprite);
    layerLabels.push(sprite);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (autoRotate) {
        scene.rotation.y += 0.003;
    }
    
    stars.forEach(star => {
        star.rotation.y += 0.0001;
    });
    
    nodes.forEach(node => {
        const pulse = Math.sin(Date.now() * 0.002 + node.userData.index * 0.1) * 0.5 + 0.5;
        node.material.emissiveIntensity = node.userData.activation * 0.4 + pulse * 0.3;
        if (node.userData.glow) {
            node.userData.glow.material.opacity = node.userData.activation * 0.15 + pulse * 0.1;
            node.userData.glow.scale.setScalar(1 + pulse * 0.2);
        }
    });
    
    if (gameActive) {
        updateGame();
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('network-3d');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onNodeClick(event) {
    if (isDragging) return;
    
    const container = document.getElementById('network-3d');
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(nodes);
    
    if (selectedNode) {
        selectedNode.material.emissive.setHSL(selectedNode.userData.hue, 1, 0.5);
        selectedNode.scale.set(1, 1, 1);
    }
    
    if (intersects.length > 0) {
        selectedNode = intersects[0].object;
        selectedNode.material.emissive.setHex(0x00ff88);
        selectedNode.scale.set(1.5, 1.5, 1.5);
        
        checkEasterEgg(selectedNode.userData.index);
        console.log('Node selected:', selectedNode.userData);
    }
}

function checkEasterEgg(nodeIndex) {
    clickSequence.push({ index: nodeIndex, time: Date.now() });
    
    if (clickSequence.length > 7) clickSequence.shift();
    
    if (clickSequence.length === 7) {
        const timeDiffs = [];
        for (let i = 1; i < clickSequence.length; i++) {
            timeDiffs.push(clickSequence[i].time - clickSequence[i-1].time);
        }
        
        const avgTime = timeDiffs.reduce((a, b) => a + b) / timeDiffs.length;
        const isRhythmic = timeDiffs.every(t => Math.abs(t - avgTime) < 200);
        
        const sequence = clickSequence.map(c => c.index);
        const isCorrect = JSON.stringify(sequence) === JSON.stringify(secretCode);
        
        if (isCorrect && isRhythmic && avgTime < 1000) {
            activateGame();
        }
    }
}

function activateGame() {
    gameActive = true;
    score = 0;
    alert('🎮 SECRET GAME ACTIVATED! 🎮\n\nClick glowing nodes to score points!\nPress ESC to exit.');
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gameActive) {
            gameActive = false;
            alert(`Game Over! Final Score: ${score}`);
        }
    });
}

function updateGame() {
    const time = Date.now() * 0.005;
    nodes.forEach((node, i) => {
        if (Math.sin(time + i) > 0.9) {
            node.material.emissive.setHex(0xff0088);
            node.userData.isTarget = true;
        } else if (node.userData.isTarget) {
            node.material.emissive.setHSL(node.userData.hue, 1, 0.5);
            node.userData.isTarget = false;
        }
    });
}

function resetCamera() {
    camera.position.set(8, 4, 8);
    controls.target.set(0, 0, 0);
    controls.update();
}

function toggleRotation() {
    autoRotate = !autoRotate;
}

function toggleConnections() {
    showConnections = !showConnections;
    connections.forEach(conn => conn.visible = showConnections);
}

function toggleLabels() {
    showLabels = !showLabels;
}

function randomizeActivation() {
    nodes.forEach(node => {
        node.userData.activation = Math.random();
        node.material.color.setHSL(node.userData.hue, 1, 0.4 + node.userData.activation * 0.3);
        node.material.emissiveIntensity = node.userData.activation * 0.6;
        if (node.userData.glow) {
            node.userData.glow.material.opacity = node.userData.activation * 0.2;
        }
    });
}

window.addEventListener('click', (e) => {
    if (gameActive && selectedNode?.userData.isTarget) {
        score += 10;
        selectedNode.material.emissive.setHex(0x00ff00);
        console.log('Score:', score);
    }
});
