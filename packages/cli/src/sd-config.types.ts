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
 * Capacitor Android 서명 설정
 */
export interface SdCapacitorSignConfig {
  /** keystore 파일 경로 (패키지 디렉토리 기준 상대경로) */
  keystore: string;
  /** keystore 비밀번호 */
  storePassword: string;
  /** 키 별칭 */
  alias: string;
  /** 키 비밀번호 */
  password: string;
  /** keystore 타입 (기본값: "jks") */
  keystoreType?: string;
}

/**
 * Capacitor Android 권한 설정
 */
export interface SdCapacitorPermission {
  /** 권한 이름 (예: "CAMERA", "WRITE_EXTERNAL_STORAGE") */
  name: string;
  /** 최대 SDK 버전 */
  maxSdkVersion?: number;
  /** tools:ignore 속성 값 */
  ignore?: string;
}

/**
 * Capacitor Android Intent Filter 설정
 */
export interface SdCapacitorIntentFilter {
  /** intent action (예: "android.intent.action.VIEW") */
  action?: string;
  /** intent category (예: "android.intent.category.DEFAULT") */
  category?: string;
}

/**
 * Capacitor Android 플랫폼 설정
 */
export interface SdCapacitorAndroidConfig {
  /** AndroidManifest.xml application 태그 속성 (예: { requestLegacyExternalStorage: "true" }) */
  config?: Record<string, string>;
  /** AAB 번들 빌드 여부 (false면 APK) */
  bundle?: boolean;
  /** Intent Filter 설정 */
  intentFilters?: SdCapacitorIntentFilter[];
  /** APK/AAB 서명 설정 */
  sign?: SdCapacitorSignConfig;
  /** Android SDK 버전 (minSdk, targetSdk) */
  sdkVersion?: number;
  /** 추가 권한 설정 */
  permissions?: SdCapacitorPermission[];
}

/**
 * Capacitor 설정
 */
export interface SdCapacitorConfig {
  /** 앱 ID (예: "com.example.app") */
  appId: string;
  /** 앱 이름 */
  appName: string;
  /** Capacitor 플러그인 설정 (키: 패키지명, 값: true 또는 플러그인 옵션) */
  plugins?: Record<string, Record<string, unknown> | true>;
  /** 앱 아이콘 경로 (패키지 디렉토리 기준 상대경로) */
  icon?: string;
  /** 디버그 빌드 여부 */
  debug?: boolean;
  /** 플랫폼별 설정 */
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}

/**
 * 클라이언트 패키지 설정 (Vite 개발 서버)
 */
export interface SdClientPackageConfig {
  /** 빌드 타겟 */
  target: "client";
  /** 개발 서버 포트 (필수) */
  server: number;
  /** Capacitor 설정 */
  capacitor?: SdCapacitorConfig;
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
