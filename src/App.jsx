import React, { useState, useEffect, useCallback, useRef } from 'react'
import * as db from './db'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import Board from './components/Board'
import CardModal from './components/CardModal'
import ProjectModal from './components/ProjectModal'
import Toast from './components/Toast'

let toastCounter = 0

export default function App() {
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [cardModal, setCardModal] = useState({ open: false, lane: 'todo', task: null })
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('sidebarOpen') !== 'false')

  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastCounter
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // Init: load projects from API
  useEffect(() => {
    async function init() {
      try {
        let projectList = await db.getProjects()
        if (projectList.length === 0) {
          const defaultProject = await db.addProject('Project Alpha')
          projectList = [defaultProject]
        } else {
          projectList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        }
        setProjects(projectList)
        const savedId = localStorage.getItem('currentProjectId')
        const validId = savedId && projectList.find(p => p.id === savedId)
          ? savedId
          : projectList[0].id
        setCurrentProjectId(validId)
      } catch (err) {
        console.error('Init failed', err)
        addToast('Failed to load data', 'error')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, []) // eslint-disable-line

  // Load tasks when project changes
  useEffect(() => {
    if (!currentProjectId) return
    localStorage.setItem('currentProjectId', currentProjectId)
    db.getTasksByProject(currentProjectId).then(loaded => {
      setTasks(loaded.sort((a, b) => a.order - b.order))
    })
  }, [currentProjectId])

  const currentProject = projects.find(p => p.id === currentProjectId) ?? null

  // ── Project operations ──────────────────────────────────────────────────────

  const createProject = useCallback(async (name) => {
    try {
      const project = await db.addProject(name)
      setProjects(prev => [...prev, project])
      setCurrentProjectId(project.id)
      setTasks([])
      addToast(`Project "${name}" created`)
    } catch (err) {
      addToast('Failed to create project', 'error')
    }
  }, [addToast])

  const renameProject = useCallback(async (id, name) => {
    try {
      const updated = await db.renameProject(id, name)
      setProjects(prev => prev.map(p => p.id === id ? updated : p))
      addToast('Project renamed')
    } catch (err) {
      addToast('Failed to rename project', 'error')
      throw err
    }
  }, [addToast])

  const deleteProject = useCallback(async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return
    try {
      await db.deleteProject(id)
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== id)
        if (currentProjectId === id) {
          setCurrentProjectId(remaining.length > 0 ? remaining[0].id : null)
          setTasks([])
        }
        return remaining
      })
      addToast('Project deleted')
    } catch (err) {
      addToast('Failed to delete project', 'error')
    }
  }, [currentProjectId, addToast])

  const switchProject = useCallback((id) => {
    setCurrentProjectId(id)
    addToast('Project switched')
  }, [addToast])

  // ── Task operations ─────────────────────────────────────────────────────────

  const createTask = useCallback(async (title, description, dueDate, status = 'todo', tags = [], priority = 'none') => {
    try {
      const task = await db.addTask({
        projectId: currentProjectId,
        title,
        description: description || '',
        dueDate: dueDate || null,
        status,
        tags,
        priority,
      })
      setTasks(prev => [...prev, task])
      addToast('Task created')
    } catch (err) {
      addToast('Failed to create task', 'error')
    }
  }, [currentProjectId, addToast])

  const updateTask = useCallback(async (id, updates) => {
    try {
      const updated = await db.updateTask(id, {
        ...updates,
      })
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
      addToast('Task updated')
    } catch (err) {
      addToast('Failed to update task', 'error')
    }
  }, [addToast])

  const deleteTask = useCallback(async (id) => {
    try {
      await db.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      addToast('Task deleted')
    } catch (err) {
      addToast('Failed to delete task', 'error')
    }
  }, [addToast])

  const moveTask = useCallback(async (affectedTasks) => {
    // Optimistic update — store previous state for rollback
    const previousTasks = tasksRef.current
    setTasks(prev => {
      const map = new Map(affectedTasks.map(t => [t.id, t]))
      return prev.map(t => map.has(t.id) ? map.get(t.id) : t)
    })
    try {
      await db.bulkUpdateTasks(affectedTasks)
    } catch (err) {
      setTasks(previousTasks)
      addToast('Failed to save reorder', 'error')
    }
  }, [addToast])

  // ── Export / Import ─────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    try {
      const data = await db.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kanban_export_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('Exported successfully')
    } catch {
      addToast('Export failed', 'error')
    }
  }, [addToast])

  const handleImport = useCallback(async (file) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.version || !Array.isArray(data.projects) || !Array.isArray(data.tasks)) {
        throw new Error('Invalid file format')
      }
      if (!window.confirm('This will replace all current data. Continue?')) return
      // Import via API: delete all existing, then recreate
      // For simplicity, we'll POST each project and task
      // A future enhancement could add a dedicated import endpoint
      addToast('Import is not yet supported via API', 'error')
    } catch (err) {
      addToast('Import failed: ' + err.message, 'error')
    }
  }, [addToast])

  // ── Modal helpers ───────────────────────────────────────────────────────────

  const openNewCard = useCallback((lane = 'todo') => {
    setCardModal({ open: true, lane, task: null })
  }, [])

  const openEditCard = useCallback((task) => {
    setCardModal({ open: true, lane: task.status, task })
  }, [])

  const closeCardModal = useCallback(() => {
    setCardModal({ open: false, lane: 'todo', task: null })
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <span className="text-on-surface-variant font-label tracking-widest uppercase text-sm animate-pulse">
          Initializing...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-body text-on-surface antialiased overflow-hidden">
      <TopNav />
      <SideNav
        currentProject={currentProject}
        onNewTask={() => openNewCard('todo')}
        open={sidebarOpen}
        onClose={() => { setSidebarOpen(false); localStorage.setItem('sidebarOpen', 'false') }}
        onOpen={() => { setSidebarOpen(true); localStorage.setItem('sidebarOpen', 'true') }}
      />

      <main className={`${sidebarOpen ? 'ml-64' : 'ml-10'} mt-16 p-8 min-h-[calc(100vh-4rem)] overflow-y-auto h-[calc(100vh-4rem)]`}>
        <Board
          tasks={tasks}
          currentProject={currentProject}
          projects={projects}
          onAddCard={openNewCard}
          onEditCard={openEditCard}
          onDeleteCard={deleteTask}
          onMoveTask={moveTask}
          onOpenProjectModal={() => setProjectModalOpen(true)}
          onExport={handleExport}
          onImport={handleImport}
        />
      </main>

      {/* FAB */}
      <button
        onClick={() => openNewCard('todo')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary-fixed rounded-sm shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50"
        title="Add task"
        data-testid="fab-new-task"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_task</span>
      </button>

      {/* Modals */}
      {cardModal.open && (
        <CardModal
          lane={cardModal.lane}
          task={cardModal.task}
          onSave={cardModal.task
            ? (id, updates) => updateTask(id, updates)
            : (title, desc, dueDate, status, tags, priority) => createTask(title, desc, dueDate, status, tags, priority)
          }
          onClose={closeCardModal}
        />
      )}

      {projectModalOpen && (
        <ProjectModal
          projects={projects}
          currentProjectId={currentProjectId}
          onCreateProject={createProject}
          onRenameProject={renameProject}
          onDeleteProject={deleteProject}
          onSwitchProject={switchProject}
          onClose={() => setProjectModalOpen(false)}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
