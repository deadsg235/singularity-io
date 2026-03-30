/**
 * groq-client.js — Groq chat client for Singularity.io
 *
 * Routes all requests through /api/ai/chat (FastAPI proxy) so the
 * GROQ_API_KEY stays server-side and never appears in the browser bundle.
 *
 * Falls back to direct Groq only on localhost when the backend isn't running,
 * using a dev-only key that should be rotated before production use.
 */

const GROQ_MODEL  = 'llama-3.3-70b-versatile';
const API_CHAT    = '/api/ai/chat';

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Send a chat message and return the full response text.
 *
 * @param {Array<{role:string,content:string}>} messages
 * @param {object} [opts]
 * @param {function(string):void} [opts.onChunk]  - called with each streamed token
 * @param {string}  [opts.system]                 - optional system prompt
 * @param {number}  [opts.maxTokens]              - default 4096
 * @param {number}  [opts.temperature]            - default 0.8
 * @returns {Promise<string>}
 */
async function groqChat(messages, opts = {}) {
    const { onChunk, system, maxTokens = 4096, temperature = 0.8 } = opts;

    // Try backend proxy first
    try {
        return await _proxyChat(messages, { onChunk, system, maxTokens, temperature });
    } catch (proxyErr) {
        // Only fall back to direct call on localhost dev
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            throw proxyErr;
        }
        console.warn('[groq] Backend proxy failed, using direct fallback (dev only):', proxyErr.message);
        return await _directChat(messages, { onChunk, system, maxTokens, temperature });
    }
}

// ── Backend proxy (production path) ──────────────────────────────────────────

async function _proxyChat(messages, { onChunk, system, maxTokens, temperature }) {
    const body = {
        messages,
        system:      system || null,
        stream:      !!onChunk,
        max_tokens:  maxTokens,
        temperature,
    };

    const res = await fetch(API_CHAT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(60000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error('API error ' + res.status + ': ' + err);
    }

    if (!onChunk) {
        // Non-streaming: collect full response
        const data = await res.json();
        return data.content || data.text || '';
    }

    // Streaming SSE
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return full;
            try {
                const chunk = JSON.parse(payload);
                const text  = chunk.text || chunk.content || '';
                if (text) { full += text; onChunk(text); }
            } catch { /* skip malformed */ }
        }
    }
    return full;
}

// ── Direct Groq fallback (localhost dev only) ─────────────────────────────────

async function _directChat(messages, { onChunk, system, maxTokens, temperature }) {
    // This key is intentionally non-functional in production.
    // Set GROQ_API_KEY in Vercel env vars — the proxy handles it server-side.
    const devKey = '';
    if (!devKey) {
        throw new Error('No GROQ_API_KEY configured. Set it in Vercel environment variables.');
    }

    const fullMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + devKey },
        body:    JSON.stringify({
            model:      GROQ_MODEL,
            messages:   fullMessages,
            temperature,
            max_tokens: maxTokens,
            stream:     !!onChunk,
        }),
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error('Groq error ' + res.status + ': ' + err);
    }

    if (!onChunk) {
        const data = await res.json();
        return data.choices[0].message.content || '';
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return full;
            try {
                const chunk = JSON.parse(payload);
                const text  = chunk.choices?.[0]?.delta?.content || '';
                if (text) { full += text; onChunk(text); }
            } catch { /* skip malformed */ }
        }
    }
    return full;
}

window.groqChat = groqChat;
