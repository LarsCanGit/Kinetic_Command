import express from 'express'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { createApp } from './app.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 7429
const DIST_DIR = join(__dirname, '..', 'dist')

const app = createApp()

// ── Serve built frontend (production) ───────────────────────────────────────
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'API running', message: 'Build frontend with npm run build' })
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Kanban server running on http://localhost:${PORT}`)
  console.log(`Data path: ${process.env.DATA_PATH || '/data'}`)
})
