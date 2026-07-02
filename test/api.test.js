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

// ── Task filtering ──────────────────────────────────────────────────────────

describe('GET /api/tasks — server-side filters', () => {
  it('filters by status', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Todo task', status: 'todo' })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Done task', status: 'done' })

    const res = await request(app).get('/api/tasks?status=todo')
    expect(res.status).toBe(200)
    expect(res.body.every(t => t.status === 'todo')).toBe(true)
    expect(res.body.some(t => t.title === 'Todo task')).toBe(true)
    expect(res.body.some(t => t.title === 'Done task')).toBe(false)
  })

  it('filters by tag', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Tagged', tags: ['bug', 'urgent'] })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Untagged' })

    const res = await request(app).get('/api/tasks?tag=bug')
    expect(res.status).toBe(200)
    expect(res.body.some(t => t.title === 'Tagged')).toBe(true)
    expect(res.body.some(t => t.title === 'Untagged')).toBe(false)
  })

  it('tag filter skips tasks where tags is not an array', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Has tag', tags: ['bug'] })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'No tags' })

    const res = await request(app).get('/api/tasks?tag=bug')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Has tag')
  })

  it('filters by priority', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'High prio', priority: 'high' })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Low prio', priority: 'low' })

    const res = await request(app).get('/api/tasks?priority=high')
    expect(res.status).toBe(200)
    expect(res.body.every(t => t.priority === 'high')).toBe(true)
    expect(res.body.some(t => t.title === 'High prio')).toBe(true)
    expect(res.body.some(t => t.title === 'Low prio')).toBe(false)
  })

  it('limits results via ?limit=', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/tasks').send({ projectId: pid, title: `Task ${i}` })
    }

    const res = await request(app).get('/api/tasks?limit=2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('combines multiple filters', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const pid = project.body.id
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Match', status: 'todo', priority: 'medium', tags: ['feat'] })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Wrong priority', status: 'todo', priority: 'low', tags: ['feat'] })
    await request(app).post('/api/tasks').send({ projectId: pid, title: 'Wrong status', status: 'done', priority: 'medium', tags: ['feat'] })

    const res = await request(app).get(`/api/tasks?projectId=${pid}&status=todo&priority=medium`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Match')
  })
})

// ── Task tags and priority ───────────────────────────────────────────────────

describe('POST /api/tasks — tags and priority', () => {
  it('stores tags array', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', tags: ['bug', 'urgent'] })
    expect(res.status).toBe(201)
    expect(res.body.tags).toEqual(['bug', 'urgent'])
  })

  it('defaults tags to empty array when absent', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T' })
    expect(res.status).toBe(201)
    expect(res.body.tags).toEqual([])
  })

  it('normalises non-array tags to empty array', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', tags: 'not-an-array' })
    expect(res.status).toBe(201)
    expect(res.body.tags).toEqual([])
  })

  it('stores priority', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', priority: 'critical' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBe('critical')
  })

  it('defaults priority to none when absent', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const res = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T' })
    expect(res.status).toBe(201)
    expect(res.body.priority).toBe('none')
  })
})

describe('PUT /api/tasks/:id — tags and priority', () => {
  it('updates tags', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', tags: ['old'] })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ tags: ['new', 'tags'] })
    expect(res.status).toBe(200)
    expect(res.body.tags).toEqual(['new', 'tags'])
  })

  it('normalises non-array tags to empty array on update', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', tags: ['old'] })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ tags: 'not-array' })
    expect(res.status).toBe(200)
    expect(res.body.tags).toEqual([])
  })

  it('updates priority', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', priority: 'low' })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ priority: 'critical' })
    expect(res.status).toBe(200)
    expect(res.body.priority).toBe('critical')
  })

  it('preserves tags and priority when not in update payload', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'T', tags: ['keep'], priority: 'high' })

    const res = await request(app)
      .put(`/api/tasks/${task.body.id}`)
      .send({ title: 'Updated title' })
    expect(res.status).toBe(200)
    expect(res.body.tags).toEqual(['keep'])
    expect(res.body.priority).toBe('high')
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

// ── Restore ─────────────────────────────────────────────────────────────────

function validProject(overrides = {}) {
  return {
    id: 'p1',
    name: 'Restored Project',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function validTask(overrides = {}) {
  return {
    id: 't1',
    projectId: 'p1',
    title: 'Restored Task',
    status: 'todo',
    order: 1,
    ...overrides,
  }
}

describe('POST /api/restore', () => {
  it('restores valid projects and tasks', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject()], tasks: [validTask()] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, projects: 1, tasks: 1 })

    const projects = await request(app).get('/api/projects')
    expect(projects.body).toHaveLength(1)
    expect(projects.body[0].name).toBe('Restored Project')

    const tasks = await request(app).get('/api/tasks')
    expect(tasks.body).toHaveLength(1)
    expect(tasks.body[0].title).toBe('Restored Task')
  })

  it('replaces existing data rather than merging', async () => {
    await request(app).post('/api/projects').send({ name: 'Old Project' })

    await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject({ id: 'p2', name: 'New Project' })], tasks: [] })

    const projects = await request(app).get('/api/projects')
    expect(projects.body).toHaveLength(1)
    expect(projects.body[0].name).toBe('New Project')
  })

  it('rejects missing version', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ projects: [], tasks: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/version/i)
  })

  it('rejects non-array projects', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: 'nope', tasks: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/projects/i)
  })

  it('rejects non-array tasks', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [], tasks: 'nope' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/tasks/i)
  })

  it('rejects project missing id/name/created_at/updated_at', async () => {
    const fields = ['id', 'name', 'created_at', 'updated_at']
    for (const field of fields) {
      const project = validProject()
      delete project[field]
      const res = await request(app)
        .post('/api/restore')
        .send({ version: '1', projects: [project], tasks: [] })
      expect(res.status).toBe(400)
    }
  })

  it('rejects duplicate project ids', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject(), validProject()], tasks: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/duplicate/i)
  })

  it('rejects task missing id or title', async () => {
    for (const field of ['id', 'title']) {
      const task = validTask()
      delete task[field]
      const res = await request(app)
        .post('/api/restore')
        .send({ version: '1', projects: [validProject()], tasks: [task] })
      expect(res.status).toBe(400)
    }
  })

  it('rejects task with invalid status', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject()], tasks: [validTask({ status: 'banana' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/i)
  })

  it('rejects task with non-numeric order', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject()], tasks: [validTask({ order: 'first' })] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/order/i)
  })

  it('rejects duplicate task ids', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject()], tasks: [validTask(), validTask()] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/duplicate/i)
  })

  it('rejects task with missing projectId', async () => {
    const task = validTask()
    delete task.projectId
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [validProject()], tasks: [task] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/projectId/i)
  })

  it('allows a task whose projectId does not match any project (orphaned)', async () => {
    const res = await request(app)
      .post('/api/restore')
      .send({
        version: '1',
        projects: [validProject()],
        tasks: [validTask({ projectId: 'no-such-project' })],
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, projects: 1, tasks: 1 })

    const tasks = await request(app).get('/api/tasks')
    expect(tasks.body[0].projectId).toBe('no-such-project')
  })

  it('accepts a large payload well under the 10mb body limit', async () => {
    const project = validProject()
    const tasks = Array.from({ length: 2000 }, (_, i) =>
      validTask({ id: `t${i}`, title: `Task ${i}`, order: i + 1 })
    )
    const res = await request(app)
      .post('/api/restore')
      .send({ version: '1', projects: [project], tasks })
    expect(res.status).toBe(200)
    expect(res.body.tasks).toBe(2000)
  })
})

// ── Cleanup ─────────────────────────────────────────────────────────────────

describe('GET /api/cleanup/candidates', () => {
  it('returns empty lists when nothing qualifies', async () => {
    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ oldCompleted: [], orphaned: [] })
  })

  it('rejects missing days', async () => {
    const res = await request(app).get('/api/cleanup/candidates')
    expect(res.status).toBe(400)
  })

  it('rejects negative days', async () => {
    const res = await request(app).get('/api/cleanup/candidates?days=-1')
    expect(res.status).toBe(400)
  })

  it('rejects non-numeric days', async () => {
    const res = await request(app).get('/api/cleanup/candidates?days=abc')
    expect(res.status).toBe(400)
  })

  it('includes a done task older than the cutoff with its project name', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'Old Stuff' })
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    await request(app)
      .post('/api/restore')
      .send({
        version: '1',
        projects: [validProject({ id: project.body.id, name: project.body.name, created_at: project.body.created_at, updated_at: project.body.updated_at })],
        tasks: [validTask({ id: 'old1', projectId: project.body.id, status: 'done', updated_at: oldDate, title: 'Old done task' })],
      })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.oldCompleted).toHaveLength(1)
    expect(res.body.oldCompleted[0].title).toBe('Old done task')
    expect(res.body.oldCompleted[0].projectName).toBe('Old Stuff')
  })

  it('excludes a done task newer than the cutoff', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const task = await request(app)
      .post('/api/tasks')
      .send({ projectId: project.body.id, title: 'Recently done' })
    await request(app).put(`/api/tasks/${task.body.id}`).send({ status: 'done' })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.oldCompleted).toHaveLength(0)
  })

  it('excludes a non-done task regardless of age', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    await request(app)
      .post('/api/restore')
      .send({
        version: '1',
        projects: [validProject({ id: project.body.id, name: project.body.name, created_at: project.body.created_at, updated_at: project.body.updated_at })],
        tasks: [validTask({ id: 'old2', projectId: project.body.id, status: 'todo', updated_at: oldDate })],
      })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.oldCompleted).toHaveLength(0)
  })

  it('flags a task with a projectId that matches no project as orphaned', async () => {
    await request(app)
      .post('/api/restore')
      .send({
        version: '1',
        projects: [],
        tasks: [validTask({ projectId: 'ghost-project' })],
      })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.orphaned).toHaveLength(1)
    expect(res.body.orphaned[0].id).toBe('t1')
  })

  it('excludes a normal task with a valid projectId from orphaned', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    await request(app).post('/api/tasks').send({ projectId: project.body.id, title: 'Fine' })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.orphaned).toHaveLength(0)
  })

  it('classifies a task that is both old-completed and orphaned as orphaned only', async () => {
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    await request(app)
      .post('/api/restore')
      .send({
        version: '1',
        projects: [],
        tasks: [validTask({ projectId: 'ghost-project', status: 'done', updated_at: oldDate })],
      })

    const res = await request(app).get('/api/cleanup/candidates?days=30')
    expect(res.body.orphaned).toHaveLength(1)
    expect(res.body.oldCompleted).toHaveLength(0)
  })
})

describe('POST /api/cleanup', () => {
  it('deletes exactly the requested tasks and leaves others', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    const t1 = await request(app).post('/api/tasks').send({ projectId: project.body.id, title: 'Delete me' })
    const t2 = await request(app).post('/api/tasks').send({ projectId: project.body.id, title: 'Keep me' })

    const res = await request(app).post('/api/cleanup').send({ taskIds: [t1.body.id] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, deleted: 1 })

    const tasks = await request(app).get('/api/tasks')
    expect(tasks.body).toHaveLength(1)
    expect(tasks.body[0].id).toBe(t2.body.id)
  })

  it('rejects an empty taskIds array', async () => {
    const res = await request(app).post('/api/cleanup').send({ taskIds: [] })
    expect(res.status).toBe(400)
  })

  it('rejects a missing taskIds field', async () => {
    const res = await request(app).post('/api/cleanup').send({})
    expect(res.status).toBe(400)
  })

  it('no-ops for unknown ids without error', async () => {
    const project = await request(app).post('/api/projects').send({ name: 'P' })
    await request(app).post('/api/tasks').send({ projectId: project.body.id, title: 'Stays' })

    const res = await request(app).post('/api/cleanup').send({ taskIds: ['nonexistent-id'] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, deleted: 0 })

    const tasks = await request(app).get('/api/tasks')
    expect(tasks.body).toHaveLength(1)
  })
})
