import { useState, useEffect } from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"
const TOKEN_LIMIT = 5000

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (active) => (
      <svg className="w-4 h-4" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    key: "agent",
    label: "AI Agent",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    key: "projects",
    label: "Projects",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    key: "tasks",
    label: "Tasks",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "planner",
    label: "Planner",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: "activity",
    label: "Activity Log",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "clients",
    label: "Clients",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: () => (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeNav, setActiveNav, onSearch }) {
  const [tokenUsage, setTokenUsage] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/usage`)
      .then(r => r.json())
      .then(data => setTokenUsage(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); onSearch?.() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onSearch])

  const usedTokens = tokenUsage?.total_tokens ?? 0
  const pct = Math.min(100, Math.round((usedTokens / TOKEN_LIMIT) * 100))

  return (
    <div className="w-56 bg-white dark:bg-[#13131f] border-r border-[#ede9fe] dark:border-[#1e1e2e] flex flex-col h-screen flex-shrink-0">

      {/* Logo */}
      <div className="px-5 py-[18px] border-b border-[#ede9fe] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#7c3aed] flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#1e1b4b] dark:text-white text-[15px] leading-tight">DevPulse</p>
            <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 leading-tight">Build Better Every Day</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#ede9fe] dark:border-[#1e1e2e]">
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#9ca3af] text-xs hover:bg-[#ede9fe] dark:hover:bg-[#2a2a3e] transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#2a2a3e] px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = activeNav === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "bg-[#7c3aed] text-white font-medium shadow-sm"
                  : "text-[#6b7280] dark:text-gray-400 hover:text-[#7c3aed] hover:bg-[#f5f0ff] dark:bg-[#1e1e2e]"
              }`}
            >
              {item.icon(active)}
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-[#ede9fe] dark:border-[#1e1e2e] space-y-3">
        {/* Avatar + Name */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#f5f0ff] dark:bg-[#1e1e2e] cursor-pointer transition">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm">
            R
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1e1b4b] dark:text-white truncate">Raj Ronald Shaw</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500">Solo Developer</p>
          </div>
        </div>

        {/* Sync Status */}
        <div className="flex items-center gap-2 px-2">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-[#374151] dark:text-gray-200">All data synced</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500">Last synced 2m ago</p>
          </div>
        </div>

        {/* AI Credits */}
        <div className="px-2">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#6b7280] dark:text-gray-400">AI Credits</span>
            <span className="text-[#374151] dark:text-gray-200 font-medium">{usedTokens.toLocaleString()} / {TOKEN_LIMIT.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-[#ede9fe] dark:bg-[#2a2a3e] rounded-full overflow-hidden">
            <div className="h-full bg-[#7c3aed] rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-1">{pct}%</p>
        </div>
      </div>

    </div>
  )
}
