import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const inputClass = "w-full bg-[#f5f0ff] dark:bg-[#1e1e2e] border border-[#ede9fe] dark:border-[#1e1e2e] rounded-xl px-3 py-2.5 text-sm text-[#1e1b4b] dark:text-white outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent placeholder-[#9ca3af] transition"
const labelClass = "text-xs font-semibold text-[#6b7280] dark:text-gray-400 mb-1.5 block"

export default function AddProjectModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: "", description: "", client: "",
    deadline: "", priority: "medium",
    tech_stack: "", type: "personal"
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async () => {
    if (!form.name || !form.description || !form.client || !form.deadline) {
      setError("Please fill all required fields")
      return
    }
    setLoading(true)
    try {
      await axios.post(`${API}/api/projects/add`, {
        ...form,
        tech_stack: form.tech_stack.split(",").map(t => t.trim()).filter(Boolean)
      })
      onAdded()
      onClose()
    } catch {
      setError("Failed to add project")
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#1e1b4b] dark:text-white">New Project</h2>
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
            <label className={labelClass}>Project Name *</label>
            <input name="name" value={form.name} onChange={handle} placeholder="e.g. MyApp" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <input name="description" value={form.description} onChange={handle} placeholder="What does it do?" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Client *</label>
            <input name="client" value={form.client} onChange={handle} placeholder="Client name or Personal" className={inputClass} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Deadline *</label>
              <input name="deadline" type="date" value={form.deadline} onChange={handle} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Priority</label>
              <select name="priority" value={form.priority} onChange={handle} className={inputClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Tech Stack <span className="text-[#9ca3af] dark:text-gray-500 font-normal">(comma separated)</span></label>
            <input name="tech_stack" value={form.tech_stack} onChange={handle} placeholder="React, FastAPI, MongoDB" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-2">
              {[
                { value: "personal", label: "Personal", icon: "🧑‍💻" },
                { value: "client", label: "Client", icon: "💼" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: opt.value })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${
                    form.type === opt.value
                      ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                      : "bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#6b7280] dark:text-gray-400 border-[#ede9fe] dark:border-[#1e1e2e] hover:border-[#7c3aed]"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[#f5f0ff] dark:border-[#1e1e2e]">
          <button onClick={onClose} className="flex-1 bg-[#f5f0ff] dark:bg-[#1e1e2e] hover:bg-[#ede9fe] dark:bg-[#2a2a3e] text-[#6b7280] dark:text-gray-400 py-2.5 rounded-xl text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={submit} disabled={loading} className="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {loading ? "Adding..." : "Add Project"}
          </button>
        </div>

      </div>
    </div>
  )
}
