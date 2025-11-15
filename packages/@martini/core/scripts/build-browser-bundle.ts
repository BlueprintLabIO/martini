#!/usr/bin/env tsx
/**
 * Build single ESM browser bundle for Sandpack consumption
 *
 * This creates a standalone browser-ready module that Sandpack can inject
 * as /node_modules/@martini/core/index.js
 */

import { build } from 'esbuild';
import { join } from 'path';

const PKG_ROOT = join(import.meta.dirname, '..');

await build({
	entryPoints: [join(PKG_ROOT, 'src/index.ts')],
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2020',
	outfile: join(PKG_ROOT, 'dist/browser.js'),
	minify: false,
	sourcemap: true,
	// Core has no external deps - bundle everything
});

console.log('✅ @martini/core browser bundle built: dist/browser.js');
