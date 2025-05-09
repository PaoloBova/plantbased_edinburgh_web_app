export default async (req, res) => {
  // Simple IP-based rate limit (20 req / 10 min in memory)
  if (!global.bucket) global.bucket = new Map();
  const key = req.headers["x-nf-client-connection-ip"];
  const now = Date.now();
  const counter = global.bucket.get(key) || [];
  global.bucket.set(key, counter.filter(t => now - t < 6e5).concat(now));
  if (global.bucket.get(key).length > 20) return res.status(429).end();

  const body = JSON.parse(req.body || "{}");
  // 1. OpenAI moderation guard
  const mod = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ input: body.messages.at(-1)?.content || "" })
  }).then(r => r.json());
  if (mod.results[0].flagged) return res.status(400).json({error:"Policy violation"});

  // 2. System prompt + GPT-4o-mini
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {role:"system", content:"You are an email-writing assistant …"},
      ...body.messages
    ],
    temperature: 0.7
  };

  // 3. Non-streaming to stay <10 s
  const ai = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST", headers: auth, body: JSON.stringify(payload), signal: Abort(9500)
  }).then(r=>r.json());
  res.setHeader("Access-Control-Allow-Origin","https://YOUR_DOMAIN");
  return res.json(ai.choices[0].message);
};
