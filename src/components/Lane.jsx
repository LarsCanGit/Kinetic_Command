import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

const LANE_META = {
  todo: {
    label: 'To Do',
    dotClass: 'bg-on-surface-variant',
    countClass: 'bg-surface-container-low text-on-surface-variant',
  },
  in_progress: {
    label: 'In Progress',
    dotClass: 'bg-primary',
    countClass: 'bg-primary/10 text-primary',
  },
  done: {
    label: 'Done',
    dotClass: 'bg-tertiary',
    countClass: 'bg-tertiary/10 text-tertiary',
  },
}

export default function Lane({ laneId, tasks, onAddCard, onEditCard, onDeleteCard }) {
  const meta = LANE_META[laneId]
  const taskIds = tasks.map(t => t.id)

  const { setNodeRef, isOver } = useDroppable({ id: laneId })

  return (
    <section className="space-y-4" data-testid={`lane-${laneId}`}>
      {/* Lane header */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 ${meta.dotClass}`} />
          <h3 className="text-sm font-label uppercase tracking-[0.2em] font-bold text-on-surface">
            {meta.label}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 font-mono ${meta.countClass}`}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(laneId)}
          className="text-on-surface-variant hover:text-primary transition-colors w-11 h-11 flex items-center justify-center"
          title={`Add task to ${meta.label}`}
          data-testid={`add-card-${laneId}`}
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-4 min-h-[80px] transition-colors rounded-sm ${
            isOver ? 'outline outline-1 outline-primary/30 bg-primary/5' : ''
          }`}
        >
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-outline-variant/20 text-center">
              <span className="material-symbols-outlined text-on-surface-variant/30 text-2xl mb-2">
                inbox
              </span>
              <span className="text-[10px] font-label text-on-surface-variant/40 uppercase tracking-widest">
                No tasks
              </span>
            </div>
          )}
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
