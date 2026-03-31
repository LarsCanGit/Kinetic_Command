# CLAUDE.md — KINETIC COMMAND

## Rules

- **Never push to GitHub without explicit instruction from the user.**
- All new work goes on the `develop` branch. Merge to `main` only when the user says to ship.
- Do not add features, refactor, or clean up code beyond what was asked.
- Follow the design system strictly — no standard 1px borders, no rounded corners, surface color shifts for separation only. See `tailwind.config.js` for exact color tokens.

## Dev workflow

Production runs in Docker on **port 7429**. Dev uses isolated ports to avoid conflicts:

```bash
# Terminal 1 — API on port 7430, data in ./dev-data
npm run server:dev

# Terminal 2 — Vite on port 5173, proxies /api → 7430
npm run dev
```

Production build:
```bash
npm run build && npm start        # port 7429, data in /data
docker compose up -d              # same, containerized
```

## Architecture

- **Frontend:** React 18 + Vite, Tailwind CSS v3, @dnd-kit drag-and-drop
- **Backend:** Express serving static `dist/` + REST API at `/api`
- **Storage:** Flat JSON files — `projects.json` + `tasks.json` in `DATA_PATH`
- **MCP server:** `mcp/server.js` — exposes kanban API as Claude tools via stdio

Key files:
- `server/fileStorage.js` — all disk reads/writes, write queue prevents corruption
- `server/api/` — route handlers for projects and tasks
- `src/db.js` — frontend API client (all fetch calls go through here)
- `src/App.jsx` — top-level state, event handlers, modal orchestration
- `src/components/TaskCard.jsx` — sortable card; drag handle + click-to-open + inline delete

## Data model

Three fixed lanes: `todo` / `in_progress` / `done` — not configurable.

Card fields: `title`, `description`, `dueDate`, `status`, `order` — no assignees, priority, or ticket IDs.

## What NOT to commit

`.env`, `.env.local`, `.claude/`, `dev-data/`, `test-data/`, `dist/`, `node_modules/`, any `*.md` except this file and `README.md`, `code.html`, research HTML files.
