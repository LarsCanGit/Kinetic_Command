import React, { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00') < today
}

export function TaskCardOverlay({ task }) {
  return (
    <div className="bg-surface-container-high p-5 border-b-2 border-primary shadow-2xl shadow-primary/10 opacity-95 rotate-1 cursor-grabbing w-full">
      <h4 className="font-headline font-bold text-on-surface mb-1 leading-tight text-sm">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-xs text-on-surface-variant line-clamp-1">{task.description}</p>
      )}
    </div>
  )
}

export default function TaskCard({ task, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 0 : undefined,
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const overdue = isOverdue(task.dueDate)
  const formattedDate = formatDueDate(task.dueDate)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface-container-low p-5 group hover:bg-surface-container-high transition-colors border-b border-outline-variant/10 cursor-grab active:cursor-grabbing select-none relative"
      {...attributes}
      {...listeners}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-label uppercase tracking-widest font-bold ${
          task.status === 'in_progress'
            ? 'text-primary'
            : task.status === 'done'
            ? 'text-tertiary'
            : 'text-on-surface-variant'
        }`}>
          {task.status === 'todo' && 'Backlog'}
          {task.status === 'in_progress' && 'In Progress'}
          {task.status === 'done' && 'Completed'}
        </span>

        {/* Context menu */}
        <div
          ref={menuRef}
          className="relative"
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="text-on-surface-variant hover:text-primary transition-colors"
            data-testid={`task-menu-btn-${task.id}`}
          >
            <span className="material-symbols-outlined text-sm">more_horiz</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 bg-surface-container-highest border border-outline-variant/20 shadow-xl z-50 min-w-[120px]">
              <button
                onClick={() => { setMenuOpen(false); onEdit(task) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
                data-testid={`task-edit-btn-${task.id}`}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(task.id) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-error hover:bg-error-container/20 transition-colors"
                data-testid={`task-delete-btn-${task.id}`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className={`font-headline font-bold mb-2 leading-tight text-sm ${
        task.status === 'done' ? 'text-on-surface-variant line-through' : 'text-on-surface'
      }`}>
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className={`text-xs mb-4 line-clamp-2 ${
          task.status === 'done' ? 'text-on-surface-variant/50' : 'text-on-surface-variant'
        }`}>
          {task.description}
        </p>
      )}

      {/* Due date */}
      {formattedDate && (
        <div className={`flex items-center gap-1 mb-4 text-[10px] font-label font-medium ${
          overdue && task.status !== 'done' ? 'text-error' : 'text-on-surface-variant'
        }`}>
          <span className="material-symbols-outlined text-xs">calendar_today</span>
          {overdue && task.status !== 'done' ? 'Overdue · ' : 'Due: '}
          {formattedDate}
        </div>
      )}
    </div>
  )
}
