import path from "path";
import { readFileSync, existsSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import type esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import type { TypecheckEnv } from "./tsconfig";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:esbuild-config");

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
  /** Dev mode: skip minification for faster builds */
  dev?: boolean;
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
      compilerOptions: toEsbuildTsconfigRaw(options.compilerOptions),
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
    minify: options.dev !== true,
    platform: "node",
    target: "node20",
    bundle: true,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: options.external,
    define,
    tsconfigRaw: {
      compilerOptions: toEsbuildTsconfigRaw(options.compilerOptions),
    },
    logLevel: "silent",
  };
}

// TypeScript ScriptTarget enum → esbuild target string
const TARGET_MAP: Record<number, string> = {
  0: "es3", 1: "es5", 2: "es2015", 3: "es2016", 4: "es2017",
  5: "es2018", 6: "es2019", 7: "es2020", 8: "es2021", 9: "es2022",
  10: "es2023", 11: "es2024", 99: "esnext",
};

// TypeScript JsxEmit enum → esbuild jsx string
const JSX_MAP: Record<number, string> = {
  1: "preserve", 2: "react", 3: "react-native", 4: "react-jsx", 5: "react-jsxdev",
};

// TypeScript ModuleKind enum → string
const MODULE_MAP: Record<number, string> = {
  0: "none", 1: "commonjs", 2: "amd", 3: "umd", 4: "system",
  5: "es2015", 6: "es2020", 7: "es2022", 99: "esnext",
  100: "node16", 199: "nodenext",
};

// TypeScript ModuleResolutionKind enum → string
const MODULE_RESOLUTION_MAP: Record<number, string> = {
  1: "node10", 2: "node16", 3: "nodenext", 100: "bundler",
};

/**
 * Convert TypeScript's ts.CompilerOptions to esbuild-compatible tsconfigRaw compilerOptions.
 *
 * TypeScript uses numeric enum values (e.g., target: 99) while esbuild expects
 * string values (e.g., "esnext"). This converts known enum fields and passes
 * everything else through as-is.
 */
function toEsbuildTsconfigRaw(
  compilerOptions: Record<string, unknown>,
): esbuild.TsconfigRaw["compilerOptions"] {
  const result = { ...compilerOptions };

  if (typeof result["target"] === "number") {
    result["target"] = TARGET_MAP[result["target"] as number] ?? "esnext";
  }
  if (typeof result["jsx"] === "number") {
    result["jsx"] = JSX_MAP[result["jsx"] as number];
  }
  if (typeof result["module"] === "number") {
    result["module"] = MODULE_MAP[result["module"] as number];
  }
  if (typeof result["moduleResolution"] === "number") {
    result["moduleResolution"] = MODULE_RESOLUTION_MAP[result["moduleResolution"] as number];
  }

  return result as esbuild.TsconfigRaw["compilerOptions"];
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
 * Recursively scan dependency tree and collect externals based on predicate
 */
function scanDependencyTree(
  pkgName: string,
  resolveDir: string,
  external: Set<string>,
  visited: Set<string>,
  collector: (pkgName: string, depDir: string, pkgJson: PkgJson) => string[],
): void {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const req = createRequire(path.join(resolveDir, "noop.js"));

  let pkgJsonPath: string;
  try {
    pkgJsonPath = req.resolve(`${pkgName}/package.json`);
  } catch {
    logger.debug(`[scanDependencyTree] Could not resolve: ${pkgName}`);
    return;
  }

  const depDir = path.dirname(pkgJsonPath);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PkgJson;

  // Collect packages marked as external by predicate
  const toExternal = collector(pkgName, depDir, pkgJson);
  for (const name of toExternal) {
    external.add(name);
  }

  // Recursively traverse sub-dependencies
  const subDeps = Object.keys(pkgJson.dependencies ?? {});
  if (subDeps.length > 0) {
    logger.debug(
      `[scanDependencyTree] ${pkgName}: traversing ${String(subDeps.length)} sub-dependencies`,
    );
  }
  for (const dep of subDeps) {
    scanDependencyTree(dep, depDir, external, visited, collector);
  }
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
  const deps = Object.keys(pkgJson.dependencies ?? {});
  logger.debug(
    `[optionalPeerDeps] Scanning ${String(deps.length)} top-level dependencies...`,
  );

  for (const dep of deps) {
    scanDependencyTree(dep, pkgDir, external, visited, (_pkgName, depDir, depPkgJson) => {
      const found: string[] = [];
      if (depPkgJson.peerDependenciesMeta != null) {
        const peerDeps = depPkgJson.peerDependencies ?? {};
        const depReq = createRequire(path.join(depDir, "noop.js"));
        for (const [name, meta] of Object.entries(depPkgJson.peerDependenciesMeta)) {
          if (meta.optional === true && name in peerDeps) {
            try {
              depReq.resolve(name);
            } catch {
              found.push(name);
            }
          }
        }
      }
      return found;
    });
  }

  logger.debug(
    `[optionalPeerDeps] Done: visited ${String(visited.size)} packages, found ${String(external.size)} externals`,
  );
  return [...external];
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
  const deps = Object.keys(pkgJson.dependencies ?? {});
  logger.debug(
    `[nativeModules] Scanning ${String(deps.length)} top-level dependencies...`,
  );

  for (const dep of deps) {
    scanDependencyTree(dep, pkgDir, external, visited, (pkgName, depDir, _pkgJson) => {
      const found: string[] = [];
      // Detect native modules by checking for binding.gyp
      if (existsSync(path.join(depDir, "binding.gyp"))) {
        found.push(pkgName);
      }
      return found;
    });
  }

  logger.debug(
    `[nativeModules] Done: visited ${String(visited.size)} packages, found ${String(external.size)} externals`,
  );
  return [...external];
}

//#endregion
