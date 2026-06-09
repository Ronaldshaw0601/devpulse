import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"


function deadlineBadge(daysLeft) {
  if (daysLeft <= 7) return "bg-red-100 text-red-600 border border-red-200"
  if (daysLeft <= 20) return "bg-orange-100 text-orange-600 border border-orange-200"
  return "bg-green-100 text-green-600 border border-green-200"
}

function activityDot(action) {
  if (action === "completed") return "bg-green-500"
  if (action === "updated") return "bg-blue-500"
  return "bg-purple-500"
}

function formatTime(ts) {
  if (!ts) return "Yesterday"
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() !== now.toDateString()) return "Yesterday"
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export default function RightPanel({ setActiveNav }) {
  const [projects, setProjects] = useState([])
  const [activity, setActivity] = useState([])
  const [generating, setGenerating] = useState(false)
  const [update, setUpdate] = useState("")

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/projects`),
      axios.get(`${API}/api/activity`),
    ])
      .then(([p, a]) => {
        setProjects(p.data.projects || [])
        setActivity(a.data.activity || [])
      })
      .catch(console.error)
  }, [])

  const generateUpdate = async () => {
    setGenerating(true)
    setUpdate("")
    try {
      const { data } = await axios.post(`${API}/api/chat`, {
        message: `Generate a professional client update for ${projects[0]?.name || "my top project"}. Keep it under 100 words.`,
        history: [],
      })
      setUpdate(data.response)
    } catch {
      setUpdate("Failed to generate update.")
    } finally {
      setGenerating(false)
    }
  }

  // Build deadline items
  const deadlineItems = projects.slice(0, 3).map(p => {
    const deadline = new Date(p.deadline)
    const daysLeft = Math.ceil((deadline - new Date()) / 86400000)
    return {
      name: p.name,
      description: p.description?.slice(0, 35) || "",
      deadline: deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      daysLeft,
    }
  })

  const activityItems = activity.slice(0, 3)

  return (
    <div className="w-72 bg-white dark:bg-[#13131f] border-l border-[#ede9fe] dark:border-[#1e1e2e] flex flex-col h-full overflow-y-auto flex-shrink-0">

      {/* Upcoming Deadlines */}
      <div className="p-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Upcoming Deadlines</h3>
          </div>
        </div>

        <div className="space-y-3.5">
          {deadlineItems.map((item, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1e1b4b] dark:text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 truncate mt-0.5">{item.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-[#9ca3af] dark:text-gray-500">{item.deadline}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5 ${deadlineBadge(item.daysLeft)}`}>
                    {item.daysLeft > 0 ? `${item.daysLeft} days left` : "Overdue"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setActiveNav("projects")}
          className="mt-3.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 font-medium transition"
        >
          View All Deadlines →
        </button>
      </div>

      {/* Recent Activity */}
      <div className="p-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Recent Activity</h3>
        </div>

        <div className="space-y-3">
          {activityItems.map((a, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activityDot(a.action)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[#1e1b4b] dark:text-white leading-snug">{a.task_title}</p>
                  <span className="text-[10px] text-[#9ca3af] dark:text-gray-500 flex-shrink-0">{formatTime(a.timestamp)}</span>
                </div>
                <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 mt-0.5">{a.note}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setActiveNav("activity")}
          className="mt-3.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 font-medium transition"
        >
          View Full Activity →
        </button>
      </div>

      {/* Generate Client Update */}
      <div className="p-4 flex-1">
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #a855f7 100%)",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white dark:bg-[#13131f]/10" />
          <div className="absolute -top-2 right-8 w-10 h-10 rounded-full bg-white dark:bg-[#13131f]/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#13131f]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white leading-tight">Generate Client Update</h3>
            </div>

            <p className="text-xs text-purple-200 mb-4 leading-relaxed">
              Create professional updates in seconds with AI
            </p>

            {update && (
              <div className="bg-white dark:bg-[#13131f]/20 rounded-xl p-3 mb-3 text-xs text-white leading-relaxed">
                {update}
                <button
                  onClick={() => navigator.clipboard.writeText(update)}
                  className="mt-2 text-purple-200 hover:text-white text-xs flex items-center gap-1 transition"
                >
                  📋 Copy to clipboard
                </button>
              </div>
            )}

            <button
              onClick={generateUpdate}
              disabled={generating}
              className="w-full bg-white dark:bg-[#13131f] text-[#7c3aed] hover:bg-purple-50 text-sm py-2.5 rounded-xl font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              {generating ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-[#7c3aed] border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                "Generate Now →"
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
