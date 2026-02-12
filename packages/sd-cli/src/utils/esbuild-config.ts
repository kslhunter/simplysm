import path from "path";
import { readFileSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import { glob } from "glob";
import type esbuild from "esbuild";
import type { TypecheckEnv } from "./tsconfig";

/**
 * ESM 상대 import 경로에 .js 확장자를 추가하는 esbuild 플러그인.
 *
 * bundle: false 모드에서 esbuild는 import 경로를 그대로 유지하므로,
 * Node.js ESM에서 직접 실행 시 확장자 누락으로 모듈을 찾지 못하는 문제를 해결한다.
 */
function esmRelativeImportPlugin(outdir: string): esbuild.Plugin {
  return {
    name: "esm-relative-import",
    setup(build) {
      build.onEnd(async () => {
        const files = await glob("**/*.js", { cwd: outdir });

        await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(outdir, file);
            const content = await fs.readFile(filePath, "utf-8");

            const rewritten = content.replace(
              /((?:from|import)\s*["'])(\.\.?\/[^"']*?)(["'])/g,
              (_match, prefix: string, importPath: string, suffix: string) => {
                if (/\.(js|mjs|cjs|json|css|wasm|node)$/i.test(importPath)) return _match;
                return `${prefix}${importPath}.js${suffix}`;
              },
            );

            if (rewritten !== content) {
              await fs.writeFile(filePath, rewritten);
            }
          }),
        );
      });
    },
  };
}

/**
 * Library 빌드용 esbuild 옵션
 * - bundle: false (개별 파일 트랜스파일)
 * - platform: target에 따라 node 또는 browser
 */
export interface LibraryEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  target: "node" | "browser" | "neutral";
  compilerOptions: Record<string, unknown>;
}

/**
 * Server 빌드용 esbuild 옵션
 * - bundle: true (모든 의존성 포함한 단일 번들)
 */
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  compilerOptions: Record<string, unknown>;
  env?: Record<string, string>;
  /** 번들에서 제외할 외부 모듈 */
  external?: string[];
}

/**
 * Library용 esbuild 설정 생성
 *
 * node/browser/neutral 타겟의 라이브러리 패키지 빌드에 사용합니다.
 * - bundle: false (개별 파일을 각각 트랜스파일)
 * - platform: target이 node면 node, 그 외는 browser
 * - target: node면 node20, 그 외는 chrome84
 */
export function createLibraryEsbuildOptions(options: LibraryEsbuildOptions): esbuild.BuildOptions {
  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: options.target === "node" ? "node" : "browser",
    target: options.target === "node" ? "node20" : "chrome84",
    bundle: false,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
    plugins: [esmRelativeImportPlugin(path.join(options.pkgDir, "dist"))],
  };
}

/**
 * Server용 esbuild 설정 생성
 *
 * 서버 패키지 빌드에 사용합니다.
 * - bundle: true (모든 의존성 포함한 단일 번들)
 * - banner: CJS 패키지의 require() 지원을 위한 createRequire shim
 * - env를 define 옵션으로 치환 (process.env["KEY"] 형태)
 */
export function createServerEsbuildOptions(options: ServerEsbuildOptions): esbuild.BuildOptions {
  const define: Record<string, string> = {};
  if (options.env != null) {
    for (const [key, value] of Object.entries(options.env)) {
      define[`process.env["${key}"]`] = JSON.stringify(value);
    }
  }

  return {
    entryPoints: options.entryPoints,
    outdir: path.join(options.pkgDir, "dist"),
    format: "esm",
    sourcemap: true,
    platform: "node",
    target: "node20",
    bundle: true,
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: options.external,
    define,
    tsconfigRaw: { compilerOptions: options.compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  };
}

/**
 * 빌드 타겟에서 TypecheckEnv 추출
 *
 * 빌드용이므로 neutral은 browser로 처리합니다.
 * (neutral 패키지는 Node/브라우저 공용이지만, 빌드 시에는 browser 환경 기준으로 처리)
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
 * 의존성 트리에서 미설치 optional peer dep 수집
 *
 * 서버 빌드(bundle: true) 시 설치되지 않은 optional peer dependency를
 * esbuild external로 지정하여 빌드 실패를 방지한다.
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

function scanOptionalPeerDeps(pkgName: string, resolveDir: string, external: Set<string>, visited: Set<string>): void {
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
