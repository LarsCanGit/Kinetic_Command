// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CardModal from '../../src/components/CardModal'

const editTask = {
  id: 'task-1',
  title: 'Existing task',
  description: 'Existing description',
  dueDate: '2026-08-01',
  status: 'in_progress',
  tags: ['urgent', 'backend'],
  priority: 'high',
}

describe('CardModal', () => {
  it('renders in create mode with an empty title and lane options', () => {
    render(<CardModal lane="todo" task={null} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('card-title-input')).toHaveValue('')
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByTestId('create-task-btn')).toBeInTheDocument()
  })

  it('renders in edit mode prefilled from the task prop', () => {
    render(<CardModal lane="in_progress" task={editTask} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('card-title-input')).toHaveValue('Existing task')
    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
    expect(screen.getByTestId('save-changes-btn')).toBeInTheDocument()
  })

  it('blocks save and shows an error when the title is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardModal lane="todo" task={null} onSave={onSave} onClose={vi.fn()} />)
    await user.click(screen.getByTestId('create-task-btn'))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('adds a tag on Enter and removes it via its remove button', async () => {
    const user = userEvent.setup()
    render(<CardModal lane="todo" task={null} onSave={vi.fn()} onClose={vi.fn()} />)
    const tagInput = screen.getByPlaceholderText(/tag/i)
    await user.type(tagInput, 'urgent{Enter}')
    expect(screen.getByText('urgent')).toBeInTheDocument()

    const tagPill = screen.getByText('urgent').closest('span')
    await user.click(within(tagPill).getByRole('button'))
    expect(screen.queryByText('urgent')).not.toBeInTheDocument()
  })

  it('adds a tag on comma', async () => {
    const user = userEvent.setup()
    render(<CardModal lane="todo" task={null} onSave={vi.fn()} onClose={vi.fn()} />)
    const tagInput = screen.getByPlaceholderText(/tag/i)
    await user.type(tagInput, 'backend,')
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('calls onClose without saving when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<CardModal lane="todo" task={null} onSave={onSave} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits the correct payload in create mode, including lane and priority selection', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardModal lane="todo" task={null} onSave={onSave} onClose={vi.fn()} />)
    await user.type(screen.getByTestId('card-title-input'), 'New task')
    await user.click(screen.getByText('In Progress'))
    await user.click(screen.getByText('High'))
    await user.click(screen.getByTestId('create-task-btn'))
    expect(onSave).toHaveBeenCalledWith('New task', '', null, 'in_progress', [], 'high')
  })

  it('submits the correct payload in edit mode', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<CardModal lane="in_progress" task={editTask} onSave={onSave} onClose={vi.fn()} />)
    await user.clear(screen.getByTestId('card-title-input'))
    await user.type(screen.getByTestId('card-title-input'), 'Updated title')
    await user.click(screen.getByTestId('save-changes-btn'))
    expect(onSave).toHaveBeenCalledWith('task-1', {
      title: 'Updated title',
      description: 'Existing description',
      dueDate: '2026-08-01',
      priority: 'high',
      tags: ['urgent', 'backend'],
    })
  })
})
