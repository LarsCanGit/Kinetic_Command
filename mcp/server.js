import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const KANBAN_URL = process.env.KANBAN_URL || 'http://localhost:7429'

async function api(path, options = {}) {
  const res = await fetch(`${KANBAN_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error: ${res.status}`)
  }
  return res.json()
}

const server = new Server(
  { name: 'kanban', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_projects',
      description: 'List all projects on the kanban board',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'create_project',
      description: 'Create a new project on the kanban board',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_tasks',
      description: 'Get tasks from the kanban board, optionally filtered by project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'Filter tasks by project ID (omit to get all tasks)',
          },
        },
      },
    },
    {
      name: 'create_task',
      description: 'Create a new task on the kanban board',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID to add the task to' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done'],
            description: 'Initial status (default: todo). Use backlog for ideas/future work not yet approved; todo for approved tasks ready to be worked on.',
          },
          dueDate: { type: 'string', description: 'Due date in ISO 8601 format' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tags to categorize the task',
          },
          priority: {
            type: 'string',
            enum: ['none', 'low', 'medium', 'high', 'critical'],
            description: 'Task priority (default: none)',
          },
        },
        required: ['projectId', 'title'],
      },
    },
    {
      name: 'update_task',
      description: 'Update an existing task (title, description, status, dueDate, tags, priority)',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done'],
            description: 'New status. Use backlog for ideas/future work not yet approved; todo for approved tasks ready to be worked on.',
          },
          dueDate: { type: 'string', description: 'New due date in ISO 8601 format' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of tags to categorize the task',
          },
          priority: {
            type: 'string',
            enum: ['none', 'low', 'medium', 'high', 'critical'],
            description: 'Task priority',
          },
        },
        required: ['id'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    let result

    switch (name) {
      case 'list_projects':
        result = await api('/projects')
        break

      case 'create_project':
        result = await api('/projects', {
          method: 'POST',
          body: JSON.stringify({ name: args.name }),
        })
        break

      case 'get_tasks': {
        const qs = args.projectId
          ? `?projectId=${encodeURIComponent(args.projectId)}`
          : ''
        result = await api(`/tasks${qs}`)
        break
      }

      case 'create_task':
        result = await api('/tasks', {
          method: 'POST',
          body: JSON.stringify(args),
        })
        break

      case 'update_task': {
        const { id, ...updates } = args
        result = await api(`/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        })
        break
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
