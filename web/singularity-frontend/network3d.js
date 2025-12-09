import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

let scene, camera, renderer, controls, dragControls;
let nodes = [];
let connections = [];
let labels = [];
let autoRotate = false;
let showConnections = true;
let showLabels = true;
let selectedNode = null;
let isDragging = false;

const layers = [8, 16, 16, 8];
const layerSpacing = 5;
const nodeRadius = 0.2;

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
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(8, 4, 8);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x0066ff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    
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

function createNetwork() {
    let nodeIndex = 0;
    const allNodes = [];
    
    layers.forEach((layerSize, layerIdx) => {
        const layerNodes = [];
        const x = (layerIdx - layers.length / 2) * layerSpacing;
        
        for (let i = 0; i < layerSize; i++) {
            const angle = (i / layerSize) * Math.PI * 2;
            const radius = 2 + layerIdx * 0.5;
            const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 2;
            const z = Math.cos(angle) * radius + (Math.random() - 0.5) * 2;
            
            const activation = Math.random();
            const geometry = new THREE.SphereGeometry(nodeRadius, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(0.6, 1, 0.3 + activation * 0.4),
                emissive: new THREE.Color(0x0066ff),
                emissiveIntensity: activation * 0.5,
                shininess: 100
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            sphere.userData = { layerIdx, nodeIdx: i, activation, index: nodeIndex++, connections: [] };
            scene.add(sphere);
            
            nodes.push(sphere);
            layerNodes.push(sphere);
            
            const glowGeometry = new THREE.SphereGeometry(nodeRadius * 1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x0066ff,
                transparent: true,
                opacity: activation * 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);
            scene.add(glow);
            sphere.userData.glow = glow;
        }
        
        allNodes.push(layerNodes);
    });
    
    for (let l = 0; l < allNodes.length - 1; l++) {
        allNodes[l].forEach(sourceNode => {
            allNodes[l + 1].forEach(targetNode => {
                if (Math.random() > 0.3) {
                    const weight = Math.random();
                    const material = new THREE.LineBasicMaterial({
                        color: new THREE.Color().setHSL(0.6, 1, 0.2 + weight * 0.3),
                        transparent: true,
                        opacity: 0.3 + weight * 0.3
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

function animate() {
    requestAnimationFrame(animate);
    
    if (autoRotate) {
        scene.rotation.y += 0.005;
    }
    
    nodes.forEach(node => {
        const pulse = Math.sin(Date.now() * 0.001 + node.userData.index) * 0.5 + 0.5;
        node.material.emissiveIntensity = node.userData.activation * 0.3 + pulse * 0.2;
        if (node.userData.glow) {
            node.userData.glow.material.opacity = node.userData.activation * 0.2 + pulse * 0.1;
        }
    });
    
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
        selectedNode.material.emissive.setHex(0x0066ff);
        selectedNode.scale.set(1, 1, 1);
    }
    
    if (intersects.length > 0) {
        selectedNode = intersects[0].object;
        selectedNode.material.emissive.setHex(0x00ff88);
        selectedNode.scale.set(1.5, 1.5, 1.5);
        
        console.log('Node selected:', selectedNode.userData);
    }
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
        node.material.color.setHSL(0.6, 1, 0.3 + node.userData.activation * 0.4);
        node.material.emissiveIntensity = node.userData.activation * 0.5;
        if (node.userData.glow) {
            node.userData.glow.material.opacity = node.userData.activation * 0.3;
        }
    });
}
