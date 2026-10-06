import { Router } from 'express'
import { getTasks, getProjects } from '../fileStorage.js'

const router = Router()

// GET /api/health — confirms the data directory is reachable and readable
router.get('/', async (req, res) => {
  try {
    const [projects, tasks] = await Promise.all([getProjects(), getTasks()])
    res.json({ status: 'ok', projects: projects.length, tasks: tasks.length })
  } catch (err) {
    console.error('GET /api/health error:', err)
    res.status(503).json({ status: 'error', error: 'Data storage unavailable' })
  }
})

export default router
