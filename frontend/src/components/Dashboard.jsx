import { useState, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import StatsCards from "./StatsCards"
import TodaysPlan from "./TodaysPlan"
import RightPanel from "./RightPanel"
import AddProjectModal from "./AddProjectModal"
import AddTaskModal from "./AddTaskModal"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

function BriefingCard() {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/briefing`)
      .then(res => setBriefing(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] p-4 flex items-start gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-[#ede9fe] dark:bg-[#2a2a3e] flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/4" />
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-full" />
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!briefing) return null

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4 flex items-start gap-3">
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm">✦</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-bold text-[#7c3aed] uppercase tracking-wider">AI Daily Briefing</p>
          <span className="text-[10px] bg-[#ede9fe] dark:bg-[#2a2a3e] text-[#7c3aed] px-1.5 py-0.5 rounded-full font-medium">Today</span>
        </div>
        <p className="text-sm text-[#374151] dark:text-gray-200 leading-relaxed">{briefing.text}</p>

        {/* Quick stats */}
        {briefing.stats && (
          <div className="flex items-center gap-4 mt-2.5">
            {[
              { label: "Projects", val: briefing.stats.projects, color: "text-[#7c3aed]" },
              { label: "Tasks", val: briefing.stats.tasks, color: "text-blue-500" },
              { label: "Blocked", val: briefing.stats.blocked, color: "text-red-500" },
              { label: "Urgent", val: briefing.stats.urgent, color: "text-orange-500" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
                <span className="text-xs text-[#9ca3af] dark:text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeadlineWarnings({ setActiveNav }) {
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    axios.get(`${API}/api/warnings`)
      .then(res => setWarnings(res.data.warnings || []))
      .catch(console.error)
  }, [])

  if (warnings.length === 0) return null

  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">
            {warnings.length} deadline{warnings.length > 1 ? "s" : ""} need{warnings.length === 1 ? "s" : ""} attention
          </p>
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">{w.project_name}</span>
                  <span className="text-xs text-red-600 dark:text-red-400">·</span>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {w.overdue ? "Overdue" : `${w.days_left}d left`}
                  </span>
                </div>
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {w.pending_tasks} task{w.pending_tasks > 1 ? "s" : ""} pending
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveNav("projects")}
            className="mt-2.5 text-xs text-red-600 dark:text-red-400 hover:text-red-800 font-medium flex items-center gap-1 transition"
          >
            View Projects →
          </button>
        </div>
      </div>
    </div>
  )
}

function StandupCard() {
  const [standup, setStandup]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const generate = () => {
    setLoading(true)
    axios.get(`${API}/api/standup`)
      .then(res => setStandup(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const copy = () => {
    if (!standup?.standup) return
    navigator.clipboard.writeText(standup.standup)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <p className="text-sm font-bold text-[#1e1b4b] dark:text-white">Daily Standup</p>
          {standup && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Ready</span>}
        </div>
        <div className="flex items-center gap-2">
          {standup && (
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-xs text-[#7c3aed] hover:text-[#6d28d9] bg-[#f5f0ff] dark:bg-[#1e1e2e] px-2.5 py-1.5 rounded-lg transition font-medium"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition font-medium"
          >
            {loading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : "✦"}
            {standup ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {!standup && !loading && (
        <p className="text-xs text-[#9ca3af] dark:text-gray-500">Generate your daily standup from yesterday's completions and today's tasks — ready to paste into Slack.</p>
      )}
      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-full" />
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-3/4" />
          <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/2" />
        </div>
      )}
      {standup && !loading && (
        <div className="text-sm text-[#374151] dark:text-gray-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{standup.standup}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function WeeklyReportModal({ onClose }) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/weekly-report`)
      .then(res => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const regenerate = () => {
    setLoading(true)
    axios.get(`${API}/api/weekly-report?force=true`)
      .then(res => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#13131f] rounded-2xl shadow-2xl border border-[#ede9fe] dark:border-[#1e1e2e] w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-base font-bold text-[#1e1b4b] dark:text-white">Weekly Report</h2>
            {report?.stats && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{report.stats.completed_this_week} shipped</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{report.stats.pending} pending</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={regenerate}
              disabled={loading}
              className="text-xs text-[#7c3aed] hover:text-[#6d28d9] font-medium disabled:opacity-50 transition"
            >
              Regenerate
            </button>
            <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] dark:hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded ${i % 2 === 0 ? "w-3/4" : "w-full"}`} />
              ))}
            </div>
          ) : report ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-[#374151] dark:text-gray-200">
              <ReactMarkdown>{report.report}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-[#9ca3af] text-center py-8">Failed to generate report</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ setActiveNav, setPendingAgentMessage }) {
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const [query, setQuery] = useState("")

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const sendToAgent = (text) => {
    const msg = (text || query).trim()
    if (!msg) { setActiveNav("agent"); return }
    setPendingAgentMessage?.(msg)
    setQuery("")
    setActiveNav("agent")
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* Center Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Welcome Hero Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 40%, #e0d7ff 100%)",
            minHeight: "168px",
          }}
        >
          <div className="absolute top-4 right-56 text-white/40 text-xl select-none">✦</div>
          <div className="absolute top-8 right-72 text-white/30 text-sm select-none">✦</div>
          <div className="absolute bottom-6 right-64 text-white/20 text-xs select-none">✦</div>
          <div className="absolute right-0 top-0 bottom-0 w-52 opacity-20 pointer-events-none">
            <div className="w-full h-full" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(167,139,250,0.6) 0%, transparent 70%)" }} />
          </div>

          <div className="relative z-10 p-6">
            <h1 className="text-2xl font-bold text-[#1e1b4b] mb-1">{getGreeting()}, Raj 👋</h1>
            <p className="text-[#4c1d95] text-sm mb-4 opacity-80">Let's focus on shipping something great today.</p>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="What would you like to know or plan today?"
                className="flex-1 bg-transparent text-sm text-[#374151] outline-none placeholder-[#9ca3af]"
                onKeyDown={e => { if (e.key === "Enter") sendToAgent() }}
              />
              <button
                onClick={() => sendToAgent()}
                className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center text-white hover:bg-[#6d28d9] transition flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { label: "Smart Plan",    icon: "📅", msg: "Plan my day — I have 4 hours to work today" },
                { label: "Find Blockers", icon: "🚨", msg: "What's blocked across all my projects?" },
                { label: "Client Update", icon: "📝", msg: "Generate a professional client status update" },
                { label: "Weekly Report", icon: "📊", msg: null, action: () => setShowWeeklyReport(true) },
                { label: "Add Task",      icon: "➕", msg: null, action: () => setShowAddTask(true) },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => btn.action ? btn.action() : sendToAgent(btn.msg)}
                  className="flex items-center gap-1.5 bg-white/70 hover:bg-white text-[#4c1d95] text-xs px-3 py-1.5 rounded-lg transition border border-white/50 shadow-sm font-medium"
                >
                  <span>{btn.icon}</span> {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Daily Briefing */}
        <BriefingCard />

        {/* Deadline Warnings */}
        <DeadlineWarnings setActiveNav={setActiveNav} />

        {/* Stats Cards */}
        <StatsCards setActiveNav={setActiveNav} />

        {/* Today's Plan */}
        <TodaysPlan onAddTask={() => setShowAddTask(true)} />

        {/* Daily Standup */}
        <StandupCard />

      </div>

      {/* Right Panel */}
      <RightPanel setActiveNav={setActiveNav} />

      {showAddProject && (
        <AddProjectModal onClose={() => setShowAddProject(false)} onAdded={() => {}} />
      )}
      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onAdded={() => {}} />
      )}
      {showWeeklyReport && (
        <WeeklyReportModal onClose={() => setShowWeeklyReport(false)} />
      )}
    </div>
  )
}
