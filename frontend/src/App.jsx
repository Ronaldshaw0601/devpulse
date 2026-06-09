import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import Dashboard from "./components/Dashboard"
import AgentChat from "./components/AgentChat"
import ProjectsPage from "./components/ProjectsPage"
import TasksPage from "./components/TasksPage"
import PlannerPage from "./components/PlannerPage"
import ActivityLogPage from "./components/ActivityLogPage"
import ClientsPage from "./components/ClientsPage"
import SettingsPage from "./components/SettingsPage"
import TimeAllocationPage from "./components/TimeAllocationPage"
import AnalyticsPage from "./components/AnalyticsPage"
import SearchModal from "./components/SearchModal"

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("devpulse-theme") || "light")
  const [activeNav, setActiveNav] = useState("dashboard")
  const [agentMessages, setAgentMessages] = useState([
    {
      role: "assistant",
      content: "Hey Raj! 👋 I'm **DevPulse**, your personal AI project agent.\n\nI have real-time access to all your projects and tasks via MongoDB. Try asking me to:\n\n- 📅 **Plan your day** — tell me how many hours you have\n- 🚨 **Find blockers** — I'll surface stuck tasks\n- 📝 **Draft a client update** — for any project\n- 📊 **Weekly summary** — what you accomplished"
    }
  ])
  const [pendingAgentMessage, setPendingAgentMessage] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("devpulse-theme", theme)
  }, [theme])

  return (
    <div className="flex h-screen bg-[#f5f0ff] dark:bg-[#0f0f1a] overflow-hidden font-sans" style={{ minHeight: "100vh" }}>

      {/* Left Sidebar */}
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} onSearch={() => setShowSearch(true)} />

      {/* Right Side: Header + Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header Bar */}
        <header className="h-16 bg-white dark:bg-[#13131f] border-b border-[#ede9fe] dark:border-[#1e1e2e] flex items-center px-6 gap-4 flex-shrink-0 z-20">

          {/* Search trigger */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex-1 max-w-2xl mx-auto flex items-center gap-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] border border-[#ede9fe] dark:border-[#2a2a3e] rounded-xl px-4 py-2.5 text-left hover:border-[#7c3aed]/30 transition"
          >
            <svg className="w-4 h-4 text-[#9ca3af] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-sm text-[#9ca3af]">Search tasks, projects, tags...</span>
            <kbd className="hidden sm:block text-xs bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#2a2a3e] px-2 py-0.5 rounded text-[#9ca3af]">⌘K</kbd>
          </button>

          {/* Ask DevPulse */}
          <button
            onClick={() => setActiveNav("agent")}
            className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm px-5 py-2.5 rounded-xl font-medium transition flex-shrink-0 shadow-sm"
          >
            <span className="text-yellow-300">✦</span>
            Ask DevPulse
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {activeNav === "dashboard"      && <Dashboard setActiveNav={setActiveNav} setPendingAgentMessage={setPendingAgentMessage} />}
          {activeNav === "agent"          && <AgentChat messages={agentMessages} setMessages={setAgentMessages} pendingMessage={pendingAgentMessage} clearPendingMessage={() => setPendingAgentMessage("")} />}
          {activeNav === "projects"       && <ProjectsPage />}
          {activeNav === "tasks"          && <TasksPage />}
          {activeNav === "planner"        && <PlannerPage />}
          {activeNav === "activity"       && <ActivityLogPage />}
          {activeNav === "clients"        && <ClientsPage />}
          {activeNav === "settings"       && <SettingsPage theme={theme} setTheme={setTheme} />}
          {activeNav === "timeallocation" && <TimeAllocationPage setActiveNav={setActiveNav} />}
          {activeNav === "analytics"      && <AnalyticsPage />}
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          setActiveNav={setActiveNav}
          setPendingAgentMessage={setPendingAgentMessage}
        />
      )}
    </div>
  )
}
