import path from "path";
import { readFileSync, existsSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import type esbuild from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import type { TypecheckEnv } from "./tsconfig";

/**
 * esbuild outputFiles 중 실제로 변경된 파일만 디스크에 쓴다.
 *
 * - .js 파일: ESM 상대 import 경로에 .js 확장자를 추가한 후 비교
 * - 그 외 파일(.js.map 등): 원본 그대로 비교
 * - 기존 파일과 내용이 동일하면 쓰기를 건너뛰어 타임스탬프를 유지한다.
 */
export async function writeChangedOutputFiles(outputFiles: esbuild.OutputFile[]): Promise<void> {
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

      // Compare with existing file — skip write if unchanged
      try {
        const existing = await fs.readFile(file.path, "utf-8");
        if (existing === finalText) return;
      } catch {
        // File doesn't exist yet
      }

      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, finalText);
    }),
  );
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
 * package.json에서 solid-js 의존성 감지
 */
function hasSolidDependency(pkgDir: string): boolean {
  const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8")) as PkgJson;
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.peerDependencies };
  return "solid-js" in allDeps;
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
 * Server용 esbuild 설정 생성
 *
 * 서버 패키지 빌드에 사용합니다.
 * - bundle: true (모든 의존성 포함한 단일 번들)
 * - minify: true (코드 보호를 위한 압축)
 * - banner: CJS 패키지의 require() 지원을 위한 createRequire shim
 * - env를 define 옵션으로 치환 (process.env.KEY 형태)
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
 * 의존성 중 binding.gyp가 있는 네이티브 모듈 수집
 *
 * node-gyp로 빌드되는 네이티브 모듈은 esbuild가 번들링할 수 없으므로
 * external로 지정해야 한다.
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

  // binding.gyp 존재 여부로 네이티브 모듈 감지
  if (existsSync(path.join(depDir, "binding.gyp"))) {
    external.add(pkgName);
  }

  // 하위 dependencies도 재귀 탐색
  const depPkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PkgJson;
  for (const dep of Object.keys(depPkgJson.dependencies ?? {})) {
    scanNativeModules(dep, depDir, external, visited);
  }
}

//#endregion
