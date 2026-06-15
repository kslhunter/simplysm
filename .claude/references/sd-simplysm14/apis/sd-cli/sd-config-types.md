# @simplysm/sd-cli — sd.config.ts 설정 타입

프로젝트 루트 `sd.config.ts` 는 `SdConfigFn` 형태의 함수를 `default export` 해야 한다 — `(params: SdConfigParams) => SdConfig | Promise<SdConfig>`. sd-cli 가 이 함수를 호출해 패키지별 빌드 타겟·배포·앱 패키징·의존성 교체를 결정한다. 모든 타입은 entry 의 `export *` 로 노출되며 `import type { ... } from "@simplysm/sd-cli"` 로 가져온다.

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

`SdConfigParams` — sd-cli 가 config 함수에 넘기는 인자:

- **cwd**: string — 현재 작업 디렉토리(워크스페이스 루트).
- **dev**: boolean — 개발 모드 플래그. `true`(`watch`/`dev`)와 `false`(프로덕션 `build`/`pub`)에 따라 다른 설정을 반환하는 분기에 쓴다.
- **opt**: string[] — CLI `-o <opt>` 로 전달된 추가 옵션 배열.

`SdConfig` — config 함수 반환값:

- **packages**: `Record<string, SdPackageConfig | undefined>` — 키는 `packages/` 하위 디렉토리명(예: `"core-common"`), 값은 그 패키지의 빌드 설정. `undefined` 면 빌드 대상에서 제외.
- **replaceDeps**: `Record<string, string>` — node_modules 패키지를 로컬 소스로 심링크 교체. 키는 node_modules 에서 찾을 glob(예: `"@simplysm/*"`), 값은 소스 디렉토리 경로이며 키의 `*` 캡처가 값의 `*` 에 치환됨(예: `"../simplysm/packages/*"`). 로컬 소스를 빌드 없이 곧바로 참조하게 만든다.
- **postPublish**: `SdPostPublishScriptConfig[]` — 배포 완료 후 실행할 스크립트 목록.

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
  },
});
export default config;
```

## SdPackageConfig (타겟별 패키지 설정)

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig    // target: "node" | "browser" | "neutral"
  | SdClientPackageConfig   // target: "client"
  | SdServerPackageConfig   // target: "server"
  | SdScriptsPackageConfig; // target: "scripts"

type BuildTarget = "node" | "browser" | "neutral";
```

`target` literal 로 어느 멤버인지 구분하는 판별 유니온. `target` 별 동작 차이:

- **`"node"`** — Node.js 전용 라이브러리 패키지(esbuild 빌드, npm 배포용).
- **`"browser"`** — 브라우저 전용 라이브러리 패키지.
- **`"neutral"`** — Node/브라우저 공용 라이브러리 패키지.
- **`"client"`** — Frontend 앱 패키지(Angular + Capacitor/Electron/PWA).
- **`"server"`** — Fastify 서버 앱 패키지.
- **`"scripts"`** — 유틸 패키지(watch 훅으로 임의 명령 실행).

### SdBuildPackageConfig (node/browser/neutral)

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

- **target**: `"node" | "browser" | "neutral"` — 위 BuildTarget 동작 차이 참조.
- **publish**: `SdPublishConfig` — 배포 설정(아래 §배포 설정). 라이브러리 패키지는 보통 `{ type: "npm" }`.
- **copySrc**: string[] — `src/`→`dist/` 로 그대로 복사할 파일의 glob 패턴(`src/` 기준 상대). esbuild 번들에 포함되지 않는 정적 자원을 dist 에 남길 때.
- **watch**: `SdWatchHookConfig` — 설정 시 watch 모드에서 빌드 엔진과 함께 훅이 실행됨.

### SdClientPackageConfig (client)

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

- **server**: `string | number` — string 이면 연결할 서버 패키지명(예: `"demo-server"`), number 이면 포트 직접 지정(하위 호환).
- **env**: `Record<string, string>` — 빌드 시 치환할 환경 변수. `process.env` 를 이 객체로 치환(define 주입).
- **publish**: `SdPublishConfig` — 배포 설정.
- **capacitor**: `SdCapacitorConfig` — 모바일(Capacitor) 패키징 설정. 지정 시 앱을 Android 등으로 빌드.
- **electron**: `SdElectronConfig` — 데스크톱(Electron) 패키징 설정.
- **configs**: `Record<string, unknown>` — 런타임 설정. 빌드 시 `dist/.config.json` 으로 기록되어 앱이 런타임에 읽음.
- **exclude**: string[] — Capacitor/Electron package.json 에 추가할(번들에서 제외할) 패키지.
- **browserSupport**: `SdBrowserSupportConfig` — browserslist/PostCSS/legacyModule 등 브라우저 지원 설정.
- **pwa**: `false | SdPwaConfig` — `false` 면 PWA 비활성화. 미지정 시 기본값으로 활성화. 객체면 manifest 등 세부 지정.
- **prerender**: string[] — SSG(빌드 타임 프리렌더) 라우트 목록(예: `["/", "/about"]`). 지정 시 프로덕션 빌드에서 `src/main.server.ts` 진입점으로 라우트별 HTML 을 생성하고, SPA 셸은 `index.csr.html` 로 별도 출력. dev/watch 모드에는 적용되지 않음. 라우트는 `"/"` 로 시작.

```typescript
"client-portal": {
  target: "client",
  server: "server",
  prerender: ["/", "/about"],
},
```

### SdServerPackageConfig (server)

```typescript
interface SdServerPackageConfig {
  target: "server";
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;
  externals?: string[];
  pm2?: { name?: string; ignoreWatchPaths?: string[] };
  packageManager?: "volta" | "mise";
}
```

- **env**: `Record<string, string>` — 빌드 시 치환할 환경 변수. `process.env.KEY` 를 상수로 치환(esbuild banner 주입).
- **configs**: `Record<string, unknown>` — 런타임 설정. 빌드 시 `dist/.config.json` 으로 기록.
- **externals**: string[] — esbuild 번들에 포함하지 않을 외부 모듈. 자동 `binding.gyp` 감지 목록에 추가됨(네이티브 모듈 외부화).
- **pm2**: 지정 시 `dist/pm2.config.cjs` 생성. `name` 은 PM2 프로세스 이름(미지정 시 package.json name 에서 생성), `ignoreWatchPaths` 는 PM2 watch 제외 경로.
- **packageManager**: `"volta" | "mise"` — 사용할 패키지 매니저. `mise.toml` 또는 volta 설정 생성에 영향.

### SdScriptsPackageConfig (scripts)

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}

interface SdWatchHookConfig {
  target: string[]; // 감시할 glob (패키지 디렉토리 기준 상대)
  cmd: string;      // 변경 시 실행할 명령어
  args?: string[];  // 명령어 인수
}
```

- **SdScriptsPackageConfig.watch**: `SdWatchHookConfig` — 설정 시에만 watch 모드에 패키지가 포함됨. 미설정이면 watch/typecheck 에서 제외.
- **SdWatchHookConfig.target**: string[] — 감시할 glob 패턴(패키지 디렉토리 기준 상대 경로).
- **SdWatchHookConfig.cmd / args**: 변경 감지 시 실행할 명령어와 인수.

## 배포 설정 (SdPublishConfig)

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;

interface SdNpmPublishConfig { type: "npm"; }
interface SdLocalDirectoryPublishConfig { type: "local-directory"; path: string; }
interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string; port?: number; path?: string; user?: string; password?: string;
}

interface SdPostPublishScriptConfig { type: "script"; cmd: string; args: string[]; }
```

`type` literal 로 배포 방식 판별:

- **`"npm"`** — npm 레지스트리에 배포. 추가 필드 없음.
- **`"local-directory"`** — 로컬 디렉토리로 복사. `path` 는 대상 경로이며 환경 변수 치환 지원(`%VER%`, `%PROJECT%`).
- **`"ftp" | "ftps" | "sftp"`** — 스토리지 서버에 업로드. `host` 필수, `port`/`path`/`user`/`password` 는 선택.

`SdPostPublishScriptConfig` — `SdConfig.postPublish` 항목. `type: "script"` 고정, `cmd` 실행 명령, `args` 인수(환경 변수 치환 지원: `%VER%`, `%PROJECT%`).

```typescript
"excel": { target: "neutral", publish: { type: "npm" } },
"client": { target: "client", server: "server", publish: { type: "ftp", host: "...", path: "/www" } },
```

## Capacitor 설정 (SdCapacitorConfig)

```typescript
interface SdCapacitorConfig {
  appId: string;
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;
  debug?: boolean;
  platform?: { android?: SdCapacitorAndroidConfig };
}
```

- **appId**: string — 앱 ID(예: `"com.example.app"`).
- **appName**: string — 앱 이름.
- **plugins**: `Record<string, Record<string, unknown> | true>` — Capacitor 플러그인 설정. key 는 패키지명, value 는 `true`(옵션 없이 활성) 또는 플러그인 옵션 객체.
- **icon**: string — 앱 아이콘 경로(패키지 디렉토리 기준 상대).
- **debug**: boolean — 디버그 빌드 플래그.
- **platform.android**: `SdCapacitorAndroidConfig` — Android 플랫폼 세부 설정.

```typescript
interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;      // AndroidManifest application 태그 속성
  bundle?: boolean;                     // false=APK (true/미지정=AAB 번들)
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;                  // minSdk/targetSdk
  permissions?: SdCapacitorPermission[];
}

interface SdCapacitorSignConfig {
  keystore: string;       // keystore 파일 경로 (패키지 기준 상대)
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string;  // 기본값 "jks"
}

interface SdCapacitorPermission {
  name: string;           // 예: "CAMERA"
  maxSdkVersion?: number;
  ignore?: string;        // tools:ignore 속성 값
}

interface SdCapacitorIntentFilter {
  action?: string;        // 예: "android.intent.action.VIEW"
  category?: string;      // 예: "android.intent.category.DEFAULT"
}
```

- **SdCapacitorAndroidConfig.config**: `Record<string, string>` — AndroidManifest.xml `application` 태그 속성(예: `{ requestLegacyExternalStorage: "true" }`).
- **SdCapacitorAndroidConfig.bundle**: boolean — `false` 면 APK 로 빌드(AAB 번들 빌드 플래그).
- **SdCapacitorAndroidConfig.sdkVersion**: number — Android SDK 버전(minSdk, targetSdk).
- **SdCapacitorSignConfig.keystoreType**: string — keystore 타입, 기본값 `"jks"`.
- **SdCapacitorPermission.maxSdkVersion / ignore**: 권한별 최대 SDK 버전과 `tools:ignore` 속성 값.

## Electron 설정 (SdElectronConfig)

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

- **appId**: string — Electron 앱 ID(예: `"com.example.myapp"`).
- **portable**: boolean — `true` 면 포터블 `.exe`, `false`/미지정이면 NSIS 설치 프로그램.
- **installerIcon**: string — 설치 프로그램 아이콘(`.ico`, 패키지 기준 상대).
- **reinstallDependencies**: string[] — Electron 에 포함할 npm 패키지(네이티브 모듈 등).
- **postInstallScript**: string — npm postinstall 스크립트.
- **nsisOptions**: `Record<string, unknown>` — NSIS 옵션(`portable` 이 `false` 일 때).
- **env**: `Record<string, string>` — 환경 변수. `electron-main.ts` 에서 `process.env` 로 접근 가능.

## PWA 설정 (SdPwaConfig) / 브라우저 지원 (SdBrowserSupportConfig)

```typescript
interface SdPwaConfig { manifest?: SdPwaManifestConfig; }

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

- **SdPwaManifestConfig.display**: `"standalone" | "fullscreen" | "minimal-ui" | "browser"` — PWA 표시 모드(웹 앱 manifest `display` 그대로).
- **SdBrowserSupportConfig.browserslist**: `string | string[]` — browserslist 쿼리(예: `"last 2 Chrome versions"` 또는 `["ie 11", "last 2 versions"]`).
- **SdBrowserSupportConfig.postCss**: PostCSS 플러그인 설정. `plugins` 는 `[name, options]` 튜플 배열.
- **SdBrowserSupportConfig.legacyModule**: boolean — 레거시 모듈 지원. 코드 분할 비활성화 + `import.meta` 치환.

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

npm `package.json` 구조 타입. sd.config 설정값은 아니며, package.json 을 다루는 보조 타입으로 entry 에서 함께 노출된다.
