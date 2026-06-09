import { useState, useEffect } from "react"
import axios from "axios"
import AddProjectModal from "./AddProjectModal"
import AddTaskModal from "./AddTaskModal"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_BADGE = {
  high:   "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low:    "bg-green-100 text-green-700 border border-green-200",
}

const CARD_ACCENTS = ["#7c3aed", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b"]

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - new Date()) / 86400000)
}

export default function ProjectsPage() {
  const [projects, setProjects]         = useState([])
  const [tasks, setTasks]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask]   = useState(false)
  const [filter, setFilter]             = useState("all")
  const [healthScores, setHealthScores] = useState({})
  const [progressMap, setProgressMap]   = useState({})

  const fetchData = () => {
    setLoading(true)
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

    axios.get(`${API}/api/projects/health-scores`)
      .then(res => {
        const map = {}
        ;(res.data.scores || []).forEach(s => { map[s.project_name] = s })
        setHealthScores(map)
      })
      .catch(console.error)

    axios.get(`${API}/api/projects/progress`)
      .then(res => {
        const map = {}
        ;(res.data.progress || []).forEach(p => { map[p.project_name] = p })
        setProgressMap(map)
      })
      .catch(console.error)
  }

  useEffect(() => { fetchData() }, [])

  const filtered     = filter === "all" ? projects : projects.filter(p => p.type === filter)
  const taskCountFor = name => tasks.filter(t => t.project_name === name).length

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Projects</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{projects.length} active projects</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#1e1e2e] text-[#7c3aed] text-sm px-4 py-2.5 rounded-xl font-medium hover:bg-[#f5f0ff] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Task
            </button>
            <button
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { key: "all",      label: "All Projects" },
            { key: "client",   label: "Client" },
            { key: "personal", label: "Personal" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === tab.key
                  ? "bg-[#7c3aed] text-white shadow-sm"
                  : "bg-white dark:bg-[#13131f] text-[#6b7280] dark:text-gray-400 border border-[#ede9fe] dark:border-[#1e1e2e] hover:bg-[#f5f0ff]"
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-white/20 text-white" : "bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#7c3aed]"
              }`}>
                {tab.key === "all" ? projects.length : projects.filter(p => p.type === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Project Cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl p-5 h-56 animate-pulse border border-[#f0eaff] dark:border-[#1e1e2e]">
                <div className="h-4 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-3/4 mb-3" />
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/2 mb-2" />
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((p, i) => {
              const days      = daysLeft(p.deadline)
              const pct       = progressMap[p.name]?.progress ?? 0
              const accent    = CARD_ACCENTS[i % CARD_ACCENTS.length]
              const taskCount = taskCountFor(p.name)
              const health    = healthScores[p.name]

              return (
                <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm hover:shadow-md transition overflow-hidden">
                  <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{p.type === "client" ? "💼" : "🧑‍💻"}</span>
                          <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white truncate">{p.name}</h3>
                        </div>
                        <p className="text-xs text-[#9ca3af] dark:text-gray-500 truncate">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        {health && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: health.color + "22", color: health.color }}
                            title={`Health Score: ${health.score}/100`}
                          >
                            {health.score}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[p.priority] || PRIORITY_BADGE.medium}`}>
                          {p.priority}
                        </span>
                      </div>
                    </div>

                    {/* Client */}
                    {p.client && (
                      <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-3 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {p.client}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#6b7280] dark:text-gray-400">
                          {progressMap[p.name] ? `${progressMap[p.name].completed}/${progressMap[p.name].total} tasks` : "Progress"}
                        </span>
                        <span className="font-semibold text-[#1e1b4b] dark:text-white">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
                      </div>
                    </div>

                    {/* Tech Stack */}
                    {p.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.tech_stack.slice(0, 3).map((t, j) => (
                          <span key={j} className="text-[10px] bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#7c3aed] px-2 py-0.5 rounded-full font-medium">{t}</span>
                        ))}
                        {p.tech_stack.length > 3 && (
                          <span className="text-[10px] bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#9ca3af] px-2 py-0.5 rounded-full">+{p.tech_stack.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#f5f0ff] dark:border-[#1e1e2e]">
                      <div className="flex items-center gap-1 text-xs text-[#6b7280] dark:text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {taskCount} task{taskCount !== 1 ? "s" : ""}
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        days <= 7 ? "text-red-500" : days <= 20 ? "text-orange-500" : "text-green-600"
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {days > 0 ? `${days}d left` : "Overdue"}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add Project Card */}
            <button
              onClick={() => setShowAddProject(true)}
              className="bg-white dark:bg-[#13131f] rounded-2xl border-2 border-dashed border-[#ede9fe] dark:border-[#1e1e2e] p-5 flex flex-col items-center justify-center gap-2 hover:border-[#7c3aed] hover:bg-[#f5f0ff] dark:hover:bg-[#1e1e2e] transition min-h-[200px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#7c3aed]">New Project</p>
              <p className="text-xs text-[#9ca3af] dark:text-gray-500">Add a client or personal project</p>
            </button>
          </div>
        )}
      </div>

      {showAddProject && <AddProjectModal onClose={() => setShowAddProject(false)} onAdded={fetchData} />}
      {showAddTask    && <AddTaskModal    onClose={() => setShowAddTask(false)}    onAdded={fetchData} />}
    </div>
  )
}
