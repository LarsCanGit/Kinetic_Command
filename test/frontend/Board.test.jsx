import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Board from '../../src/components/Board'

const { capturedHandlers } = vi.hoisted(() => ({ capturedHandlers: {} }))

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    DndContext: (props) => {
      capturedHandlers.onDragStart = props.onDragStart
      capturedHandlers.onDragOver = props.onDragOver
      capturedHandlers.onDragEnd = props.onDragEnd
      return props.children
    },
    useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: null,
      isDragging: false,
    }),
  }
})

const currentProject = { id: 'proj-1', name: 'Project Alpha' }
const projects = [currentProject]

function makeTask(id, status, order, title) {
  return {
    id,
    projectId: 'proj-1',
    title,
    description: '',
    dueDate: null,
    status,
    order,
    tags: [],
    priority: 'none',
  }
}

const baseTasks = [
  makeTask('task-1', 'todo', 1, 'First todo'),
  makeTask('task-2', 'todo', 2, 'Second todo'),
  makeTask('task-3', 'in_progress', 1, 'In progress task'),
]

beforeEach(() => {
  capturedHandlers.onDragStart = null
  capturedHandlers.onDragOver = null
  capturedHandlers.onDragEnd = null
})

describe('Board', () => {
  it('renders all four lanes with cards grouped by status', () => {
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onMoveTask={vi.fn()}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    expect(screen.getByTestId('lane-backlog')).toBeInTheDocument()
    expect(screen.getByTestId('lane-todo')).toBeInTheDocument()
    expect(screen.getByTestId('lane-in_progress')).toBeInTheDocument()
    expect(screen.getByTestId('lane-done')).toBeInTheDocument()

    const todoLane = screen.getByTestId('lane-todo')
    expect(todoLane).toHaveTextContent('First todo')
    expect(todoLane).toHaveTextContent('Second todo')
    const inProgressLane = screen.getByTestId('lane-in_progress')
    expect(inProgressLane).toHaveTextContent('In progress task')
    expect(inProgressLane).not.toHaveTextContent('First todo')
  })

  it('triggers onAddCard with the correct lane id', async () => {
    const user = userEvent.setup()
    const onAddCard = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={onAddCard}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onMoveTask={vi.fn()}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('add-card-backlog'))
    expect(onAddCard).toHaveBeenCalledWith('backlog')
  })

  it('triggers onEditCard with the full task when a card is clicked', async () => {
    const user = userEvent.setup()
    const onEditCard = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={onEditCard}
        onDeleteCard={vi.fn()}
        onMoveTask={vi.fn()}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    await user.click(screen.getByText('First todo'))
    expect(onEditCard).toHaveBeenCalledWith(baseTasks[0])
  })

  it('triggers onDeleteCard with the task id after two-step confirmation', async () => {
    const user = userEvent.setup()
    const onDeleteCard = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={onDeleteCard}
        onMoveTask={vi.fn()}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    await user.click(screen.getByTestId('task-delete-btn-task-1'))
    await user.click(screen.getByTestId('task-delete-confirm-btn-task-1'))
    expect(onDeleteCard).toHaveBeenCalledWith('task-1')
  })

  it('reorders within a lane and calls onMoveTask with the updated tasks', () => {
    const onMoveTask = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onMoveTask={onMoveTask}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    act(() => {
      capturedHandlers.onDragStart({ active: { id: 'task-2' } })
    })
    act(() => {
      capturedHandlers.onDragEnd({ active: { id: 'task-2' }, over: { id: 'task-1' } })
    })
    expect(onMoveTask).toHaveBeenCalled()
    const updated = onMoveTask.mock.calls[0][0]
    const task1Update = updated.find(t => t.id === 'task-1')
    const task2Update = updated.find(t => t.id === 'task-2')
    expect(task2Update.order).toBeLessThan(task1Update.order)
  })

  it('moves a card to a different lane and calls onMoveTask with the new status', () => {
    const onMoveTask = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onMoveTask={onMoveTask}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    act(() => {
      capturedHandlers.onDragStart({ active: { id: 'task-1' } })
    })
    act(() => {
      capturedHandlers.onDragOver({ active: { id: 'task-1' }, over: { id: 'in_progress' } })
    })
    act(() => {
      capturedHandlers.onDragEnd({ active: { id: 'task-1' }, over: { id: 'in_progress' } })
    })
    expect(onMoveTask).toHaveBeenCalled()
    const updated = onMoveTask.mock.calls[0][0]
    const task1Update = updated.find(t => t.id === 'task-1')
    expect(task1Update.status).toBe('in_progress')
  })

  it('does not call onMoveTask when a drag ends outside any droppable', () => {
    const onMoveTask = vi.fn()
    render(
      <Board
        tasks={baseTasks}
        currentProject={currentProject}
        projects={projects}
        onAddCard={vi.fn()}
        onEditCard={vi.fn()}
        onDeleteCard={vi.fn()}
        onMoveTask={onMoveTask}
        onOpenProjectModal={vi.fn()}
        onRefresh={vi.fn()}
        onExport={vi.fn()}
      />
    )
    act(() => {
      capturedHandlers.onDragStart({ active: { id: 'task-1' } })
    })
    act(() => {
      capturedHandlers.onDragEnd({ active: { id: 'task-1' }, over: null })
    })
    expect(onMoveTask).not.toHaveBeenCalled()
  })
})
