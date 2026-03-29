import React, { useState, useEffect, useRef } from 'react'

export default function ProjectModal({
  projects,
  currentProjectId,
  onCreateProject,
  onDeleteProject,
  onSwitchProject,
  onClose,
}) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('Project name is required')
      return
    }
    onCreateProject(name)
    setNewName('')
    setError('')
    onClose()
  }

  function handleSwitch(id) {
    if (id !== currentProjectId) {
      onSwitchProject(id)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px]" />

      {/* Modal */}
      <div className="relative bg-surface-container-highest w-full max-w-md shadow-2xl border border-outline-variant/15" data-testid="project-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-label uppercase tracking-widest font-bold text-on-surface">
            Projects
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
            data-testid="project-modal-close-btn"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Project list */}
          <div className="space-y-1">
            {projects.length === 0 && (
              <p className="text-xs text-on-surface-variant/50 font-label text-center py-4">
                No projects yet
              </p>
            )}
            {projects.map(project => (
              <div
                key={project.id}
                className={`flex items-center justify-between px-3 py-2.5 group cursor-pointer transition-colors ${
                  project.id === currentProjectId
                    ? 'bg-primary/10 border-l-2 border-primary'
                    : 'hover:bg-surface-container-high'
                }`}
                onClick={() => handleSwitch(project.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    folder
                  </span>
                  <span className={`text-sm font-label font-medium ${
                    project.id === currentProjectId ? 'text-primary' : 'text-on-surface'
                  }`}>
                    {project.name}
                  </span>
                  {project.id === currentProjectId && (
                    <span className="text-[9px] font-label uppercase tracking-widest text-primary/70">
                      Active
                    </span>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteProject(project.id) }}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                  title="Delete project"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-outline-variant/10" />

          {/* New project form */}
          <form onSubmit={handleCreate} className="space-y-3" data-testid="project-form">
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
              New Project
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError('') }}
                placeholder="Project name..."
                data-testid="project-name-input"
                className="flex-1 bg-surface-container-low border-b border-outline-variant/30 focus:border-primary text-on-surface text-sm px-3 py-2 focus:outline-none focus:bg-surface-container transition-all placeholder:text-on-surface-variant/40"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed text-xs font-label uppercase tracking-wider font-bold hover:opacity-90 transition-opacity"
                data-testid="create-project-btn"
              >
                Create
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-error font-label">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
