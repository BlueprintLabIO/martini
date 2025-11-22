#!/usr/bin/env node
/**
 * Sync built packages to static/dev-packages/ for local Sandpack development
 *
 * This script copies dist files from @martini-kit packages to the static directory
 * so they can be served by Vite and used by Sandpack during development.
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, '../../..');
const STATIC_DIR = join(__dirname, '../static/dev-packages');

// Packages to sync and their dist files
const PACKAGES = [
  {
    name: '@martini-kit/core',
    files: ['dist', 'package.json']
  },
  {
    name: '@martini-kit/phaser',
    files: ['dist', 'package.json']
  },
  {
    name: '@martini-kit/transport-iframe-bridge',
    files: ['dist', 'package.json']
  },
  {
    name: '@martini-kit/transport-local',
    files: ['dist', 'package.json']
  },
  {
    name: '@martini-kit/transport-trystero',
    files: ['dist', 'package.json']
  },
  {
    name: '@martini-kit/devtools',
    files: ['dist', 'package.json']
  }
];

function copyRecursive(src, dest) {
  if (!existsSync(src)) {
    return;
  }

  const stat = statSync(src);

  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src);

    for (const entry of entries) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else if (stat.isFile()) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

function syncPackages() {
  console.log('🔄 Syncing dev packages to static directory...\n');

  let syncedCount = 0;
  let skippedCount = 0;

  for (const pkg of PACKAGES) {
    const pkgPath = join(ROOT, pkg.name.replace('@martini-kit/', '@martini-kit/'));
    const targetPath = join(STATIC_DIR, pkg.name);

    console.log(`📦 ${pkg.name}`);

    // Copy each specified file/directory
    for (const file of pkg.files) {
      const srcPath = join(pkgPath, file);
      const destPath = join(targetPath, file);

      if (!existsSync(srcPath)) {
        console.log(`   ⚠️  ${file} not found (skipping)`);
        skippedCount++;
        continue;
      }

      copyRecursive(srcPath, destPath);
      console.log(`   ✅ ${file}`);
      syncedCount++;
    }

    console.log('');
  }

  console.log(`✨ Done! Synced ${syncedCount} files (${skippedCount} skipped)\n`);
  console.log(`📁 Packages available at: /dev-packages/@martini-kit/...\n`);
}

// Run sync
syncPackages();
