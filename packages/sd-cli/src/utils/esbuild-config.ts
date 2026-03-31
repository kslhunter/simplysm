import path from "path";
import { readFileSync, existsSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import type esbuild from "esbuild";
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
  logger.debug(`변경된 출력 파일 쓰기 시작 (${outputFiles.length}개)`);
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
  logger.debug(`변경된 출력 파일 쓰기 완료 (변경: ${String(hasChanges)})`);
  return hasChanges;
}

/**
 * esbuild options for Server build
 * - bundle: true (single bundle with all dependencies)
 */
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  env?: Record<string, string>;
  /** External modules to exclude from bundle */
  external?: string[];
  /** Dev mode: skip minification for faster builds */
  dev?: boolean;
}

/**
 * Generate a JS banner snippet that merges env vars into process.env at runtime.
 * Uses ??= so that runtime ENV (e.g. `DEV=false node server.js`) takes precedence
 * over build-time defaults.
 */
export function createEnvBanner(env?: Record<string, string>): string {
  if (env == null || Object.keys(env).length === 0) return "";
  return `for(const[__k,__v]of Object.entries(${JSON.stringify(env)})){process.env[__k]??=__v;}`;
}

/**
 * Create esbuild config for Server build
 *
 * Used for server package builds
 * - bundle: true (single bundle with all dependencies)
 * - minify: true (minify for code protection)
 * - banner: createRequire shim for CJS package require() support + env injection
 */
export function createServerEsbuildOptions(options: ServerEsbuildOptions): esbuild.BuildOptions {
  const envBanner = createEnvBanner(options.env);
  const bannerJs =
    "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" +
    envBanner;

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    minify: options.dev !== true,
    platform: "node",
    target: "node20",
    bundle: true,
    banner: { js: bannerJs },
    external: options.external,
    tsconfig: path.join(options.pkgDir, "tsconfig.json"),
    logLevel: "silent",
  };
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
 * Collect both uninstalled optional peer deps and native modules in a single tree traversal
 */
export function collectAllDependencyExternals(pkgDir: string): {
  optionalPeerDeps: string[];
  nativeModules: string[];
} {
  const optionalPeerDeps = new Set<string>();
  const nativeModules = new Set<string>();
  const visited = new Set<string>();

  const pkgJson = JSON.parse(
    readFileSync(path.join(pkgDir, "package.json"), "utf-8"),
  ) as PkgJson;
  const deps = Object.keys(pkgJson.dependencies ?? {});
  logger.debug(
    `[collectAllDependencyExternals] Scanning ${String(deps.length)} top-level dependencies...`,
  );

  for (const dep of deps) {
    scanDependencyTree(
      dep,
      pkgDir,
      optionalPeerDeps,
      visited,
      (pkgName, depDir, depPkgJson) => {
        const found: string[] = [];

        // Optional peer deps check
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

        // Native module check
        if (existsSync(path.join(depDir, "binding.gyp"))) {
          nativeModules.add(pkgName);
        }

        return found;
      },
    );
  }

  logger.debug(
    `[collectAllDependencyExternals] Done: visited ${String(visited.size)} packages, ` +
      `optionalPeerDeps=${String(optionalPeerDeps.size)}, nativeModules=${String(nativeModules.size)}`,
  );

  return {
    optionalPeerDeps: [...optionalPeerDeps],
    nativeModules: [...nativeModules],
  };
}

/**
 * Collect uninstalled optional peer deps from dependency tree
 *
 * For server builds (bundle: true), specify uninstalled optional peer dependencies
 * as esbuild externals to prevent build failures
 */
export function collectUninstalledOptionalPeerDeps(pkgDir: string): string[] {
  return collectAllDependencyExternals(pkgDir).optionalPeerDeps;
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
  return collectAllDependencyExternals(pkgDir).nativeModules;
}

//#endregion
