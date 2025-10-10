import { defineConfig } from 'tsup';
import { copyFileSync } from 'fs';

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
  },
  async onSuccess() {
    // Copy version.json to dist directory
    try {
      copyFileSync('version.json', 'dist/version.json');
      console.log('✅ Copied version.json to dist/');
    } catch (err) {
      console.warn('⚠️  version.json not found, skipping copy');
    }
  }
});
