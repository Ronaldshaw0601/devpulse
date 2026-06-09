import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const QUICK_PROMPTS = [
  { icon: "📅", label: "Smart Plan", msg: "Plan my day — I have 4 hours to work today" },
  { icon: "🚨", label: "Find Blockers", msg: "What's blocked across all my projects?" },
  { icon: "📝", label: "Client Update", msg: "Generate a professional client status update" },
  { icon: "📊", label: "Weekly Summary", msg: "What did I accomplish this week?" },
  { icon: "🎯", label: "Next Task", msg: "What should I work on next based on priority and deadlines?" },
  { icon: "⏰", label: "Due Soon", msg: "What's due soonest across all projects?" },
]

export default function AgentChat({ messages, setMessages, pendingMessage, clearPendingMessage }) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)
  const pendingSent = useRef(false)

  // Abort in-flight request when navigating away
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Auto-send pending message from Dashboard on mount
  useEffect(() => {
    if (pendingMessage?.trim() && !pendingSent.current) {
      pendingSent.current = true
      clearPendingMessage?.()
      // Small delay so component is fully mounted before sending
      setTimeout(() => send(pendingMessage), 50)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async (text) => {
    const msg = text || input
    if (!msg.trim() || loading) return

    setInput("")

    const currentHistory = messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }))

    // Add user message + empty assistant placeholder
    setMessages(prev => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "" },
    ])
    setLoading(true)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(`${API}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: currentHistory }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (raw === "[DONE]") break

          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = { role: "assistant", content: `❌ ${parsed.error}` }
                return msgs
              })
              break
            }
            if (parsed.token) {
              setMessages(prev => {
                const msgs = [...prev]
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: msgs[msgs.length - 1].content + parsed.token,
                }
                return msgs
              })
            }
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: "assistant", content: "❌ Error connecting to agent." }
          return msgs
        })
      }
    } finally {
      setLoading(false)
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setLoading(false)
    setStreaming(false)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2e] bg-[#13131f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
              ✦
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">DevPulse AI Agent</h2>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${streaming ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
                <span className="text-xs text-gray-400">
                  {streaming ? "Streaming response…" : "Connected to MongoDB · Gemini 2.5 Flash"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streaming && (
              <button
                onClick={stop}
                className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-3 py-1.5 rounded-lg transition border border-red-800/30"
              >
                ⬛ Stop
              </button>
            )}
            <button
              onClick={() => { abortRef.current?.abort(); setMessages([{
                role: "assistant",
                content: "Hey Raj! 👋 Chat cleared. How can I help you?"
              }]) }}
              className="text-xs text-gray-400 hover:text-white bg-[#1e1e2e] px-3 py-1.5 rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5 text-sm">
                  ✦
                </div>
              )}

              <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-purple-600 text-white rounded-tr-sm"
                  : "bg-[#13131f] border border-[#1e1e2e] text-gray-100 rounded-tl-sm"
              }`}>
                {m.content === "" && i === messages.length - 1 && streaming ? (
                  /* Blinking cursor while agent is thinking */
                  <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse rounded-sm" />
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      li: ({ children }) => <li className="ml-4 mb-1">{children}</li>,
                      ul: ({ children }) => <ul className="list-disc mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal mb-2">{children}</ol>,
                      code: ({ children }) => (
                        <code className="bg-[#1e1e2e] text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                )}

                {/* Streaming cursor appended to last message */}
                {streaming && i === messages.length - 1 && m.content !== "" && (
                  <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse rounded-sm ml-0.5 align-middle" />
                )}
              </div>

              {m.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 text-sm font-bold">
                  R
                </div>
              )}
            </div>
          ))}

          {/* Loading dots (only shown before first token arrives) */}
          {loading && !streaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 flex-shrink-0 text-sm">
                ✦
              </div>
              <div className="bg-[#13131f] border border-[#1e1e2e] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-6 pb-3 flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => send(p.msg)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs bg-[#13131f] hover:bg-[#1e1e2e] border border-[#1e1e2e] hover:border-purple-500/30 text-gray-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1e1e2e]">
          <div className="flex items-center gap-3 bg-[#13131f] border border-[#1e1e2e] hover:border-purple-500/30 rounded-xl px-4 py-3 transition">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask DevPulse anything about your projects..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-gray-300 outline-none placeholder-gray-600 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-8 h-8 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center justify-center text-white transition disabled:opacity-50 text-sm"
            >
              ➤
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">Powered by Gemini 2.5 Flash on Vertex AI · Responses stream in real-time</p>
        </div>

      </div>
    </div>
  )
}
