import { createRoot } from "https://esm.sh/react-dom@18/client";
import React, { useState } from "https://esm.sh/react@18";
function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! What would you like your e-mail to say?" }
  ]);
  const [input, setInput] = useState("");
  async function send() {
    if (!input.trim()) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    const res = await fetch("/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next })
    });
    for await (const chunk of res.body?.getReader() ?? []) {
      // naive stream reader – replace with better logic for production
      const text = new TextDecoder().decode(chunk.value);
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: text }]);
    }
  }
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <div className="space-y-4 h-64 overflow-y-auto pr-2">
        {messages.map((m, i) => (
          <p key={i} className={m.role === "user" ? "text-right" : ""}>
            <span
              className={`inline-block px-3 py-2 rounded-lg ${
                m.role === "user" ? "bg-emerald-50" : "bg-slate-50"
              }`}
            >
              {m.content}
            </span>
          </p>
        ))}
      </div>
      <div className="mt-4 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-l-lg px-3 py-2 outline-none"
          placeholder="Type…"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          className="bg-emerald-600 text-white px-4 rounded-r-lg"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
createRoot(document.getElementById("chat-root")).render(<App />);
