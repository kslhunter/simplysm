import path from "path";
import { readFileSync, existsSync } from "fs";
import fs from "fs/promises";
import { createRequire } from "module";
import type esbuild from "esbuild";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:esbuild-config");

/**
 * esbuild outputFiles에서 변경된 파일만 디스크에 쓴다.
 *
 * - .js 파일: 비교 전 ESM 상대 import 경로에 .js 확장자를 추가한다
 * - 기타 파일(.js.map 등): 원본 내용을 그대로 비교한다
 * - 기존 파일과 내용이 동일하면 타임스탬프 보존을 위해 쓰기를 스킵한다
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
        // 파일이 아직 존재하지 않음
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
 * Server 빌드용 esbuild 옵션
 * - bundle: true (모든 의존성을 포함한 단일 번들)
 */
export interface ServerEsbuildOptions {
  pkgDir: string;
  entryPoints: string[];
  env?: Record<string, string>;
  /** 번들에서 제외할 외부 모듈 */
  external?: string[];
  /** dev 모드: 빠른 빌드를 위해 minification 스킵 */
  dev?: boolean;
}

/**
 * 런타임에 환경변수를 process.env에 병합하는 JS 배너 스니펫을 생성한다.
 * ??=를 사용하여 런타임 ENV(예: `DEV=false node server.js`)가
 * 빌드 타임 기본값보다 우선하도록 한다.
 */
export function createEnvBanner(env?: Record<string, string>): string {
  if (env == null || Object.keys(env).length === 0) return "";
  return `for(const[__k,__v]of Object.entries(${JSON.stringify(env)})){process.env[__k]??=__v;}`;
}

/**
 * Server 빌드용 esbuild 설정을 생성한다.
 *
 * server 패키지 빌드에 사용한다.
 * - bundle: true (모든 의존성을 포함한 단일 번들)
 * - minify: true (코드 보호를 위한 minify)
 * - banner: CJS 패키지 require() 지원을 위한 createRequire shim + 환경변수 주입
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
 * 의존성 트리를 재귀적으로 스캔하고 predicate 기반으로 externals를 수집한다.
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

  // predicate에 의해 external로 표시된 패키지 수집
  const toExternal = collector(pkgName, depDir, pkgJson);
  for (const name of toExternal) {
    external.add(name);
  }

  // 하위 의존성 재귀 탐색
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
 * 단일 트리 탐색으로 미설치 optional peer deps와 네이티브 모듈을 모두 수집한다.
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

        // Optional peer deps 확인
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

        // 네이티브 모듈 확인
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
 * 의존성 트리에서 미설치 optional peer deps를 수집한다.
 *
 * server 빌드(bundle: true)에서 미설치 optional peer dependencies를
 * esbuild externals로 지정하여 빌드 실패를 방지한다.
 */
export function collectUninstalledOptionalPeerDeps(pkgDir: string): string[] {
  return collectAllDependencyExternals(pkgDir).optionalPeerDeps;
}

//#endregion

//#region Native Module Externals

/**
 * 의존성에서 binding.gyp가 있는 네이티브 모듈을 수집한다.
 *
 * node-gyp로 빌드된 네이티브 모듈은 esbuild로 번들링할 수 없으므로
 * externals로 지정해야 한다.
 */
export function collectNativeModuleExternals(pkgDir: string): string[] {
  return collectAllDependencyExternals(pkgDir).nativeModules;
}

//#endregion
