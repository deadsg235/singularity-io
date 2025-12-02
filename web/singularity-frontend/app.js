// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// HUD elements
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');
const nextCheckpointIndicator = document.getElementById('next-checkpoint-indicator');

// Game state
let startTime;
let gameFinished = false;
let currentCheckpoint = 0;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
scene.add(pointLight);

// --- New Ship Design ---
const ship = new THREE.Group();
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffaa, flatShading: true });
const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x00cc88, flatShading: true });
const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x00ffaa, emissiveIntensity: 1 });

const bodyGeometry = new THREE.BoxGeometry(1, 0.4, 3);
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
ship.add(body);

const cockpitGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.8);
const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
cockpit.position.set(0, 0.3, -0.8);
ship.add(cockpit);

const wingGeometry = new THREE.BoxGeometry(3, 0.2, 1);
const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
leftWing.position.set(-1.5, 0, -0.5);
ship.add(leftWing);

const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
rightWing.position.set(1.5, 0, -0.5);
ship.add(rightWing);

const engineLight = new THREE.PointLight(0x00ffaa, 5, 5);
engineLight.position.set(0, 0, 1.6);
ship.add(engineLight);
scene.add(ship);


// --- New Anti-Gravity Physics & Controls ---
let velocity = new THREE.Vector3();
let angularVelocity = new THREE.Vector3();

const thrust = 0.01;
const yawSpeed = 0.002;
const rollSpeed = 0.003;
const autoLevelFactor = 0.05;
const linearDamping = 0.98;
const angularDamping = 0.95;

// Controls state
const keys = { w: false, s: false, a: false, d: false, q: false, e: false };

// Checkpoints (same as before)
const checkpoints = [];
const checkpointPositions = [
    new THREE.Vector3(0, 0, -20), new THREE.Vector3(30, 10, -60),
    new THREE.Vector3(0, -20, -100), new THREE.Vector3(-40, 0, -140),
    new THREE.Vector3(0, 30, -180), new THREE.Vector3(50, 0, -220),
    new THREE.Vector3(0, 0, -260), new THREE.Vector3(-60, -20, -300) 
];
checkpointPositions.forEach(pos => {
    const geometry = new THREE.TorusGeometry(5, 0.5, 8, 50);
    const material = new THREE.MeshPhongMaterial({ color: 0xffa500, emissive: 0xffa500, transparent: true, opacity: 0.7 });
    const checkpoint = new THREE.Mesh(geometry, material);
    checkpoint.position.copy(pos);
    checkpoints.push(checkpoint);
    scene.add(checkpoint);
});

// Starfield (same as before)
const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 800, y = (Math.random() - 0.5) * 800, z = (Math.random() - 0.5) * 800;
    starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Event Listeners
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateShip() {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);

    // Apply thrust
    if (keys.w) velocity.add(forward.clone().multiplyScalar(thrust));
    if (keys.s) velocity.add(forward.clone().multiplyScalar(-thrust * 0.5));
    
    engineLight.intensity = keys.w ? 10 : (keys.s ? 5 : 2);

    // Apply torque for yaw
    if (keys.a) angularVelocity.y += yawSpeed;
    if (keys.d) angularVelocity.y -= yawSpeed;

    // Apply torque for explicit roll (Q and E)
    if (keys.q) angularVelocity.z += rollSpeed;
    if (keys.e) angularVelocity.z -= rollSpeed;

    // Auto-leveling for roll (only if not manually rolling)
    if (!keys.q && !keys.e) {
        const currentRoll = ship.rotation.z;
        const rollError = -currentRoll; // Target roll is 0 when not turning
        angularVelocity.z += rollError * autoLevelFactor;
    }


    // Apply damping
    velocity.multiplyScalar(linearDamping);
    angularVelocity.multiplyScalar(angularDamping);

    // Update position and rotation
    ship.position.add(velocity);
    ship.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(angularVelocity.x, angularVelocity.y, angularVelocity.z, 'YXZ')));

    // Update camera to follow smoothly
    const cameraOffset = new THREE.Vector3(0, 2.5, 7.0);
    const cameraTarget = new THREE.Vector3();
    cameraTarget.copy(ship.position).add(cameraOffset.applyQuaternion(ship.quaternion));
    camera.position.lerp(cameraTarget, 0.1);
    
    const lookAtTarget = new THREE.Vector3();
    lookAtTarget.copy(ship.position).add(new THREE.Vector3(0, 1, 0)); // Look slightly above the ship's center
    camera.lookAt(lookAtTarget);

    // Update main point light
    pointLight.position.copy(ship.position);
}

function checkWinCondition() { /* ... same as before ... */ 
    if (gameFinished) return;
    const currentTarget = checkpoints[currentCheckpoint];
    if (ship.position.distanceTo(currentTarget.position) < 5) {
        currentTarget.material.color.set(0x00ff00);
        currentTarget.material.emissive.set(0x00ff00);
        currentCheckpoint++;
        if (currentCheckpoint >= checkpoints.length) {
            gameFinished = true;
            const totalTime = (performance.now() - startTime) / 1000;
            messageElement.textContent = `FINISH!\nTime: ${totalTime.toFixed(2)}s`;
            messageElement.style.opacity = '1';
        }
    }
}

function updateHUD() { /* ... same as before, but with a new helper ... */ 
    if (gameFinished || !startTime) return;
    const elapsedTime = (performance.now() - startTime) / 1000;
    timerElement.textContent = `Time: ${elapsedTime.toFixed(2)}s`;

    const nextCheckpointPos = checkpoints[currentCheckpoint].position;
    const screenPos = toScreenPosition(nextCheckpointPos, camera);
    const angle = Math.atan2(screenPos.y - window.innerHeight / 2, screenPos.x - window.innerWidth / 2);
    
    const isOffScreen = screenPos.x < 0 || screenPos.x > window.innerWidth || screenPos.y < 0 || screenPos.y > window.innerHeight || screenPos.z > 1;
    
    if (isOffScreen) {
        nextCheckpointIndicator.style.display = 'block';
        const x = window.innerWidth / 2 + (window.innerWidth / 2.2) * Math.cos(angle);
        const y = window.innerHeight / 2 + (window.innerHeight / 2.2) * Math.sin(angle);
        nextCheckpointIndicator.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
    } else {
        nextCheckpointIndicator.style.display = 'none';
    }
}

function toScreenPosition(worldPos, camera) {
    const vector = worldPos.clone().project(camera);
    vector.x = (vector.x + 1) / 2 * window.innerWidth;
    vector.y = -(vector.y - 1) / 2 * window.innerHeight;
    return vector;
}

function animate() {
    requestAnimationFrame(animate);
    updateShip();
    checkWinCondition();
    updateHUD();

    if (!gameFinished && currentCheckpoint < checkpoints.length) {
        const pulse = Math.sin(performance.now() * 0.005) * 0.5 + 0.5;
        const currentTarget = checkpoints[currentCheckpoint];
        currentTarget.material.opacity = pulse * 0.3 + 0.7;
        currentTarget.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1 + pulse * 0.1);
    }
    
    renderer.render(scene, camera);
}

// Start Game Logic
messageElement.textContent = "Press W to Start";
messageElement.style.opacity = '1';
const startListener = (e) => {
    if(e.key.toLowerCase() === 'w' && !startTime) {
        startTime = performance.now();
        messageElement.style.opacity = '0';
        window.removeEventListener('keydown', startListener);
    }
};
window.addEventListener('keydown', startListener);

animate();
