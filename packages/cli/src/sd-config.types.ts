/**
 * 빌드 타겟 유형
 * - node: Node.js 전용 패키지
 * - browser: 브라우저 전용 패키지
 * - neutral: Node/브라우저 공용 패키지
 */
export type Target = "node" | "browser" | "neutral";

/**
 * 패키지 설정
 */
export interface SdPackageConfig {
  /** 빌드 타겟 */
  target: Target;
}

/**
 * sd.config.ts 설정 타입
 */
export interface SdConfig {
  /** 패키지별 설정 (키: 패키지 이름) */
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
