import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const ACTION_CONFIG = {
  completed: {
    bg: "bg-green-100",
    icon: (
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-700 border border-green-200",
  },
  updated: {
    bg: "bg-blue-100",
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    dot: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  created: {
    bg: "bg-purple-100",
    icon: (
      <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    dot: "bg-[#7c3aed]",
    badge: "bg-purple-100 text-purple-700 border border-purple-200",
  },
}

function formatTimestamp(ts) {
  if (!ts) return "—"
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function groupByDate(activity) {
  const groups = {}
  activity.forEach(a => {
    const d = a.timestamp ? new Date(a.timestamp) : new Date()
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let label
    if (d.toDateString() === today.toDateString()) label = "Today"
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday"
    else label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  })
  return groups
}

export default function ActivityLogPage() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    axios.get(`${API}/api/activity`)
      .then(res => setActivity(res.data.activity || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === "all" ? activity : activity.filter(a => a.action === filter)
  const grouped = groupByDate(filtered)

  const counts = {
    all: activity.length,
    completed: activity.filter(a => a.action === "completed").length,
    updated: activity.filter(a => a.action === "updated").length,
    created: activity.filter(a => a.action === "created").length,
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Activity Log</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{activity.length} total entries</p>
          </div>
        </div>

        {/* Summary Chips */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: "all", label: "All Activity", color: "bg-[#7c3aed] text-white" },
            { key: "completed", label: "Completed", color: "bg-green-500 text-white" },
            { key: "updated", label: "Updated", color: "bg-blue-500 text-white" },
            { key: "created", label: "Created", color: "bg-purple-500 text-white" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                filter === tab.key
                  ? tab.color + " shadow-sm"
                  : "bg-white border border-[#ede9fe] dark:border-[#1e1e2e] text-[#6b7280] dark:text-gray-400 hover:bg-[#f5f0ff] dark:bg-[#1e1e2e]"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-white/20" : "bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#7c3aed]"
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl p-4 h-20 animate-pulse border border-[#f0eaff] dark:border-[#1e1e2e]">
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#374151] dark:text-gray-200">No activity yet</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-1">Complete or update tasks to see activity here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                {/* Date label */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-[#f0eaff]" />
                  <span className="text-xs text-[#9ca3af] dark:text-gray-500">{items.length} event{items.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2.5">
                  {items.map((a, i) => {
                    const cfg = ACTION_CONFIG[a.action] || ACTION_CONFIG.created
                    return (
                      <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4 flex items-start gap-4 hover:shadow-md transition">

                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[#1e1b4b] dark:text-white truncate">{a.task_title}</p>
                            <span className="text-xs text-[#9ca3af] dark:text-gray-500 flex-shrink-0">{formatTimestamp(a.timestamp)}</span>
                          </div>
                          {a.note && (
                            <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-0.5">{a.note}</p>
                          )}
                          {a.project_name && (
                            <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-1 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {a.project_name}
                            </p>
                          )}
                        </div>

                        {/* Badge */}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 capitalize ${cfg.badge}`}>
                          {a.action}
                        </span>

                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
