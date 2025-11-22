#!/usr/bin/env node
/**
 * Build single ESM browser bundle for Sandpack consumption
 * Externalizes @martini-kit/core, transports, and Phaser (loaded separately)
 */

import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [join(PKG_ROOT, 'src/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile: join(PKG_ROOT, 'dist/browser.js'),
  external: [
    '@martini-kit/core',
    '@martini-kit/transport-local',
    '@martini-kit/transport-iframe-bridge',
    '@martini-kit/transport-trystero',
    'phaser'
  ],
  minify: false,
  sourcemap: true
});

console.log('✅ @martini-kit/phaser browser bundle built: dist/browser.js');
