/**
 * 빌드 타겟 타입 (esbuild로 빌드)
 * - node: Node.js 전용 패키지
 * - browser: 브라우저 전용 패키지
 * - neutral: Node/브라우저 공용 패키지
 */
export type BuildTarget = "node" | "browser" | "neutral";

//#region 배포 설정 타입

/**
 * npm 레지스트리 배포 설정
 */
export interface SdNpmPublishConfig {
  type: "npm";
}

/**
 * 패키지 배포 설정
 * - SdNpmPublishConfig: npm 레지스트리에 배포
 * - SdLocalDirectoryPublishConfig: 로컬 디렉토리로 복사
 * - SdStoragePublishConfig: FTP/FTPS/SFTP 서버에 업로드
 */
export type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;

/**
 * 로컬 디렉토리 배포 설정
 */
export interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  /** 배포 대상 경로 (환경 변수 치환 지원: %VER%, %PROJECT%) */
  path: string;
}

/**
 * 스토리지 (FTP/FTPS/SFTP) 배포 설정
 */
export interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}

/**
 * postPublish 스크립트 설정
 */
export interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  /** 스크립트 인수 (환경 변수 치환 지원: %VER%, %PROJECT%) */
  args: string[];
}

//#endregion

/**
 * 패키지 설정 (node/browser/neutral)
 */
export interface SdBuildPackageConfig {
  /** 빌드 타겟 */
  target: BuildTarget;
  /** 배포 설정 */
  publish?: SdPublishConfig;
  /** src/에서 dist/로 복사할 파일의 glob 패턴 (src/ 기준 상대 경로) */
  copySrc?: string[];
  /** watch 훅 설정 (설정 시, watch 모드에서 빌드 엔진과 함께 훅이 실행됨) */
  watch?: SdWatchHookConfig;
}

/**
 * Capacitor Android 서명 설정
 */
export interface SdCapacitorSignConfig {
  /** keystore 파일 경로 (패키지 디렉토리 기준 상대 경로) */
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
  /** intent 액션 (예: "android.intent.action.VIEW") */
  action?: string;
  /** intent 카테고리 (예: "android.intent.category.DEFAULT") */
  category?: string;
}

/**
 * Capacitor Android 플랫폼 설정
 */
export interface SdCapacitorAndroidConfig {
  /** AndroidManifest.xml application 태그 속성 (예: { requestLegacyExternalStorage: "true" }) */
  config?: Record<string, string>;
  /** AAB 번들 빌드 플래그 (false이면 APK) */
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
  /** Capacitor 플러그인 설정 (key: 패키지명, value: true 또는 플러그인 옵션) */
  plugins?: Record<string, Record<string, unknown> | true>;
  /** 앱 아이콘 경로 (패키지 디렉토리 기준 상대 경로) */
  icon?: string;
  /** 디버그 빌드 플래그 */
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
  /** 포터블 .exe (true) 또는 NSIS 설치 프로그램 (false/미지정) */
  portable?: boolean;
  /** 설치 프로그램 아이콘 경로 (.ico, 패키지 디렉토리 기준 상대 경로) */
  installerIcon?: string;
  /** Electron에 포함할 npm 패키지 (네이티브 모듈 등) */
  reinstallDependencies?: string[];
  /** npm postinstall 스크립트 */
  postInstallScript?: string;
  /** NSIS 옵션 (portable이 false일 때) */
  nsisOptions?: Record<string, unknown>;
  /** 환경 변수 (electron-main.ts에서 process.env로 접근 가능) */
  env?: Record<string, string>;
}

//#region PWA 설정 타입

/**
 * PWA manifest 설정 (VitePWA manifest 옵션의 서브셋)
 */
export interface SdPwaManifestConfig {
  name?: string;
  short_name?: string;
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}

/**
 * PWA workbox 설정
 */
export interface SdPwaWorkboxConfig {
  globPatterns?: string[];
}

/**
 * PWA 설정
 */
export interface SdPwaConfig {
  manifest?: SdPwaManifestConfig;
  workbox?: SdPwaWorkboxConfig;
}

//#endregion

/**
 * 클라이언트 패키지용 브라우저 지원 설정
 */
export interface SdBrowserSupportConfig {
  /** browserslist 쿼리 (예: "last 2 Chrome versions" 또는 ["ie 11", "last 2 versions"]) */
  browserslist?: string | string[];
  /** PostCSS 플러그인 설정 */
  postCss?: { plugins: unknown[] };
  /** 레거시 모듈 지원 (코드 분할 비활성화 + import.meta 치환) */
  legacyModule?: boolean;
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
   * - number: Vite 포트 직접 지정 (하위 호환)
   */
  server: string | number;
  /** 빌드 시 치환할 환경 변수 (process.env를 객체로 치환) */
  env?: Record<string, string>;
  /** 배포 설정 */
  publish?: SdPublishConfig;
  /** Capacitor 설정 */
  capacitor?: SdCapacitorConfig;
  /** Electron 설정 */
  electron?: SdElectronConfig;
  /** 런타임 설정 (빌드 시 dist/.config.json으로 기록) */
  configs?: Record<string, unknown>;
  /** Vite optimizeDeps에서 제외하고 Capacitor/Electron package.json에 추가할 패키지 */
  exclude?: string[];
  /** 브라우저 지원 설정 (browserslist, PostCSS, legacyModule) */
  browserSupport?: SdBrowserSupportConfig;
  /** PWA 설정. false이면 비활성화. 미지정 시 기본값으로 활성화 */
  pwa?: false | SdPwaConfig;
}

/**
 * 서버 패키지 설정 (Fastify 서버)
 */
export interface SdServerPackageConfig {
  /** 빌드 타겟 */
  target: "server";
  /** 빌드 시 치환할 환경 변수 (process.env.KEY를 상수로 치환) */
  env?: Record<string, string>;
  /** 배포 설정 */
  publish?: SdPublishConfig;
  /** 런타임 설정 (빌드 시 dist/.config.json으로 기록) */
  configs?: Record<string, unknown>;
  /** esbuild 번들에 포함하지 않을 외부 모듈 (자동 binding.gyp 감지에 추가) */
  externals?: string[];
  /** PM2 설정 (지정 시 dist/pm2.config.cjs 생성) */
  pm2?: {
    /** PM2 프로세스 이름 (미지정 시 package.json name에서 생성) */
    name?: string;
    /** PM2 watch에서 제외할 경로 */
    ignoreWatchPaths?: string[];
  };
  /** 사용할 패키지 매니저 (mise.toml 또는 volta 설정 생성에 영향) */
  packageManager?: "volta" | "mise";
}

/**
 * scripts 패키지용 watch 훅 설정
 */
export interface SdWatchHookConfig {
  /** 감시할 glob 패턴 (패키지 디렉토리 기준 상대 경로) */
  target: string[];
  /** 변경 시 실행할 명령어 */
  cmd: string;
  /** 명령어 인수 */
  args?: string[];
}

/**
 * 스크립트 전용 패키지 설정 (watch 훅이 설정되지 않으면 watch/typecheck에서 제외)
 */
export interface SdScriptsPackageConfig {
  /** 빌드 타겟 */
  target: "scripts";
  /** 배포 설정 */
  publish?: SdPublishConfig;
  /** watch 훅 설정 (설정 시, watch 모드에 패키지가 포함됨) */
  watch?: SdWatchHookConfig;
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
  /** 패키지별 설정 (key: packages/ 하위 디렉토리명, 예: "core-common") */
  packages: Record<string, SdPackageConfig | undefined>;
  /**
   * 의존성 교체 설정 (node_modules 패키지를 로컬 소스로 심링크 교체)
   * - key: node_modules에서 찾을 패키지 glob 패턴 (예: "@simplysm/*")
   * - value: 소스 디렉토리 경로 (key의 *에서 캡처된 값이 value의 *에 치환됨)
   * - 예시: { "@simplysm/*": "../simplysm/packages/*" }
   */
  replaceDeps?: Record<string, string>;
  /** 배포 완료 후 실행할 스크립트 */
  postPublish?: SdPostPublishScriptConfig[];
}

/**
 * sd.config.ts 함수에 전달되는 매개변수
 */
export interface SdConfigParams {
  /** 현재 작업 디렉토리 */
  cwd: string;
  /** 개발 모드 플래그 */
  dev: boolean;
  /** 추가 옵션 (CLI의 -o 플래그에서 전달) */
  options: string[];
}

/**
 * sd.config.ts는 반드시 다음 형식의 함수를 default export해야 한다:
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
