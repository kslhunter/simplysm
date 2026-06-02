# @simplysm/sd-cli — sd.config.ts 설정 타입

프로젝트 루트 `sd.config.ts` 작성·수정 시 함께 읽히는 타입 묶음. `sd.config.ts` 는 `SdConfigFn` 을 default export 해야 한다. 권위 소스는 `packages/sd-cli/src/sd-config.types.ts`. 모든 타입은 `import type { ... } from "@simplysm/sd-cli"` 로 가져온다.

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

`SdConfigParams` (sd-cli 가 설정 함수에 주입):

- cwd: string — 현재 작업 디렉토리(워크스페이스 루트). 설정에서 경로를 절대화할 때 쓴다.
- dev: boolean — 개발 모드 플래그. true 면 dev 실행(watch/dev). env·publish 를 모드별로 분기할 때 쓴다.
- opt: string[] — CLI 의 `-o` 플래그로 넘어온 추가 옵션 배열. 임의 빌드 변형(예: 특정 환경 타겟)을 분기할 때 쓴다.

`SdConfig`:

- packages: Record<string, SdPackageConfig | undefined> — 키는 `packages/` 하위 디렉토리명(예: `"core-common"`), 값은 해당 패키지 빌드 설정. `undefined` 면 그 패키지를 빌드 대상에서 제외. 워크스페이스의 어떤 패키지를 어떤 타겟으로 빌드할지 한 곳에 모은다.
- replaceDeps?: Record<string, string> — 의존성 교체(심링크). 키는 node_modules 에서 찾을 패키지 glob(예: `"@simplysm/*"`), 값은 로컬 소스 디렉토리 경로로 키의 `*` 캡처가 값의 `*` 에 치환됨(예: `"../simplysm/packages/*"`). 배포된 패키지 대신 로컬 소스를 곧바로 쓰고 싶을 때.
- postPublish?: SdPostPublishScriptConfig[] — 배포 완료 후 순차 실행할 스크립트 목록. 배포 후 알림·태깅 등 후처리에 쓴다.

사용 예:

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = ({ dev }) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node", publish: { type: "npm" } },
    "demo-client": dev ? { target: "client", server: "demo-server" } : undefined,
  },
});
export default config;
```

## SdPackageConfig (빌드 타겟 분기 유니온)

```typescript
type SdPackageConfig =
  | SdBuildPackageConfig    // target: "node" | "browser" | "neutral"
  | SdClientPackageConfig   // target: "client"
  | SdServerPackageConfig   // target: "server"
  | SdScriptsPackageConfig; // target: "scripts"
```

판별자는 `target`. enum literal 별 의미:

- "node" / "browser" / "neutral" (→ `SdBuildPackageConfig`) — esbuild 라이브러리 패키지. "node" = Node.js 전용, "browser" = 브라우저 전용, "neutral" = 공용. npm 배포 라이브러리에 쓴다.
- "client" (→ `SdClientPackageConfig`) — Frontend 앱(Angular + Capacitor/Electron/PWA 옵션). esbuild + define 으로 env 주입.
- "server" (→ `SdServerPackageConfig`) — Fastify 서버 앱. esbuild banner 로 env 주입, PM2 옵션.
- "scripts" (→ `SdScriptsPackageConfig`) — 유틸 패키지. watch 훅이 없으면 watch/typecheck 대상에서 제외됨.

### SdBuildPackageConfig (node/browser/neutral)

```typescript
interface SdBuildPackageConfig {
  target: BuildTarget; // "node" | "browser" | "neutral"
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

- target: "node"|"browser"|"neutral" — 빌드 런타임 타겟(위 풀이 참조). 라이브러리가 어느 환경에서 돌지에 맞춰 고른다.
- publish?: SdPublishConfig — 배포 대상 설정. 미지정 시 배포 안 함. npm 배포 라이브러리면 `{ type: "npm" }`.
- copySrc?: string[] — `src/` 에서 `dist/` 로 그대로 복사할 파일 glob(src 기준 상대). 컴파일 대상 아닌 정적 리소스를 산출물에 포함할 때.
- watch?: SdWatchHookConfig — watch 모드에서 빌드 엔진과 함께 실행할 훅. 빌드 외 부수 작업(코드 생성 등)을 watch 에 끼울 때.

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
}
```

- server: string | number — 연결할 dev 서버. string = 서버 패키지명(예: `"demo-server"`), number = 포트 직접 지정(하위 호환). 보통 같은 워크스페이스의 서버 패키지명을 준다.
- env?: Record<string, string> — 빌드 시 `process.env` 를 객체로 치환할 환경 변수. 프론트 코드에 빌드 타임 상수를 주입할 때.
- publish?: SdPublishConfig — 산출물 배포 설정.
- capacitor?: SdCapacitorConfig — Capacitor 모바일 앱 패키징 설정. 지정 시 Android 등으로 패키징.
- electron?: SdElectronConfig — Electron 데스크톱 앱 패키징 설정.
- configs?: Record<string, unknown> — 런타임 설정. 빌드 시 `dist/.config.json` 으로 기록되어 앱이 런타임에 읽음. 배포 환경별 가변 값.
- exclude?: string[] — Capacitor/Electron `package.json` 에 추가(번들 제외)할 패키지 목록.
- browserSupport?: SdBrowserSupportConfig — 브라우저 호환(browserslist/PostCSS/legacyModule) 설정.
- pwa?: false | SdPwaConfig — PWA 설정. `false` 면 비활성화, 미지정 시 기본값으로 활성화, 객체면 manifest 커스텀. PWA 가 필요 없으면 `false`.

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

- env?: Record<string, string> — 빌드 시 `process.env.KEY` 를 상수로 치환(esbuild banner). 서버 빌드 타임 상수 주입.
- configs?: Record<string, unknown> — 런타임 설정. `dist/.config.json` 으로 기록.
- externals?: string[] — esbuild 번들에 포함하지 않을 외부 모듈. 자동 `binding.gyp` 감지 항목에 더해짐. 네이티브 모듈을 번들에서 뺄 때.
- pm2?.name?: string — PM2 프로세스 이름. 미지정 시 `package.json` name 에서 생성. 지정 시 `dist/pm2.config.cjs` 생성.
- pm2?.ignoreWatchPaths?: string[] — PM2 watch 에서 제외할 경로.
- packageManager?: "volta" | "mise" — 산출물에 생성할 패키지 매니저 설정 종류. "volta" = volta 설정, "mise" = `mise.toml` 생성. 배포 서버의 매니저에 맞춘다.

### SdScriptsPackageConfig (scripts)

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

- watch?: SdWatchHookConfig — watch 훅. 지정해야만 이 패키지가 watch 모드에 포함됨(미지정 시 watch/typecheck 제외). 파일 변경 시 임의 명령 실행에 쓴다.

## SdWatchHookConfig

```typescript
interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

- target: string[] — 감시할 glob 패턴(패키지 디렉토리 기준 상대). 어떤 파일 변경에 반응할지.
- cmd: string — 변경 감지 시 실행할 명령어.
- args?: string[] — 명령어 인수.

## 배포 설정 (SdPublishConfig 유니온 + SdPostPublishScriptConfig)

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

판별자는 `type`:

- `SdNpmPublishConfig` — `{ type: "npm" }`. npm 레지스트리 배포. 공개 라이브러리에 쓴다.
- `SdLocalDirectoryPublishConfig` — `{ type: "local-directory"; path: string }`. 로컬 디렉토리로 복사. `path` 는 `%VER%`/`%PROJECT%` 치환 지원. 사내 공유 폴더 배포에.
- `SdStoragePublishConfig` — `{ type: "ftp"|"ftps"|"sftp"; host; port?; path?; user?; password? }`. type 별 프로토콜 차이(ftp = 평문, ftps = TLS, sftp = SSH). 원격 서버 업로드 배포에. host 만 필수, 나머지는 선택.

```typescript
interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[]; // %VER%, %PROJECT% 치환 지원
}
```

- cmd: string — 배포 후 실행할 명령어.
- args: string[] — 인수. `%VER%`(버전), `%PROJECT%`(프로젝트명) 치환됨.

## Capacitor 설정 (client 의 capacitor)

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

- appId: string — 앱 ID(역도메인, 예: `"com.example.app"`). 스토어 식별자.
- appName: string — 앱 표시 이름.
- plugins?: Record<string, Record<string, unknown> | true> — Capacitor 플러그인. 키 = 패키지명, 값 = `true`(옵션 없이 활성) 또는 옵션 객체. 옵션이 필요 없으면 `true`.
- icon?: string — 앱 아이콘 경로(패키지 기준 상대).
- debug?: boolean — 디버그 빌드 플래그.
- platform?.android?: SdCapacitorAndroidConfig — Android 플랫폼별 설정.

```typescript
interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;
  bundle?: boolean;
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;
  permissions?: SdCapacitorPermission[];
}
```

- config?: Record<string, string> — `AndroidManifest.xml` 의 `<application>` 태그 속성(예: `{ requestLegacyExternalStorage: "true" }`).
- bundle?: boolean — true = AAB 번들, false = APK. 스토어 배포면 true.
- intentFilters?: SdCapacitorIntentFilter[] — 딥링크 등 Intent Filter 목록.
- sign?: SdCapacitorSignConfig — APK/AAB 서명 설정. 릴리스 빌드에 필요.
- sdkVersion?: number — Android SDK 버전(minSdk·targetSdk 공통).
- permissions?: SdCapacitorPermission[] — 추가 권한 목록.

```typescript
interface SdCapacitorSignConfig { keystore: string; storePassword: string; alias: string; password: string; keystoreType?: string; }
interface SdCapacitorPermission { name: string; maxSdkVersion?: number; ignore?: string; }
interface SdCapacitorIntentFilter { action?: string; category?: string; }
```

- SdCapacitorSignConfig.keystore — keystore 파일 경로(패키지 기준 상대). storePassword/alias/password = 서명 자격. keystoreType?: string — keystore 타입(기본값 `"jks"`).
- SdCapacitorPermission.name — 권한 이름(예: `"CAMERA"`). maxSdkVersion?: number — 권한 적용 최대 SDK. ignore?: string — `tools:ignore` 속성 값.
- SdCapacitorIntentFilter.action — intent 액션(예: `"android.intent.action.VIEW"`). category — intent 카테고리(예: `"android.intent.category.DEFAULT"`).

## Electron 설정 (client 의 electron)

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

- appId: string — Electron 앱 ID(역도메인, 예: `"com.example.myapp"`).
- portable?: boolean — true = 포터블 `.exe`, false/미지정 = NSIS 설치 프로그램. 설치 없이 실행 배포면 true.
- installerIcon?: string — 설치 프로그램 아이콘(`.ico`, 패키지 기준 상대).
- reinstallDependencies?: string[] — Electron 에 포함할 npm 패키지(네이티브 모듈 등) 목록.
- postInstallScript?: string — npm postinstall 스크립트.
- nsisOptions?: Record<string, unknown> — NSIS 옵션(`portable` 이 false 일 때 적용).
- env?: Record<string, string> — 환경 변수. `electron-main.ts` 에서 `process.env` 로 접근 가능.

## PWA 설정 (client 의 pwa)

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
```

- manifest?: SdPwaManifestConfig — PWA manifest 커스터마이징. 미지정 시 기본 manifest.
- display?: "standalone"|"fullscreen"|"minimal-ui"|"browser" — 앱 표시 모드. "standalone" = 브라우저 UI 없는 앱 창, "fullscreen" = 전체 화면, "minimal-ui" = 최소 브라우저 UI, "browser" = 일반 탭. 네이티브 느낌이면 "standalone".
- name/short_name/theme_color/background_color — manifest 표준 필드(앱 이름·축약명·테마색·배경색).
- icons?: Array<{ src; sizes; type? }> — manifest 아이콘 목록(경로·크기·MIME).

## SdBrowserSupportConfig (client 의 browserSupport)

```typescript
interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;
}
```

- browserslist?: string | string[] — browserslist 쿼리(예: `"last 2 Chrome versions"` 또는 `["ie 11", "last 2 versions"]`). 트랜스파일·prefix 대상 브라우저 범위.
- postCss?.plugins: [string, (object|string)?][] — PostCSS 플러그인 `[이름, 옵션?]` 튜플 배열.
- legacyModule?: boolean — 레거시 모듈 지원. true 면 코드 분할 비활성화 + `import.meta` 치환. 구형 환경 대응이 필요할 때.

## 보조 타입

```typescript
type BuildTarget = "node" | "browser" | "neutral";
interface NpmConfig { name; version; description?; dependencies?; devDependencies?; peerDependencies?; volta?; }
```

- BuildTarget — esbuild 라이브러리 빌드 런타임 타겟 enum(위 `SdPackageConfig` 풀이 참조).
- NpmConfig — `package.json` 구조 타입. name/version 필수, 나머지 선택. package.json 을 타입 안전하게 다룰 때.
