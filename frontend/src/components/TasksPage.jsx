import { useState, useEffect, useRef } from "react"
import axios from "axios"
import AddTaskModal from "./AddTaskModal"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRIORITY_BADGE = {
  high: "bg-red-100 text-red-600 border border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-green-100 text-green-700 border border-green-200",
}

const STATUS_BADGE = {
  pending: "bg-gray-100 text-gray-600 border border-gray-200",
  in_progress: "bg-blue-100 text-blue-600 border border-blue-200",
  completed: "bg-green-100 text-green-700 border border-green-200",
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ mimetype }) {
  const isImage = mimetype?.startsWith("image/")
  const isPdf = mimetype === "application/pdf"
  if (isImage) return (
    <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
  if (isPdf) return (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
  return (
    <svg className="w-4 h-4 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

function TaskFilesModal({ task, onClose }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const fileRef = useRef()

  const fetchFiles = () => {
    setLoading(true)
    axios.get(`${API}/api/tasks/${encodeURIComponent(task.title)}/files`)
      .then(res => setFiles(res.data.files || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFiles() }, [task.title])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      await axios.post(
        `${API}/api/tasks/${encodeURIComponent(task.title)}/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      fetchFiles()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleDelete = async (fileId) => {
    setDeleting(fileId)
    try {
      await axios.delete(`${API}/api/files/${fileId}`)
      setFiles(f => f.filter(x => x._id !== fileId))
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#13131f] rounded-2xl shadow-2xl border border-[#ede9fe] dark:border-[#1e1e2e] w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#f5f0ff] dark:border-[#1e1e2e]">
          <div>
            <h2 className="text-base font-bold text-[#1e1b4b] dark:text-white">Attachments</h2>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-0.5 truncate max-w-[340px]">{task.title}</p>
          </div>
          <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] dark:hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File List */}
        <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-12 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <p className="text-sm text-[#9ca3af] dark:text-gray-500">No attachments yet</p>
            </div>
          ) : (
            files.map(f => (
              <div key={f._id} className="flex items-center gap-3 p-3 bg-[#f9f7ff] dark:bg-[#1e1e2e] rounded-xl border border-[#ede9fe] dark:border-[#2a2a3e]">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#13131f] border border-[#ede9fe] dark:border-[#2a2a3e] flex items-center justify-center flex-shrink-0">
                  <FileIcon mimetype={f.mimetype} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1e1b4b] dark:text-white truncate">{f.filename}</p>
                  <p className="text-xs text-[#9ca3af] dark:text-gray-500">{formatSize(f.size)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={`${API}/api/files/${f._id}`}
                    download={f.filename}
                    className="w-7 h-7 rounded-lg bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center text-[#7c3aed] hover:bg-[#ddd6fe] transition"
                    title="Download"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleDelete(f._id)}
                    disabled={deleting === f._id}
                    className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 hover:bg-red-100 transition"
                    title="Delete"
                  >
                    {deleting === f._id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload */}
        <div className="p-5 border-t border-[#f5f0ff] dark:border-[#1e1e2e]">
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white text-sm px-4 py-2.5 rounded-xl font-medium transition"
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
              </>
            )}
          </button>
          <p className="text-center text-xs text-[#9ca3af] dark:text-gray-500 mt-2">Max 10MB · Any file type</p>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)
  const [showAddTask, setShowAddTask] = useState(false)
  const [filter, setFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [fileModal, setFileModal] = useState(null)
  const [fileCounts, setFileCounts] = useState({})

  const fetchTasks = () => {
    setLoading(true)
    axios.get(`${API}/api/tasks`)
      .then(res => setTasks(res.data.tasks || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [])

  // Fetch file counts for visible tasks
  useEffect(() => {
    if (tasks.length === 0) return
    const fetchCounts = async () => {
      const counts = {}
      await Promise.all(
        tasks.map(async (t) => {
          try {
            const res = await axios.get(`${API}/api/tasks/${encodeURIComponent(t.title)}/files`)
            counts[t.title] = (res.data.files || []).length
          } catch {
            counts[t.title] = 0
          }
        })
      )
      setFileCounts(counts)
    }
    fetchCounts()
  }, [tasks])

  const completeTask = async (task) => {
    setCompleting(task.title)
    try {
      await axios.post(`${API}/api/tasks/complete`, {
        task_title: task.title,
        note: `${task.title} completed`
      })
      fetchTasks()
    } catch (e) {
      console.error(e)
    } finally {
      setCompleting(null)
    }
  }

  const filtered = tasks.filter(t => {
    const statusOk = filter === "all" || t.status === filter
    const priorityOk = priorityFilter === "all" || t.priority === priorityFilter
    return statusOk && priorityOk
  })

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white">Tasks</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-0.5">{tasks.length} total tasks</p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { key: "all", label: "Total", color: "text-[#7c3aed]", bg: "bg-[#ede9fe] dark:bg-[#2a2a3e]" },
            { key: "pending", label: "Pending", color: "text-gray-600", bg: "bg-gray-100" },
            { key: "in_progress", label: "In Progress", color: "text-blue-600", bg: "bg-blue-100" },
            { key: "completed", label: "Completed", color: "text-green-600", bg: "bg-green-100" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`bg-white dark:bg-[#13131f] rounded-2xl p-4 border text-left transition shadow-sm ${
                filter === s.key
                  ? "border-[#7c3aed] ring-2 ring-[#7c3aed]/20"
                  : "border-[#f0eaff] dark:border-[#1e1e2e] hover:border-[#ede9fe]"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <span className={`text-sm font-bold ${s.color}`}>{counts[s.key]}</span>
              </div>
              <p className="text-xs text-[#6b7280] dark:text-gray-400">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[#9ca3af] dark:text-gray-500 font-medium">Priority:</span>
          {["all", "high", "medium", "low"].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                priorityFilter === p
                  ? "bg-[#7c3aed] text-white"
                  : "bg-white dark:bg-[#1e1e2e] border border-[#ede9fe] dark:border-[#1e1e2e] text-[#6b7280] dark:text-gray-400 hover:bg-[#f5f0ff]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl p-4 h-20 animate-pulse border border-[#f0eaff] dark:border-[#1e1e2e]">
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/2 mb-2" />
                <div className="h-3 bg-[#f5f0ff] dark:bg-[#1e1e2e] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ede9fe] dark:bg-[#2a2a3e] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#374151] dark:text-gray-200">No tasks found</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-500 mt-1">Try a different filter or add a new task</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task, i) => (
              <div key={i} className="bg-white dark:bg-[#13131f] rounded-2xl border border-[#f0eaff] dark:border-[#1e1e2e] shadow-sm hover:shadow-md transition p-4 flex items-center gap-4 group">

                {/* Complete Checkbox */}
                <button
                  onClick={() => task.status !== "completed" && completeTask(task)}
                  disabled={task.status === "completed" || completing === task.title}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                    task.status === "completed"
                      ? "bg-green-500 border-green-500"
                      : "border-[#d1d5db] hover:border-[#7c3aed]"
                  }`}
                >
                  {(task.status === "completed" || completing === task.title) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold truncate ${
                      task.status === "completed"
                        ? "line-through text-[#9ca3af] dark:text-gray-500"
                        : "text-[#1e1b4b] dark:text-white"
                    }`}>
                      {task.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#9ca3af] dark:text-gray-500">{task.project_name}</span>
                    {task.tags?.length > 0 && (
                      <>
                        <span className="text-[#d1d5db]">·</span>
                        {task.tags.slice(0, 2).map((tag, j) => (
                          <span key={j} className="text-[10px] bg-[#f5f0ff] dark:bg-[#1e1e2e] text-[#7c3aed] px-1.5 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                    {task.blocked_reason && (
                      <>
                        <span className="text-[#d1d5db]">·</span>
                        <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                          </svg>
                          Blocked
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[task.status] || STATUS_BADGE.pending}`}>
                    {task.status?.replace("_", " ")}
                  </span>
                  <span className="text-xs text-[#9ca3af] dark:text-gray-500 font-medium">
                    {task.estimated_hours}h
                  </span>

                  {/* Attachments button */}
                  <button
                    onClick={() => setFileModal(task)}
                    className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f5f0ff] dark:bg-[#1e1e2e] hover:bg-[#ede9fe] dark:hover:bg-[#2a2a3e] transition text-[#7c3aed] group/attach"
                    title="Attachments"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {fileCounts[task.title] > 0 && (
                      <span className="text-[10px] font-bold text-[#7c3aed]">{fileCounts[task.title]}</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onAdded={fetchTasks} />
      )}

      {fileModal && (
        <TaskFilesModal
          task={fileModal}
          onClose={() => {
            setFileModal(null)
            // Refresh file counts
            axios.get(`${API}/api/tasks/${encodeURIComponent(fileModal.title)}/files`)
              .then(res => setFileCounts(c => ({ ...c, [fileModal.title]: (res.data.files || []).length })))
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
