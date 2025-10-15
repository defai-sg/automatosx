import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: false,  // Disabled to reduce package size (~25% reduction)
  treeshake: true,   // Enable tree shaking for optimization
  clean: true,
  shims: true,
  outDir: 'dist',
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node'
  }
});
