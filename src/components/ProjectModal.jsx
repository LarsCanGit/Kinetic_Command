import React, { useState, useEffect, useRef } from 'react'

export default function ProjectModal({
  projects,
  currentProjectId,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onSwitchProject,
  onClose,
}) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editNameError, setEditNameError] = useState('')
  const inputRef = useRef(null)
  const editInputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null)
          setEditingName('')
          setEditNameError('')
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, editingId])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

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

  async function handleRenameConfirm(id) {
    const name = editingName.trim()
    if (!name) {
      setEditNameError('Name cannot be empty')
      return
    }
    try {
      await onRenameProject(id, name)
      setEditingId(null)
      setEditingName('')
      setEditNameError('')
    } catch {
      setEditNameError('Rename failed — try again')
    }
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
                className={`flex items-center justify-between px-3 py-2.5 group transition-colors ${
                  editingId === project.id
                    ? 'bg-surface-container-high'
                    : project.id === currentProjectId
                      ? 'bg-primary/10 border-l-2 border-primary cursor-pointer'
                      : 'hover:bg-surface-container-high cursor-pointer'
                }`}
                onClick={() => editingId !== project.id && handleSwitch(project.id)}
              >
                {editingId === project.id ? (
                  <div className="flex-1 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">edit</span>
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={e => { setEditingName(e.target.value); setEditNameError('') }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameConfirm(project.id)
                        }}
                        className="flex-1 bg-surface-container-low border-b border-primary text-on-surface text-sm px-2 py-1 focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameConfirm(project.id)}
                        className="text-primary hover:text-primary/70 transition-colors"
                        title="Confirm rename"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditingName(''); setEditNameError('') }}
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                        title="Cancel"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                    {editNameError && (
                      <p className="text-[10px] text-error font-label pl-6">{editNameError}</p>
                    )}
                  </div>
                ) : (
                  <>
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingId(project.id); setEditingName(project.name) }}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                        title="Rename project"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteProject(project.id) }}
                        className="text-on-surface-variant hover:text-error transition-colors"
                        title="Delete project"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </>
                )}
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
