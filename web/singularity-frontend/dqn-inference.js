/**
 * dqn-inference.js — Browser-side DQN inference using onnxruntime-web
 * Loads dqn_node_model.onnx and exposes window.dqnInfer(marketData)
 */

const DQN_ACTIONS = [
    'STRONG_BUY', 'BUY', 'WEAK_BUY', 'HOLD', 'WEAK_SELL',
    'SELL', 'STRONG_SELL', 'INCREASE_POSITION', 'REDUCE_POSITION', 'EXIT'
];

const ACTION_COLORS = {
    'STRONG_BUY': '#00ff88', 'BUY': '#00cc66', 'WEAK_BUY': '#66ff99',
    'HOLD': '#ffaa00', 'WEAK_SELL': '#ff9966', 'SELL': '#ff4444',
    'STRONG_SELL': '#ff0000', 'INCREASE_POSITION': '#00d4ff',
    'REDUCE_POSITION': '#ff8800', 'EXIT': '#ff0066'
};

let _session = null;

// Resolve when model is ready
let _resolveReady;
window.dqnReady = new Promise(resolve => { _resolveReady = resolve; });

async function loadDQNModel() {
    try {
        // ort is loaded via CDN script tag
        if (typeof ort === 'undefined') {
            console.warn('DQN: onnxruntime-web not loaded');
            return;
        }
        ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/';
        _session = await ort.InferenceSession.create('./dqn_node_model.onnx', {
            executionProviders: ['wasm']
        });
        console.log('DQN model loaded. Inputs:', _session.inputNames, 'Outputs:', _session.outputNames);
        _resolveReady(_session);
        window.dispatchEvent(new CustomEvent('dqnLoaded', { detail: { session: _session } }));
    } catch (err) {
        console.error('DQN model load failed:', err);
        // Resolve anyway so callers don't hang — they'll get null session
        _resolveReady(null);
    }
}

/**
 * Build a 128-float state vector from market data.
 * @param {object} market - { price, volume, rsi, macd, bbUpper, bbLower, solTps, walletBalance }
 */
function buildStateVector(market = {}) {
    const {
        price = 0, volume = 0, rsi = 50, macd = 0,
        bbUpper = 0, bbLower = 0, solTps = 3000, walletBalance = 0
    } = market;

    const vec = new Float32Array(128);
    // Normalize inputs to roughly 0-1 range
    vec[0] = Math.min(price / 1000, 1);          // price (SOL ~$100-300)
    vec[1] = Math.min(volume / 1e9, 1);           // volume
    vec[2] = rsi / 100;                            // RSI 0-100
    vec[3] = Math.tanh(macd / 10);                // MACD (tanh squash)
    vec[4] = Math.min(bbUpper / 1000, 1);         // BB upper
    vec[5] = Math.min(bbLower / 1000, 1);         // BB lower
    vec[6] = Math.min(solTps / 5000, 1);          // SOL TPS
    vec[7] = Math.min(walletBalance / 100, 1);    // wallet balance in SOL
    // indices 8-127 remain 0
    return vec;
}

/**
 * Run DQN inference.
 * @param {object} marketData - market snapshot
 * @returns {Promise<{actionIndex, actionLabel, qValues, confidence, color}>}
 */
async function dqnInfer(marketData = {}) {
    if (!_session) {
        // Fallback: return a deterministic result based on RSI
        const rsi = marketData.rsi ?? 50;
        const idx = rsi > 70 ? 5 : rsi < 30 ? 1 : 3; // SELL / BUY / HOLD
        return {
            actionIndex: idx,
            actionLabel: DQN_ACTIONS[idx],
            qValues: Array(10).fill(0).map((_, i) => i === idx ? 1 : Math.random() * 0.3),
            confidence: 0.6 + Math.random() * 0.2,
            color: ACTION_COLORS[DQN_ACTIONS[idx]],
            source: 'fallback'
        };
    }

    try {
        const stateVec = buildStateVector(marketData);
        const tensor = new ort.Tensor('float32', stateVec, [1, 128]);

        // Try common input name patterns
        const inputName = _session.inputNames[0];
        const feeds = { [inputName]: tensor };
        const results = await _session.run(feeds);
        const outputName = _session.outputNames[0];
        const qValues = Array.from(results[outputName].data);

        const actionIndex = qValues.indexOf(Math.max(...qValues));
        const actionLabel = DQN_ACTIONS[actionIndex] ?? 'HOLD';

        // Softmax for confidence
        const expQ = qValues.map(q => Math.exp(q - Math.max(...qValues)));
        const sumExp = expQ.reduce((a, b) => a + b, 0);
        const softmax = expQ.map(e => e / sumExp);
        const confidence = softmax[actionIndex];

        return {
            actionIndex,
            actionLabel,
            qValues,
            confidence,
            color: ACTION_COLORS[actionLabel] ?? '#ffffff',
            source: 'onnx'
        };
    } catch (err) {
        console.error('DQN inference error:', err);
        return { actionIndex: 3, actionLabel: 'HOLD', qValues: [], confidence: 0.5, color: '#ffaa00', source: 'error' };
    }
}

window.dqnInfer = dqnInfer;
window.dqnBuildState = buildStateVector;
window.DQN_ACTIONS = DQN_ACTIONS;
window.ACTION_COLORS = ACTION_COLORS;

// Auto-load when script runs
document.addEventListener('DOMContentLoaded', loadDQNModel);
// Also try immediately in case DOM is already ready
if (document.readyState !== 'loading') loadDQNModel();
