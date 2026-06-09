import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_COLOR = { high: "text-red-500", medium: "text-yellow-600", low: "text-green-600" }

export default function SearchModal({ onClose, setActiveNav, setPendingAgentMessage }) {
  const [query, setQuery]     = useState("")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults(null); return }
    const delay = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(delay)
  }, [query])

  const runSearch = async (q) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/search`, { params: { q } })
      setResults(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const askAgent = () => {
    if (!query.trim()) return
    setPendingAgentMessage?.(`Tell me about tasks related to: ${query}`)
    setActiveNav?.("agent")
    onClose()
  }

  const taskCount    = results?.tasks?.length ?? 0
  const projectCount = results?.projects?.length ?? 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#13131f] rounded-2xl shadow-2xl border border-[#ede9fe] dark:border-[#1e1e2e] w-full max-w-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
          <svg className="w-5 h-5 text-[#7c3aed] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, tags..."
            className="flex-1 bg-transparent text-sm text-[#1e1b4b] dark:text-white outline-none placeholder-[#9ca3af]"
          />
          {loading && (
            <svg className="w-4 h-4 text-[#7c3aed] animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
          <kbd className="text-xs text-[#9ca3af] bg-[#f5f0ff] dark:bg-[#1e1e2e] px-2 py-1 rounded border border-[#ede9fe] dark:border-[#2a2a3e]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {!query.trim() ? (
            <div className="px-5 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm text-[#374151] dark:text-gray-300 font-medium mb-1">Search your workspace</p>
              <p className="text-xs text-[#9ca3af]">Tasks, projects, tags</p>
            </div>
          ) : results ? (
            <div className="p-4 space-y-4">
              {/* Tasks */}
              {taskCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider px-1 mb-2">Tasks ({taskCount})</p>
                  <div className="space-y-1.5">
                    {results.tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-[#f9f7ff] dark:bg-[#1e1e2e] rounded-xl hover:bg-[#ede9fe]/30 transition">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === "completed" ? "bg-green-500" : t.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${t.status === "completed" ? "line-through text-[#9ca3af]" : "text-[#1e1b4b] dark:text-white"}`}>{t.title}</p>
                          <p className="text-xs text-[#9ca3af] dark:text-gray-500">{t.project_name}</p>
                        </div>
                        <span className={`text-xs font-medium capitalize flex-shrink-0 ${PRIORITY_COLOR[t.priority] || "text-gray-400"}`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projectCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider px-1 mb-2">Projects ({projectCount})</p>
                  <div className="space-y-1.5">
                    {results.projects.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-[#f9f7ff] dark:bg-[#1e1e2e] rounded-xl hover:bg-[#ede9fe]/30 transition cursor-pointer"
                        onClick={() => { setActiveNav?.("projects"); onClose() }}
                      >
                        <span className="text-base flex-shrink-0">{p.type === "client" ? "💼" : "🧑‍💻"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1e1b4b] dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-[#9ca3af] dark:text-gray-500 truncate">{p.description}</p>
                        </div>
                        <span className={`text-xs font-medium capitalize flex-shrink-0 ${PRIORITY_COLOR[p.priority] || "text-gray-400"}`}>{p.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {taskCount === 0 && projectCount === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-[#9ca3af]">No results for "{query}"</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#f5f0ff] dark:border-[#1e1e2e] flex items-center justify-between bg-[#faf9ff] dark:bg-[#0f0f18]">
          <span className="text-xs text-[#9ca3af]">ESC to close</span>
          {query.trim() && (
            <button
              onClick={askAgent}
              className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] font-medium transition"
            >
              <span>✦</span> Ask AI about this →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
