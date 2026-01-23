/**
 * 빌드 타겟 유형 (esbuild로 빌드)
 * - node: Node.js 전용 패키지
 * - browser: 브라우저 전용 패키지
 * - neutral: Node/브라우저 공용 패키지
 */
export type BuildTarget = "node" | "browser" | "neutral";

/**
 * 패키지 설정 (node/browser/neutral)
 */
export interface SdBuildPackageConfig {
  /** 빌드 타겟 */
  target: BuildTarget;
}

/**
 * 클라이언트 패키지 설정 (Vite 개발 서버)
 */
export interface SdClientPackageConfig {
  /** 빌드 타겟 */
  target: "client";
  /** 개발 서버 포트 (필수) */
  server: number;
}

/**
 * 스크립트 전용 패키지 설정 (watch/typecheck 제외)
 */
export interface SdScriptsPackageConfig {
  /** 빌드 타겟 */
  target: "scripts";
}

/**
 * 패키지 설정
 */
export type SdPackageConfig = SdBuildPackageConfig | SdClientPackageConfig | SdScriptsPackageConfig;

/**
 * sd.config.ts 설정 타입
 */
export interface SdConfig {
  /** 패키지별 설정 (키: packages/ 하위 디렉토리 이름, 예: "core-common") */
  packages: Record<string, SdPackageConfig | undefined>;
}

/**
 * sd.config.ts 설정 함수 타입
 *
 * @example
 * ```typescript
 * import type { SdConfigFn } from "@simplysm/cli";
 *
 * const config: SdConfigFn = () => ({
 *   packages: {
 *     "core-common": { target: "neutral" },
 *     "core-node": { target: "node" },
 *   },
 * });
 *
 * export default config;
 * ```
 */
export type SdConfigFn = () => SdConfig;
