import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

function getDataPath() { return process.env.DATA_PATH || '/data' }
function getProjectsFile() { return join(getDataPath(), 'projects.json') }
function getTasksFile() { return join(getDataPath(), 'tasks.json') }

// Simple write queue to prevent concurrent file writes
const writeQueue = { projects: Promise.resolve(), tasks: Promise.resolve() }

async function ensureDataDir() {
  await mkdir(getDataPath(), { recursive: true })
}

async function readJSON(filePath, fallback = []) {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return fallback
    if (err instanceof SyntaxError) {
      console.error(`Corrupted JSON in ${filePath}, resetting to default`)
      return fallback
    }
    throw err
  }
}

function writeJSON(filePath, data, queueKey) {
  writeQueue[queueKey] = writeQueue[queueKey].then(async () => {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  })
  return writeQueue[queueKey]
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function getProjects() {
  await ensureDataDir()
  return readJSON(getProjectsFile(), [])
}

export async function saveProjects(projects) {
  await ensureDataDir()
  return writeJSON(getProjectsFile(), projects, 'projects')
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks() {
  await ensureDataDir()
  return readJSON(getTasksFile(), [])
}

export async function saveTasks(tasks) {
  await ensureDataDir()
  return writeJSON(getTasksFile(), tasks, 'tasks')
}
