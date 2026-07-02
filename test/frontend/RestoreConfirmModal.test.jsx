import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RestoreConfirmModal from '../../src/components/RestoreConfirmModal'

describe('RestoreConfirmModal', () => {
  it('renders the confirmation copy and singular counts', () => {
    render(<RestoreConfirmModal projectCount={1} taskCount={1} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Confirm Restore')).toBeInTheDocument()
    expect(screen.getByText('This will replace all current data')).toBeInTheDocument()
    expect(screen.getByText('project')).toBeInTheDocument()
    expect(screen.getByText('task')).toBeInTheDocument()
  })

  it('renders plural counts for multiple projects and tasks', () => {
    render(<RestoreConfirmModal projectCount={2} taskCount={5} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('tasks')).toBeInTheDocument()
  })

  it('calls onConfirm when Restore is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RestoreConfirmModal projectCount={1} taskCount={1} onConfirm={onConfirm} onClose={vi.fn()} />)
    await user.click(screen.getByText('Restore'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('closes without confirming when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<RestoreConfirmModal projectCount={1} taskCount={1} onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
