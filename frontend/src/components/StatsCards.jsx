import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function StatsCards({ setActiveNav }) {
  const [tasks, setTasks] = useState([])
  const [blocked, setBlocked] = useState([])
  const [projects, setProjects] = useState([])

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/tasks`),
      axios.get(`${API}/api/blocked`),
      axios.get(`${API}/api/projects`),
    ])
      .then(([t, b, p]) => {
        setTasks(t.data.tasks || [])
        setBlocked(b.data.blocked || [])
        setProjects(p.data.projects || [])
      })
      .catch(console.error)
  }, [])

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)
  const PROJECT_PCTS = [82, 65, 51, 40, 55, 70]

  return (
    <div className="grid grid-cols-4 gap-4">

      {/* Card 1: Today's Plan */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl p-4 shadow-sm border border-[#f0eaff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1e1b4b] dark:text-white">Today's Plan</span>
        </div>
        <p className="text-xs text-[#9ca3af] dark:text-gray-500 mb-3 ml-10">
          {tasks.length} Tasks &nbsp;•&nbsp; {totalHours}h total
        </p>

        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ede9fe" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none" stroke="#7c3aed" strokeWidth="3"
                strokeDasharray="75 25" strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[#1e1b4b] dark:text-white">75%</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-600">Day Progress</p>
            <p className="text-xs text-[#6b7280] dark:text-gray-400">— On track</p>
          </div>
        </div>

        <button
          onClick={() => setActiveNav("agent")}
          className="mt-3 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 transition font-medium"
        >
          View Plan →
        </button>
      </div>

      {/* Card 2: Blockers */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl p-4 shadow-sm border border-[#f0eaff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1e1b4b] dark:text-white">Blockers</span>
        </div>
        <p className="text-xs text-[#9ca3af] dark:text-gray-500 mb-3 ml-10">
          {blocked.length} Items
        </p>

        <div className="space-y-2.5">
          {blocked.slice(0, 2).map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#1e1b4b] dark:text-white truncate">{b.title}</p>
                <p className="text-xs text-[#9ca3af] dark:text-gray-500 truncate">{b.blocked_reason}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setActiveNav("agent")}
          className="mt-3 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 transition font-medium"
        >
          View All →
        </button>
      </div>

      {/* Card 3: Active Projects */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl p-4 shadow-sm border border-[#f0eaff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1e1b4b] dark:text-white">Active Projects</span>
        </div>
        <p className="text-xs text-[#9ca3af] dark:text-gray-500 mb-3 ml-10">
          {projects.length} Projects
        </p>

        <div className="space-y-2.5">
          {projects.slice(0, 3).map((p, i) => {
            const pct = PROJECT_PCTS[i] ?? 50
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#374151] dark:text-gray-200 font-medium truncate max-w-[110px]">{p.name}</span>
                  <span className="text-[#6b7280] dark:text-gray-400 flex-shrink-0 ml-1">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[#ede9fe] dark:bg-[#2a2a3e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: i === 0 ? "#7c3aed" : i === 1 ? "#3b82f6" : "#8b5cf6",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <button className="mt-3 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 transition font-medium">
          View Projects →
        </button>
      </div>

      {/* Card 4: Time Allocation */}
      <div className="bg-white dark:bg-[#13131f] rounded-2xl p-4 shadow-sm border border-[#f0eaff] dark:border-[#1e1e2e]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1e1b4b] dark:text-white">Time Allocation</span>
        </div>
        <p className="text-xs text-[#9ca3af] dark:text-gray-500 mb-3 ml-10">Today</p>

        <div className="flex items-center gap-3">
          {/* Donut */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="4" />
              {/* Deep Work - purple */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="4"
                strokeDasharray="54 46" strokeLinecap="butt" />
              {/* Shallow Work - blue */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="4"
                strokeDasharray="27 73" strokeDashoffset="-54" strokeLinecap="butt" />
              {/* Meetings - yellow */}
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4"
                strokeDasharray="11 89" strokeDashoffset="-81" strokeLinecap="butt" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-[#1e1b4b] dark:text-white leading-tight">4h</span>
              <span className="text-[9px] text-[#6b7280] dark:text-gray-400 leading-tight">15m</span>
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            {[
              { color: "#7c3aed", label: "Deep Work", val: "2h 30m" },
              { color: "#3b82f6", label: "Shallow Work", val: "1h 15m" },
              { color: "#f59e0b", label: "Meetings", val: "30m" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-[#6b7280] dark:text-gray-400 flex-1">{item.label}</span>
                <span className="text-xs text-[#374151] dark:text-gray-200 font-medium">{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setActiveNav("timeallocation")}
          className="mt-3 text-xs text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 transition font-medium"
        >
          View Timeline →
        </button>
      </div>

    </div>
  )
}
