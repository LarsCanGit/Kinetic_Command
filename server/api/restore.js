import express, { Router } from 'express'
import { saveProjects, saveTasks } from '../fileStorage.js'

const router = Router()
router.use(express.json({ limit: '10mb' }))

const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'done']

function validateRestoreData(data) {
  if (!data || typeof data !== 'object') {
    return 'Request body must be a JSON object'
  }

  const { version, projects, tasks } = data

  if (typeof version !== 'string' || !version) {
    return 'Missing or invalid "version" field (expected non-empty string)'
  }

  if (!Array.isArray(projects)) {
    return '"projects" must be an array'
  }

  if (!Array.isArray(tasks)) {
    return '"tasks" must be an array'
  }

  const projectIds = new Set()
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i]
    if (!p || typeof p !== 'object') {
      return `projects[${i}]: must be an object`
    }
    if (typeof p.id !== 'string' || !p.id) {
      return `projects[${i}]: missing or invalid "id"`
    }
    if (typeof p.name !== 'string' || !p.name.trim()) {
      return `projects[${i}]: missing or empty "name"`
    }
    if (typeof p.created_at !== 'string' || !p.created_at) {
      return `projects[${i}]: missing "created_at"`
    }
    if (typeof p.updated_at !== 'string' || !p.updated_at) {
      return `projects[${i}]: missing "updated_at"`
    }
    if (projectIds.has(p.id)) {
      return `projects[${i}]: duplicate project id "${p.id}"`
    }
    projectIds.add(p.id)
  }

  const taskIds = new Set()
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    if (!t || typeof t !== 'object') {
      return `tasks[${i}]: must be an object`
    }
    if (typeof t.id !== 'string' || !t.id) {
      return `tasks[${i}]: missing or invalid "id"`
    }
    if (typeof t.projectId !== 'string' || !t.projectId) {
      return `tasks[${i}]: missing or invalid "projectId"`
    }
    if (typeof t.title !== 'string' || !t.title.trim()) {
      return `tasks[${i}]: missing or empty "title"`
    }
    if (!VALID_STATUSES.includes(t.status)) {
      return `tasks[${i}]: invalid status "${t.status}" (must be one of: ${VALID_STATUSES.join(', ')})`
    }
    if (typeof t.order !== 'number' || isNaN(t.order)) {
      return `tasks[${i}]: missing or invalid "order" (expected number)`
    }
    if (!projectIds.has(t.projectId)) {
      return `tasks[${i}]: projectId "${t.projectId}" does not match any project in the backup`
    }
    if (taskIds.has(t.id)) {
      return `tasks[${i}]: duplicate task id "${t.id}"`
    }
    taskIds.add(t.id)
  }

  return null
}

router.post('/', async (req, res) => {
  try {
    const error = validateRestoreData(req.body)
    if (error) {
      return res.status(400).json({ error })
    }

    const { projects, tasks } = req.body
    await saveProjects(projects)
    await saveTasks(tasks)

    res.json({ success: true, projects: projects.length, tasks: tasks.length })
  } catch (err) {
    console.error('POST /api/restore error:', err)
    res.status(500).json({ error: 'Failed to restore database' })
  }
})

export default router
