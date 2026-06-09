import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const inputClass = "w-full bg-[#f5f0ff] dark:bg-[#1e1e2e] border border-[#ede9fe] dark:border-[#1e1e2e] rounded-xl px-3 py-2.5 text-sm text-[#1e1b4b] dark:text-white outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent placeholder-[#9ca3af] transition"
const labelClass = "text-xs font-semibold text-[#6b7280] dark:text-gray-400 mb-1.5 block"

export default function AddTaskModal({ onClose, onAdded }) {
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    project_name: "", title: "",
    priority: "medium", estimated_hours: 2, tags: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    axios.get(`${API}/api/projects`).then(res => {
      const p = res.data.projects || []
      setProjects(p)
      if (p.length > 0) setForm(f => ({ ...f, project_name: p[0].name }))
    })
  }, [])

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    if (!form.project_name || !form.title) {
      setError("Please fill all required fields")
      return
    }
    setLoading(true)
    try {
      await axios.post(`${API}/api/tasks/add`, {
        ...form,
        estimated_hours: parseFloat(form.estimated_hours),
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
      })
      onAdded()
      onClose()
    } catch {
      setError("Failed to add task")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#1e1b4b]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#13131f] rounded-2xl w-full max-w-md shadow-2xl border border-[#ede9fe] dark:border-[#1e1e2e]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#1e1b4b] dark:text-white">New Task</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f5f0ff] dark:bg-[#1e1e2e] flex items-center justify-center text-[#9ca3af] dark:text-gray-500 hover:text-[#374151] dark:text-gray-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-3.5">
          <div>
            <label className={labelClass}>Project *</label>
            <select name="project_name" value={form.project_name} onChange={handle} className={inputClass}>
              {projects.map((p, i) => (
                <option key={i} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Task Title *</label>
            <input name="title" value={form.title} onChange={handle} placeholder="e.g. Build login page" className={inputClass} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Priority</label>
              <div className="flex gap-1.5">
                {[
                  { v: "high", color: "bg-red-100 text-red-600 border-red-200", active: "bg-red-500 text-white border-red-500" },
                  { v: "medium", color: "bg-yellow-100 text-yellow-700 border-yellow-200", active: "bg-yellow-500 text-white border-yellow-500" },
                  { v: "low", color: "bg-green-100 text-green-700 border-green-200", active: "bg-green-500 text-white border-green-500" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setForm({ ...form, priority: opt.v })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition ${
                      form.priority === opt.v ? opt.active : opt.color
                    }`}
                  >
                    {opt.v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Est. Hours</label>
              <input name="estimated_hours" type="number" min="0.5" max="24" step="0.5" value={form.estimated_hours} onChange={handle} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tags <span className="text-[#9ca3af] dark:text-gray-500 font-normal">(comma separated)</span></label>
            <input name="tags" value={form.tags} onChange={handle} placeholder="backend, api, urgent" className={inputClass} />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#f5f0ff] dark:border-[#1e1e2e]">
          <button onClick={onClose} className="flex-1 bg-[#f5f0ff] dark:bg-[#1e1e2e] hover:bg-[#ede9fe] dark:bg-[#2a2a3e] text-[#6b7280] dark:text-gray-400 py-2.5 rounded-xl text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>

      </div>
    </div>
  )
}
