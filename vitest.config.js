import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlob: [['test/frontend/**', 'jsdom']],
    setupFiles: ['./test/frontend/setup.js'],
  },
})
