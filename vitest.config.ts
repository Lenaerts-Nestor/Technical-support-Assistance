import { defineConfig } from 'vitest/config'

// Pure-logic tests only (zip, assets, merge, organize on an in-memory folder),
// so Node is enough — it ships Blob / File / (De)CompressionStream.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
