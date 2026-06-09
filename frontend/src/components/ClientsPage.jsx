import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const CARD_ACCENTS = ["#7c3aed", "#3b82f6", "#ec4899", "#f59e0b", "#06b6d4", "#22c55e"]

const PRIORITY_BADGE = {
  high: "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-green-100 text-green-700 border border-green-200",
}

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - new Date()) / 86400000)
}

function deadlineColor(days) {
  if (days <= 7) return "text-red-500"
  if (days <= 20) return "text-orange-500"
  return "text-green-600"
}

function getInitials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

export default function ClientsPage() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingFor, setGeneratingFor] = useState(null)
  const [updates, setUpdates] = useState({})
  const [expandedClient, setExpandedClient] = useState(null)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/projects`),
      axios.get(`${API}/api/tasks`),
    ])
      .then(([p, t]) => {
        setProjects(p.data.projects || [])
        setTasks(t.data.tasks || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Group client-type projects by client name
  const clientProjects = projects.filter(p => p.type === "client")
  const clientMap = {}
  clientProjects.forEach(p => {
    if (!clientMap[p.client]) clientMap[p.client] = []
    clientMap[p.client].push(p)
  })
  const clients = Object.entries(clientMap)

  const taskCountFor = (projectName) =>
    tasks.filter(t => t.project_name === projectName).length

  const completedTasksFor = (projectName) =>
    tasks.filter(t => t.project_name === projectName && t.status === "completed").length

  const nearestDeadline = (projs) => {
    const sorted = [...projs].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    return sorted[0]?.deadline
  }

  const generateUpdate = async (clientName, clientProjs) => {
    setGeneratingFor(clientName)
    setUpdates(u => ({ ...u, [clientName]: "" }))
    try {
      const projectNames = clientProjs.map(p => p.name).join(", ")
      const { data } = await axios.post(`${API}/api/chat`, {
        message: `Generate a professional client status update for ${clientName}. Their projects are: ${projectNames}. Include recent progress, current status, and next steps. Keep it under 120 words, professional tone.`,
        history: [],
      })
      setUpdates(u => ({ ...u, [clientName]: data.response }))
    } catch {
      setUpdates(u => ({ ...u, [clientName]: "Failed to generate update." }))
    } finally {
      setGeneratingFor(null)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Clients</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{clients.length} active client{clients.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: "Total Clients",
              value: clients.length,
              icon: (
                <svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              bg: "bg-[#ede9fe] dark:bg-[#2a2a3e]",
            },
            {
              label: "Client Projects",
              value: clientProjects.length,
              icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              bg: "bg-blue-50",
            },
            {
              label: "Tasks Across Clients",
              value: tasks.filter(t => clientProjects.some(p => p.name === t.project_name)).length,
              icon: (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
              bg: "bg-green-50",
            },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1e1b4b] dark:text-white">{loading ? "—" : stat.value}</p>
                <p className="text-xs text-[#9ca3af] dark:text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Client Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] p-6 h-48 animate-pulse">
                <div className="h-4 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/4 mb-3" />
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#374151] dark:text-gray-200">No clients yet</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-1">Add a project with type "Client" to see clients here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clients.map(([clientName, clientProjs], idx) => {
              const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length]
              const nearest = nearestDeadline(clientProjs)
              const days = nearest ? daysLeft(nearest) : null
              const totalTasks = clientProjs.reduce((s, p) => s + taskCountFor(p.name), 0)
              const completedTasks = clientProjs.reduce((s, p) => s + completedTasksFor(p.name), 0)
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
              const isExpanded = expandedClient === clientName
              const update = updates[clientName]

              return (
                <div key={clientName} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm overflow-hidden">
                  {/* Accent bar */}
                  <div className="h-1" style={{ backgroundColor: accent }} />

                  <div className="p-5">
                    {/* Client Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: accent }}
                        >
                          {getInitials(clientName)}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#1e1b4b] dark:text-white">{clientName}</h2>
                          <p className="text-xs text-[#9ca3af] dark:text-gray-500">
                            {clientProjs.length} project{clientProjs.length !== 1 ? "s" : ""} · {totalTasks} tasks
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Nearest deadline badge */}
                        {days !== null && (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                            days <= 7
                              ? "bg-red-50 text-red-600 border-red-200"
                              : days <= 20
                              ? "bg-orange-50 text-orange-600 border-orange-200"
                              : "bg-green-50 text-green-600 border-green-200"
                          }`}>
                            {days > 0 ? `${days}d to deadline` : "Overdue"}
                          </span>
                        )}

                        {/* Generate Update Button */}
                        <button
                          onClick={() => generateUpdate(clientName, clientProjs)}
                          disabled={generatingFor === clientName}
                          className="flex items-center gap-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs px-3 py-2 rounded-xl font-medium transition disabled:opacity-60"
                        >
                          {generatingFor === clientName ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-yellow-300 text-xs">✦</span>
                          )}
                          {generatingFor === clientName ? "Generating..." : "Generate Update"}
                        </button>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedClient(isExpanded ? null : clientName)}
                          className="w-8 h-8 rounded-lg bg-[#f5f0ff] dark:bg-[#1e1e2e] hover:bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center transition"
                        >
                          <svg
                            className={`w-4 h-4 text-[#7c3aed] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Overall Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#6b7280] dark:text-gray-400">Overall Progress</span>
                        <span className="font-semibold text-[#1e1b4b] dark:text-white">{completedTasks}/{totalTasks} tasks done</span>
                      </div>
                      <div className="h-2 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: accent }}
                        />
                      </div>
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {clientProjs.map((proj, j) => {
                        const pDays = daysLeft(proj.deadline)
                        const pTasks = taskCountFor(proj.name)
                        return (
                          <div
                            key={j}
                            className="rounded-xl border border-[#f0eaff] dark:border-[#1e1e2e] p-3 hover:border-[#ddd6fe] transition"
                            style={{ backgroundColor: `${accent}08` }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-xs font-semibold text-[#1e1b4b] dark:text-white truncate flex-1">{proj.name}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-1 flex-shrink-0 ${PRIORITY_BADGE[proj.priority] || PRIORITY_BADGE.medium}`}>
                                {proj.priority}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 mb-2 truncate">{proj.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#6b7280] dark:text-gray-400">{pTasks} tasks</span>
                              <span className={`text-[10px] font-medium ${deadlineColor(pDays)}`}>
                                {pDays > 0 ? `${pDays}d left` : "Overdue"}
                              </span>
                            </div>
                            {/* Tech stack */}
                            {proj.tech_stack?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {proj.tech_stack.slice(0, 2).map((t, k) => (
                                  <span key={k} className="text-[9px] bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#1e1e2e] text-[#7c3aed] px-1.5 py-0.5 rounded-full">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* AI Generated Update */}
                    {update && (
                      <div className="bg-gradient-to-r from-[#f5f0ff] to-[#faf8ff] border border-[#ddd6fe] rounded-xl p-4 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#7c3aed] text-xs">✦</span>
                            <span className="text-xs font-bold text-[#1e1b4b] dark:text-white">AI Client Update</span>
                          </div>
                          <button
                            onClick={() => navigator.clipboard.writeText(update)}
                            className="flex items-center gap-1 text-xs text-[#7c3aed] hover:text-[#6d28d9] transition font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>
                        </div>
                        <p className="text-sm text-[#374151] dark:text-gray-200 leading-relaxed">{update}</p>
                      </div>
                    )}

                    {/* Expanded: Task breakdown */}
                    {isExpanded && (
                      <div className="border-t border-[#f5f0ff] dark:border-[#1e1e2e] pt-4 mt-1">
                        <p className="text-xs font-bold text-[#9ca3af] dark:text-gray-500 uppercase tracking-wider mb-3">Task Breakdown</p>
                        <div className="space-y-2">
                          {tasks
                            .filter(t => clientProjs.some(p => p.name === t.project_name))
                            .slice(0, 8)
                            .map((task, k) => (
                              <div key={k} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-[#f5f0ff] dark:bg-[#1e1e2e] transition">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  task.status === "completed" ? "bg-green-500" :
                                  task.status === "in_progress" ? "bg-blue-500" : "bg-gray-300"
                                }`} />
                                <p className={`text-sm flex-1 truncate ${task.status === "completed" ? "line-through text-[#9ca3af] dark:text-gray-500" : "text-[#374151] dark:text-gray-200"}`}>
                                  {task.title}
                                </p>
                                <span className="text-xs text-[#9ca3af] dark:text-gray-500 flex-shrink-0">{task.project_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                                  {task.priority}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
