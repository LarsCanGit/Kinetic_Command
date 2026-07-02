import { Router } from 'express'
import { getTasks, saveTasks, getProjects } from '../fileStorage.js'

const router = Router()

// GET /api/cleanup/candidates?days=N — scan for old completed tasks and orphaned tasks (no mutation)
router.get('/candidates', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10)
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ error: 'days must be a non-negative number' })
    }

    const [tasks, projects] = await Promise.all([getTasks(), getProjects()])
    const projectMap = new Map(projects.map(p => [p.id, p.name]))
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

    const orphaned = []
    const oldCompleted = []

    for (const t of tasks) {
      const isOrphaned = !t.projectId || !projectMap.has(t.projectId)
      if (isOrphaned) {
        orphaned.push(t)
        continue
      }
      if (t.status === 'done' && new Date(t.updated_at).getTime() < cutoff) {
        oldCompleted.push({ ...t, projectName: projectMap.get(t.projectId) })
      }
    }

    res.json({ oldCompleted, orphaned })
  } catch (err) {
    console.error('GET /api/cleanup/candidates error:', err)
    res.status(500).json({ error: 'Failed to scan for cleanup candidates' })
  }
})

// POST /api/cleanup — delete tasks by id
router.post('/', async (req, res) => {
  try {
    const { taskIds } = req.body
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds array is required' })
    }

    const idSet = new Set(taskIds)
    const allTasks = await getTasks()
    const remaining = allTasks.filter(t => !idSet.has(t.id))
    const deleted = allTasks.length - remaining.length

    await saveTasks(remaining)
    res.json({ success: true, deleted })
  } catch (err) {
    console.error('POST /api/cleanup error:', err)
    res.status(500).json({ error: 'Failed to clean up tasks' })
  }
})

export default router
