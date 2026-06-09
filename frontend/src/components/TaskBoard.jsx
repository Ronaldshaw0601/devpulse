import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_COLORS = {
  high: "border-red-500 bg-red-500/10",
  medium: "border-yellow-500 bg-yellow-500/10",
  low: "border-green-500 bg-green-500/10"
}

const STATUS_COLORS = {
  in_progress: "bg-blue-500/20 text-blue-300",
  pending: "bg-gray-500/20 text-gray-300",
  completed: "bg-green-500/20 text-green-300"
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState([])
  const [blocked, setBlocked] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tasks")

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/tasks`),
      axios.get(`${API}/api/blocked`),
      axios.get(`${API}/api/activity`)
    ]).then(([tasksRes, blockedRes, activityRes]) => {
      setTasks(tasksRes.data.tasks)
      setBlocked(blockedRes.data.blocked)
      setActivity(activityRes.data.activity)
    }).catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {[
          { key: "tasks", label: `📋 All Tasks (${tasks.length})` },
          { key: "blocked", label: `🚨 Blocked (${blocked.length})` },
          { key: "activity", label: `📝 Activity (${activity.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm text-center mt-8">
            Loading...
          </p>
        ) : (
          <>
            {/* Tasks Tab */}
            {activeTab === "tasks" && tasks.map((t, i) => (
              <div key={i}
                className={`rounded-xl p-4 border-l-4 
                  ${PRIORITY_COLORS[t.priority] || "border-gray-500"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {t.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      📁 {t.project_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full 
                      ${STATUS_COLORS[t.status]}`}>
                      {t.status?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      ⏱ {t.estimated_hours}h
                    </span>
                  </div>
                </div>
                {t.tags && (
                  <div className="flex gap-1 mt-2">
                    {t.tags.map((tag, j) => (
                      <span key={j}
                        className="text-xs bg-gray-700 text-gray-300 
                          px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Blocked Tab */}
            {activeTab === "blocked" && (
              blocked.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-8">
                  🎉 No blocked tasks!
                </p>
              ) : blocked.map((t, i) => (
                <div key={i}
                  className="rounded-xl p-4 border-l-4 
                    border-red-500 bg-red-500/10">
                  <p className="text-sm font-medium text-white">
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    📁 {t.project_name}
                  </p>
                  <div className="mt-2 bg-red-900/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-300">
                      🚨 {t.blocked_reason}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && activity.map((a, i) => (
              <div key={i}
                className="rounded-xl p-4 bg-gray-800 border 
                  border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {a.task_title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      📁 {a.project_name}
                    </p>
                    <p className="text-xs text-gray-300 mt-2">
                      💬 {a.note}
                    </p>
                  </div>
                  <span className="text-xs bg-green-500/20 text-green-300 
                    px-2 py-0.5 rounded-full">
                    {a.action}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  🕐 {new Date(a.timestamp).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}