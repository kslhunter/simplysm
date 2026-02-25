import path from "path";
import { readFileSync, existsSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import type esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import type { TypecheckEnv } from "./tsconfig";

/**
 * Write only changed files from esbuild outputFiles to disk
 *
 * - .js files: Add .js extension to ESM relative import paths before comparing
 * - Other files (.js.map etc): Compare original content as-is
 * - Skip writing if content matches existing file to preserve timestamps
 */
export async function writeChangedOutputFiles(outputFiles: esbuild.OutputFile[]): Promise<boolean> {
  let hasChanges = false;
  await Promise.all(
    outputFiles.map(async (file) => {
      const finalText = file.path.endsWith(".js")
        ? file.text.replace(
            /((?:from|import)\s*["'])(\.\.?\/[^"']*?)(["'])/g,
            (_match, prefix: string, importPath: string, suffix: string) => {
              if (/\.(js|mjs|cjs|json|css|wasm|node)$/i.test(importPath)) return _match;
              return `${prefix}${importPath}.js${suffix}`;
            },
          )
        : file.text;

      try {
        const existing = await fs.readFile(file.path, "utf-8");
        if (existing === finalText) return;
      } catch {
        // File doesn't exist yet
      }

      hasChanges = true;
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, finalText);
    }),
  );
  return hasChanges;
}

/**
 * esbuild options for Library build
 * - bundle: false (transpile individual files)
 * - platform: node or browser depending on target
 */
export interface LibraryEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  target: "node" | "browser" | "neutral";
  compilerOptions: Record<string, unknown>;
}

/**
 * esbuild options for Server build
 * - bundle: true (single bundle with all dependencies)
 */
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  /** External modules to exclude from bundle */
  external?: string[];
}

/**
 * Detect solid-js dependency in package.json
 */
function hasSolidDependency(pkgDir: string): boolean {
  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.peerDependencies };
  return "solid-js" in allDeps;
}

/**
 * Create esbuild config for Library build
 *
 * Used to build library packages with node/browser/neutral targets
 * - bundle: false (transpile each file individually)
 * - platform: node if target is node, otherwise browser
 * - target: node20 if target is node, otherwise chrome84
 */
export function createLibraryEsbuildOptions(options: LibraryEsbuildOptions): esbuild.BuildOptions {
  const plugins: esbuild.Plugin[] = [];

  if (hasSolidDependency(options.pkgDir)) {
    plugins.unshift(solidPlugin());
  }

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    sourcesContent: false,
    platform: options.target === "node" ? "node" : "browser",
    target: options.target === "node" ? "node20" : "chrome84",
    bundle: false,
    write: false,
    tsconfigRaw: {
      compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"],
    },
    logLevel: "silent",
    plugins,
  };
}

/**
 * Create esbuild config for Server build
 *
 * Used for server package builds
 * - bundle: true (single bundle with all dependencies)
 * - minify: true (minify for code protection)
 * - banner: createRequire shim for CJS package require() support
 * - Replace env with define option (process.env.KEY format)
 */
export function createServerEsbuildOptions(options: ServerEsbuildOptions): esbuild.BuildOptions {
  const define: Record<string, string> = {};
  if (options.env != null) {
    for (const [key, value] of Object.entries(options.env)) {
      define[`process.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    minify: true,
    platform: "node",
    target: "node20",
    bundle: true,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: options.external,
    define,
    tsconfigRaw: {
      compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"],
    },
    logLevel: "silent",
  };
}

/**
 * Extract TypecheckEnv from build target
 *
 * Neutral is treated as browser for builds.
 * (neutral packages are Node/browser universal, but we treat as browser for build)
 */
export function getTypecheckEnvFromTarget(target: "node" | "browser" | "neutral"): TypecheckEnv {
  return target === "node" ? "node" : "browser";
}

//#region Optional Peer Deps

interface PkgJson {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/**
 * Collect uninstalled optional peer deps from dependency tree
 *
 * For server builds (bundle: true), specify uninstalled optional peer dependencies
 * as esbuild externals to prevent build failures
 */
export function collectUninstalledOptionalPeerDeps(pkgDir: string): string[] {
  const external = new Set<string>();
  const visited = new Set<string>();

  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    scanOptionalPeerDeps(dep, pkgDir, external, visited);
  }

  return [...external];
}

function scanOptionalPeerDeps(
  pkgName: string,
  resolveDir: string,
  external: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const req = createRequire(path.join(resolveDir, "noop.js"));

  let pkgJsonPath: string;
  try {
    pkgJsonPath = req.resolve(`${pkgName}/package.json`);
  } catch {
    return;
  }

  const depDir = path.dirname(pkgJsonPath);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PkgJson;

  if (pkgJson.peerDependenciesMeta != null) {
    const peerDeps = pkgJson.peerDependencies ?? {};
    const depReq = createRequire(path.join(depDir, "noop.js"));
    for (const [name, meta] of Object.entries(pkgJson.peerDependenciesMeta)) {
      if (meta.optional === true && name in peerDeps) {
        try {
          depReq.resolve(name);
        } catch {
          external.add(name);
        }
      }
    }
  }

  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    scanOptionalPeerDeps(dep, depDir, external, visited);
  }
}

//#endregion

//#region Native Module Externals

/**
 * Collect native modules with binding.gyp from dependencies
 *
 * Native modules built with node-gyp cannot be bundled by esbuild,
 * so they must be specified as externals.
 */
export function collectNativeModuleExternals(pkgDir: string): string[] {
  const external = new Set<string>();
  const visited = new Set<string>();

  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    scanNativeModules(dep, pkgDir, external, visited);
  }

  return [...external];
}

function scanNativeModules(
  pkgName: string,
  resolveDir: string,
  external: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const req = createRequire(path.join(resolveDir, "noop.js"));

  let pkgJsonPath: string;
  try {
    pkgJsonPath = req.resolve(`${pkgName}/package.json`);
  } catch {
    return;
  }

  const depDir = path.dirname(pkgJsonPath);

  // Detect native modules by checking for binding.gyp
  if (existsSync(path.join(depDir, "binding.gyp"))) {
    external.add(pkgName);
  }

  // Recursively traverse sub-dependencies
  const depPkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PkgJson;
  for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
    scanNativeModules(dep, depDir, external, visited);
  }
}

//#endregion
