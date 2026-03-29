// API client — replaces IndexedDB with REST calls to the backend

const API = '/api'

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function getProjects() {
  return request(`${API}/projects`)
}

export async function addProject(name) {
  return request(`${API}/projects`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteProject(id) {
  return request(`${API}/projects/${id}`, { method: 'DELETE' })
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasksByProject(projectId) {
  return request(`${API}/tasks?projectId=${encodeURIComponent(projectId)}`)
}

export async function addTask(task) {
  return request(`${API}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

export async function updateTask(id, updates) {
  return request(`${API}/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteTask(id) {
  return request(`${API}/tasks/${id}`, { method: 'DELETE' })
}

// Bulk update: single request to update status + order for multiple tasks
export async function bulkUpdateTasks(tasks) {
  return request(`${API}/tasks/bulk`, {
    method: 'PATCH',
    body: JSON.stringify({ tasks: tasks.map(t => ({ id: t.id, status: t.status, order: t.order })) }),
  })
}

// ── Export / Import ─────────────────────────────────────────────────────────

export async function exportData() {
  const [projects, tasks] = await Promise.all([
    request(`${API}/projects`),
    request(`${API}/tasks`),
  ])
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projects,
    tasks,
  }
}
