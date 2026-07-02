import express from 'express'
import projectsRouter from './api/projects.js'
import tasksRouter from './api/tasks.js'
import restoreRouter from './api/restore.js'
import cleanupRouter from './api/cleanup.js'

export function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  app.use('/api/projects', projectsRouter)
  app.use('/api/tasks', tasksRouter)
  app.use('/api/restore', restoreRouter)
  app.use('/api/cleanup', cleanupRouter)

  // Catch-all 404 for unknown API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return app
}
