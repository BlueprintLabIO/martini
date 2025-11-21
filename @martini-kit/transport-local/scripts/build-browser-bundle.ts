#!/usr/bin/env tsx
import { build } from 'esbuild';
import { join } from 'path';
import { readFileSync } from 'fs';

const PKG_ROOT = join(import.meta.dirname, '..');

await build({
	entryPoints: [join(PKG_ROOT, 'src/index.ts')],
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2020',
	outfile: join(PKG_ROOT, 'dist/browser.js'),
	external: ['@martini-kit/core'],  // Core loaded separately
	minify: false,
	sourcemap: true
});

const pkgJson = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8'));
console.log(`✅ ${pkgJson.name} browser bundle built: dist/browser.js`);
