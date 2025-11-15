#!/usr/bin/env tsx
/**
 * Build single ESM browser bundle for Sandpack consumption
 *
 * Externalizes @martini/core and phaser (loaded separately)
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
	external: [
		'@martini/core',      // Loaded separately in Sandpack
		'@martini/transport-local',
		'@martini/transport-iframe-bridge',
		'@martini/transport-trystero',
		'phaser'              // Loaded globally via CDN
	],
	minify: false,
	sourcemap: true
});

console.log('✅ @martini/phaser browser bundle built: dist/browser.js');
