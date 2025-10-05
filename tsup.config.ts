import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  outDir: 'dist',
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node'
  }
});
