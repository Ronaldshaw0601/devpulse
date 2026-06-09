import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_STYLES = {
  high:   "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low:    "bg-green-100 text-green-700 border border-green-200",
}

const DOT_COLORS = ["#7c3aed", "#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#ec4899"]

export default function TodaysPlan({ onAddTask }) {
  const [plan, setPlan]       = useState(null)   // full plan object from API
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError]     = useState(null)

  // Load today's cached plan (or fall back to raw tasks)
  useEffect(() => {
    axios.get(`${API}/api/plan/today`)
      .then(res => {
        if (res.data.generated && res.data.scheduled_tasks?.length) {
          setPlan(res.data)
        } else {
          // No plan yet — fall back to raw task list
          return axios.get(`${API}/api/tasks`).then(r => {
            const tasks = r.data.tasks || []
            setPlan({ generated: false, scheduled_tasks: tasks.slice(0, 6) })
          })
        }
      })
      .catch(() => setPlan({ generated: false, scheduled_tasks: [] }))
      .finally(() => setLoading(false))
  }, [])

  const handleOptimize = () => {
    setOptimizing(true)
    setError(null)
    axios.post(`${API}/api/plan/generate`)
      .then(res => setPlan(res.data))
      .catch(() => setError("Failed to generate plan. Try again."))
      .finally(() => setOptimizing(false))
  }

  const tasks = plan?.scheduled_tasks || []
  const totalHours = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)
  const isAIPlan = plan?.generated === true

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-sm border border-[#f0eaff] dark:border-[#1e1e2e] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-[#1e1b4b] dark:text-white">Today's Plan</h3>
          <span className="text-xs text-[#7c3aed] bg-[#ede9fe] dark:bg-[#2a2a3e] px-2.5 py-1 rounded-full font-medium">
            {totalHours}h total
          </span>
          {isAIPlan && (
            <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <span>✦</span> AI Optimized
              {plan?.current_time && (
                <span className="text-[10px] text-emerald-500 ml-1">as of {plan.current_time}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOptimize}
            disabled={optimizing}
            className="flex items-center gap-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded-lg transition font-medium"
          >
            {optimizing ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Optimizing…
              </>
            ) : (
              <>
                <span className="text-yellow-300">✦</span>
                {isAIPlan ? "Re-optimize" : "Optimize Plan"}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10">{error}</div>
      )}

      {/* Table Header */}
      <div
        className="grid px-5 py-2.5 bg-[#faf8ff] dark:bg-[#0f0f1a] border-b border-[#f5f0ff] dark:border-[#1e1e2e]"
        style={{ gridTemplateColumns: "160px 1fr 90px 130px 80px 100px" }}
      >
        {["TIME", "TASK", "PRIORITY", "PROJECT", "EST.", isAIPlan ? "CONFIDENCE" : "STATUS"].map((h, i) => (
          <span key={i} className="text-[10px] font-semibold text-[#9ca3af] dark:text-gray-500 tracking-wider uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {loading ? (
        <div className="py-10 text-center text-sm text-[#9ca3af] dark:text-gray-500">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#9ca3af] dark:text-gray-500 px-6">
          {plan?.note || "No pending tasks — click Optimize Plan to generate a schedule."}
        </div>
      ) : (
        <div className="divide-y divide-[#faf8ff] dark:divide-[#1e1e2e]">
          {tasks.map((task, i) => {
            const conf     = task.confidence ?? null
            const priority = (task.priority || "medium").toLowerCase()
            const startTime = task.start_time || null
            const endTime   = task.end_time   || null

            return (
              <div
                key={i}
                className="grid items-center px-5 py-3 hover:bg-[#faf8ff] dark:hover:bg-[#0f0f1a] transition group"
                style={{ gridTemplateColumns: "160px 1fr 90px 130px 80px 100px" }}
                title={task.reason || ""}
              >
                {/* Time */}
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }} />
                  {startTime ? (
                    <div>
                      <p className="text-xs font-medium text-[#374151] dark:text-gray-200">{startTime}</p>
                      <p className="text-[10px] text-[#9ca3af] dark:text-gray-500">− {endTime}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#9ca3af] dark:text-gray-500">Unscheduled</p>
                  )}
                </div>

                {/* Task */}
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-[#1e1b4b] dark:text-white truncate">{task.title}</p>
                  {task.reason && isAIPlan && (
                    <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 truncate italic">{task.reason}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </span>
                </div>

                {/* Project */}
                <p className="text-xs text-[#6b7280] dark:text-gray-400 truncate pr-2">
                  {task.project_name || "—"}
                </p>

                {/* Est. Time */}
                <p className="text-sm font-medium text-[#374151] dark:text-gray-200">
                  {task.estimated_hours ? `${task.estimated_hours}h` : "1h"}
                </p>

                {/* Confidence ring (AI plan) or status badge (raw tasks) */}
                {isAIPlan && conf !== null ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-9 h-9">
                      <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ede9fe" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9"
                          fill="none"
                          stroke={conf >= 80 ? "#7c3aed" : conf >= 65 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="3"
                          strokeDasharray={`${conf} ${100 - conf}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-bold text-[#1e1b4b] dark:text-white" style={{ fontSize: "8px" }}>
                          {conf}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-[10px] text-[#9ca3af] dark:text-gray-500 capitalize">
                    {task.status || "pending"}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#f5f0ff] dark:border-[#1e1e2e] flex items-center justify-between">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 text-sm text-[#7c3aed] hover:text-[#6d28d9] font-medium transition"
        >
          <span className="w-5 h-5 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center text-[#7c3aed] text-xs font-bold">+</span>
          Add Task
        </button>
        {plan?.generated_at && (
          <span className="text-[10px] text-[#9ca3af] dark:text-gray-500">
            Generated {new Date(plan.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  )
}
