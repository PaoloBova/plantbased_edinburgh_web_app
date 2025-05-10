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

  // enforce max-length on user input (silent drop if too long)
  if (userEntry.length > 1000) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: '' })
    };
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
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        functions: [
          {
            name: 'generate_email',
            description: 'Produce a JSON email with subject, opening_address, opening_paragraph, later_paragraphs, closing, signature',
            parameters: {
              type: 'object',
              properties: {
                subject: { type: 'string', description: 'Single-line subject (<65 chars)' },
                opening_address: { type: 'string', description: 'e.g. Dear Cllr. <<Surname>>,' },
                opening_paragraph: { type: 'string', description: '1–2 sentences of context' },
                later_paragraphs: { 
                  type: 'array',
                  items: { type: 'string' },
                  description: '0–2 additional short paragraphs or bullets'
                },
                closing: { type: 'string', description: 'One-sentence closing, e.g. Kind regards,' },
                signature: { type: 'string', description: 'Your sign-off, e.g. [Full Name]' }
              },
              required: ['subject','opening_address','opening_paragraph','closing','signature']
            }
          }
        ],
        function_call: { name: 'generate_email' }
      }),
      signal: controller.signal
    }).then(r => r.json());

    // extract function call
    const fnCall = ai.choices?.[0]?.message?.function_call;
    if (!fnCall || !fnCall.arguments) {
      throw new Error('No function call in response');
    }
    const reply = JSON.parse(fnCall.arguments);

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
