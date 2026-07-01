# @simplysm/sd-cli — sd.config.ts 설정 타입군

프로젝트 루트 `sd.config.ts` 가 default export 해야 하는 함수(`SdConfigFn`)와 그 반환값(`SdConfig`)을 구성하는 타입 묶음. 앱 작성자가 직접 손으로 쓰는 설정이므로 필드별 의미를 빠짐없이 정리한다. 패키지 target, 배포, 클라이언트/서버 앱 패키징, Capacitor/Electron, PWA, watch 훅, 의존성 교체 구조를 함께 본다.

## SdConfigFn / SdConfigParams / SdConfig

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

- `SdConfigFn` — `sd.config.ts` 가 default export 해야 하는 함수 타입; `SdConfigParams` 를 받아 동기 `SdConfig` 또는 `Promise<SdConfig>` 를 반환한다.
- `params: SdConfigParams` — sd-cli 가 설정 함수에 전달하는 실행 컨텍스트.
- `cwd: string` — 현재 작업 디렉토리.
- `dev: boolean` — 개발 모드 플래그(`true`=개발, `false`=프로덕션). 설정 함수가 dev/prod 별로 분기할 때 사용.
- `opt: string[]` — CLI `-o`/`--opt` 옵션에서 전달된 추가 옵션 문자열 배열.
- `packages: Record<string, SdPackageConfig | undefined>` — 키는 `packages/` 하위 디렉토리명(예: `"core-common"`), 값은 패키지별 설정. 값에 `undefined` 가 허용되어 조건부로 패키지를 비활성화할 수 있다.
- `replaceDeps?: Record<string, string>` — node_modules 패키지를 로컬 소스로 심링크 교체하는 설정. 키는 찾을 glob(예: `"@simplysm/*"`), 값은 소스 경로이며 키의 `*` 캡처가 값의 `*` 에 치환된다.
- `postPublish?: SdPostPublishScriptConfig[]` — 배포 완료 후 실행할 스크립트 설정 목록.

## SdPackageConfig / BuildTarget

```typescript
type BuildTarget = "node" | "browser" | "neutral";

type SdPackageConfig =
  SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | SdScriptsPackageConfig;
```

- `BuildTarget` — esbuild 기반 라이브러리 패키지의 빌드 플랫폼 target literal 묶음.
- `"node"` — Node.js 전용 패키지로 빌드.
- `"browser"` — 브라우저 전용 패키지로 빌드.
- `"neutral"` — Node/브라우저 공용 패키지로 빌드.
- `SdPackageConfig` — `target` 값으로 판별하는 패키지 설정 유니온. `"node"/"browser"/"neutral"`→`SdBuildPackageConfig`, `"client"`→`SdClientPackageConfig`, `"server"`→`SdServerPackageConfig`, `"scripts"`→`SdScriptsPackageConfig`.

## SdBuildPackageConfig

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

- `target: "node" | "browser" | "neutral"` — 라이브러리 패키지 빌드 target.
- `publish?: SdPublishConfig` — 패키지 배포 설정.
- `copySrc?: string[]` — `src/` 에서 `dist/` 로 복사할 glob 패턴 목록(각 패턴은 `src/` 기준 상대 경로).
- `watch?: SdWatchHookConfig` — 설정 시 watch 모드에서 빌드 엔진과 함께 실행되는 훅.

## SdClientPackageConfig

`prerender` 로 SSG 라우트를 지정할 때 사용법: [client-ssg.md](../../manuals/client-ssg.md)

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

- `target: "client"` — 클라이언트(esbuild) 패키지 설정을 고르는 판별 literal.
- `server: string | number` — `string` 은 연결할 서버 패키지명(예: `"demo-server"`), `number` 는 포트 직접 지정(하위 호환).
- `env?: Record<string, string>` — 빌드 시 `process.env` 를 객체로 치환할 환경 변수 맵.
- `publish?: SdPublishConfig` — 클라이언트 배포 설정.
- `capacitor?: SdCapacitorConfig` — Capacitor 앱 패키징 설정.
- `electron?: SdElectronConfig` — Electron 앱 패키징 설정.
- `configs?: Record<string, unknown>` — 빌드 시 `dist/.config.json` 으로 기록할 런타임 설정.
- `exclude?: string[]` — Capacitor/Electron `package.json` 에 추가할 패키지 목록.
- `browserSupport?: SdBrowserSupportConfig` — browserslist·PostCSS·legacy module 지원 설정.
- `pwa?: false | SdPwaConfig` — `false` 는 PWA 비활성화, 객체는 PWA 세부 설정, 미지정은 기본값으로 활성화.
- `prerender?: string[]` — SSG(빌드 타임 프리렌더) 라우트 목록(예: `["/", "/about"]`). 지정 시 프로덕션 빌드에서 `src/main.server.ts` 진입점으로 라우트별 HTML 을 생성하고, SPA 셸은 `index.csr.html` 로 별도 출력(비프리렌더 라우트 딥링크 폴백용)하며, dev/watch 모드에는 적용되지 않는다.

## SdServerPackageConfig

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

- `target: "server"` — Fastify 서버 패키지 설정을 고르는 판별 literal.
- `env?: Record<string, string>` — 빌드 시 `process.env.KEY` 를 상수로 치환할 환경 변수 맵.
- `publish?: SdPublishConfig` — 서버 배포 설정.
- `configs?: Record<string, unknown>` — 빌드 시 `dist/.config.json` 으로 기록할 런타임 설정.
- `externals?: string[]` — esbuild 번들에 포함하지 않을 외부 모듈 목록(자동 `binding.gyp` 감지분에 추가).
- `pm2?: { name?: string; ignoreWatchPaths?: string[] }` — 지정 시 `dist/pm2.config.cjs` 를 생성하는 PM2 설정.
- `pm2.name?: string` — PM2 프로세스 이름; 미지정 시 `package.json` name 에서 생성된다.
- `pm2.ignoreWatchPaths?: string[]` — PM2 watch 제외 경로 목록.
- `packageManager?: "volta" | "mise"` — 사용할 패키지 매니저; `"volta"` 는 volta 설정, `"mise"` 는 `mise.toml` 생성에 영향을 준다.

## SdScriptsPackageConfig / SdWatchHookConfig

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}

interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

- `target: "scripts"` — 스크립트 전용 패키지 설정을 고르는 판별 literal.
- `publish?: SdPublishConfig` — 스크립트 패키지 배포 설정.
- `watch?: SdWatchHookConfig` — 설정 시 watch 모드에 패키지가 포함되는 훅; 미설정이면 watch/typecheck 에서 제외된다.
- `SdWatchHookConfig.target: string[]` — 감시할 glob 패턴 목록(각 패턴은 패키지 디렉토리 기준 상대 경로).
- `cmd: string` — 변경 시 실행할 명령어.
- `args?: string[]` — 명령어 인수 목록.

## SdPublishConfig / SdPostPublishScriptConfig

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

- `SdPublishConfig` — `type` 으로 npm·로컬 디렉토리·스토리지 배포를 구분하는 유니온.
- `SdNpmPublishConfig.type: "npm"` — npm 레지스트리 배포.
- `SdLocalDirectoryPublishConfig.type: "local-directory"` — 로컬 디렉토리 복사 배포.
- `SdLocalDirectoryPublishConfig.path: string` — 배포 대상 경로; `%VER%`·`%PROJECT%` 환경 변수 치환을 지원한다.
- `SdStoragePublishConfig.type: "ftp" | "ftps" | "sftp"` — 스토리지 업로드 프로토콜(`"ftp"` 평문, `"ftps"` TLS, `"sftp"` SSH).
- `host: string` — 업로드 서버 host.
- `port?: number` — 업로드 서버 port.
- `path?: string` — 업로드 대상 경로.
- `user?: string` — 접속 사용자명.
- `password?: string` — 접속 비밀번호.
- `SdPostPublishScriptConfig.type: "script"` — postPublish 스크립트 판별 literal.
- `SdPostPublishScriptConfig.cmd: string` — 배포 완료 후 실행할 명령.
- `SdPostPublishScriptConfig.args: string[]` — 스크립트 인수 목록; `%VER%`·`%PROJECT%` 환경 변수 치환을 지원한다.

## SdCapacitorConfig

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

- `appId: string` — Capacitor 앱 ID(예: `"com.example.app"`).
- `appName: string` — Capacitor 앱 이름.
- `plugins?: Record<string, Record<string, unknown> | true>` — 키는 Capacitor 플러그인 패키지명, 값은 플러그인 옵션 객체이거나 옵션 없는 활성화 literal `true`.
- `icon?: string` — 앱 아이콘 경로(패키지 디렉토리 기준 상대 경로).
- `debug?: boolean` — 디버그 빌드 플래그.
- `platform?: { android?: SdCapacitorAndroidConfig }` — 플랫폼별 설정 컨테이너.
- `platform.android?: SdCapacitorAndroidConfig` — Android 플랫폼 설정.

## SdCapacitorAndroidConfig / 하위 타입

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

- `config?: Record<string, string>` — `AndroidManifest.xml` 의 `application` 태그 속성 맵(예: `{ requestLegacyExternalStorage: "true" }`).
- `bundle?: boolean` — `true` 면 AAB 번들, `false` 면 APK 로 빌드.
- `intentFilters?: SdCapacitorIntentFilter[]` — Android intent filter 설정 목록.
- `sign?: SdCapacitorSignConfig` — APK/AAB 서명 설정.
- `sdkVersion?: number` — Android `minSdk`·`targetSdk` 버전 값.
- `permissions?: SdCapacitorPermission[]` — 추가 Android 권한 설정 목록.
- `SdCapacitorSignConfig.keystore: string` — keystore 파일 경로(패키지 디렉토리 기준 상대 경로).
- `storePassword: string` — keystore 비밀번호.
- `alias: string` — keystore 키 별칭.
- `password: string` — keystore 키 비밀번호.
- `keystoreType?: string` — keystore 타입; 기본값 `"jks"`.
- `SdCapacitorPermission.name: string` — Android 권한 이름(예: `"CAMERA"`).
- `maxSdkVersion?: number` — 권한의 최대 SDK 버전.
- `ignore?: string` — 권한의 `tools:ignore` 속성 값.
- `SdCapacitorIntentFilter.action?: string` — intent action 값(예: `"android.intent.action.VIEW"`).
- `category?: string` — intent category 값(예: `"android.intent.category.DEFAULT"`).

## SdElectronConfig

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

- `appId: string` — Electron 앱 ID(예: `"com.example.myapp"`).
- `portable?: boolean` — `true` 는 포터블 `.exe`, `false`/미지정은 NSIS 설치 프로그램.
- `installerIcon?: string` — 설치 프로그램 아이콘 경로(`.ico`, 패키지 디렉토리 기준 상대 경로).
- `reinstallDependencies?: string[]` — Electron 에 포함할 npm 패키지(네이티브 모듈 등) 목록.
- `postInstallScript?: string` — npm postinstall 스크립트.
- `nsisOptions?: Record<string, unknown>` — `portable` 이 `false` 일 때 적용하는 NSIS 옵션.
- `env?: Record<string, string>` — `electron-main.ts` 에서 `process.env` 로 접근할 환경 변수 맵.

## SdPwaConfig / SdBrowserSupportConfig

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
interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;
}
```

- `SdPwaConfig.manifest?: SdPwaManifestConfig` — PWA manifest 설정.
- `name?: string` — manifest `name` 값.
- `short_name?: string` — manifest `short_name` 값.
- `display?: "standalone" | "fullscreen" | "minimal-ui" | "browser"` — manifest `display` 표시 모드 값(`"standalone"` 독립 앱, `"fullscreen"` 전체화면, `"minimal-ui"` 최소 UI, `"browser"` 브라우저 탭).
- `theme_color?: string` — manifest `theme_color` 값.
- `background_color?: string` — manifest `background_color` 값.
- `icons?: Array<{ src; sizes; type? }>` — manifest icon 항목 목록.
- `icons[].src: string` — icon 파일 경로.
- `icons[].sizes: string` — icon 크기 문자열.
- `icons[].type?: string` — icon MIME type.
- `SdBrowserSupportConfig.browserslist?: string | string[]` — browserslist 쿼리(예: `"last 2 Chrome versions"`, `["ie 11", "last 2 versions"]`).
- `postCss?: { plugins: [string, (object | string)?][] }` — PostCSS 플러그인 설정 컨테이너.
- `postCss.plugins[]: [string, (object | string)?]` — 첫 원소는 플러그인 이름, 둘째 원소는 선택적 플러그인 옵션(객체 또는 문자열).
- `legacyModule?: boolean` — `true` 면 레거시 모듈 지원(코드 분할 비활성화 + `import.meta` 치환).

## NpmConfig

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

npm `package.json` 구조를 나타내는 보조 타입.

- `name: string` — 패키지 name.
- `version: string` — 패키지 version.
- `description?: string` — 패키지 description.
- `dependencies?: Record<string, string>` — dependencies 맵.
- `devDependencies?: Record<string, string>` — devDependencies 맵.
- `peerDependencies?: Record<string, string>` — peerDependencies 맵.
- `volta?: unknown` — `package.json` 의 volta 설정 값.
