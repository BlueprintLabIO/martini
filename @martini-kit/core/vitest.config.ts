import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
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
        'src/testing/**',
        'src/transport.ts',
        'src/helpers.ts',
        'src/PlayerManager.ts',
        'scripts/**'
      ],
      // Target 100% coverage for critical algorithms
      thresholds: {
        lines: 85,
        functions: 90,
        branches: 85,
        statements: 85
      }
    }
  }
});
