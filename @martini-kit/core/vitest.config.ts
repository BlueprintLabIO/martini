import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/vitest.config.ts',
        'src/index.ts', // Empty stub for now
        'src/types.ts',  // Type-only file
        'src/core/**', // Not implemented yet
        'src/sync/**',
        'src/transport/**',
        'src/testing/**'
      ],
      // Target 100% coverage for critical algorithms
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    }
  }
});
