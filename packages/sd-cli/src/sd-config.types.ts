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
  /** 배포 대상 경로 (환경변수 치환 지원: %VER%, %PROJECT%) */
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
  /** 스크립트 인자 (환경변수 치환 지원: %VER%, %PROJECT%) */
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
 * Electron 설정
 */
export interface SdElectronConfig {
  /** Electron 앱 ID (예: "com.example.myapp") */
  appId: string;
  /** portable .exe (true) 또는 NSIS 인스톨러 (false/미지정) */
  portable?: boolean;
  /** 인스톨러 아이콘 경로 (.ico, 패키지 디렉토리 기준 상대경로) */
  installerIcon?: string;
  /** Electron에 포함할 npm 패키지 (native 모듈 등) */
  reinstallDependencies?: string[];
  /** npm postinstall 스크립트 */
  postInstallScript?: string;
  /** NSIS 옵션 (portable이 아닌 경우) */
  nsisOptions?: Record<string, unknown>;
  /** 환경변수 (electron-main.ts에서 process.env로 접근) */
  env?: Record<string, string>;
}

/**
 * 클라이언트 패키지 설정 (Vite 개발 서버)
 */
export interface SdClientPackageConfig {
  /** 빌드 타겟 */
  target: "client";
  /**
   * 서버 설정
   * - string: 연결할 서버 패키지명 (예: "solid-demo-server")
   * - number: Vite 직접 포트 사용 (하위 호환성)
   */
  server: string | number;
  /** 빌드 시 치환할 환경변수 (process.env를 객체로 치환) */
  env?: Record<string, string>;
  /** publish 설정 */
  publish?: SdPublishConfig;
  /** Capacitor 설정 */
  capacitor?: SdCapacitorConfig;
  /** Electron 설정 */
  electron?: SdElectronConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
}

/**
 * 서버 패키지 설정 (Fastify 서버)
 */
export interface SdServerPackageConfig {
  /** 빌드 타겟 */
  target: "server";
  /** 빌드 시 치환할 환경변수 (process.env.KEY를 상수로 치환) */
  env?: Record<string, string>;
  /** publish 설정 */
  publish?: SdPublishConfig;
  /** runtime config (written to dist/.config.json during build) */
  configs?: Record<string, unknown>;
  /** esbuild에서 번들에 포함하지 않을 외부 모듈 (binding.gyp 자동 감지에 더해 수동 지정) */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    /** PM2 프로세스 이름 (미지정 시 package.json name에서 생성) */
    name?: string;
    /** PM2 watch에서 제외할 경로 */
    ignoreWatchPaths?: string[];
    /** true면 interpreter 경로 생략 (시스템 PATH의 node 사용) */
    noInterpreter?: boolean;
  };
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
export type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;

/**
 * sd.config.ts 설정 타입
 */
export interface SdConfig {
  /** 패키지별 설정 (키: packages/ 하위 디렉토리 이름, 예: "core-common") */
  packages: Record<string, SdPackageConfig | undefined>;
  /**
   * 의존성 교체 설정 (node_modules 패키지를 로컬 소스로 symlink 교체)
   * - 키: node_modules에서 찾을 패키지 glob 패턴 (예: "@simplysm/*")
   * - 값: 소스 디렉토리 경로 (키의 * 캡처값이 값의 *에 치환됨)
   * - 예: { "@simplysm/*": "../simplysm/packages/*" }
   */
  replaceDeps?: Record<string, string>;
  /** 배포 완료 후 실행할 스크립트 */
  postPublish?: SdPostPublishScriptConfig[];
}

/**
 * sd.config.ts 함수에 전달되는 파라미터
 */
export interface SdConfigParams {
  /** 현재 작업 디렉토리 */
  cwd: string;
  /** 개발 모드 여부 */
  dev: boolean;
  /** 추가 옵션 (CLI의 -o 플래그) */
  opt: string[];
}

/**
 * sd.config.ts는 다음과 같은 형태의 함수를 default export해야 한다:
 *
 * ```typescript
 * import type { SdConfig, SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";
 *
 * const config: SdConfigFn = (params: SdConfigParams) => ({
 *   packages: {
 *     "core-common": { target: "neutral" },
 *     "core-node": { target: "node" },
 *   },
 * });
 *
 * export default config;
 * ```
 */
export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
