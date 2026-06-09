import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const CATEGORY_CONFIG = {
  deep_work: {
    label: "Deep Work",
    color: "#7c3aed",
    bg: "bg-[#ede9fe] dark:bg-[#2a2a3e]",
    text: "text-[#7c3aed]",
    bar: "bg-[#7c3aed]",
    desc: "Focused coding, architecture, complex problem solving",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  shallow_work: {
    label: "Shallow Work",
    color: "#3b82f6",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    desc: "Reviews, documentation, emails, simple fixes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  meetings: {
    label: "Meetings",
    color: "#f59e0b",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    text: "text-yellow-600 dark:text-yellow-400",
    bar: "bg-yellow-500",
    desc: "Client calls, standups, design reviews",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
}

function DonutChart({ deep, shallow, meetings, total }) {
  if (total === 0) {
    return (
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 36 36" className="w-44 h-44 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f5f0ff" strokeWidth="4" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#1e1b4b] dark:text-white">0h</span>
          <span className="text-xs text-[#9ca3af] dark:text-gray-500">No data</span>
        </div>
      </div>
    )
  }

  const circumference = 100
  const deepPct = (deep / total) * circumference
  const shallowPct = (shallow / total) * circumference
  const meetingsPct = (meetings / total) * circumference

  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 36 36" className="w-44 h-44 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="4" />
        {/* Deep Work */}
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="4"
          strokeDasharray={`${deepPct} ${circumference - deepPct}`}
          strokeLinecap="butt" />
        {/* Shallow Work */}
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="4"
          strokeDasharray={`${shallowPct} ${circumference - shallowPct}`}
          strokeDashoffset={`-${deepPct}`}
          strokeLinecap="butt" />
        {/* Meetings */}
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4"
          strokeDasharray={`${meetingsPct} ${circumference - meetingsPct}`}
          strokeDashoffset={`-${deepPct + shallowPct}`}
          strokeLinecap="butt" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#1e1b4b] dark:text-white">{total}h</span>
        <span className="text-xs text-[#9ca3af] dark:text-gray-500">Today</span>
      </div>
    </div>
  )
}

export default function TimeAllocationPage({ setActiveNav }) {
  const [allocation, setAllocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [tasks, setTasks] = useState([])

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      axios.get(`${API}/api/time-allocation`),
      axios.get(`${API}/api/tasks`),
    ])
      .then(([a, t]) => {
        setAllocation(a.data)
        setTasks(t.data.tasks || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const allocateForToday = async () => {
    setGenerating(true)
    try {
      const { data } = await axios.post(`${API}/api/time-allocation/generate`)
      setAllocation(data)
    } catch {
      console.error("Failed to generate allocation")
    } finally {
      setGenerating(false)
    }
  }

  const deep = allocation?.deep_work || 0
  const shallow = allocation?.shallow_work || 0
  const meetings = allocation?.meetings || 0
  const total = allocation?.total || 0

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  // Map task categories from agent response
  const taskCategories = allocation?.tasks || []
  const getCategoryForTask = (title) => {
    const found = taskCategories.find(t => t.title?.toLowerCase().includes(title?.toLowerCase().slice(0, 15)))
    return found?.category || null
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveNav("dashboard")}
              className="w-8 h-8 rounded-lg bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#1e1e2e] flex items-center justify-center text-[#6b7280] dark:text-gray-400 hover:text-[#7c3aed] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Time Allocation</h1>
              <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{today}</p>
            </div>
          </div>

          <button
            onClick={allocateForToday}
            disabled={generating || tasks.length === 0}
            className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Allocating...
              </>
            ) : (
              <>
                <span className="text-yellow-300">✦</span>
                Allocate for Today
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] h-32 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* No tasks warning */}
            {tasks.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl px-5 py-3.5 mb-5 flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">No tasks found. Add tasks first, then allocate time.</p>
              </div>
            )}

            {/* Main Layout */}
            <div className="grid grid-cols-3 gap-6 mb-6">

              {/* Donut + summary */}
              <div className="col-span-1 bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-6 flex flex-col items-center justify-center gap-4">
                <DonutChart deep={deep} shallow={shallow} meetings={meetings} total={total} />

                <div className="w-full space-y-2">
                  {[
                    { key: "deep_work", val: deep },
                    { key: "shallow_work", val: shallow },
                    { key: "meetings", val: meetings },
                  ].map(({ key, val }) => {
                    const cfg = CATEGORY_CONFIG[key]
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          <span className="text-xs text-[#6b7280] dark:text-gray-400">{cfg.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#1e1b4b] dark:text-white">{val}h</span>
                      </div>
                    )
                  })}
                </div>

                {allocation?.generated_at && (
                  <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 text-center">
                    Last allocated {new Date(allocation.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>

              {/* Category cards */}
              <div className="col-span-2 space-y-4">
                {["deep_work", "shallow_work", "meetings"].map(key => {
                  const cfg = CATEGORY_CONFIG[key]
                  const val = allocation?.[key] || 0
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0
                  const relatedTasks = tasks.filter(t => {
                    const cat = getCategoryForTask(t.title)
                    if (cat) return cat === key
                    // Fallback heuristic
                    if (key === "deep_work") return t.priority === "high"
                    if (key === "meetings") return ["meeting", "review", "client", "call"].some(w => t.title?.toLowerCase().includes(w))
                    return t.priority !== "high"
                  })

                  return (
                    <div key={key} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className={cfg.text}>{cfg.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1e1b4b] dark:text-white">{cfg.label}</p>
                            <p className="text-xs text-[#9ca3af] dark:text-gray-500">{cfg.desc}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#1e1b4b] dark:text-white">{val}h</p>
                          <p className="text-xs text-[#9ca3af] dark:text-gray-500">{pct}% of day</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Task chips */}
                      {relatedTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {relatedTasks.slice(0, 4).map((t, i) => (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                              {t.title.slice(0, 30)}{t.title.length > 30 ? "…" : ""}
                            </span>
                          ))}
                          {relatedTasks.length > 4 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#9ca3af] dark:text-gray-500">
                              +{relatedTasks.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {relatedTasks.length === 0 && val > 0 && (
                        <p className="text-xs text-[#9ca3af] dark:text-gray-500 italic">No tasks mapped to this category yet</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Task breakdown table */}
            {tasks.length > 0 && (
              <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
                  <h2 className="text-sm font-bold text-[#1e1b4b] dark:text-white">All Tasks for Today</h2>
                </div>
                <div className="divide-y divide-[#faf8ff] dark:divide-[#1e1e2e]">
                  {tasks.slice(0, 10).map((t, i) => {
                    const catKey = getCategoryForTask(t.title) ||
                      (t.priority === "high" ? "deep_work" :
                       ["meeting","review","client","call"].some(w => t.title?.toLowerCase().includes(w)) ? "meetings" : "shallow_work")
                    const cfg = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.shallow_work
                    return (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[#faf8ff] dark:hover:bg-[#1e1e2e] transition">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                        <p className="text-sm text-[#1e1b4b] dark:text-white flex-1 truncate">{t.title}</p>
                        <span className="text-xs text-[#9ca3af] dark:text-gray-500">{t.project_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-medium text-[#374151] dark:text-gray-200 w-8 text-right">{t.estimated_hours}h</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
