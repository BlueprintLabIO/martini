/**
 * Bundle Martini SDK source files into a JSON file for Sandpack
 *
 * This script collects all TypeScript source files from @martini packages
 * and bundles them into a single JSON file that SandpackManager can use
 * to inject as virtual node_modules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PackageConfig {
  name: string;
  srcDir: string;
  packageJsonPath: string;
}

// SDK packages to bundle
// Note: runtime.ts imports all transports, so we bundle them all
// but only use 'local' transport in single-player mode
const PACKAGES: PackageConfig[] = [
  {
    name: '@martini/core',
    srcDir: '../../../@martini/core/src',
    packageJsonPath: '../../../@martini/core/package.json'
  },
  {
    name: '@martini/phaser',
    srcDir: '../../../@martini/phaser/src',
    packageJsonPath: '../../../@martini/phaser/package.json'
  },
  {
    name: '@martini/transport-local',
    srcDir: '../../../@martini/transport-local/src',
    packageJsonPath: '../../../@martini/transport-local/package.json'
  },
  {
    name: '@martini/transport-iframe-bridge',
    srcDir: '../../../@martini/transport-iframe-bridge/src',
    packageJsonPath: '../../../@martini/transport-iframe-bridge/package.json'
  }
];

interface VirtualFileSystem {
  [filePath: string]: string;
}

/**
 * Recursively read all .ts files from a directory
 */
function readSourceFiles(dir: string, baseDir: string = dir): Map<string, string> {
  const files = new Map<string, string>();

  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip test directories
      if (entry.name === '__tests__' || entry.name === 'tests') {
        continue;
      }

      // Recurse into subdirectories
      const subFiles = readSourceFiles(fullPath, baseDir);
      for (const [relPath, content] of subFiles) {
        files.set(relPath, content);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      // Skip test files
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
        continue;
      }

      const relativePath = path.relative(baseDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.set(relativePath, content);
    }
  }

  return files;
}

/**
 * Bundle all SDK packages into a virtual file system
 */
function bundleSDK(): VirtualFileSystem {
  const virtualFS: VirtualFileSystem = {};

  for (const pkg of PACKAGES) {
    const srcPath = path.resolve(__dirname, pkg.srcDir);
    const packageJsonPath = path.resolve(__dirname, pkg.packageJsonPath);

    console.log(`📦 Bundling ${pkg.name}...`);

    // Read package.json
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Create minimal package.json for Sandpack
      // Point to TypeScript source files, not compiled dist files
      const minimalPackageJson = {
        name: pkg.name,
        version: packageJson.version || '0.0.0',
        main: './index.ts',
        type: 'module',
        exports: {
          '.': './index.ts'
        }
      };

      const pkgJsonPath = `/node_modules/${pkg.name}/package.json`;
      virtualFS[pkgJsonPath] = JSON.stringify(minimalPackageJson, null, 2);
      console.log(`  ✓ ${pkgJsonPath}`);
    }

    // Read all source files
    const sourceFiles = readSourceFiles(srcPath);
    let fileCount = 0;

    for (const [relativePath, content] of sourceFiles) {
      // Convert Windows paths to Unix paths
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const virtualPath = `/node_modules/${pkg.name}/${normalizedPath}`;

      // Fix imports: replace .js extensions with .ts for Sandpack
      // TypeScript uses .js extensions in imports, but we're providing .ts source files
      const fixedContent = content.replace(/from\s+['"](.+?)\.js['"]/g, 'from \'$1.ts\'');

      virtualFS[virtualPath] = fixedContent;
      fileCount++;
    }

    console.log(`  ✓ Bundled ${fileCount} source files`);
  }

  return virtualFS;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Bundling Martini SDK source files for Sandpack...\n');

  const virtualFS = bundleSDK();
  const outputPath = path.resolve(__dirname, '../src/lib/core/sdk-bundle.json');

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write bundle to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(virtualFS, null, 2), 'utf-8');

  const fileCount = Object.keys(virtualFS).length;
  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(2);

  console.log(`\n✅ SDK bundle created successfully!`);
  console.log(`   Files: ${fileCount}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Output: ${path.relative(process.cwd(), outputPath)}`);
}

main();
