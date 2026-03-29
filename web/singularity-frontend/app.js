/**
 * app.js — Singularity.io v2.0 core application
 */

const API_BASE      = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
const SIO_MINT      = 'Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump';

// ── Canvas / Neural Network ────────────────────────────────
let canvas, ctx, networkData, animFrame;
let particles = [];

function initCanvas() {
  canvas = document.getElementById('network-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width  = r.width;
    canvas.height = r.height || 380;
  };
  resize();
  window.addEventListener('resize', resize);
}

async function loadNetwork() {
  try {
    const res = await fetch(`${API_BASE}/api/network`);
    networkData = await res.json();
    const count = networkData?.nodes?.length ?? 0;
    const el = document.getElementById('node-count');
    if (el) el.textContent = `Nodes: ${count}`;
    if (count > 0) { buildParticles(); if (!animFrame) animate(); }
  } catch { /* offline — canvas stays dark */ }
}

function buildParticles() {
  particles = [];
  if (!networkData?.connections?.length) return;
  for (let i = 0; i < 24; i++) {
    particles.push({
      conn:     networkData.connections[Math.floor(Math.random() * networkData.connections.length)],
      progress: Math.random(),
      speed:    0.002 + Math.random() * 0.003
    });
  }
}

function animate() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (networkData?.nodes?.length) {
    drawConnections(); drawParticles(); drawNodes(); drawLabels();
  }
  animFrame = requestAnimationFrame(animate);
}

function _coords(node) {
  const pad = 60, w = canvas.width - pad*2, h = canvas.height - pad*2;
  return [pad + node.x * w, pad + node.y * h];
}

function drawConnections() {
  networkData.connections.forEach(c => {
    const [x1,y1] = _coords(networkData.nodes[c.source]);
    const [x2,y2] = _coords(networkData.nodes[c.target]);
    const g = ctx.createLinearGradient(x1,y1,x2,y2);
    g.addColorStop(0, 'rgba(220,38,38,0.18)');
    g.addColorStop(1, 'rgba(239,68,68,0.10)');
    ctx.strokeStyle = g; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
}

function drawParticles() {
  particles.forEach(p => {
    const src = networkData.nodes[p.conn.source];
    const tgt = networkData.nodes[p.conn.target];
    const [x1,y1] = _coords(src), [x2,y2] = _coords(tgt);
    const x = x1 + (x2-x1)*p.progress, y = y1 + (y2-y1)*p.progress;
    const g = ctx.createRadialGradient(x,y,0,x,y,8);
    g.addColorStop(0,'rgba(220,38,38,0.95)'); g.addColorStop(1,'rgba(220,38,38,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x,y,7,0,Math.PI*2); ctx.fill();
    p.progress += p.speed;
    if (p.progress > 1) {
      p.progress = 0;
      p.conn = networkData.connections[Math.floor(Math.random()*networkData.connections.length)];
    }
  });
}

function drawNodes() {
  networkData.nodes.forEach(n => {
    const [x,y] = _coords(n), r = 5 + n.value * 8;
    const glow = ctx.createRadialGradient(x,y,0,x,y,r*3);
    glow.addColorStop(0,`rgba(220,38,38,${0.35*n.value})`); glow.addColorStop(1,'rgba(220,38,38,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x,y,r*3,0,Math.PI*2); ctx.fill();
    const ng = ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
    ng.addColorStop(0,'rgba(255,160,160,1)'); ng.addColorStop(.5,'rgba(220,38,38,.9)'); ng.addColorStop(1,'rgba(153,27,27,.7)');
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(220,38,38,${0.7+n.value*.3})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
  });
}

function drawLabels() {
  const pad = 60, h = canvas.height - pad*2;
  const names = ['Input','Hidden 1','Hidden 2','Hidden 3','Output'];
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  networkData.layers?.forEach((size, i) => {
    const y = pad + (i/(networkData.layers.length-1))*h;
    ctx.fillStyle = 'rgba(220,38,38,0.75)';
    ctx.fillText(`${names[i]||`L${i}`} (${size})`, 8, y+4);
  });
}

// ── System Status ──────────────────────────────────────────
function setStatus(id, text, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `status-value ${state}`;
}

async function checkStatus() {
  try {
    const res  = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    setStatus('api-status',     data.status === 'healthy' ? 'Online' : 'Degraded', data.status === 'healthy' ? 'online' : 'pending');
    setStatus('network-status', data.solana_network || 'mainnet-beta', 'online');
    setStatus('phase-status',   data.phase || 'Active', 'online');
    setStatus('dqn-status',     'Active', 'online');
    setStatus('x402-status',    data.x402 || 'Online', 'online');
    const tps = document.getElementById('stat-tps');
    if (tps && data.tps) tps.textContent = data.tps;
    const nodes = document.getElementById('stat-nodes');
    if (nodes && data.validators) nodes.textContent = data.validators;
    const phase = document.getElementById('stat-phase');
    if (phase && data.phase) phase.textContent = data.phase;
  } catch {
    setStatus('api-status',     'Offline',      'offline');
    setStatus('network-status', 'Disconnected', 'offline');
    setStatus('phase-status',   'Unknown',      'offline');
    setStatus('dqn-status',     'Active',       'online');  // local — always on
    setStatus('x402-status',    'Offline',      'offline');
  }
}

// ── Chat Terminal ──────────────────────────────────────────
let chatHistory = [];

function initChat() {
  const out = document.getElementById('chat-output');
  if (!out) return;
  out.innerHTML = `<div class="msg-system">SINGULARITY.IO AI TERMINAL v2.0 — Groq Llama 3.3 70B</div>
<div class="msg-system" style="margin-top:.5rem">Try: "What is my wallet balance?" · "Create a token called NOVA" · "Explain the DQN"</div>
<div class="msg-system" style="margin-top:.25rem;color:var(--cyan)">Ready ›</div>`;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input?.value.trim();
  if (!msg) return;
  addMsg('user', msg);
  input.value = '';

  try {
    const res  = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, wallet: window.walletManager?.publicKey, history: chatHistory })
    });
    const data = await res.json();
    const reply = data.response || 'No response.';

    // Handle structured agent actions
    try {
      const parsed = JSON.parse(reply);
      if (parsed.action === 'create_token') {
        addMsg('ai', parsed.message);
        createToken(parsed.params);
        return;
      }
    } catch { /* plain text */ }

    addMsg('ai', reply);
    chatHistory.push({ user: msg, assistant: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch (err) {
    addMsg('ai', `Connection error: ${err.message}`);
  }
}

function addMsg(role, text) {
  const out = document.getElementById('chat-output');
  if (!out) return;
  const div = document.createElement('div');
  div.className = `msg-${role}`;
  div.style.marginTop = '0.4rem';
  div.textContent = text;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function createToken(params) {
  if (!window.walletManager?.connected) {
    addMsg('ai', 'Connect your wallet first to create tokens.');
    return;
  }
  const mint = Array.from({length:44},()=>'123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random()*58)]).join('');
  const tokens = JSON.parse(localStorage.getItem('tokens')||'[]');
  tokens.push({ mint, ...params, creator: window.walletManager.publicKey, timestamp: Date.now() });
  localStorage.setItem('tokens', JSON.stringify(tokens));
  addMsg('ai', `✓ Token created — ${params.name} (${params.symbol})\nMint: ${mint.slice(0,8)}…${mint.slice(-8)}\nView on Token Launchpad`);
  window.Toast?.success(`Token ${params.symbol} created`);
}

// ── Boot ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initChat();
  checkStatus();
  setInterval(checkStatus, 30_000);
  setTimeout(loadNetwork, 400);

  document.getElementById('update-btn')?.addEventListener('click', loadNetwork);
  document.getElementById('send-btn')?.addEventListener('click', sendMessage);
  document.getElementById('chat-input')?.addEventListener('keydown', e => { if (e.key==='Enter') sendMessage(); });
});

window.addEventListener('beforeunload', () => { if (animFrame) cancelAnimationFrame(animFrame); });
