import * as esbuild from 'esbuild';

async function bundleProjectFiles(sourceFiles) {
  if (sourceFiles.length === 0) {
    return { success: false, error: "No source files found in /src/" };
  }
  const entryFile = sourceFiles.find((f) => f.path === "/src/main.ts" || f.path === "/src/main.js");
  if (!entryFile) {
    return { success: false, error: "Entry point /src/main.ts or /src/main.js not found" };
  }
  try {
    const fileMap = /* @__PURE__ */ new Map();
    sourceFiles.forEach((file) => {
      const path = file.path.startsWith("/") ? file.path.slice(1) : file.path;
      fileMap.set(path, file.content);
    });
    const virtualPlugin = {
      name: "virtual-files",
      setup(build) {
        build.onResolve({ filter: /^@martini\/(phaser|core)$/ }, (args) => {
          return { path: args.path, namespace: "martini-global" };
        });
        build.onLoad({ filter: /.*/, namespace: "martini-global" }, (args) => {
          return {
            contents: `
							export const defineGame = window.MartiniMultiplayer.defineGame;
							export const GameRuntime = window.MartiniMultiplayer.GameRuntime;
							export const PhaserAdapter = window.MartiniMultiplayer.PhaserAdapter;
							export const TrysteroTransport = window.MartiniMultiplayer.TrysteroTransport;
						`,
            loader: "js"
          };
        });
        build.onResolve({ filter: /^phaser$/ }, (args) => {
          return { path: args.path, namespace: "phaser-global" };
        });
        build.onLoad({ filter: /.*/, namespace: "phaser-global" }, () => {
          return {
            contents: "export default window.Phaser;",
            loader: "js"
          };
        });
        build.onResolve({ filter: /.*/ }, (args) => {
          if (args.path.startsWith("./") || args.path.startsWith("../")) {
            const importerDir = args.importer.split("/").slice(0, -1);
            const pathParts = args.path.split("/");
            const resolvedParts = [...importerDir];
            for (const part of pathParts) {
              if (part === "..") {
                resolvedParts.pop();
              } else if (part === ".") {
                continue;
              } else {
                resolvedParts.push(part);
              }
            }
            let resolved = resolvedParts.join("/");
            if (!resolved.endsWith(".ts") && !resolved.endsWith(".js")) {
              if (fileMap.has(resolved + ".ts")) {
                resolved += ".ts";
              } else if (fileMap.has(resolved + ".js")) {
                resolved += ".js";
              }
            }
            return { path: resolved, namespace: "virtual" };
          }
          const normalizedPath = args.path.startsWith("/") ? args.path.slice(1) : args.path;
          return { path: normalizedPath, namespace: "virtual" };
        });
        build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
          const content = fileMap.get(args.path);
          if (!content) {
            const availableFiles = Array.from(fileMap.keys()).join(", ");
            return {
              errors: [
                {
                  text: `File not found: ${args.path}`,
                  detail: `Available files: ${availableFiles}`
                }
              ]
            };
          }
          return {
            contents: content,
            loader: args.path.endsWith(".ts") ? "ts" : "js"
          };
        });
      }
    };
    const result = await esbuild.build({
      stdin: {
        contents: entryFile.content,
        sourcefile: entryFile.path.startsWith("/") ? entryFile.path.slice(1) : entryFile.path,
        loader: entryFile.path.endsWith(".ts") ? "ts" : "js"
      },
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "es2020",
      write: false,
      plugins: [virtualPlugin],
      minify: false,
      // Keep readable for debugging
      sourcemap: "inline"
      // Enable source maps for better error messages
    });
    const bundledCode = result.outputFiles[0].text;
    return {
      success: true,
      code: bundledCode
    };
  } catch (error) {
    console.error("Bundling error:", error);
    return {
      success: false,
      error: "Failed to bundle code",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export { bundleProjectFiles as b };
//# sourceMappingURL=bundler-CtkqweLb.js.map
