/**
 * Watch Martini SDK source files and auto-rebuild bundle on changes
 *
 * This script watches SDK package directories and regenerates sdk-bundle.json
 * whenever source files change. Used in dev mode for live updates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SDK packages to watch
const WATCH_DIRS = [
  '../../../@martini/core/src',
  '../../../@martini/phaser/src',
  '../../../@martini/transport-local/src',
  '../../../@martini/transport-iframe-bridge/src'
];

let rebuildTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 300;

/**
 * Run the bundle script
 */
function rebuild() {
  console.log('\n🔄 SDK source changed, rebuilding bundle...');

  const bundleScript = path.resolve(__dirname, 'bundle-sdk-source.ts');
  const child = spawn('tsx', [bundleScript], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Bundle updated\n');
    } else {
      console.error(`❌ Bundle failed with code ${code}\n`);
    }
  });
}

/**
 * Debounced rebuild
 */
function scheduleRebuild() {
  if (rebuildTimer) {
    clearTimeout(rebuildTimer);
  }
  rebuildTimer = setTimeout(rebuild, DEBOUNCE_MS);
}

/**
 * Watch a directory for changes
 */
function watchDirectory(dir: string) {
  const absPath = path.resolve(__dirname, dir);

  if (!fs.existsSync(absPath)) {
    console.warn(`⚠️  Directory not found: ${absPath}`);
    return;
  }

  fs.watch(absPath, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.ts')) {
      // Skip test files
      if (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__')) {
        return;
      }

      console.log(`📝 Changed: ${filename}`);
      scheduleRebuild();
    }
  });

  console.log(`👀 Watching: ${path.relative(process.cwd(), absPath)}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting SDK source watcher...\n');

  // Initial build
  rebuild();

  // Watch all directories
  for (const dir of WATCH_DIRS) {
    watchDirectory(dir);
  }

  console.log('\n✅ Watcher started. Press Ctrl+C to stop.\n');
}

main();
