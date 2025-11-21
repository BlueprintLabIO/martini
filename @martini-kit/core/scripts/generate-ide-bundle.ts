#!/usr/bin/env tsx
/**
 * Generate SDK bundle for IDE consumption
 *
 * This script bundles all @martini-kit/core source files into a single JSON file
 * that can be injected into Sandpack's virtual file system.
 *
 * Output: dist/sdk-bundle.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

interface BundleMetadata {
	version: string;
	gitSha: string;
	gitBranch: string;
	buildTime: string;
}

interface SdkBundle {
	__metadata: BundleMetadata;
	[path: string]: string | BundleMetadata;
}

const PKG_ROOT = join(import.meta.dirname, '..');
const SRC_DIR = join(PKG_ROOT, 'src');
const DIST_DIR = join(PKG_ROOT, 'dist');
const OUTPUT_FILE = join(DIST_DIR, 'sdk-bundle.json');

/**
 * Get all .ts files recursively from a directory
 */
function getTsFiles(dir: string): string[] {
	const files: string[] = [];

	function walk(currentDir: string) {
		const entries = readdirSync(currentDir);

		for (const entry of entries) {
			const fullPath = join(currentDir, entry);
			const stat = statSync(fullPath);

			if (stat.isDirectory()) {
				// Skip test directories
				if (entry === '__tests__' || entry === 'node_modules') {
					continue;
				}
				walk(fullPath);
			} else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
				files.push(fullPath);
			}
		}
	}

	walk(dir);
	return files;
}

/**
 * Get git metadata
 */
function getGitMetadata(): { sha: string; branch: string } {
	try {
		const sha = execSync('git rev-parse HEAD', { cwd: PKG_ROOT, encoding: 'utf-8' }).trim();
		const branch = execSync('git rev-parse --abbrev-ref HEAD', {
			cwd: PKG_ROOT,
			encoding: 'utf-8'
		}).trim();
		return { sha, branch };
	} catch (error) {
		console.warn('[generate-ide-bundle] Git metadata not available:', error);
		return { sha: 'unknown', branch: 'unknown' };
	}
}

/**
 * Get package version
 */
function getPackageVersion(): string {
	try {
		const pkgJson = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8'));
		return pkgJson.version || 'unknown';
	} catch (error) {
		console.warn('[generate-ide-bundle] Could not read package.json version');
		return 'unknown';
	}
}

/**
 * Main bundle generation
 */
function generateBundle(): void {
	console.log('[generate-ide-bundle] Starting bundle generation...');

	const bundle: SdkBundle = {
		__metadata: {
			version: getPackageVersion(),
			gitSha: '',
			gitBranch: '',
			buildTime: new Date().toISOString()
		}
	};

	// Get git metadata
	const git = getGitMetadata();
	bundle.__metadata.gitSha = git.sha;
	bundle.__metadata.gitBranch = git.branch;

	// Get all source files
	const sourceFiles = getTsFiles(SRC_DIR);
	console.log(`[generate-ide-bundle] Found ${sourceFiles.length} source files`);

	// Read each file and add to bundle
	for (const filePath of sourceFiles) {
		const relativePath = relative(SRC_DIR, filePath);
		// Map to Sandpack virtual path: /node_modules/@martini-kit/core/{file}
		const virtualPath = `/node_modules/@martini-kit/core/${relativePath}`;
		const content = readFileSync(filePath, 'utf-8');

		bundle[virtualPath] = content;
		console.log(`  ✓ ${virtualPath}`);
	}

	// Add package.json to bundle (needed for Sandpack module resolution)
	const packageJsonPath = '/node_modules/@martini-kit/core/package.json';
	const packageJsonContent = JSON.stringify(
		{
			name: '@martini-kit/core',
			version: bundle.__metadata.version,
			main: './index.ts',
			type: 'module',
			exports: {
				'.': './index.ts'
			}
		},
		null,
		2
	);

	bundle[packageJsonPath] = packageJsonContent;
	console.log(`  ✓ ${packageJsonPath} (generated)`);

	// Write bundle to dist/
	writeFileSync(OUTPUT_FILE, JSON.stringify(bundle, null, 2), 'utf-8');

	console.log(`\n[generate-ide-bundle] ✅ Bundle generated successfully!`);
	console.log(`  Output: ${OUTPUT_FILE}`);
	console.log(`  Version: ${bundle.__metadata.version}`);
	console.log(`  Git SHA: ${bundle.__metadata.gitSha.substring(0, 8)}`);
	console.log(`  Files: ${Object.keys(bundle).length - 1} (+ metadata)`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	generateBundle();
}
