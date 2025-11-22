import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

async function buildSDK() {
  const packages = [
    '@martini-kit/core',
    '@martini-kit/phaser',
    '@martini-kit/devtools',
    '@martini-kit/transport-local',
    '@martini-kit/transport-iframe-bridge'
  ];

  // Create virtual entry that re-exports all packages
  // Each package is imported and then ALL its exports are re-exported
  const sdkEntry = packages.map((pkg) => {
    return `export * from '${pkg}';`;
  }).join('\n');

  console.log('[SDK Build] Starting...');
  console.log(`[SDK Build] Mode: ${isProd ? 'production' : 'development'}`);
  console.log(`[SDK Build] Packages: ${packages.join(', ')}`);

  const outDir = resolve(__dirname, '../static/sdk');

  // Ensure output directory exists
  await mkdir(outDir, { recursive: true });

  const ctx = await esbuild.context({
    stdin: {
      contents: sdkEntry,
      resolveDir: process.cwd(),
      loader: 'ts'
    },
    bundle: true,
    format: 'esm',
    outfile: resolve(outDir, 'martini-kit.js'),
    external: ['phaser'],
    sourcemap: !isProd,
    minify: isProd,

    plugins: [{
      name: 'resolve-workspace-or-npm',
      setup(build) {
        build.onResolve({ filter: /@martini-kit\// }, (args) => {
          const pkgName = args.path.replace('@martini-kit/', '');

          if (!isProd) {
            // Dev: resolve from workspace source
            // __dirname is @martini-kit/demos/scripts, so ../ is @martini-kit/demos, ../../ is martini root
            const sourcePath = resolve(
              __dirname,
              `../../../@martini-kit/${pkgName}/src/index.ts`
            );
            console.log(`[SDK Build] Resolving ${args.path} → ${sourcePath}`);
            return { path: sourcePath };
          } else {
            // Production: resolve from workspace dist (built packages)
            const distPath = resolve(
              __dirname,
              `../../../@martini-kit/${pkgName}/dist/index.js`
            );
            console.log(`[SDK Build] Resolving ${args.path} → ${distPath}`);
            return { path: distPath };
          }
        });
      }
    }]
  });

  if (isDev) {
    console.log('[SDK Build] Watching for changes...');
    await ctx.watch();
    // Keep process alive
    await new Promise(() => {});
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[SDK Build] ✓ Built successfully');
  }

  // Generate import map shims
  await generateShims(packages);
}

async function generateShims(packages: string[]) {
  const shimsDir = resolve(__dirname, '../static/sdk/shims');

  // Ensure the directory exists
  await mkdir(shimsDir, { recursive: true });

  console.log('[SDK Build] Generating import map shims (ESM dynamic exports)...');

  for (const pkg of packages) {
    const name = pkg.replace('@martini-kit/', '');
    const exportName = name.replace(/-/g, '_');

    // Create ESM shim that re-exports everything from the main SDK bundle
    // Since SDK now uses `export * from '@martini-kit/X'`, all exports are available at the top level
    // The shim just re-exports everything - the import map will resolve the package name to this shim
    const shimContent = `// Auto-generated ESM shim for ${pkg}
// Re-export all exports from the main SDK bundle
// This makes all package exports available when importing from '${pkg}'
export * from '/sdk/martini-kit.js';
`;

    await writeFile(
      resolve(shimsDir, `${name}.js`),
      shimContent
    );
  }

  // Phaser library shim (points to CDN global) - for 'phaser' bare import
  await writeFile(
    resolve(shimsDir, 'phaser-global.js'),
    `// Auto-generated shim for Phaser library (loaded from CDN as global)
// This is for importing the Phaser library itself: import Phaser from 'phaser'
export default globalThis.Phaser;
`
  );

  console.log(`[SDK Build] ✓ Generated ${packages.length + 1} ESM shims`);
}

buildSDK().catch(err => {
  console.error('[SDK Build] Failed:', err);
  process.exit(1);
});
