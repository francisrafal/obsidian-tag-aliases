import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { obsidian: fileURLToPath(new URL('./tests/obsidian.ts', import.meta.url)) } },
  test: {
    coverage: {
      provider: 'v8', include: ['src/**/*.ts'],
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 }
    }
  }
});
