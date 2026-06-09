import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }
const VELOCITY_COLORS = ["#7c3aed", "#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b"]

// ── SVG Bar Chart ──────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = "#7c3aed", height = 140, emptyMsg = "No data yet" }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-36 text-xs text-[#9ca3af] dark:text-gray-500">{emptyMsg}</div>
  )
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const barW = Math.floor(100 / data.length)

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 400 ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = max === 0 ? 0 : (d[valueKey] / max) * (height - 28)
          const x = i * (400 / data.length) + (400 / data.length) * 0.15
          const w = (400 / data.length) * 0.7
          const y = height - 20 - barH

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x} y={y} width={w} height={barH}
                rx="3" fill={color} opacity="0.85"
              />
              {/* Value label */}
              {d[valueKey] > 0 && (
                <text
                  x={x + w / 2} y={y - 4}
                  textAnchor="middle" fontSize="9" fill={color} fontWeight="600"
                >
                  {d[valueKey]}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + w / 2} y={height - 4}
                textAnchor="middle" fontSize="9" fill="#9ca3af"
              >
                {d[labelKey]}
              </text>
            </g>
          )
        })}
        {/* Baseline */}
        <line x1="0" y1={height - 20} x2="400" y2={height - 20} stroke="#f0eaff" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ── Horizontal Bar Chart ───────────────────────────────────
function HBarChart({ data, nameKey, valueKey, totalKey, colors }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-xs text-[#9ca3af] dark:text-gray-500">No projects yet</div>
  )
  const max = Math.max(...data.map(d => d[totalKey] || 1), 1)

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = max === 0 ? 0 : Math.round((d[totalKey] / max) * 100)
        const completedPct = d[totalKey] === 0 ? 0 : Math.round((d[valueKey] / d[totalKey]) * 100)
        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#374151] dark:text-gray-200 font-medium truncate max-w-[160px]">{d[nameKey]}</span>
              <span className="text-[#9ca3af] dark:text-gray-500 flex-shrink-0 ml-2">
                {d[valueKey]} done · {d[totalKey]} total
              </span>
            </div>
            <div className="h-2 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${completedPct}%`, backgroundColor: colors[i % colors.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut ──────────────────────────────────────────────────
function StatusDonut({ counts }) {
  const total = (counts.pending || 0) + (counts.in_progress || 0) + (counts.completed || 0)
  if (total === 0) return (
    <div className="flex items-center justify-center h-32 text-xs text-[#9ca3af] dark:text-gray-500">No tasks yet</div>
  )

  const segments = [
    { label: "Completed", value: counts.completed || 0, color: "#22c55e" },
    { label: "In Progress", value: counts.in_progress || 0, color: "#3b82f6" },
    { label: "Pending", value: counts.pending || 0, color: "#e5e7eb" },
  ]

  let offset = 0
  const r = 15.9
  const circ = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
          {segments.filter(s => s.value > 0).map((s, i) => {
            const pct = s.value / total
            const dash = pct * circ
            const el = (
              <circle
                key={i} cx="18" cy="18" r={r}
                fill="none" stroke={s.color} strokeWidth="3.5"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += dash
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[#1e1b4b] dark:text-white">{total}</span>
          <span className="text-[9px] text-[#9ca3af] dark:text-gray-500">tasks</span>
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-[#6b7280] dark:text-gray-400 flex-1">{s.label}</span>
            <span className="text-xs font-semibold text-[#1e1b4b] dark:text-white">{s.value}</span>
            <span className="text-[10px] text-[#9ca3af] dark:text-gray-500">
              ({total > 0 ? Math.round(s.value / total * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API}/api/analytics`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const StatCard = ({ label, value, sub, color = "text-[#7c3aed]", bg = "bg-[#ede9fe] dark:bg-[#2a2a3e]", icon }) => (
    <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</p>
        <p className="text-xs text-[#9ca3af] dark:text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Analytics</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">Productivity insights from MongoDB</p>
          </div>
          <button
            onClick={() => { setLoading(true); axios.get(`${API}/api/analytics`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false)) }}
            className="flex items-center gap-2 text-xs bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#1e1e2e] text-[#7c3aed] px-3 py-2 rounded-xl hover:bg-[#f5f0ff] transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Completed This Week"
            value={data?.tasks_completed_this_week ?? "—"}
            color="text-green-600"
            bg="bg-green-50 dark:bg-green-900/20"
            icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
          <StatCard
            label="Activity Events This Week"
            value={data?.activity_this_week ?? "—"}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-900/20"
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <StatCard
            label="Hours in Pipeline"
            value={data ? `${data.total_pending_hours}h` : "—"}
            color="text-[#7c3aed]"
            bg="bg-[#ede9fe] dark:bg-[#2a2a3e]"
            icon={<svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Total Tasks Tracked"
            value={data?.total_tasks ?? "—"}
            color="text-orange-500"
            bg="bg-orange-50 dark:bg-orange-900/20"
            icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          {/* Tasks Completed Per Day */}
          <div className="col-span-2 bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Tasks Completed</h3>
                <p className="text-xs text-[#9ca3af] dark:text-gray-500">Last 7 days · from MongoDB activity_log</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
            </div>
            {loading ? (
              <div className="h-36 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-xl animate-pulse" />
            ) : (
              <BarChart
                data={data?.daily_completed || []}
                valueKey="count"
                labelKey="day"
                color="#7c3aed"
                height={140}
                emptyMsg="No completed tasks yet"
              />
            )}
          </div>

          {/* Task Status Donut */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Task Status</h3>
              <p className="text-xs text-[#9ca3af] dark:text-gray-500">All time breakdown</p>
            </div>
            {loading ? (
              <div className="h-32 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-xl animate-pulse" />
            ) : (
              <StatusDonut counts={data?.status_counts || {}} />
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-4">

          {/* Priority Breakdown */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Tasks by Priority</h3>
              <p className="text-xs text-[#9ca3af] dark:text-gray-500">Current task distribution</p>
            </div>
            {loading ? (
              <div className="h-28 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-xl animate-pulse" />
            ) : (
              <BarChart
                data={(data?.priority_breakdown || []).map(d => ({ ...d, label: d.priority }))}
                valueKey="count"
                labelKey="priority"
                color="#f59e0b"
                height={120}
                emptyMsg="No tasks yet"
              />
            )}
            {!loading && data?.priority_breakdown && (
              <div className="flex items-center justify-center gap-4 mt-2">
                {data.priority_breakdown.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p.priority] }} />
                    <span className="text-xs text-[#6b7280] dark:text-gray-400 capitalize">{p.priority}</span>
                    <span className="text-xs font-bold text-[#1e1b4b] dark:text-white">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Velocity */}
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#1e1b4b] dark:text-white">Project Velocity</h3>
              <p className="text-xs text-[#9ca3af] dark:text-gray-500">Tasks completed this week per project</p>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded animate-pulse" />)}
              </div>
            ) : (
              <HBarChart
                data={data?.project_velocity || []}
                nameKey="name"
                valueKey="completed_this_week"
                totalKey="total_tasks"
                colors={VELOCITY_COLORS}
              />
            )}
          </div>

        </div>

        {/* MongoDB Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 py-3">
          <div className="flex items-center gap-2 bg-white dark:bg-[#13131f] border border-[#f0eaff] dark:border-[#1e1e2e] rounded-xl px-4 py-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-[#6b7280] dark:text-gray-400">
              All data from <span className="font-semibold text-[#1e1b4b] dark:text-white">MongoDB Atlas</span> via aggregation pipelines
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
