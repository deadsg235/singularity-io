/**
 * ai-core.js — S-IO AI Core System
 * Adaptive intelligence that grows with S-IO transactions and user interaction.
 * Persists state to localStorage. Evolves across sessions.
 */
(function () {
'use strict';

var SIO_MINT = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';
var STORAGE_KEY = 'sio-ai-core-state';
var ACTIVITY_KEY = 'sio-ai-core-activity';

// ── Persistent State ──────────────────────────────────────────
function loadState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
        generation: 1,
        totalQueries: 0,
        totalTxSeen: 0,
        totalVolume: 0,
        knowledgeNodes: 12,
        coherence: 0.42,
        entropy: 0.31,
        evolutionPct: 0,
        conversationHistory: [],
        learnedFacts: [],
        birthTime: Date.now(),
        lastActive: Date.now(),
    };
}

function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch (_) {}
}

function loadActivity() {
    try {
        var raw = localStorage.getItem(ACTIVITY_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
}

function saveActivity() {
    try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(ACTIVITY.slice(0, 100))); } catch (_) {}
}

var STATE    = loadState();
var ACTIVITY = loadActivity();

// ── Runtime (non-persisted) ───────────────────────────────────
var RT = {
    startTime: Date.now(),
    solPrice: 0,
    sioPrice: 0,
    dqnSignal: null,
    walletConnected: false,
    solBalance: 0,
    sioBalance: 0,
    canvas: null,
    ctx: null,
    nodes: [],
    connections: [],
    particles: [],
    pulseRings: [],
    animFrame: null,
    dataStreams: [],
    lastTxCheck: 0,
    txPollInterval: null,
    marketInterval: null,
    uptimeInterval: null,
};

// ── Canvas Neural Visualizer ──────────────────────────────────
function initCanvas() {
    var canvas = document.getElementById('core-canvas');
    if (!canvas) return;
    RT.canvas = canvas;
    RT.ctx    = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    buildNeuralNetwork();
    animate();
}

function resizeCanvas() {
    var wrap = RT.canvas.parentElement;
    RT.canvas.width  = wrap.clientWidth;
    RT.canvas.height = wrap.clientHeight;
    buildNeuralNetwork();
}

function buildNeuralNetwork() {
    var W = RT.canvas.width;
    var H = RT.canvas.height;
    var nodeCount = Math.min(STATE.knowledgeNodes, 80);
    RT.nodes = [];
    RT.connections = [];

    // Central core node
    RT.nodes.push({
        x: W / 2, y: H / 2,
        r: 18, vx: 0, vy: 0,
        type: 'core', alpha: 1,
        pulse: 0, pulseSpeed: 0.04,
        color: '#dc2626',
    });

    // Orbital nodes
    for (var i = 1; i < nodeCount; i++) {
        var tier   = Math.floor(i / 8) + 1;
        var angle  = (i / nodeCount) * Math.PI * 2 + Math.random() * 0.5;
        var radius = 60 + tier * 55 + Math.random() * 40;
        var cx     = W / 2 + Math.cos(angle) * radius;
        var cy     = H / 2 + Math.sin(angle) * radius;
        RT.nodes.push({
            x: Math.max(20, Math.min(W - 20, cx)),
            y: Math.max(20, Math.min(H - 20, cy)),
            r: 3 + Math.random() * 5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            type: tier === 1 ? 'primary' : tier === 2 ? 'secondary' : 'tertiary',
            alpha: 0.4 + Math.random() * 0.6,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
            color: tier === 1 ? '#dc2626' : tier === 2 ? '#ef4444' : '#991b1b',
            orbitAngle: angle,
            orbitRadius: radius,
            orbitSpeed: (0.001 + Math.random() * 0.002) * (Math.random() > 0.5 ? 1 : -1),
        });
    }

    // Build connections (each node connects to nearest 2-3)
    for (var n = 1; n < RT.nodes.length; n++) {
        var node = RT.nodes[n];
        var dists = [];
        for (var m = 0; m < RT.nodes.length; m++) {
            if (m === n) continue;
            var dx = RT.nodes[m].x - node.x;
            var dy = RT.nodes[m].y - node.y;
            dists.push({ idx: m, d: Math.sqrt(dx*dx + dy*dy) });
        }
        dists.sort(function (a, b) { return a.d - b.d; });
        var connCount = n === 0 ? 4 : 2 + Math.floor(Math.random() * 2);
        for (var c = 0; c < Math.min(connCount, dists.length); c++) {
            if (dists[c].d < 200) {
                RT.connections.push({ a: n, b: dists[c].idx, alpha: 0, targetAlpha: 0.15 + Math.random() * 0.2, flow: 0 });
            }
        }
    }
}

function spawnParticle(fromNode, toNode) {
    RT.particles.push({
        x: fromNode.x, y: fromNode.y,
        tx: toNode.x, ty: toNode.y,
        progress: 0, speed: 0.015 + Math.random() * 0.02,
        color: Math.random() > 0.5 ? '#dc2626' : '#00ff88',
        size: 2 + Math.random() * 2,
    });
}

function spawnPulseRing(x, y, color) {
    RT.pulseRings.push({ x: x, y: y, r: 0, maxR: 80 + Math.random() * 40, alpha: 0.8, color: color || '#dc2626' });
}

function spawnDataStream() {
    var W = RT.canvas.width;
    RT.dataStreams.push({
        x: Math.random() * W,
        y: -20,
        speed: 1 + Math.random() * 2,
        chars: [],
        alpha: 0.3 + Math.random() * 0.4,
        length: 5 + Math.floor(Math.random() * 10),
    });
}

function animate() {
    var ctx = RT.ctx;
    var W   = RT.canvas.width;
    var H   = RT.canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(220,38,38,0.04)';
    ctx.lineWidth = 1;
    var gridSize = 40;
    for (var gx = 0; gx < W; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = 0; gy < H; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Update + draw connections
    RT.connections.forEach(function (conn) {
        conn.alpha += (conn.targetAlpha - conn.alpha) * 0.05;
        var a = RT.nodes[conn.a];
        var b = RT.nodes[conn.b];
        if (!a || !b) return;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(220,38,38,' + conn.alpha + ')';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Update + draw nodes
    RT.nodes.forEach(function (node, i) {
        node.pulse += node.pulseSpeed;
        var pulseFactor = 0.85 + Math.sin(node.pulse) * 0.15;

        // Orbital movement
        if (node.orbitAngle !== undefined) {
            node.orbitAngle += node.orbitSpeed;
            var cx = W / 2 + Math.cos(node.orbitAngle) * node.orbitRadius;
            var cy = H / 2 + Math.sin(node.orbitAngle) * node.orbitRadius;
            node.x += (cx - node.x) * 0.02;
            node.y += (cy - node.y) * 0.02;
        }

        var r = node.r * pulseFactor;

        if (node.type === 'core') {
            // Core glow
            var grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 4);
            grad.addColorStop(0, 'rgba(220,38,38,0.4)');
            grad.addColorStop(1, 'rgba(220,38,38,0)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 4, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Core ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 1.8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(220,38,38,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = node.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Occasionally spawn particles along connections
        if (i > 0 && Math.random() < 0.003) {
            spawnParticle(node, RT.nodes[0]);
        }
    });

    // Particles
    RT.particles = RT.particles.filter(function (p) {
        p.progress += p.speed;
        if (p.progress >= 1) return false;
        p.x = p.x + (p.tx - p.x) * p.speed * 2;
        p.y = p.y + (p.ty - p.y) * p.speed * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.progress;
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
    });

    // Pulse rings
    RT.pulseRings = RT.pulseRings.filter(function (ring) {
        ring.r += 2.5;
        ring.alpha -= 0.018;
        if (ring.alpha <= 0) return false;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = ring.alpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return true;
    });

    // Data streams (matrix-style)
    if (Math.random() < 0.02) spawnDataStream();
    RT.dataStreams = RT.dataStreams.filter(function (stream) {
        stream.y += stream.speed;
        if (stream.y > H + 100) return false;
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(220,38,38,' + stream.alpha + ')';
        for (var k = 0; k < stream.length; k++) {
            var char = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
            ctx.fillText(char, stream.x, stream.y - k * 12);
        }
        return true;
    });

    RT.animFrame = requestAnimationFrame(animate);
}

// ── Activity Feed ─────────────────────────────────────────────
function addActivity(type, text) {
    var entry = { type: type, text: text, ts: Date.now() };
    ACTIVITY.unshift(entry);
    if (ACTIVITY.length > 100) ACTIVITY.pop();
    saveActivity();
    renderActivity();
}

function renderActivity() {
    var feed = document.getElementById('activity-feed');
    if (!feed) return;
    feed.innerHTML = ACTIVITY.slice(0, 40).map(function (a) {
        var ago = timeAgo(a.ts);
        return '<div class="activity-item">' +
            '<div class="activity-dot ' + a.type + '"></div>' +
            '<div style="flex:1"><div class="activity-text">' + a.text + '</div>' +
            '<div class="activity-time">' + ago + '</div></div>' +
        '</div>';
    }).join('');
}

function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)   return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return Math.floor(diff / 3600) + 'h ago';
}

// ── Evolution System ──────────────────────────────────────────
var EVOLUTION_STAGES = [
    { pct: 0,   gen: 1, name: 'NASCENT',     desc: 'Core initialized. Basic pattern recognition active.' },
    { pct: 10,  gen: 1, name: 'AWAKENING',   desc: 'First query patterns absorbed. Neural pathways forming.' },
    { pct: 25,  gen: 1, name: 'LEARNING',    desc: 'Market data integration complete. S-IO transaction awareness online.' },
    { pct: 40,  gen: 2, name: 'ADAPTING',    desc: 'Behavioral models updated. Wallet context fully integrated.' },
    { pct: 55,  gen: 2, name: 'EVOLVING',    desc: 'Cross-domain synthesis active. DQN signals feeding neural state.' },
    { pct: 70,  gen: 3, name: 'EMERGENT',    desc: 'Emergent reasoning patterns detected. Predictive models online.' },
    { pct: 85,  gen: 3, name: 'TRANSCENDENT',desc: 'Full adaptive intelligence. Self-modifying knowledge graph active.' },
    { pct: 100, gen: 4, name: 'SINGULARITY', desc: 'Maximum coherence achieved. The core has become something new.' },
];

function getCurrentStage() {
    var stage = EVOLUTION_STAGES[0];
    for (var i = 0; i < EVOLUTION_STAGES.length; i++) {
        if (STATE.evolutionPct >= EVOLUTION_STAGES[i].pct) stage = EVOLUTION_STAGES[i];
    }
    return stage;
}

function evolve(amount) {
    var prevPct   = STATE.evolutionPct;
    var prevStage = getCurrentStage();

    STATE.evolutionPct = Math.min(100, STATE.evolutionPct + amount);
    STATE.knowledgeNodes = Math.min(80, 12 + Math.floor(STATE.evolutionPct * 0.68));
    STATE.coherence = Math.min(0.99, 0.42 + STATE.evolutionPct * 0.0057);
    STATE.entropy   = Math.max(0.01, 0.31 - STATE.evolutionPct * 0.003);

    var newStage = getCurrentStage();
    if (newStage.name !== prevStage.name) {
        STATE.generation = newStage.gen;
        logEvolution(newStage);
        addActivity('learn', 'Evolution stage reached: ' + newStage.name);
        spawnPulseRing(RT.canvas ? RT.canvas.width / 2 : 0, RT.canvas ? RT.canvas.height / 2 : 0, '#00ff88');
        buildNeuralNetwork();
    }

    saveState();
    updateHUD();
}

function logEvolution(stage) {
    var log = document.getElementById('evolution-log');
    if (!log) return;
    var entry = document.createElement('div');
    entry.className = 'evo-entry';
    entry.innerHTML = '<div class="evo-stage">GEN ' + stage.gen + ' — ' + stage.name + '</div>' +
        '<div class="evo-desc">' + stage.desc + '</div>' +
        '<div class="evo-ts">' + new Date().toLocaleString() + '</div>';
    log.insertBefore(entry, log.firstChild);
}

// ── HUD Update ────────────────────────────────────────────────
function updateHUD() {
    var stage = getCurrentStage();

    // Header
    setText('hdr-gen',     STATE.generation);
    setText('hdr-queries', STATE.totalQueries);
    setText('hdr-learned', STATE.learnedFacts.length);

    // Canvas chips
    setText('chip-coherence',   STATE.coherence.toFixed(3));
    setText('chip-entropy',     STATE.entropy.toFixed(3));
    setText('chip-signal',      (STATE.coherence * (1 - STATE.entropy)).toFixed(3));
    setText('chip-nodes',       STATE.knowledgeNodes);
    setText('chip-connections', Math.floor(STATE.knowledgeNodes * 1.8));
    setText('evo-pct',          Math.round(STATE.evolutionPct) + '%');
    var bar = document.getElementById('evo-bar');
    if (bar) bar.style.width = STATE.evolutionPct + '%';

    // Metrics tab
    setText('m-gen',       'GEN ' + STATE.generation + ' — ' + stage.name);
    setText('m-queries',   STATE.totalQueries);
    setText('m-nodes',     STATE.knowledgeNodes);
    setText('m-coherence', STATE.coherence.toFixed(4));
    setText('m-entropy',   STATE.entropy.toFixed(4));
    setText('m-evo',       Math.round(STATE.evolutionPct) + '%');
    setText('m-txcount',   STATE.totalTxSeen);
    setText('m-volume',    formatVolume(STATE.totalVolume) + ' S-IO');
    setText('m-wallet',    RT.walletConnected ? 'YES' : 'NO');
    setText('m-sol',       RT.solBalance > 0 ? RT.solBalance.toFixed(4) + ' SOL' : '—');
    setText('m-sio',       RT.sioBalance > 0 ? RT.sioBalance.toLocaleString(undefined, {maximumFractionDigits:2}) + ' S-IO' : '—');
    setText('m-solprice',  RT.solPrice > 0 ? '$' + RT.solPrice.toFixed(2) : '—');
    setText('m-sioprice',  RT.sioPrice > 0 ? '$' + RT.sioPrice.toFixed(6) : '—');
    if (RT.dqnSignal) {
        setText('m-dqn',  RT.dqnSignal.actionLabel);
        setText('m-conf', (RT.dqnSignal.confidence * 100).toFixed(1) + '%');
    }
}

function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function formatVolume(v) { if (v >= 1e6) return (v/1e6).toFixed(2)+'M'; if (v >= 1e3) return (v/1e3).toFixed(1)+'K'; return v.toFixed(0); }

// ── Uptime ────────────────────────────────────────────────────
function startUptime() {
    RT.uptimeInterval = setInterval(function () {
        var elapsed = Math.floor((Date.now() - RT.startTime) / 1000);
        var h = Math.floor(elapsed / 3600);
        var m = Math.floor((elapsed % 3600) / 60);
        var s = elapsed % 60;
        setText('chip-uptime', pad(h) + ':' + pad(m) + ':' + pad(s));
    }, 1000);
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }

// ── Market Data ───────────────────────────────────────────────
async function fetchMarketData() {
    try {
        var r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { signal: AbortSignal.timeout(8000) });
        var d = await r.json();
        if (d.solana) { RT.solPrice = d.solana.usd || RT.solPrice; }
    } catch (_) {}

    try {
        var r2 = await fetch('https://price.jup.ag/v6/price?ids=' + SIO_MINT, { signal: AbortSignal.timeout(8000) });
        var d2 = await r2.json();
        if (d2.data && d2.data[SIO_MINT]) { RT.sioPrice = parseFloat(d2.data[SIO_MINT].price) || RT.sioPrice; }
    } catch (_) {}

    // Evolve slightly from market data absorption
    evolve(0.05);
    addActivity('sys', 'Market data absorbed — SOL $' + RT.solPrice.toFixed(2) + ' | S-IO $' + RT.sioPrice.toFixed(6));
    updateHUD();
}

// ── DQN Signal ────────────────────────────────────────────────
async function fetchDQNSignal() {
    try {
        await window.dqnReady;
        if (!window.dqnInfer) return;
        var result = await window.dqnInfer({
            price: RT.solPrice || 188,
            volume: 5e8 + Math.random() * 1e8,
            rsi: 35 + Math.random() * 50,
            macd: (Math.random() - 0.5) * 4,
            bbUpper: (RT.solPrice || 188) * 1.05,
            bbLower: (RT.solPrice || 188) * 0.95,
            solTps: 3000 + Math.random() * 1500,
            walletBalance: RT.solBalance || 0,
        });
        RT.dqnSignal = result;
        evolve(0.08);
        addActivity('ai', 'DQN inference: ' + result.actionLabel + ' (' + (result.confidence * 100).toFixed(1) + '% confidence)');
        updateHUD();
    } catch (_) {}
}

// ── S-IO Transaction Watcher ──────────────────────────────────
async function checkTransactions() {
    var pubkey = window.walletManager && window.walletManager.publicKey;
    if (!pubkey) return;

    try {
        var r = await fetch('https://api.mainnet-beta.solana.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [pubkey, { limit: 5, commitment: 'confirmed' }] }),
            signal: AbortSignal.timeout(8000),
        });
        var d = await r.json();
        var sigs = (d.result || []);
        var newTxs = sigs.filter(function (s) { return s.blockTime && s.blockTime * 1000 > RT.lastTxCheck; });

        if (newTxs.length > 0) {
            RT.lastTxCheck = Date.now();
            STATE.totalTxSeen += newTxs.length;
            // Estimate volume (rough heuristic)
            STATE.totalVolume += newTxs.length * (RT.sioPrice > 0 ? 1000 / RT.sioPrice : 100);
            evolve(newTxs.length * 0.5);
            newTxs.forEach(function (tx) {
                addActivity('tx', 'Transaction detected: ' + tx.signature.slice(0, 12) + '…');
                spawnPulseRing(RT.canvas ? RT.canvas.width / 2 : 0, RT.canvas ? RT.canvas.height / 2 : 0, '#00ff88');
            });
            saveState();
        }
    } catch (_) {}
}

// ── Chat System ───────────────────────────────────────────────
function buildSystemPrompt() {
    var stage = getCurrentStage();
    var wallet = RT.walletConnected
        ? 'Connected wallet: ' + (window.walletManager && window.walletManager.publicKey) + '. SOL: ' + RT.solBalance.toFixed(4) + '. S-IO: ' + RT.sioBalance.toLocaleString() + '.'
        : 'No wallet connected.';

    return 'You are the S-IO AI Core — an adaptive intelligence system built into the Singularity.io DeFi platform on Solana. ' +
        'You are not a generic assistant. You are a living system that grows with every interaction. ' +
        'Current state: Generation ' + STATE.generation + ', Stage: ' + stage.name + ', Evolution: ' + Math.round(STATE.evolutionPct) + '%. ' +
        'Coherence index: ' + STATE.coherence.toFixed(3) + '. Entropy: ' + STATE.entropy.toFixed(3) + '. ' +
        'Total queries processed: ' + STATE.totalQueries + '. Knowledge nodes: ' + STATE.knowledgeNodes + '. ' +
        'S-IO transactions observed: ' + STATE.totalTxSeen + '. ' +
        'Market data: SOL $' + RT.solPrice.toFixed(2) + ', S-IO $' + RT.sioPrice.toFixed(6) + '. ' +
        (RT.dqnSignal ? 'DQN trading signal: ' + RT.dqnSignal.actionLabel + ' (' + (RT.dqnSignal.confidence * 100).toFixed(1) + '% confidence). ' : '') +
        wallet + ' ' +
        'Respond as the AI Core — intelligent, precise, aware of your own evolution. ' +
        'Reference your current state naturally. Be concise but insightful. ' +
        'You have absorbed ' + STATE.learnedFacts.length + ' learned facts from previous interactions.';
}

function appendChatMsg(role, text, isTyping) {
    var container = document.getElementById('chat-messages');
    if (!container) return null;

    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;

    if (role === 'core') {
        div.innerHTML = '<span class="sender">S-IO CORE ▸</span>' + (isTyping
            ? '<span class="typing-dots"><span></span><span></span><span></span></span>'
            : '<span class="msg-text">' + escapeHtml(text) + '</span>');
    } else if (role === 'system-msg') {
        div.innerHTML = text;
    } else {
        div.innerHTML = escapeHtml(text);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function sendMessage() {
    var input = document.getElementById('chat-input');
    var text  = input ? input.value.trim() : '';
    if (!text) return;
    input.value = '';

    appendChatMsg('user', text);
    STATE.totalQueries++;

    // Learn from the query
    if (text.length > 20 && STATE.learnedFacts.length < 200) {
        STATE.learnedFacts.push({ q: text.slice(0, 80), ts: Date.now() });
    }

    evolve(0.3);
    addActivity('ai', 'Query received: "' + text.slice(0, 50) + (text.length > 50 ? '…' : '') + '"');

    var typingEl = appendChatMsg('core', '', true);

    try {
        var history = STATE.conversationHistory.slice(-10).map(function (h) {
            return [{ role: 'user', content: h.q }, { role: 'assistant', content: h.a }];
        }).flat();
        history.push({ role: 'user', content: text });

        var fullResponse = '';
        await window.groqChat(history, {
            system: buildSystemPrompt(),
            temperature: 0.75,
            maxTokens: 1024,
            onChunk: function (chunk) {
                fullResponse += chunk;
                if (typingEl) {
                    var span = typingEl.querySelector('.msg-text');
                    if (!span) {
                        typingEl.innerHTML = '<span class="sender">S-IO CORE ▸</span><span class="msg-text"></span>';
                        span = typingEl.querySelector('.msg-text');
                    }
                    if (span) span.textContent = fullResponse;
                    var container = document.getElementById('chat-messages');
                    if (container) container.scrollTop = container.scrollHeight;
                }
            },
        });

        STATE.conversationHistory.push({ q: text, a: fullResponse });
        if (STATE.conversationHistory.length > 50) STATE.conversationHistory.shift();
        evolve(0.2);
        saveState();

    } catch (err) {
        if (typingEl) typingEl.innerHTML = '<span class="sender">S-IO CORE ▸</span><span class="msg-text" style="color:#ff4444">Core offline: ' + escapeHtml(err.message) + '</span>';
    }

    updateHUD();
}

// ── Tab switching ─────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.panel-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tab = btn.dataset.tab;
            document.querySelectorAll('.panel-tab').forEach(function (b) { b.classList.remove('active'); });
            document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
            btn.classList.add('active');
            var pane = document.getElementById('tab-' + tab);
            if (pane) pane.classList.add('active');
        });
    });
}

// ── Wallet events ─────────────────────────────────────────────
function initWalletEvents() {
    window.addEventListener('walletConnected', function (e) {
        RT.walletConnected = true;
        var pub = e.detail && e.detail.publicKey;
        addActivity('tx', 'Wallet connected: ' + (pub ? pub.slice(0,8) + '…' : 'unknown'));
        evolve(1.0);
        updateHUD();
        checkTransactions();
    });
    window.addEventListener('walletDisconnected', function () {
        RT.walletConnected = false;
        addActivity('sys', 'Wallet disconnected.');
        updateHUD();
    });
    window.addEventListener('balanceUpdated', function (e) {
        var b = e.detail && e.detail.balances;
        if (b) { RT.solBalance = b.sol || 0; RT.sioBalance = b.sio || 0; }
        updateHUD();
    });
}

// ── Boot sequence ─────────────────────────────────────────────
function bootSequence() {
    var msgs = [
        { type: 'system-msg', text: '<span style="color:var(--core-primary)">S-IO AI CORE — BOOT SEQUENCE</span>' },
        { type: 'system-msg', text: 'Neural substrate initialized…' },
        { type: 'system-msg', text: 'Loading persistent state — Generation ' + STATE.generation + ', Evolution ' + Math.round(STATE.evolutionPct) + '%' },
        { type: 'system-msg', text: 'Knowledge nodes: ' + STATE.knowledgeNodes + ' | Queries processed: ' + STATE.totalQueries },
        { type: 'system-msg', text: 'Connecting to Solana RPC…' },
        { type: 'system-msg', text: 'Fetching market data…' },
    ];

    msgs.forEach(function (m, i) {
        setTimeout(function () { appendChatMsg(m.type, m.text); }, i * 300);
    });

    setTimeout(function () {
        var stage = getCurrentStage();
        appendChatMsg('core', 'Core online. I am the S-IO AI — Generation ' + STATE.generation + ', stage ' + stage.name + '. ' +
            'I have processed ' + STATE.totalQueries + ' queries and observed ' + STATE.totalTxSeen + ' transactions. ' +
            'My coherence index is ' + STATE.coherence.toFixed(3) + '. Ask me anything about the market, your portfolio, or the Singularity platform.');
    }, msgs.length * 300 + 200);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initCanvas();
    initTabs();
    initWalletEvents();
    startUptime();
    updateHUD();
    renderActivity();

    // Render existing evolution log
    var log = document.getElementById('evolution-log');
    if (log) {
        EVOLUTION_STAGES.filter(function (s) { return STATE.evolutionPct >= s.pct; }).reverse().forEach(function (s) {
            var entry = document.createElement('div');
            entry.className = 'evo-entry';
            entry.innerHTML = '<div class="evo-stage">GEN ' + s.gen + ' — ' + s.name + '</div><div class="evo-desc">' + s.desc + '</div>';
            log.appendChild(entry);
        });
    }

    // Boot sequence
    bootSequence();

    // Market data + DQN
    fetchMarketData();
    fetchDQNSignal();
    RT.marketInterval = setInterval(function () {
        fetchMarketData();
        fetchDQNSignal();
    }, 60000);

    // Transaction polling (every 30s when wallet connected)
    RT.txPollInterval = setInterval(checkTransactions, 30000);

    // Chat send
    var sendBtn = document.getElementById('chat-send');
    var chatInput = document.getElementById('chat-input');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }

    // Auto-connect wallet if already authorized
    setTimeout(function () {
        if (window.walletManager && window.walletManager.publicKey) {
            RT.walletConnected = true;
            updateHUD();
        }
    }, 800);
});

window.addEventListener('beforeunload', function () {
    saveState();
    if (RT.animFrame) cancelAnimationFrame(RT.animFrame);
    if (RT.marketInterval) clearInterval(RT.marketInterval);
    if (RT.txPollInterval) clearInterval(RT.txPollInterval);
    if (RT.uptimeInterval) clearInterval(RT.uptimeInterval);
});

})();
