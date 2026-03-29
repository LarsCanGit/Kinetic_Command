import React, { useState, useEffect, useRef } from 'react'

const LANE_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export default function CardModal({ lane, task, onSave, onClose }) {
  const isEdit = !!task
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [selectedLane, setSelectedLane] = useState(lane)
  const [error, setError] = useState('')
  const titleRef = useRef(null)
  const handleSubmitRef = useRef(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Keep ref current so the keydown handler always calls the latest handleSubmit
  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  })

  // Close on Escape, submit on Ctrl+Enter
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        handleSubmitRef.current?.(e)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (isEdit) {
      onSave(task.id, {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
      })
    } else {
      onSave(title.trim(), description.trim(), dueDate || null, selectedLane)
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
      <div className="relative bg-surface-container-highest w-full max-w-lg shadow-2xl border border-outline-variant/15" data-testid="card-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="text-sm font-label uppercase tracking-widest font-bold text-on-surface">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
            data-testid="card-modal-close-btn"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5" data-testid="card-modal-form">
          {/* Lane selector — only for new tasks */}
          {!isEdit && (
            <div>
              <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">
                Lane
              </label>
              <div className="flex gap-2">
                {LANE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedLane(opt.value)}
                    className={`px-3 py-1.5 text-xs font-label transition-colors ${
                      selectedLane === opt.value
                        ? 'bg-primary text-on-primary-fixed font-bold'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Title <span className="text-error">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="Task title..."
              data-testid="card-title-input"
              className="w-full bg-surface-container-low border-b border-outline-variant/30 focus:border-primary text-on-surface text-sm px-3 py-2 focus:outline-none focus:bg-surface-container transition-all placeholder:text-on-surface-variant/40"
            />
            {error && (
              <p className="text-[10px] text-error mt-1 font-label">{error}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-surface-container-low border-b border-outline-variant/30 focus:border-primary text-on-surface text-sm px-3 py-2 focus:outline-none focus:bg-surface-container transition-all placeholder:text-on-surface-variant/40 resize-none"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-surface-container-low border-b border-outline-variant/30 focus:border-primary text-on-surface text-sm px-3 py-2 focus:outline-none focus:bg-surface-container transition-all [color-scheme:dark]"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-label uppercase tracking-wider text-on-surface-variant hover:text-on-surface border border-outline-variant/20 hover:border-outline-variant/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-br from-primary to-primary-dim text-on-primary-fixed text-xs font-label uppercase tracking-wider font-bold hover:opacity-90 transition-opacity"
              data-testid={isEdit ? 'save-changes-btn' : 'create-task-btn'}
            >
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
