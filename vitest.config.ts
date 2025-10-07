import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,      // 30 seconds per test (increased for integration tests)
    hookTimeout: 30000,       // 30 seconds for hooks
    teardownTimeout: 10000,   // 10 seconds for teardown
    env: {
      // Always use mock providers in tests
      AUTOMATOSX_MOCK_PROVIDERS: 'true'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tmp/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts'
      ]
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.automatosx']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  }
});
