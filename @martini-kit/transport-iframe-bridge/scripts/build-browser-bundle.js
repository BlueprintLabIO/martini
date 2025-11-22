#!/usr/bin/env node
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [join(PKG_ROOT, 'src/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  outfile: join(PKG_ROOT, 'dist/browser.js'),
  external: ['@martini-kit/core'],
  minify: false,
  sourcemap: true
});

const pkgJson = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8'));
console.log(`✅ ${pkgJson.name} browser bundle built: dist/browser.js`);
