# @simplysm/sd-cli — Configuration Types

sd.config.ts 작성 시 사용하는 설정 타입.
프로젝트 루트 `sd.config.ts` 는 SdConfigFn 함수를 default export 하며,
패키지별 빌드 target, 배포, 클라이언트/서버 패키징, Capacitor/Electron, PWA, watch 훅, 의존성 교체를 정의.

## SdConfigFn, SdConfigParams, SdConfig

sd.config.ts 의 기본 구조. 설정 함수가 받는 파라미터와 반환값.

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;

interface SdConfigParams {
  cwd: string;
  dev: boolean;
  opt: string[];
}

interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

- `SdConfigFn`: default export 함수 타입. SdConfigParams 받아 동기 또는 async SdConfig 반환.
- `SdConfigParams.cwd`: string — 현재 작업 디렉토리 (프로젝트 루트).
- `SdConfigParams.dev`: boolean — 개발 모드 플래그.
  - true = watch/dev 명령, false = build/publish.
  - 설정 함수가 dev/prod 별 분기 시 사용.
- `SdConfigParams.opt`: string[] — CLI `-o` 플래그 전달 옵션 배열 (예: `["--custom-flag"]`).
- `SdConfig.packages`: Record<string, SdPackageConfig | undefined> — 패키지별 설정.
  key = packages/ 하위 디렉토리명 (예: "core-common", "service-server"). value 에 undefined 허용하면 조건부 비활성화 가능.
- `SdConfig.replaceDeps?`: Record<string, string> — node_modules 패키지를 로컬 소스로 심링크 교체.
  key = glob 패턴 (예: "@simplysm/*"), value = 소스 경로.
  key 의 `*` 캡처가 value 의 `*` 에 치환됨 (예: "@simplysm/core-common" 찾을 때 "../simplysm/packages/core-common" 로 교체).
- `SdConfig.postPublish?`: SdPostPublishScriptConfig[] — 배포 완료 후 실행 스크립트 목록.

## SdPackageConfig, BuildTarget

패키지 타입별 설정 구분. target 값으로 어떤 설정 인터페이스인지 판별.

```typescript
type BuildTarget = "node" | "browser" | "neutral";

type SdPackageConfig =
  SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | SdScriptsPackageConfig;
```

- `BuildTarget`: 라이브러리 빌드 플랫폼.
  - "node": Node.js 전용 (CJS 진입점 포함).
  - "browser": 브라우저 ESM 전용 (Node API 제외).
  - "neutral": 환경 무관 ESM (DOM/Node API 제외).
- `SdPackageConfig`: target 값으로 타입 판별.
  - "node"|"browser"|"neutral" → SdBuildPackageConfig.
  - "client" → SdClientPackageConfig.
  - "server" → SdServerPackageConfig.
  - "scripts" → SdScriptsPackageConfig.

## SdBuildPackageConfig

라이브러리 패키지 (npm 배포 대상 모듈). 빌드만 수행, 앱 패키징 없음.

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

- `target`: "node" | "browser" | "neutral" — 빌드 대상 플랫폼.
- `publish?`: SdPublishConfig — 배포 설정 (npm/로컬/FTP). 미지정 시 배포 안 함.
- `copySrc?`: string[] — src/ 에서 dist/ 로 복사할 파일 glob 패턴. src/ 기준 상대 경로 (예: ["*.txt", "assets/**"]).
- `watch?`: SdWatchHookConfig — watch 모드 훅. 미지정 시 watch/typecheck 에서 제외.

## SdClientPackageConfig

클라이언트 앱 (웹/모바일/데스크톱). 개발 서버, Capacitor 모바일 빌드, Electron 데스크톱 빌드, PWA 지원.

```typescript
interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;
  exclude?: string[];
  browserSupport?: SdBrowserSupportConfig;
  pwa?: false | SdPwaConfig;
  prerender?: string[];
}
```

- `target`: "client" — 클라이언트 판별 literal.
- `server`: string | number — 연결 서버.
  - string: 서버 패키지 디렉토리명 (예: "demo-server"). sd-cli 가 해당 패키지 찾아 개발 서버 실행.
  - number: 포트 번호 직접 지정 (하위 호환, 비권장).
- `env?`: Record<string, string> — 빌드 시 치환 환경 변수. process.env.KEY → 상수 치환 (예: { API_URL: "https://api.example.com" }).
- `publish?`: SdPublishConfig — 배포 설정.
- `capacitor?`: SdCapacitorConfig — Capacitor 모바일 앱 패키징 (Android APK/AAB).
- `electron?`: SdElectronConfig — Electron 데스크톱 앱 패키징.
- `configs?`: Record<string, unknown> — 런타임 설정. 빌드 시 dist/.config.json 으로 기록.
- `exclude?`: string[] — Capacitor/Electron package.json 에서 제외할 npm 패키지 (예: ["webpack", "rollup"]).
- `browserSupport?`: SdBrowserSupportConfig — browserslist, PostCSS, 레거시 모듈 지원.
- `pwa?`: false | SdPwaConfig — PWA 설정.
  - false: 비활성화.
  - 미지정: 기본값 활성화.
  - SdPwaConfig: manifest 커스터마이징.
- `prerender?`: string[] — SSG 프리렌더 라우트 (예: ["/", "/about"]).
  - 지정 시 prod build 에서 src/main.server.ts 로 각 라우트 HTML 생성.
  - SPA 폴백 셸 = index.csr.html.
  - dev/watch 모드: 적용 안 됨 (SPA 개발 서버).

## SdServerPackageConfig

Fastify 기반 Node.js 서버 패키지. Capacitor/Electron 연결용 API 서버.

```typescript
interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;
  externals?: string[];
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  packageManager?: "volta" | "mise";
}
```

- `target`: "server" — 서버 판별 literal.
- `env?`: Record<string, string> — 빌드 시 치환 환경 변수. process.env.KEY 상수 치환.
- `publish?`: SdPublishConfig — 배포 설정.
- `configs?`: Record<string, unknown> — 런타임 설정 (dist/.config.json).
- `externals?`: string[] — esbuild 번들 제외 외부 모듈 (native binding, 클라이언트 패키지 등). binding.gyp 자동 감지에 추가.
- `pm2?`: { name?, ignoreWatchPaths? } — PM2 배포 설정. 지정 시 dist/pm2.config.cjs 생성.
  - `name?`: string — PM2 프로세스 이름. 미지정 시 package.json name 에서 생성.
  - `ignoreWatchPaths?`: string[] — PM2 watch 감시 제외 경로.
- `packageManager?`: "volta" | "mise" — 패키지 매니저. volta = volta 설정, mise = mise.toml 생성.

## SdScriptsPackageConfig

빌드, 배포 불필요한 스크립트 전용 패키지. watch 훅 설정 시만 watch 에 포함.

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

- `target`: "scripts" — 스크립트 판별 literal.
- `publish?`: SdPublishConfig — 배포 설정 (드물게 사용).
- `watch?`: SdWatchHookConfig — watch 훅. 미지정 시 watch/typecheck 제외.

## SdWatchHookConfig

watch 모드 감시 설정. 패키지 파일 변경 시 외부 명령 자동 실행.

```typescript
interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

- `target`: string[] — 감시 glob 패턴 배열 (패키지 기준 상대 경로). 예: ["src/**/_.ts", "_.json", "types/**"].
- `cmd`: string — 변경 시 실행 명령어 (예: "npm run gen", "tsx scripts/build.ts").
- `args?`: string[] — 명령 인수.

## SdPublishConfig, SdPostPublishScriptConfig

배포 및 postPublish 설정.

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;

interface SdNpmPublishConfig {
  type: "npm";
}

interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}

interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}

interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];
}
```

- `SdPublishConfig` union:
  - `{ type: "npm" }` — npm 레지스트리 배포.
  - `{ type: "local-directory", path: string }` — 로컬 디렉토리 복사. path 에 %VER%, %PROJECT% 환경 변수 치환 지원.
  - `{ type: "ftp" | "ftps" | "sftp", host, port?, path?, user?, password? }` — FTP/FTPS/SFTP 업로드.
    - "ftp": 평문 연결.
    - "ftps": TLS 암호화.
    - "sftp": SSH.
- `SdPostPublishScriptConfig`: 배포 완료 후 실행 스크립트.
  - `type: "script"` — 판별 literal.
  - `cmd`: string — 명령어 (예: "npm run notify-deploy").
  - `args`: string[] — 인수. %VER%, %PROJECT% 환경 변수 치환.

## SdCapacitorConfig

Capacitor 모바일 앱 패키징 설정 (Android APK/AAB, iOS).

```typescript
interface SdCapacitorConfig {
  appId: string;
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;
  debug?: boolean;
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}
```

- `appId`: string — 앱 ID (예: "com.example.myapp"). Android package name 사용.
- `appName`: string — 앱 표시 이름.
- `plugins?`: Record<string, Record<string, unknown> | true> — Capacitor 플러그인 설정. key = 플러그인 패키지명, value = 옵션 객체 또는 true (옵션 없음).
- `icon?`: string — 앱 아이콘 경로 (패키지 기준 상대 경로). PNG/JPG.
- `debug?`: boolean — 디버그 빌드 플래그.
- `platform?`: { android?: SdCapacitorAndroidConfig } — 플랫폼별 설정.

## SdCapacitorAndroidConfig, SdCapacitorSignConfig, SdCapacitorPermission, SdCapacitorIntentFilter

Android 플랫폼 설정 및 하위 타입.

```typescript
interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;
  bundle?: boolean;
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;
  permissions?: SdCapacitorPermission[];
}

interface SdCapacitorSignConfig {
  keystore: string;
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string;
}

interface SdCapacitorPermission {
  name: string;
  maxSdkVersion?: number;
  ignore?: string;
}

interface SdCapacitorIntentFilter {
  action?: string;
  category?: string;
}
```

- `SdCapacitorAndroidConfig`:
  - `config?`: Record<string, string> — AndroidManifest.xml <application> 속성 (예: { requestLegacyExternalStorage: "true" }).
  - `bundle?`: boolean — AAB 번들 빌드 (true) vs APK (false).
  - `intentFilters?`: SdCapacitorIntentFilter[] — Intent Filter 배열.
  - `sign?`: SdCapacitorSignConfig — 서명 설정 (APK/AAB).
  - `sdkVersion?`: number — Android minSdk, targetSdk 버전 (예: 33).
  - `permissions?`: SdCapacitorPermission[] — 추가 권한.
- `SdCapacitorSignConfig`:
  - `keystore`: string — keystore 파일 경로 (패키지 기준 상대 경로).
  - `storePassword`: string — keystore 비밀번호.
  - `alias`: string — 키 별칭.
  - `password`: string — 키 비밀번호.
  - `keystoreType?`: string — 타입 (기본값: "jks").
- `SdCapacitorPermission`:
  - `name`: string — 권한명 (예: "CAMERA", "WRITE_EXTERNAL_STORAGE").
  - `maxSdkVersion?`: number — 최대 SDK 버전. 초과 시 권한 미요청.
  - `ignore?`: string — tools:ignore 속성.
- `SdCapacitorIntentFilter`:
  - `action?`: string — Intent 액션 (예: "android.intent.action.VIEW").
  - `category?`: string — Intent 카테고리 (예: "android.intent.category.DEFAULT").

## SdElectronConfig

Electron 데스크톱 앱 패키징 설정.

```typescript
interface SdElectronConfig {
  appId: string;
  portable?: boolean;
  installerIcon?: string;
  reinstallDependencies?: string[];
  postInstallScript?: string;
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;
}
```

- `appId`: string — Electron 앱 ID (예: "com.example.myapp").
- `portable?`: boolean — 포터블 exe(true) vs NSIS 설치 프로그램(false/미지정).
- `installerIcon?`: string — 설치 프로그램 아이콘 (.ico, 패키지 기준 상대 경로).
- `reinstallDependencies?`: string[] — Electron 번들 포함 npm 패키지 (native binding, sqlite3 등).
- `postInstallScript?`: string — npm postinstall 스크립트 (Electron 자동 실행).
- `nsisOptions?`: Record<string, unknown> — NSIS 옵션 (portable = false 일 때).
- `env?`: Record<string, string> — 환경 변수. electron-main.ts 에서 process.env 로 접근.

## SdPwaConfig, SdPwaManifestConfig

PWA (Progressive Web App) 설정.

```typescript
interface SdPwaConfig {
  manifest?: SdPwaManifestConfig;
}

interface SdPwaManifestConfig {
  name?: string;
  short_name?: string;
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}
```

- `SdPwaConfig.manifest?`: SdPwaManifestConfig — manifest 커스터마이징. 미지정 시 기본값 사용.
- `SdPwaManifestConfig`:
  - `name?`: string — 앱 긴 이름.
  - `short_name?`: string — 앱 짧은 이름 (홈 화면 표시).
  - `display?`: "standalone" | "fullscreen" | "minimal-ui" | "browser" — 표시 모드.
    - "standalone": 전체 앱 (주소바 숨김).
    - "fullscreen": 전체 화면 (상태바 숨김).
    - "minimal-ui": 최소 브라우저 UI.
    - "browser": 일반 브라우저.
  - `theme_color?`: string — 테마 컬러 (hex/rgb, 예: "#1976d2").
  - `background_color?`: string — 배경 컬러.
  - `icons?`: Array<{ src, sizes, type? }> — 아이콘 배열.
    - `src`: string — 파일 경로.
    - `sizes`: string — 크기 (예: "192x192").
    - `type?`: string — MIME type (예: "image/png").

## SdBrowserSupportConfig

브라우저 호환성 및 PostCSS 설정.

```typescript
interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;
}
```

- `browserslist?`: string | string[] — Browserslist 쿼리.
  - string: 단일 쿼리 (예: "last 2 Chrome versions").
  - string[]: 배열 (예: ["ie 11", "last 2 versions"]).
- `postCss?`: { plugins: [string, (object | string)?][] } — PostCSS 플러그인 설정.
  - plugins: [플러그인명, 옵션] 튜플 배열. 옵션은 객체 또는 문자열.
- `legacyModule?`: boolean — 레거시 모듈 지원.
  - true: 코드 분할 비활성화, import.meta 치환.

## NpmConfig

npm package.json 구조 (보조 타입).

```typescript
interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  volta?: unknown;
}
```

- `name`: string — 패키지명.
- `version`: string — 버전.
- `description?`: string — 설명.
- `dependencies?`: Record<string, string> — 의존성 맵.
- `devDependencies?`: Record<string, string> — 개발 의존성.
- `peerDependencies?`: Record<string, string> — 동료 의존성.
- `volta?`: unknown — volta 버전 관리 설정.
