import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration.
 *
 * TODO:
 * - Adjust `include` patterns if you add more test directories.
 * - Add `setupFiles` for global test setup (e.g. mocking Prisma).
 * - Set `coverage.thresholds` if you want to enforce coverage minimums.
 */
export default defineConfig({
  test: {
    // Use jsdom for components; switch individual tests to 'node' via comment header
    environment: 'jsdom',

    // Global test utilities (describe, it, expect) available without importing
    globals: true,

    // Files to treat as test files
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'app/**/*.{test,spec}.{ts,tsx}'],

    // TODO: Add global setup/teardown files here
    // setupFiles: ['./tests/setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // TODO: Set thresholds, e.g.:
      // thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },

  resolve: {
    alias: {
      // Mirrors the `@/*` path alias in tsconfig.json
      '@': path.resolve(__dirname, '.'),
    },
  },
});
