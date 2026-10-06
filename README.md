# KINETIC COMMAND

A self-hosted kanban board with a REST API backend, styled with the **Organic Brutalism** design system. Data lives on your server in flat JSON files — no database required.

<img width="2522" height="1205" alt="screen2" src="https://github.com/user-attachments/assets/4b612036-ff6b-4097-8c4b-2627b3378733" />

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite 6 |
| Styling | Tailwind CSS v3 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Backend | Express (Node 20) |
| Storage | JSON files on disk |
| MCP | @modelcontextprotocol/sdk |

---

## Running Locally (dev)

```bash
npm install

# Terminal 1 — API on port 7430, data in ./dev-data
npm run server:dev

# Terminal 2 — Vite on port 5173, proxies /api → 7430
npm run dev          # http://localhost:5173
```

---

## Running with Docker

The recommended way to run in production.

```bash
docker compose up -d
```

This builds the image, starts the container, and persists data in a named Docker volume (`kanban-data`, which Compose names `kanban_kanban-data`).

The app is served at **http://localhost:7429**.

### Changing the port

Edit [docker-compose.yml](docker-compose.yml):

```yaml
ports:
  - "YOUR_PORT:7429"   # change the left side only
```

Or set it as an environment variable and update both sides:

```yaml
ports:
  - "8080:8080"
environment:
  - PORT=8080
```

### Data persistence

Data is stored in the `kanban-data` Docker volume at `/data` inside the container.
Two files are written: `projects.json` and `tasks.json`.

To point to a host directory instead:

```yaml
volumes:
  - ./my-data:/data
```

> **Do not change the compose project name.** [docker-compose.yml](docker-compose.yml) pins `name: kanban`, which makes the live volume `kanban_kanban-data`. Renaming the project (or the directory, if the pin is removed) points Compose at a different, empty volume and makes your data appear to vanish. The old volume is not deleted, so it can be recovered by restoring the previous name.

### Build tagging and rollback

Images are tagged with the current git short SHA, never `:latest`.

```bash
npm run docker:build              # builds kinetic-command:<short-sha>; refuses to run on a dirty working tree
TAG=<short-sha> docker compose up -d   # deploy that build
```

To roll back, run the same `up -d` with an older tag; the image is already in the local cache, so nothing is rebuilt. In PowerShell, set the variable first: `$env:TAG = "<short-sha>"; docker compose up -d`.

### Pre-deploy staging

Smoke-test the real production image before shipping. Staging runs on port **7431** with an in-memory (`tmpfs`) data directory, so nothing persists and there is nothing to clean up. It does not require a clean git tree.

```bash
npm run staging:up     # build and run kinetic-command:staging on http://localhost:7431
npm run staging:logs   # tail container logs
npm run staging:down   # stop and remove the container
```

Keep using `npm run dev` / `npm run server:dev` for day-to-day work; staging is the final check, not a replacement.

### Useful Docker commands

```bash
docker compose up -d          # start in background
docker compose down           # stop and remove container
docker compose logs -f        # follow logs
docker compose build --no-cache   # rebuild image from scratch
```

---

## Running without Docker (production build)

```bash
npm install
npm run build        # compiles frontend to dist/
npm start            # serves frontend + API on port 7429
```

Set environment variables to configure:

```bash
PORT=8080 DATA_PATH=./data npm start
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `7429` | Port the Express server listens on |
| `DATA_PATH` | `/data` | Directory where `projects.json` and `tasks.json` are written |
| `NODE_ENV` | — | Set to `production` to disable dev-only tooling |

---

## REST API

The Express server exposes a JSON API under `/api`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project `{ name }` |
| PUT | `/api/projects/:id` | Rename a project `{ name }` |
| DELETE | `/api/projects/:id` | Delete a project and all its tasks |
| GET | `/api/tasks` | List tasks — filters: `projectId`, `status`, `tag`, `priority`, `id`, `title` (case-insensitive substring), `limit` |
| POST | `/api/tasks` | Create a task `{ projectId, title, description?, status?, dueDate?, tags?, priority? }` (404 if the project does not exist) |
| PUT | `/api/tasks/:id` | Update a task |
| PATCH | `/api/tasks/:id/move` | Move a task to another project `{ projectId }`; it lands at the end of its current lane (400 if `projectId` missing, 404 if task or project unknown) |
| PATCH | `/api/tasks/bulk` | Bulk-update status + order (used by drag-and-drop) |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/restore` | Replace the whole database `{ projects, tasks }` (validated first; returns counts) |
| GET | `/api/cleanup/candidates?days=N` | Preview old completed tasks and orphaned tasks (no changes made) |
| POST | `/api/cleanup` | Delete tasks by id `{ taskIds }` |

---

## MCP Server

KINETIC COMMAND ships an [MCP](https://modelcontextprotocol.io) server that lets Claude (or any MCP-compatible AI) read and write the board directly.

### Setup

The MCP server is at [mcp/server.js](mcp/server.js). It connects to the running kanban API over HTTP.

#### Claude Code / Claude Desktop

Add this to your `.mcp.json` (already included in this repo):

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["./mcp/server.js"],
      "env": {
        "KANBAN_URL": "http://localhost:7429"
      }
    }
  }
}
```

If the kanban server runs on a different port, update `KANBAN_URL` accordingly.

#### Claude Desktop (global config)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/absolute/path/to/kanban/mcp/server.js"],
      "env": {
        "KANBAN_URL": "http://localhost:7429"
      }
    }
  }
}
```

### Available MCP tools

| Tool | Description |
|---|---|
| `list_projects` | List all projects |
| `create_project` | Create a project by name |
| `rename_project` | Rename an existing project (`id`, `name`) |
| `get_tasks` | Get tasks with optional filters (see below) |
| `create_task` | Create a task with title, description, status, dueDate, tags, priority |
| `move_task` | Move a task to a different project (`id`, `projectId`); it lands at the end of its current lane in the destination |
| `update_task` | Update any field on an existing task |

#### `get_tasks` filters

| Param | Type | Description |
|---|---|---|
| `projectId` | string | Filter by project |
| `status` | string | `backlog` \| `todo` \| `in_progress` \| `done` |
| `tag` | string | Filter by a single tag |
| `priority` | string | `none` \| `low` \| `medium` \| `high` \| `critical` |
| `id` | string | Filter by exact task ID |
| `title` | string | Filter by title substring (case-insensitive) |
| `limit` | number | Max results (applied after all filters) |
| `include_done` | boolean | Include done tasks — **default: false** |

Done tasks are excluded by default so Claude only sees actionable work.

---

## Testing

Tests live in [test/](test/) and run on [Vitest](https://vitest.dev).

```bash
npm test             # run the full suite once
npm run test:watch   # re-run on change
```

| Suite | Location | What it covers |
|---|---|---|
| API | [test/api.test.js](test/api.test.js) | REST endpoints via supertest: projects, tasks (filters, tags, priority, bulk reorder, move between projects), restore, cleanup, unknown routes |
| Frontend | [test/frontend/](test/frontend/) | Component tests for `App`, `Board`, `CardModal`, `CleanupModal`, `RestoreConfirmModal` |

Notes:

- **Isolated data:** each API test creates a temp directory and points `DATA_PATH` at it, then deletes it afterwards. Tests never touch `dev-data/` or production data.
- **Environments:** the default Vitest environment is `node`. Frontend test files opt in to jsdom with a `// @vitest-environment jsdom` docblock at the top of the file (see [vitest.config.js](vitest.config.js)).
- **Not covered:** the MCP server ([mcp/server.js](mcp/server.js)) has no automated tests yet.

---

## Project Structure

```
src/                    — React frontend
  db.js                 — API client (replaces IndexedDB)
  App.jsx               — top-level state and event handlers
  components/
    Board.jsx           — board header, export/import controls
    Lane.jsx            — droppable lane
    TaskCard.jsx        — sortable card
    CardModal.jsx       — add/edit task form
    ProjectModal.jsx    — project CRUD modal

server/                 — Express backend
  server.js             — HTTP server, static file serving
  app.js                — Express app, route registration
  fileStorage.js        — JSON file read/write (projects + tasks)
  api/                  — route handlers

mcp/
  server.js             — MCP server (stdio transport)

test/                   — Vitest suites (see Testing)
  api.test.js           — backend API tests (supertest)
  frontend/             — React component tests (Testing Library, jsdom)
    setup.js            — shared setup, loaded for all tests

scripts/
  build.sh              — tagged production image build (see Build tagging)

Dockerfile              — multi-stage build (Node 20 Alpine)
docker-compose.yml      — single-service compose config (pins project name `kanban`)
docker-compose.staging.yml — pre-deploy staging on port 7431, tmpfs data
```

---

## Features

- **Multiple projects** — create, rename, and delete projects
- **Four fixed lanes** — Backlog, Todo, In Progress, Done
- **Task cards** — title, description, due date, tags, and priority per card
- **Drag & drop** — reorder cards within and across lanes
- **Persistent storage** — data written to JSON files on the server
- **MCP integration** — AI agents can read and write the board via MCP tools; done tasks excluded by default

## Data model

Four lanes (fixed): `backlog` → `todo` → `in_progress` → `done`

**Workflow intent:** `backlog` = ideas not yet approved for development. `todo` = approved, specced, ready for Claude Code to pick up.

Task fields: `id`, `projectId`, `title`, `description`, `dueDate`, `status`, `order`, `tags[]`, `priority`, `created_at`, `updated_at`

Priority values: `none` | `low` | `medium` | `high` | `critical`
