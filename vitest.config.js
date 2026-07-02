import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // environmentMatchGlob was removed in Vitest 4. Frontend test files use a per-file
    // "// @vitest-environment jsdom" docblock instead, so test/frontend/**.test.jsx runs
    // under jsdom while test/api.test.js stays on this config's default, node.
    environment: 'node',
    setupFiles: ['./test/frontend/setup.js'],
  },
})
