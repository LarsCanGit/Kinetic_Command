import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getTasks, saveTasks } from '../fileStorage.js'

const router = Router()

// Canonical lane statuses — keep in sync with frontend (Board.jsx, Lane.jsx, CardModal.jsx)
const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'done']

// GET /api/tasks — get tasks, optionally filtered by projectId, status, tag, priority, limit
router.get('/', async (req, res) => {
  try {
    const { projectId, status, tag, priority, limit } = req.query
    let tasks = await getTasks()

    if (projectId) tasks = tasks.filter(t => t.projectId === projectId)
    if (status)    tasks = tasks.filter(t => t.status === status)
    if (tag)       tasks = tasks.filter(t => Array.isArray(t.tags) && t.tags.includes(tag))
    if (priority)  tasks = tasks.filter(t => t.priority === priority)
    if (limit)     tasks = tasks.slice(0, parseInt(limit, 10))

    res.json(tasks)
  } catch (err) {
    console.error('GET /api/tasks error:', err)
    res.status(500).json({ error: 'Failed to read tasks' })
  }
})

// POST /api/tasks — create a task
router.post('/', async (req, res) => {
  try {
    const { projectId, title, description, dueDate, status, tags, priority } = req.body
    if (!projectId) return res.status(400).json({ error: 'projectId is required' })
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' })

    const taskStatus = VALID_STATUSES.includes(status) ? status : 'todo'

    const allTasks = await getTasks()
    const laneTasks = allTasks.filter(t => t.projectId === projectId && t.status === taskStatus)
    const maxOrder = laneTasks.length > 0 ? Math.max(...laneTasks.map(t => t.order)) : 0

    const task = {
      id: uuidv4(),
      projectId,
      title: title.trim(),
      description: description?.trim() || '',
      dueDate: dueDate || null,
      status: taskStatus,
      order: maxOrder + 1,
      tags: Array.isArray(tags) ? tags : [],
      priority: priority || 'none',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    allTasks.push(task)
    await saveTasks(allTasks)
    res.status(201).json(task)
  } catch (err) {
    console.error('POST /api/tasks error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PUT /api/tasks/:id — update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const allTasks = await getTasks()
    const index = allTasks.findIndex(t => t.id === id)
    if (index === -1) return res.status(404).json({ error: 'Task not found' })

    const existing = allTasks[index]
    const { title, description, dueDate, status, order, tags, priority } = req.body
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
    }
    const updated = {
      ...existing,
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(dueDate !== undefined && { dueDate: dueDate || null }),
      ...(status !== undefined && { status }),
      ...(order !== undefined && { order }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(priority !== undefined && { priority }),
      updated_at: new Date().toISOString(),
    }
    allTasks[index] = updated
    await saveTasks(allTasks)
    res.json(updated)
  } catch (err) {
    console.error('PUT /api/tasks error:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// PATCH /api/tasks/bulk — update multiple tasks (status + order) in one write
router.patch('/bulk', async (req, res) => {
  try {
    const { tasks: updates } = req.body
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'tasks array is required' })
    }
    const allTasks = await getTasks()
    const taskMap = new Map(allTasks.map(t => [t.id, t]))
    const now = new Date().toISOString()
    for (const u of updates) {
      const existing = taskMap.get(u.id)
      if (!existing) continue
      if (u.status !== undefined && !VALID_STATUSES.includes(u.status)) continue
      if (u.status !== undefined) existing.status = u.status
      if (u.order !== undefined) existing.order = u.order
      existing.updated_at = now
    }
    await saveTasks(allTasks)
    res.json({ success: true, updated: updates.length })
  } catch (err) {
    console.error('PATCH /api/tasks/bulk error:', err)
    res.status(500).json({ error: 'Failed to bulk update tasks' })
  }
})

// DELETE /api/tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const allTasks = await getTasks()
    const index = allTasks.findIndex(t => t.id === id)
    if (index === -1) return res.status(404).json({ error: 'Task not found' })

    allTasks.splice(index, 1)
    await saveTasks(allTasks)
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/tasks error:', err)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

export default router
