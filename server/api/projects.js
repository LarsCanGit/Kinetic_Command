import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getProjects, saveProjects, getTasks, saveTasks } from '../fileStorage.js'

const router = Router()

// GET /api/projects — list all projects
router.get('/', async (req, res) => {
  try {
    const projects = await getProjects()
    res.json(projects)
  } catch (err) {
    console.error('GET /api/projects error:', err)
    res.status(500).json({ error: 'Failed to read projects' })
  }
})

// POST /api/projects — create a project
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    const project = {
      id: uuidv4(),
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const projects = await getProjects()
    projects.push(project)
    await saveProjects(projects)
    res.status(201).json(project)
  } catch (err) {
    console.error('POST /api/projects error:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// PUT /api/projects/:id — rename a project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' })
    }
    const projects = await getProjects()
    const project = projects.find(p => p.id === id)
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    project.name = name.trim()
    project.updated_at = new Date().toISOString()
    await saveProjects(projects)
    res.json(project)
  } catch (err) {
    console.error('PUT /api/projects error:', err)
    res.status(500).json({ error: 'Failed to rename project' })
  }
})

// DELETE /api/projects/:id — delete project and its tasks
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const projects = await getProjects()
    const index = projects.findIndex(p => p.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' })
    }
    projects.splice(index, 1)
    await saveProjects(projects)

    // Also delete all tasks belonging to this project
    const tasks = await getTasks()
    const remaining = tasks.filter(t => t.projectId !== id)
    await saveTasks(remaining)

    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects error:', err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

export default router
