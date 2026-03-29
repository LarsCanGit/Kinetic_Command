import express from 'express'
import projectsRouter from './api/projects.js'
import tasksRouter from './api/tasks.js'

export function createApp() {
  const app = express()
  app.use(express.json())

  app.use('/api/projects', projectsRouter)
  app.use('/api/tasks', tasksRouter)

  // Catch-all 404 for unknown API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return app
}
