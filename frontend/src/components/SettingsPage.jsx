import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function SettingsPage({ theme, setTheme }) {
  const isDark = theme === "dark"
  const [usage, setUsage] = useState(null)
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/usage`)
      .then(res => setUsage(res.data))
      .catch(console.error)
      .finally(() => setLoadingUsage(false))
  }, [])

  const Section = ({ title, children }) => (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
        <h2 className="text-sm font-bold text-[#1e1b4b] dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-[#f5f0ff] dark:divide-[#1e1e2e]">{children}</div>
    </div>
  )

  const Row = ({ label, description, children }) => (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-[#1e1b4b] dark:text-white">{label}</p>
        {description && <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )

  const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Settings</h1>
          <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">Manage your preferences</p>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          <Row label="Theme" description="Switch between light and dark mode">
            <div className="flex items-center bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-xl p-1 gap-1">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  !isDark ? "bg-white dark:bg-[#2a2a3e] text-[#7c3aed] shadow-sm" : "text-[#9ca3af] dark:text-gray-500 hover:text-[#6b7280]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isDark ? "bg-[#2a2a3e] text-[#a855f7] shadow-sm" : "text-[#9ca3af] hover:text-[#6b7280]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Dark
              </button>
            </div>
          </Row>
        </Section>

        {/* Token Usage */}
        <Section title="Token Usage">
          {/* Summary Cards */}
          <div className="px-5 py-4 grid grid-cols-4 gap-3">
            {[
              { label: "Total Tokens", value: usage ? fmt(usage.total_tokens) : "—", color: "text-[#7c3aed]", bg: "bg-[#ede9fe] dark:bg-[#2a2a3e]" },
              { label: "Today", value: usage ? fmt(usage.today_tokens) : "—", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: "Input Tokens", value: usage ? fmt(usage.total_prompt_tokens) : "—", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
              { label: "Output Tokens", value: usage ? fmt(usage.total_output_tokens) : "—", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-lg font-bold ${s.color}`}>{loadingUsage ? "—" : s.value}</p>
                <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Token bar: input vs output */}
          {usage && usage.total_tokens > 0 && (
            <div className="px-5 pb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#6b7280] dark:text-gray-400">Input vs Output split</span>
                <span className="text-[#9ca3af] dark:text-gray-500">{usage.total_requests} requests total</span>
              </div>
              <div className="h-2 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 rounded-l-full"
                  style={{ width: `${Math.round((usage.total_prompt_tokens / usage.total_tokens) * 100)}%` }}
                />
                <div
                  className="h-full bg-orange-400 rounded-r-full"
                  style={{ width: `${Math.round((usage.total_output_tokens / usage.total_tokens) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-[#6b7280] dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Input
                </span>
                <span className="flex items-center gap-1 text-xs text-[#6b7280] dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Output
                </span>
              </div>
            </div>
          )}

          {/* 7-day bar chart */}
          {usage?.daily_breakdown?.length > 0 && (
            <div className="px-5 pb-5">
              <p className="text-xs font-semibold text-[#6b7280] dark:text-gray-400 mb-3">Last 7 Days</p>
              <div className="flex items-end gap-1.5 h-20">
                {usage.daily_breakdown.map((d, i) => {
                  const maxTokens = Math.max(...usage.daily_breakdown.map(x => x.tokens), 1)
                  const pct = Math.max((d.tokens / maxTokens) * 100, d.tokens > 0 ? 4 : 0)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full rounded-t-md bg-[#7c3aed] transition-all opacity-80 hover:opacity-100"
                        style={{ height: `${pct}%`, minHeight: d.tokens > 0 ? "4px" : "2px", backgroundColor: d.tokens > 0 ? "#7c3aed" : "#e5e7eb" }}
                      />
                      <span className="text-[9px] text-[#9ca3af] dark:text-gray-500 truncate w-full text-center">
                        {d.date.split(" ")[1]}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1e1b4b] dark:bg-[#2a2a3e] text-white text-[9px] px-1.5 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">
                        {fmt(d.tokens)} tokens
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent calls */}
          {usage?.recent?.length > 0 && (
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold text-[#6b7280] dark:text-gray-400 mb-2">Recent API Calls</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {usage.recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
                      <span className="text-xs text-[#374151] dark:text-gray-200 font-mono">
                        {r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 dark:text-green-400">↑ {fmt(r.prompt_tokens || 0)}</span>
                      <span className="text-orange-500">↓ {fmt(r.output_tokens || 0)}</span>
                      <span className="font-semibold text-[#7c3aed]">{fmt(r.total_tokens || 0)} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loadingUsage && (!usage || usage.total_requests === 0) && (
            <div className="px-5 pb-5 text-center">
              <p className="text-sm text-[#9ca3af] dark:text-gray-500 py-4">
                No usage data yet — send a message to the AI Agent to start tracking.
              </p>
            </div>
          )}
        </Section>

        {/* Profile */}
        <Section title="Profile">
          <Row label="Name" description="Your display name across the app">
            <span className="text-sm text-[#6b7280] dark:text-gray-400">Raj Ronald Shaw</span>
          </Row>
          <Row label="Role" description="Your developer profile">
            <span className="text-sm text-[#6b7280] dark:text-gray-400">Solo Developer</span>
          </Row>
        </Section>

        {/* AI & Backend */}
        <Section title="AI & Backend">
          <Row label="AI Model" description="Model used for agent reasoning">
            <span className="text-xs bg-[#ede9fe] dark:bg-[#2a2a3e] text-[#7c3aed] px-2.5 py-1 rounded-full font-semibold">
              gemini-2.5-flash
            </span>
          </Row>
          <Row label="Backend" description="API billing destination">
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-semibold">
              Vertex AI (GCP)
            </span>
          </Row>
          <Row label="Database" description="MongoDB cluster status">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Connected</span>
            </div>
          </Row>
          <Row label="GCP Project" description="Your Google Cloud project">
            <span className="text-sm text-[#6b7280] dark:text-gray-400 font-mono">devpulse-agent-2026</span>
          </Row>
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row label="MongoDB Cluster" description="Atlas free tier, Singapore">
            <span className="text-sm text-[#6b7280] dark:text-gray-400 font-mono">devPulseCluster</span>
          </Row>
          <Row label="Database" description="Active database name">
            <span className="text-sm text-[#6b7280] dark:text-gray-400 font-mono">devpulse</span>
          </Row>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Version" description="Current app version">
            <span className="text-sm text-[#6b7280] dark:text-gray-400">v1.0.0 — Hackathon Build</span>
          </Row>
          <Row label="Built for" description="">
            <span className="text-sm text-[#6b7280] dark:text-gray-400">Google Cloud × MongoDB Hackathon 2026</span>
          </Row>
        </Section>

      </div>
    </div>
  )
}
