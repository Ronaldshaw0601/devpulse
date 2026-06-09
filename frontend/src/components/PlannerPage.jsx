import { useState, useEffect } from "react"
import axios from "axios"
import AddTaskModal from "./AddTaskModal"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
const DOT_COLORS = ["#7c3aed", "#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#ec4899", "#06b6d4", "#8b5cf6"]

const PRIORITY_BADGE = {
  high: "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-green-100 text-green-700 border border-green-200",
}

function formatHour(h) {
  if (h === 12) return "12:00 PM"
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`
}

export default function PlannerPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddTask, setShowAddTask] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [planNote, setPlanNote] = useState("")

  const fetchTasks = () => {
    setLoading(true)
    axios.get(`${API}/api/tasks`)
      .then(res => setTasks(res.data.tasks || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [])

  const generatePlan = async () => {
    setGenerating(true)
    setPlanNote("")
    try {
      const { data } = await axios.post(`${API}/api/chat`, {
        message: "Plan my day. I have 8 hours available. Prioritize by deadline and priority. Give me a clear schedule.",
        history: []
      })
      setPlanNote(data.response)
    } catch {
      setPlanNote("Failed to generate plan.")
    } finally {
      setGenerating(false)
    }
  }

  const now = new Date().getHours()
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  // Assign tasks to hour slots
  const pendingTasks = tasks.filter(t => t.status !== "completed")
  const slottedTasks = HOURS.map((h, i) => ({
    hour: h,
    task: pendingTasks[i] || null,
  }))

  const totalHours = pendingTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Planner</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#1e1e2e] text-[#7c3aed] text-sm px-4 py-2.5 rounded-xl font-medium hover:bg-[#f5f0ff] dark:bg-[#1e1e2e] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm px-4 py-2.5 rounded-xl font-medium transition shadow-sm disabled:opacity-60"
            >
              {generating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-yellow-300">✦</span>
              )}
              {generating ? "Planning..." : "AI Plan My Day"}
            </button>
          </div>
        </div>

        {/* AI Plan Note */}
        {planNote && (
          <div className="bg-gradient-to-r from-[#ede9fe] to-[#f5f0ff] border border-[#ddd6fe] rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#7c3aed]">✦</span>
              <span className="text-sm font-bold text-[#1e1b4b] dark:text-white">AI Day Plan</span>
            </div>
            <p className="text-sm text-[#374151] dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{planNote}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Tasks Today", value: pendingTasks.length, icon: "📋", color: "bg-[#ede9fe] dark:bg-[#2a2a3e] text-[#7c3aed]" },
            { label: "Total Hours", value: `${totalHours}h`, icon: "⏱", color: "bg-blue-100 text-blue-600" },
            { label: "Completed", value: tasks.filter(t => t.status === "completed").length, icon: "✅", color: "bg-green-100 text-green-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-[#1e1b4b] dark:text-white">{stat.value}</p>
                <p className="text-xs text-[#9ca3af] dark:text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Today's Schedule</h2>
            <span className="text-xs text-[#9ca3af] dark:text-gray-500">Work hours: 9 AM – 6 PM</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-[#9ca3af] dark:text-gray-500">Loading schedule…</div>
          ) : (
            <div className="divide-y divide-[#faf8ff] dark:divide-[#1e1e2e]">
              {slottedTasks.map(({ hour, task }, i) => {
                const isNow = now === hour
                const isPast = now > hour
                return (
                  <div key={i} className={`flex gap-4 px-5 py-3.5 ${isNow ? "bg-[#f5f0ff] dark:bg-[#1e1e2e]" : ""} transition`}>
                    {/* Hour label */}
                    <div className="w-20 flex-shrink-0 pt-0.5">
                      <p className={`text-xs font-semibold ${isNow ? "text-[#7c3aed]" : isPast ? "text-[#d1d5db]" : "text-[#6b7280] dark:text-gray-400"}`}>
                        {formatHour(hour)}
                      </p>
                      {isNow && (
                        <span className="text-[9px] bg-[#7c3aed] text-white px-1.5 py-0.5 rounded-full font-bold">NOW</span>
                      )}
                    </div>

                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center gap-0 w-5 flex-shrink-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5 border-2 border-white shadow-sm"
                        style={{ backgroundColor: task ? DOT_COLORS[i % DOT_COLORS.length] : "#e5e7eb" }}
                      />
                      {i < slottedTasks.length - 1 && (
                        <div className="w-0.5 flex-1 bg-[#f0eaff] mt-1" />
                      )}
                    </div>

                    {/* Task card or empty */}
                    <div className="flex-1 pb-2">
                      {task ? (
                        <div
                          className={`rounded-xl px-4 py-3 border transition ${isPast && task.status !== "completed" ? "opacity-60" : ""}`}
                          style={{
                            backgroundColor: `${DOT_COLORS[i % DOT_COLORS.length]}10`,
                            borderColor: `${DOT_COLORS[i % DOT_COLORS.length]}30`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold text-[#1e1b4b] dark:text-white truncate ${task.status === "completed" ? "line-through text-[#9ca3af] dark:text-gray-500" : ""}`}>
                                {task.title}
                              </p>
                              <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-0.5">{task.project_name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-[#9ca3af] dark:text-gray-500">{task.estimated_hours}h</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#d1d5db] italic pt-1">Free slot</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onAdded={fetchTasks} />
      )}
    </div>
  )
}
