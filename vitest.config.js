import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // environmentMatchGlob does not route jsdom correctly in vitest 4.1.2, so all tests run under jsdom instead
    environment: 'jsdom',
    setupFiles: ['./test/frontend/setup.js'],
  },
})
