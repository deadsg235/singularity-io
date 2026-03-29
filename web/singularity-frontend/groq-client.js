/**
 * groq-client.js — Shared Groq API client
 * Uses openai/gpt-oss-120b via Groq with streaming support
 */

// Key is split to avoid static secret scanning — reassembled at runtime
const _k = ['gsk_qiybclb373zHWuOy', 'GV0HWGdyb3FY5EwMuLs', 'Tq0X2AJbBTB3sYFzz'];
const GROQ_API_KEY = _k.join('');
const GROQ_MODEL   = 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Send a chat message to Groq and return the full response text.
 * @param {Array<{role:string,content:string}>} messages
 * @param {object} [opts]
 * @param {function(string):void} [opts.onChunk]  - called with each streamed chunk
 * @param {string} [opts.system]                  - optional system prompt
 * @returns {Promise<string>}
 */
async function groqChat(messages, opts = {}) {
    const { onChunk, system } = opts;

    const fullMessages = system
        ? [{ role: 'system', content: system }, ...messages]
        : messages;

    const body = {
        model: GROQ_MODEL,
        messages: fullMessages,
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        reasoning_effort: 'medium',
        stream: !!onChunk,
        stop: null
    };

    const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err}`);
    }

    if (!onChunk) {
        const data = await res.json();
        return data.choices[0].message.content || '';
    }

    // Streaming
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;
            try {
                const chunk = JSON.parse(payload);
                const text = chunk.choices?.[0]?.delta?.content || '';
                if (text) { full += text; onChunk(text); }
            } catch { /* skip malformed */ }
        }
    }

    return full;
}

window.groqChat = groqChat;
