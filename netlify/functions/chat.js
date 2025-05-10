// Netlify bundles this file with esbuild; requires Node ≥20.
export const handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  // ---------- 0. Pre-flight ----------
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown';

  // ---------- 1. Very cheap rate-limit (20 req / 5 min per IP) ----------
  globalThis.bucket ??= new Map();
  const now = Date.now();
  const hits = (globalThis.bucket.get(ip) || []).filter(t => now - t < 300_000);
  if (hits.length >= 20) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limit' }) };
  }
  globalThis.bucket.set(ip, [...hits, now]);

  // ---------- 2. Parse & validate body ----------
  let body;
  try {
    body = JSON.parse(event.body || "{}"); // now expects { messages: [...] }
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Bad JSON" }) };
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const userEntry = messages.find(m => m.role === 'user')?.content.trim();
  if (!userEntry) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty message' }) };
  }

  // ---------- 3. Moderation guard (OpenAI policy) ----------
  const modResp = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ input: userEntry })
  }).then(r => r.json());
  if (modResp.results?.[0]?.flagged) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Content violates policy" })
    };
  }

  // ---------- 4. Call Chat Completions ----------
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_500); // stay under 10-s limit
  try {
    const ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: 'gpt-4o-mini',          // cheaper + faster than gpt-3.5
        messages,
        temperature: 0.7
      }),
      signal: controller.signal
    }).then(r => r.json());

    const reply = ai.choices?.[0]?.message?.content?.trim() || '(no answer)';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.name === 'AbortError' ? 'Timeout' : 'Upstream error' })
    };
  } finally {
    clearTimeout(timeout);
  }

  // ---------- helper ----------
  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    };
  }
};
