import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const QUICK_PROMPTS = [
  "Plan my day — I have 4 hours",
  "What's blocked across all projects?",
  "What did I work on this week?",
  "Generate a client update for ASC Platform",
  "What's due soonest?",
  "Summarize all my projects"
]

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey! I'm **DevPulse** — your personal AI project agent.\n\nI can see all your projects and tasks in real-time. Ask me to:\n- 📅 Plan your day\n- 🚨 Surface blockers\n- ✅ Log completed work\n- 📝 Draft client updates"
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async (text) => {
    const msg = text || input
    if (!msg.trim() || loading) return

    setInput("")
    const userMsg = { role: "user", content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))

      const { data } = await axios.post(`${API}/api/chat`, {
        message: msg,
        history
      })

      setMessages(prev => [...prev,
        { role: "assistant", content: data.response }])
    } catch (e) {
      setMessages(prev => [...prev,
        { role: "assistant", content: "❌ Error connecting to agent. Is the backend running?" }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-100"
            }`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-400">
              <span className="animate-pulse">⚡ DevPulse is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-6 pb-2 flex gap-2 flex-wrap">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={loading}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 
              px-3 py-1.5 rounded-full transition disabled:opacity-50">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask DevPulse anything about your projects..."
          disabled={loading}
          className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-sm 
            outline-none focus:ring-2 ring-green-500 disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 px-5 py-3 
            rounded-xl text-sm font-medium transition disabled:opacity-50">
          Send
        </button>
      </div>

    </div>
  )
}