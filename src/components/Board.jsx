import React, { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Lane from './Lane'
import { TaskCardOverlay } from './TaskCard'

const LANE_IDS = ['backlog', 'todo', 'in_progress', 'done']

function buildItems(tasks) {
  return LANE_IDS.reduce((acc, id) => {
    acc[id] = tasks
      .filter(t => t.status === id)
      .sort((a, b) => a.order - b.order)
      .map(t => t.id)
    return acc
  }, {})
}

export default function Board({
  tasks,
  currentProject,
  projects,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onMoveTask,
  onOpenProjectModal,
  onExport,
  onImport,
}) {
  // items holds the ordered IDs per lane — updated synchronously during drag
  // so the DOM is already in the correct position when the drop lands.
  const [items, setItems] = useState(() => buildItems(tasks))
  const [activeId, setActiveId] = useState(null)
  const importRef = useRef(null)

  // Sync items when tasks change externally (project switch, add, delete)
  // but NOT during an active drag (would reset the in-progress move).
  useEffect(() => {
    if (!activeId) setItems(buildItems(tasks))
  }, [tasks, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const activeTask = activeId ? taskMap.get(activeId) : null

  function findContainer(id) {
    if (LANE_IDS.includes(id)) return id
    for (const laneId of LANE_IDS) {
      if (items[laneId].includes(id)) return laneId
    }
    return null
  }

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  // onDragOver: update items immediately for cross-lane moves so the card
  // visually snaps into the destination lane in real time.
  function handleDragOver({ active, over }) {
    if (!over) return
    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setItems(prev => {
      const activeItems = prev[activeContainer].filter(id => id !== active.id)
      const overItems = [...prev[overContainer]]
      const overIdx = overItems.indexOf(over.id)
      // Insert before the hovered item; append if dropping on the lane itself
      const insertAt = overIdx >= 0 ? overIdx : overItems.length
      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: [
          ...overItems.slice(0, insertAt),
          active.id,
          ...overItems.slice(insertAt),
        ],
      }
    })
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over) {
      // Cancelled — reset to match persisted tasks
      setItems(buildItems(tasks))
      return
    }

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)
    if (!activeContainer || !overContainer) return

    // Within-lane reorder: onDragOver didn't fire, so apply arrayMove now
    let finalItems = items
    if (activeContainer === overContainer) {
      const oldIdx = items[activeContainer].indexOf(active.id)
      const newIdx = items[overContainer].indexOf(over.id)
      if (oldIdx !== newIdx && newIdx !== -1) {
        finalItems = {
          ...items,
          [activeContainer]: arrayMove(items[activeContainer], oldIdx, newIdx),
        }
        setItems(finalItems)
      }
    }
    // Cross-lane: items already updated in onDragOver, finalItems === items

    // Persist only the tasks whose status or order actually changed
    const now = new Date().toISOString()
    const updated = []
    LANE_IDS.forEach(laneId => {
      finalItems[laneId].forEach((taskId, index) => {
        const task = taskMap.get(taskId)
        if (!task) return
        if (task.status !== laneId || task.order !== index + 1) {
          updated.push({ ...task, status: laneId, order: index + 1, updated_at: now })
        }
      })
    })
    if (updated.length > 0) onMoveTask(updated)
  }

  function handleImportClick() {
    importRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
      e.target.value = ''
    }
  }

  // Derive ordered task arrays for each lane from items (not raw tasks)
  const tasksByLane = LANE_IDS.reduce((acc, id) => {
    acc[id] = items[id].map(taskId => taskMap.get(taskId)).filter(Boolean)
    return acc
  }, {})

  return (
    <div>
      {/* Board header */}
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-12">
        <button
          onClick={onOpenProjectModal}
          className="bg-primary text-on-primary px-4 py-2 flex items-center gap-3 cursor-pointer group hover:brightness-110 transition-all text-lg font-bold"
          data-testid="project-selector-btn"
        >
          <span className="font-headline tracking-tight">
            {currentProject?.name ?? 'Select Project'}
          </span>
          <span className="material-symbols-outlined">unfold_more</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            className="bg-surface-container-low hover:bg-surface-container-high px-4 py-2 flex items-center gap-2 transition-all group"
            title="Export all data as JSON"
            data-testid="export-btn"
          >
            <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary">
              download
            </span>
            <span className="text-xs font-label uppercase tracking-wider">Export</span>
          </button>
          {/* Import hidden — not yet implemented via API (see TODOS.md) */}
        </div>
      </header>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {LANE_IDS.map(laneId => (
            <Lane
              key={laneId}
              laneId={laneId}
              tasks={tasksByLane[laneId]}
              onAddCard={onAddCard}
              onEditCard={onEditCard}
              onDeleteCard={onDeleteCard}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
