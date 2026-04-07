import React, { useState } from 'react'
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

// Normalize legacy p0/p1/p2 values to the current scale
const PRIORITY_NORMALIZE = { p0: 'critical', p1: 'high', p2: 'medium' }

const PRIORITY_STYLES = {
  critical: 'text-error',
  high: 'text-primary',
  medium: 'text-secondary',
  low: 'text-on-surface-variant',
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
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const overdue = isOverdue(task.dueDate)
  const formattedDate = formatDueDate(task.dueDate)
  const priority = PRIORITY_NORMALIZE[task.priority] || task.priority
  const hasPriority = priority && priority !== 'none'
  const hasTags = task.tags?.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => onEdit(task)}
      onMouseLeave={() => setConfirmDelete(false)}
      className="bg-surface-container-low p-5 group hover:bg-surface-container-high transition-colors border-b border-outline-variant/10 cursor-pointer select-none relative"
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-label uppercase tracking-widest font-bold ${
            task.status === 'in_progress'
              ? 'text-primary'
              : task.status === 'done'
              ? 'text-tertiary'
              : task.status === 'backlog'
              ? 'text-secondary'
              : 'text-on-surface-variant'
          }`}>
            {task.status === 'backlog' && 'Backlog'}
            {task.status === 'todo' && 'To Do'}
            {task.status === 'in_progress' && 'In Progress'}
            {task.status === 'done' && 'Completed'}
          </span>

          {hasPriority && (
            <span className={`text-[10px] font-label uppercase tracking-widest font-bold ${PRIORITY_STYLES[priority]}`}>
              · {priority.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Delete — idle or confirming */}
          {confirmDelete ? (
            <div
              className="flex items-center gap-1"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <span className="text-[10px] font-label text-error uppercase tracking-wider">Delete?</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                className="text-error hover:text-error transition-colors"
                data-testid={`task-delete-confirm-btn-${task.id}`}
              >
                <span className="material-symbols-outlined text-sm">check</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
                data-testid={`task-delete-cancel-btn-${task.id}`}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              className="text-on-surface-variant/0 group-hover:text-on-surface-variant/40 hover:!text-error transition-colors"
              data-testid={`task-delete-btn-${task.id}`}
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}

          {/* Drag handle */}
          <span
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="text-on-surface-variant/0 group-hover:text-on-surface-variant/40 hover:!text-primary transition-colors cursor-grab active:cursor-grabbing"
          >
            <span className="material-symbols-outlined text-sm">drag_indicator</span>
          </span>
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

      {/* Tags */}
      {hasTags && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map(tag => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant text-[10px] font-label"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
