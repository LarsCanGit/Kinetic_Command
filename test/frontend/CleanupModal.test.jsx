// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CleanupModal from '../../src/components/CleanupModal'
import * as db from '../../src/db'

vi.mock('../../src/db')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('CleanupModal', () => {
  it('renders only the days input and Scan button before scanning', () => {
    render(<CleanupModal onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(30)
    expect(screen.getByText('Scan')).toBeInTheDocument()
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
  })

  it('scans and renders old-completed and orphaned candidates, pre-selected', async () => {
    const user = userEvent.setup()
    db.getCleanupCandidates.mockResolvedValue({
      oldCompleted: [{ id: 'task-1', title: 'Old done task', projectName: 'Project Alpha' }],
      orphaned: [{ id: 'task-2', title: 'Orphaned task' }],
    })
    render(<CleanupModal onConfirm={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByText('Scan'))
    await waitFor(() => expect(db.getCleanupCandidates).toHaveBeenCalledWith(30))
    expect(screen.getByText(/Old completed tasks \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Orphaned tasks \(1\)/)).toBeInTheDocument()
    expect(screen.getByText('Old done task')).toBeInTheDocument()
    expect(screen.getByText('Orphaned task')).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(cb => expect(cb).toBeChecked())
  })

  it('deselecting a candidate unchecks its checkbox', async () => {
    const user = userEvent.setup()
    db.getCleanupCandidates.mockResolvedValue({
      oldCompleted: [{ id: 'task-1', title: 'Old done task', projectName: 'Project Alpha' }],
      orphaned: [],
    })
    render(<CleanupModal onConfirm={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByText('Scan'))
    await waitFor(() => expect(screen.getByText('Old done task')).toBeInTheDocument())
    const taskLabel = screen.getByText('Old done task').closest('label')
    const taskCheckbox = within(taskLabel).getByRole('checkbox')
    await user.click(taskCheckbox)
    expect(taskCheckbox).not.toBeChecked()
  })

  it('shows "Nothing to clean up." and hides Delete Selected when scan is empty', async () => {
    const user = userEvent.setup()
    db.getCleanupCandidates.mockResolvedValue({ oldCompleted: [], orphaned: [] })
    render(<CleanupModal onConfirm={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByText('Scan'))
    await waitFor(() => expect(screen.getByText('Nothing to clean up.')).toBeInTheDocument())
    expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
  })

  it('confirms with exactly the selected task ids', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue()
    db.getCleanupCandidates.mockResolvedValue({
      oldCompleted: [{ id: 'task-1', title: 'Old done task', projectName: 'Project Alpha' }],
      orphaned: [{ id: 'task-2', title: 'Orphaned task' }],
    })
    render(<CleanupModal onConfirm={onConfirm} onClose={vi.fn()} />)
    await user.click(screen.getByText('Scan'))
    await waitFor(() => expect(screen.getByText('Old done task')).toBeInTheDocument())
    const orphanLabel = screen.getByText('Orphaned task').closest('label')
    await user.click(within(orphanLabel).getByRole('checkbox'))
    await user.click(screen.getByText('Delete Selected'))
    expect(onConfirm).toHaveBeenCalledWith(['task-1'])
  })

  it('closes without confirming when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<CleanupModal onConfirm={onConfirm} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
