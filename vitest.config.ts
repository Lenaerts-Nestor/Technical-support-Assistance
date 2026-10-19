import { defineConfig } from 'vitest/config'

// Pure-logic tests only (zip, assets, merge, organize on an in-memory folder), plus the
// desktop shell's device client against a mock server, so Node is enough — it ships
// Blob / File / (De)CompressionStream.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'desktop/**/*.test.mjs'],
  },
})
