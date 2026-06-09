import { useState, useEffect } from "react"
import axios from "axios"
import AddProjectModal from "./AddProjectModal"
import AddTaskModal from "./AddTaskModal"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_COLORS = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500"
}

const TYPE_ICONS = {
  client: "💼",
  personal: "🧑‍💻"
}

export default function ProjectSidebar() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)

  const fetchProjects = () => {
    setLoading(true)
    axios.get(`${API}/api/projects`)
      .then(res => setProjects(res.data.projects))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProjects() }, [])

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 
      flex flex-col overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Active Projects
        </p>
        <p className="text-2xl font-bold text-white mt-1">
          {projects.length}
          <span className="text-sm font-normal text-gray-400 ml-2">
            projects
          </span>
        </p>
      </div>

      {/* Add Buttons */}
      <div className="p-3 flex gap-2 border-b border-gray-800">
        <button
          onClick={() => setShowAddProject(true)}
          className="flex-1 bg-green-600 hover:bg-green-500 
            text-white text-xs py-2 rounded-lg transition font-medium">
          + Project
        </button>
        <button
          onClick={() => setShowAddTask(true)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 
            text-white text-xs py-2 rounded-lg transition font-medium">
          + Task
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-gray-500 text-sm text-center mt-4">
            Loading...
          </p>
        ) : (
          projects.map((p, i) => (
            <div key={i}
              className="bg-gray-800 hover:bg-gray-750 rounded-xl p-3 
                cursor-pointer transition border border-gray-700 
                hover:border-green-600">

              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white truncate">
                  {TYPE_ICONS[p.type] || "📁"} {p.name}
                </span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 
                  ${PRIORITY_COLORS[p.priority] || "bg-gray-500"}`} />
              </div>

              <p className="text-xs text-gray-400 truncate mb-2">
                {p.client}
              </p>

              <div className="flex flex-wrap gap-1">
                {p.tech_stack?.slice(0, 3).map((t, j) => (
                  <span key={j}
                    className="text-xs bg-gray-700 text-gray-300 
                      px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>

              {p.deadline && (
                <p className="text-xs text-gray-500 mt-2">
                  📅 {new Date(p.deadline).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
          MongoDB Live
        </div>
      </div>

      {/* Modals */}
      {showAddProject && (
        <AddProjectModal
          onClose={() => setShowAddProject(false)}
          onAdded={fetchProjects}
        />
      )}
      {showAddTask && (
        <AddTaskModal
          onClose={() => setShowAddTask(false)}
          onAdded={fetchProjects}
        />
      )}

    </div>
  )
}