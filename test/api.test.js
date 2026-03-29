import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createApp } from '../server/app.js'

let tempDir
let app

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'))
  process.env.DATA_PATH = tempDir
  app = createApp()
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

// ── Projects ────────────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/projects', () => {
  it('creates a project with valid name', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Test Project' })
    expect(res.body.id).toBeTruthy()
    expect(res.body.created_at).toBeTruthy()
  })

  it('rejects empty name', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })

  it('rejects missing name', async () => {
    const res = await request(app).post('/api/projects').send({})
    expect(res.status).toBe(400)
  })

  it('trims whitespace from name', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: '  Trimmed  ' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Trimmed')
  })
})

describe('DELETE /api/projects/:id', () => {
  it('deletes an existing project', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'To Delete' })
    const id = create.body.id

    const res = await request(app).delete(`/api/projects/${id}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const list = await request(app).get('/api/projects')
    expect(list.body).toHaveLength(0)
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/projects/nonexistent')
    expect(res.status).toBe(404)
  })

  it('cascades: deletes tasks belonging to the project', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'Cascade Test' })
    const projectId = project.body.id

    await request(app).post('/api/tasks').send({ projectId, title: 'Task to cascade' })
    await request(app).delete(`/api/projects/${projectId}`)

    const tasks = await request(app).get(`/api/tasks?projectId=${projectId}`)
    expect(tasks.body).toHaveLength(0)
  })
})

// ── Tasks ───────────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/tasks')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('filters by projectId', async () => {
    const p1 = await request(app).post('/api/projects').send({ name: 'P1' })
    const p2 = await request(app).post('/api/projects').send({ name: 'P2' })

    await request(app).post('/api/tasks').send({ projectId: p1.body.id, title: 'T1' })
    await request(app).post('/api/tasks').send({ projectId: p2.body.id, title: 'T2' })

    const res = await request(app).get(`/api/tasks?projectId=${p1.body.id}`)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('T1')
  })
})

describe('POST /api/tasks', () => {
  it('creates a task with valid data', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'New Task', description: 'Desc', status: 'todo' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'New Task', description: 'Desc', status: 'todo', order: 1 })
  })

  it('rejects missing projectId', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'No Project' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/projectId/i)
  })

  it('rejects missing title', async () => {
    const res = await request(app).post('/api/tasks').send({ projectId: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/i)
  })

  it('defaults invalid status to todo', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'Bad Status', status: 'banana' })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('todo')
  })

  it('auto-increments order within the same lane', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id

    const t1 = await request(app).post('/api/tasks').send({ projectId: pid, title: 'T1', status: 'todo' })
    const t2 = await request(app).post('/api/tasks').send({ projectId: pid, title: 'T2', status: 'todo' })

    expect(t1.body.order).toBe(1)
    expect(t2.body.order).toBe(2)
  })
})

describe('PUT /api/tasks/:id', () => {
  it('updates task fields', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'Original' })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ title: 'Updated', description: 'New desc' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Updated')
    expect(res.body.description).toBe('New desc')
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/tasks/nonexistent').send({ title: 'X' })
    expect(res.status).toBe(404)
  })

  it('rejects invalid status', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T' })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ status: 'banana' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/i)
  })

  it('accepts valid status change', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T' })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ status: 'done' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('done')
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('deletes an existing task', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'To Delete' })

    const res = await request(app).delete(`/api/tasks/${task.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/tasks/nonexistent')
    expect(res.status).toBe(404)
  })
})

// ── Bulk update ─────────────────────────────────────────────────────────────

describe('PATCH /api/tasks/bulk', () => {
  it('updates multiple tasks in one request', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id

    const t1 = await request(app).post('/api/tasks').send({ projectId: pid, title: 'T1', status: 'todo' })
    const t2 = await request(app).post('/api/tasks').send({ projectId: pid, title: 'T2', status: 'todo' })

    const res = await request(app)
      .patch('/api/tasks/bulk')
      .send({
        tasks: [
          { id: t1.body.id, status: 'in_progress', order: 2 },
          { id: t2.body.id, status: 'done', order: 1 },
        ],
      })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const tasks = await request(app).get(`/api/tasks?projectId=${pid}`)
    const updated1 = tasks.body.find(t => t.id === t1.body.id)
    const updated2 = tasks.body.find(t => t.id === t2.body.id)
    expect(updated1.status).toBe('in_progress')
    expect(updated1.order).toBe(2)
    expect(updated2.status).toBe('done')
    expect(updated2.order).toBe(1)
  })

  it('rejects empty tasks array', async () => {
    const res = await request(app).patch('/api/tasks/bulk').send({ tasks: [] })
    expect(res.status).toBe(400)
  })

  it('rejects missing tasks field', async () => {
    const res = await request(app).patch('/api/tasks/bulk').send({})
    expect(res.status).toBe(400)
  })

  it('skips tasks with invalid status', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T1', status: 'todo' })

    await request(app)
      .patch('/api/tasks/bulk')
      .send({ tasks: [{ id: task.body.id, status: 'banana', order: 5 }] })

    const tasks = await request(app).get(`/api/tasks?projectId=${project.body.id}`)
    expect(tasks.body[0].status).toBe('todo')
  })
})

// ── Unknown API routes ──────────────────────────────────────────────────────

describe('Unknown API routes', () => {
  it('returns JSON 404 for unknown API paths', async () => {
    const res = await request(app).get('/api/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})
