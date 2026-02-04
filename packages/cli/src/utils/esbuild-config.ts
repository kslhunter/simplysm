import path from "path";
import type esbuild from "esbuild";
import type { TypecheckEnv } from "./tsconfig";

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
