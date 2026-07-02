// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import * as db from '../../src/db'

vi.mock('../../src/db')

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
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

vi.mock('../../src/components/DatabasePage', () => ({
  default: ({ onExport, onRestore, onCleanup }) => (
    <div data-testid="database-page-mock">
      <button onClick={onExport}>Mock Export</button>
      <button
        onClick={() =>
          onRestore({
            version: '1.0',
            projects: [{ id: 'proj-2', name: 'Project Beta', created_at: '2026-01-02T00:00:00.000Z' }],
            tasks: [{ id: 'task-9', projectId: 'proj-2', title: 'Restored task', status: 'todo', order: 1 }],
          })
        }
      >
        Mock Restore
      </button>
      <button onClick={() => onCleanup(['task-1'])}>Mock Cleanup</button>
    </div>
  ),
}))

const projectAlpha = { id: 'proj-1', name: 'Project Alpha', created_at: '2026-01-01T00:00:00.000Z' }
const projectBeta = { id: 'proj-2', name: 'Project Beta', created_at: '2026-01-02T00:00:00.000Z' }

function makeTask(overrides) {
  return {
    id: overrides.id,
    projectId: overrides.projectId ?? 'proj-1',
    title: overrides.title ?? overrides.id,
    description: '',
    dueDate: null,
    status: overrides.status ?? 'todo',
    order: overrides.order ?? 1,
    tags: [],
    priority: 'none',
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  window.localStorage.clear()
  window.URL.createObjectURL = vi.fn(() => 'blob:mock')
  window.URL.revokeObjectURL = vi.fn()
})

describe('App', () => {
  it('creates a default project when none exist, then loads its tasks', async () => {
    db.getProjects.mockResolvedValue([])
    db.addProject.mockResolvedValue(projectAlpha)
    db.getTasksByProject.mockResolvedValue([])
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    expect(db.addProject).toHaveBeenCalledWith('Project Alpha')
    expect(db.getTasksByProject).toHaveBeenCalledWith('proj-1')
  })

  it('restores the saved project from localStorage when valid', async () => {
    window.localStorage.setItem('currentProjectId', 'proj-2')
    db.getProjects.mockResolvedValue([projectAlpha, projectBeta])
    db.getTasksByProject.mockResolvedValue([])
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    expect(db.getTasksByProject).toHaveBeenCalledWith('proj-2')
  })

  it('falls back to the first project when the saved id is invalid', async () => {
    window.localStorage.setItem('currentProjectId', 'does-not-exist')
    db.getProjects.mockResolvedValue([projectAlpha, projectBeta])
    db.getTasksByProject.mockResolvedValue([])
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    expect(db.getTasksByProject).toHaveBeenCalledWith('proj-1')
  })

  it('switching projects via the project modal reloads tasks for the new project', async () => {
    const user = userEvent.setup()
    db.getProjects.mockResolvedValue([projectAlpha, projectBeta])
    db.getTasksByProject.mockImplementation(projectId =>
      Promise.resolve(
        projectId === 'proj-1'
          ? [makeTask({ id: 'task-1', title: 'Alpha task' })]
          : [makeTask({ id: 'task-2', projectId: 'proj-2', title: 'Beta task' })]
      )
    )
    render(<App />)
    await waitFor(() => expect(screen.getByText('Alpha task')).toBeInTheDocument())
    await user.click(screen.getByTestId('project-selector-btn'))
    await user.click(screen.getByText('Project Beta'))
    await waitFor(() => expect(screen.getByText('Beta task')).toBeInTheDocument())
    expect(db.getTasksByProject).toHaveBeenCalledWith('proj-2')
  })

  it('shows a toast when a task is created', async () => {
    const user = userEvent.setup()
    db.getProjects.mockResolvedValue([projectAlpha])
    db.getTasksByProject.mockResolvedValue([])
    db.addTask.mockResolvedValue(makeTask({ id: 'task-1', title: 'New task' }))
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    await user.click(screen.getByTestId('fab-new-task'))
    await user.type(screen.getByTestId('card-title-input'), 'New task')
    await user.click(screen.getByTestId('create-task-btn'))
    await waitFor(() => expect(screen.getByText('Task created')).toBeInTheDocument())
  })

  it('shows a toast when a task is deleted', async () => {
    const user = userEvent.setup()
    db.getProjects.mockResolvedValue([projectAlpha])
    db.getTasksByProject.mockResolvedValue([makeTask({ id: 'task-1', title: 'Doomed task' })])
    db.deleteTask.mockResolvedValue()
    render(<App />)
    await waitFor(() => expect(screen.getByText('Doomed task')).toBeInTheDocument())
    await user.click(screen.getByTestId('task-delete-btn-task-1'))
    await user.click(screen.getByTestId('task-delete-confirm-btn-task-1'))
    await waitFor(() => expect(screen.getByText('Task deleted')).toBeInTheDocument())
  })

  it('exports data by calling db.exportData and creating a download link', async () => {
    const user = userEvent.setup()
    db.getProjects.mockResolvedValue([projectAlpha])
    db.getTasksByProject.mockResolvedValue([])
    db.exportData.mockResolvedValue({ version: '1.0', exportedAt: '2026-07-02T00:00:00.000Z', projects: [], tasks: [] })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    await user.click(screen.getByText('Database'))
    await waitFor(() => expect(screen.getByTestId('database-page-mock')).toBeInTheDocument())
    await user.click(screen.getByText('Mock Export'))
    await waitFor(() => expect(db.exportData).toHaveBeenCalled())
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('restores data, reloads projects and tasks, switches to the first project and page, and toasts the summary', async () => {
    const user = userEvent.setup()
    db.getProjects
      .mockResolvedValueOnce([projectAlpha])
      .mockResolvedValueOnce([projectBeta])
    db.getTasksByProject.mockImplementation(projectId =>
      Promise.resolve(
        projectId === 'proj-1'
          ? []
          : [makeTask({ id: 'task-9', projectId: 'proj-2', title: 'Restored task' })]
      )
    )
    db.restoreData.mockResolvedValue({ success: true, projects: 1, tasks: 1 })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    await user.click(screen.getByText('Database'))
    await waitFor(() => expect(screen.getByTestId('database-page-mock')).toBeInTheDocument())
    await user.click(screen.getByText('Mock Restore'))
    await waitFor(() => expect(db.restoreData).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(screen.getByText(/Restored .* projects and .* tasks/)).toBeInTheDocument(), { timeout: 3000 })
    expect(db.getTasksByProject).toHaveBeenCalledWith('proj-2')
    expect(screen.getByTestId('fab-new-task')).toBeInTheDocument()
  })

  it('cleans up tasks and removes them from state with a toast', async () => {
    const user = userEvent.setup()
    db.getProjects.mockResolvedValue([projectAlpha])
    db.getTasksByProject.mockResolvedValue([makeTask({ id: 'task-1', title: 'Stale task' })])
    db.cleanupTasks.mockResolvedValue({ success: true, deleted: 1 })
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('fab-new-task')).toBeInTheDocument())
    await user.click(screen.getByText('Database'))
    await waitFor(() => expect(screen.getByTestId('database-page-mock')).toBeInTheDocument())
    await user.click(screen.getByText('Mock Cleanup'))
    await waitFor(() => expect(db.cleanupTasks).toHaveBeenCalledWith(['task-1']))
    await waitFor(() => expect(screen.getByText('Deleted 1 task')).toBeInTheDocument())
  })
})
