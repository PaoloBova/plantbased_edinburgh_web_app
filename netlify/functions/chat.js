export default async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(200, cors);
    return res.end();
  }

  // Simple IP-based rate limit (20 req / 10 min in memory)
  if (!global.bucket) global.bucket = new Map();
  const key = req.headers["x-nf-client-connection-ip"];
  const now = Date.now();
  const counter = global.bucket.get(key) || [];
  global.bucket.set(key, counter.filter(t => now - t < 6e5).concat(now));
  if (global.bucket.get(key).length > 20) return res.status(429).end();

  const body = JSON.parse(req.body || "{}");
  const userMessage = body.message;
  if (!userMessage) return res.status(400).json({ error: "No message provided" });

  // 1. OpenAI moderation guard
  const mod = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ input: userMessage })
  }).then(r => r.json());
  if (mod.results[0].flagged) return res.status(400).json({ error: "Policy violation" });

  // 2. System prompt + GPT-4o-mini
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an email-writing assistant …" },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  };

  // 3. Non-streaming to stay <10s
  const ai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: auth,
    body: JSON.stringify(payload),
    signal: Abort(9500)
  }).then(r => r.json());

  res.writeHead(200, cors);
  return res.end(JSON.stringify(ai.choices[0].message));
};
