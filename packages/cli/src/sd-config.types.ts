/**
 * 빌드 타겟 유형 (esbuild로 빌드)
 * - node: Node.js 전용 패키지
 * - browser: 브라우저 전용 패키지
 * - neutral: Node/브라우저 공용 패키지
 */
export type BuildTarget = "node" | "browser" | "neutral";

//#region Publish 설정 타입

/**
 * 패키지 publish 설정
 * - "npm": npm 레지스트리에 배포
 * - SdLocalDirectoryPublishConfig: 로컬 디렉토리에 복사
 * - SdStoragePublishConfig: FTP/FTPS/SFTP 서버에 업로드
 */
export type SdPublishConfig = "npm" | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;

/**
 * 로컬 디렉토리 publish 설정
 */
export interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  /** 배포 대상 경로 (환경변수 치환 지원: %SD_VERSION%, %SD_PROJECT_PATH%) */
  path: string;
}

/**
 * 스토리지 (FTP/FTPS/SFTP) publish 설정
 */
export interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  pass?: string;
}

/**
 * postPublish 스크립트 설정
 */
export interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  /** 스크립트 인자 (환경변수 치환 지원: %SD_VERSION%, %SD_PROJECT_PATH%) */
  args: string[];
}

//#endregion

/**
 * 패키지 설정 (node/browser/neutral)
 */
export interface SdBuildPackageConfig {
  /** 빌드 타겟 */
  target: BuildTarget;
  /** publish 설정 */
  publish?: SdPublishConfig;
}

/**
 * 클라이언트 패키지 설정 (Vite 개발 서버)
 */
export interface SdClientPackageConfig {
  /** 빌드 타겟 */
  target: "client";
  /** 개발 서버 포트 (필수) */
  server: number;
  /** publish 설정 */
  publish?: SdPublishConfig;
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
  /** 배포 완료 후 실행할 스크립트 */
  postPublish?: SdPostPublishScriptConfig[];
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
