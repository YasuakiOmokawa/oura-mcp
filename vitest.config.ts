import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**', 'src/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        'src/auth/**': { lines: 95, functions: 95 },
        'src/utils/redact.ts': { lines: 95, functions: 95 },
        'src/openapi/**': { lines: 95, functions: 95 },
      },
    },
  },
});
