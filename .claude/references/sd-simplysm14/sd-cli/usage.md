# @simplysm/sd-cli

Simplysm 모노레포용 빌드/개발/배포 CLI 도구. `sd.config.ts` 설정 타입과 Angular AOT Vite 플러그인(`sdAngularPlugin`)을 export한다.

## Installation

```bash
npm install @simplysm/sd-cli
```

## API Overview

### Config

| API | Type | Description |
|-----|------|-------------|
| `NpmConfig` | interface | npm package.json 구조 |
| `BuildTarget` | type | 빌드 타겟 타입 (`"node"` \| `"browser"` \| `"neutral"`) |
| `SdNpmPublishConfig` | interface | npm 레지스트리 배포 설정 |
| `SdLocalDirectoryPublishConfig` | interface | 로컬 디렉토리 배포 설정 |
| `SdStoragePublishConfig` | interface | FTP/FTPS/SFTP 스토리지 배포 설정 |
| `SdPublishConfig` | type | 패키지 배포 설정 유니언 (`SdNpmPublishConfig` \| `SdLocalDirectoryPublishConfig` \| `SdStoragePublishConfig`) |
| `SdPostPublishScriptConfig` | interface | postPublish 스크립트 설정 |
| `SdBuildPackageConfig` | interface | node/browser/neutral 패키지 설정 |
| `SdCapacitorSignConfig` | interface | Capacitor Android APK/AAB 서명 설정 |
| `SdCapacitorPermission` | interface | Capacitor Android 권한 설정 |
| `SdCapacitorIntentFilter` | interface | Capacitor Android Intent Filter 설정 |
| `SdCapacitorAndroidConfig` | interface | Capacitor Android 플랫폼 설정 |
| `SdCapacitorConfig` | interface | Capacitor 설정 |
| `SdElectronConfig` | interface | Electron 설정 |
| `SdPwaManifestConfig` | interface | PWA manifest 설정 |
| `SdPwaConfig` | interface | PWA 설정 |
| `SdBrowserSupportConfig` | interface | 클라이언트 패키지용 브라우저 지원 설정 |
| `SdClientPackageConfig` | interface | 클라이언트 패키지 설정 (esbuild 기반 빌드) |
| `SdServerPackageConfig` | interface | 서버 패키지 설정 (Fastify 서버) |
| `SdWatchHookConfig` | interface | watch 훅 설정 |
| `SdScriptsPackageConfig` | interface | 스크립트 전용 패키지 설정 |
| `SdPackageConfig` | type | 패키지 설정 유니언 (`SdBuildPackageConfig` \| `SdClientPackageConfig` \| `SdServerPackageConfig` \| `SdScriptsPackageConfig`) |
| `SdConfig` | interface | sd.config.ts 설정 타입 |
| `SdConfigParams` | interface | sd.config.ts 함수에 전달되는 매개변수 |
| `SdConfigFn` | type | sd.config.ts default export 함수 타입 |

### TypeScript Compiler

| API | Type | Description |
|-----|------|-------------|
| `SdTsCompiler` | class | TypeScript AOT 컴파일러 (Angular 및 일반 TS 패키지 지원) |
| `ISdTsCompilerOptions` | interface | SdTsCompiler 생성 옵션 |
| `ISdTsCompilerResult` | interface | SdTsCompiler.compileAsync() 반환 타입 |

### Angular Vite Plugin

| API | Type | Description |
|-----|------|-------------|
| `SdAngularPluginOptions` | interface | sdAngularPlugin 옵션 |
| `sdAngularPlugin` | function | Angular AOT 컴파일을 수행하는 Vite 플러그인 |

## TypeScript Compiler 상세

### `SdTsCompiler`

TypeScript AOT 컴파일러. Angular 패키지와 일반 TypeScript 패키지 모두 지원하며 증분 빌드, lint 통합, SCSS 컴파일을 관리한다.

```typescript
export class SdTsCompiler {
  constructor(options: ISdTsCompilerOptions);
  
  async compileAsync(
    modifiedFiles?: ReadonlySet<string>,
    emitOptions?: ISdTsCompilerEmitOptions,
  ): Promise<ISdTsCompilerResult>;
  
  compileSideEffectScss(): void;
  
  findAffectedByScss(scssPath: string): string[];
  
  get sideEffectScssRegistry(): Map<string, SideEffectScssEntry>;
}
```

| Method | Description |
|--------|-------------|
| `compileAsync()` | TypeScript 컴파일 실행. modifiedFiles 지정 시 증분 빌드 수행. emitOptions로 emit 방식 제어 |
| `compileSideEffectScss()` | sideEffectScssRegistry의 모든 항목을 SCSS로 컴파일 |
| `findAffectedByScss()` | SCSS 경로에 의존하는 TypeScript 파일 목록 반환 (watch 역방향 추적용) |
| `sideEffectScssRegistry` | getter. Angular component @Component.styles 항목 저장소 |

### `ISdTsCompilerOptions`

SdTsCompiler 생성 옵션.

```typescript
export interface ISdTsCompilerOptions {
  pkgDir: string;
  cwd: string;
  output: { js: boolean; dts: boolean };
  includeTests?: boolean;
  env?: TypecheckEnv;
  sourceFileCache?: AngularSourceFileCache;
  transformStylesheet?: (data: string, containingFile: string, stylesheetFile?: string) => Promise<string | null>;
  externalStylesheets?: Map<string, string>;
  compilerOptionsTransformer?: (options: ts.CompilerOptions) => ts.CompilerOptions;
  lint?: boolean;
  globalScss?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pkgDir` | `string` | 패키지 디렉토리 (절대 경로) |
| `cwd` | `string` | workspace 루트 (diagnostics 필터링 등에 사용) |
| `output` | `{ js: boolean; dts: boolean }` | emit 제어: js (JavaScript emit), dts (타입 선언 emit) |
| `includeTests` | `boolean?` | tests/ 파일을 rootNames에 포함할지 여부 (기본값: false) |
| `env` | `TypecheckEnv?` | 타입체크 환경. 설정 시 getCompilerOptionsForEnv() 적용 |
| `sourceFileCache` | `AngularSourceFileCache?` | Angular 증분 빌드용 SourceFile 캐시. 미제공 시 내부 생성 |
| `transformStylesheet` | `(data: string, containingFile: string, stylesheetFile?: string) => Promise<string \| null>?` | 스타일시트 변환 콜백 (Angular only) |
| `externalStylesheets` | `Map<string, string>?` | 외부 스타일시트 맵 (클라이언트 빌드용, resourceNameToFileName에서 사용) |
| `compilerOptionsTransformer` | `(options: ts.CompilerOptions) => ts.CompilerOptions?` | compilerOptions 후처리 (클라이언트의 target/module 강제 등) |
| `lint` | `boolean?` | lint 실행 여부. true이면 compileAsync 결과에 lint 결과 포함 |
| `globalScss` | `boolean?` | 글로벌 SCSS 컴파일 여부. true이면 scss/styles.scss → dist/styles.css 생성 |

### `ISdTsCompilerEmitOptions`

compileAsync()의 emit 옵션. Angular 컴파일러만 지원.

```typescript
export interface ISdTsCompilerEmitOptions {
  sourceFilter?: (fileName: string) => boolean;
  additionalTransformers?: {
    before?: ts.TransformerFactory<ts.SourceFile>[];
    after?: ts.TransformerFactory<ts.SourceFile>[];
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceFilter` | `(fileName: string) => boolean?` | emit 대상 소스 필터 (지정 시 해당 파일만 EmitResult에 포함). Angular only |
| `additionalTransformers` | `{ before?: ts.TransformerFactory<ts.SourceFile>[]; after?: ts.TransformerFactory<ts.SourceFile>[]; }?` | Angular transformers 외 추가 transformers. Angular only |

### `ISdTsCompilerResult`

compileAsync() 반환 타입.

```typescript
export interface ISdTsCompilerResult {
  program: ts.Program;
  builderProgram: ts.EmitAndSemanticDiagnosticsBuilderProgram;
  isForAngular: boolean;
  affectedFiles: ReadonlySet<string> | undefined;
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
  errors?: string[];
  ngtscProgram?: NgtscProgram;
  emitResults?: EmitResult[];
  lint?: LintWithProgramResult;
  scssErrors: string[];
  scssDependencies: ReadonlyMap<string, ReadonlySet<string>>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `program` | `ts.Program` | TypeScript Program 참조 (lint, 외부 도구용) |
| `builderProgram` | `ts.EmitAndSemanticDiagnosticsBuilderProgram` | Builder Program 참조 (증분 빌드 상태) |
| `isForAngular` | `boolean` | Angular 패키지 여부 (tsconfig.json에 angularCompilerOptions 존재) |
| `affectedFiles` | `ReadonlySet<string> \| undefined` | 이 빌드에서 영향받은 파일 (posix 경로). undefined = 전역 변경 (전체 리빌드) |
| `diagnostics` | `SerializedDiagnostic[]` | 직렬화된 진단 정보 (Worker 경계 통과용) |
| `errorCount` | `number` | Error 카테고리 진단 수 |
| `warningCount` | `number` | Warning 카테고리 진단 수 |
| `errors` | `string[]?` | Error 카테고리 진단을 "파일:줄:열: TS코드: 메시지" 형식으로 포맷한 배열 |
| `ngtscProgram` | `NgtscProgram?` | NgtscProgram 참조 (Angular only, HMR용). Non-Angular이면 undefined |
| `emitResults` | `EmitResult[]?` | Angular emit 결과 (Non-Angular이면 undefined — writeFile 훅으로 디스크 직접 쓰기) |
| `lint` | `LintWithProgramResult?` | lint 결과 (lint 옵션 활성 시) |
| `scssErrors` | `string[]` | SCSS 컴파일 에러 목록 |
| `scssDependencies` | `ReadonlyMap<string, ReadonlySet<string>>` | SCSS 의존성 맵 (소유자 파일 → 의존 SCSS 경로 집합). watch 역방향 탐색용 |

## Config 상세

### `NpmConfig`

npm package.json 구조를 나타내는 인터페이스.

```typescript
export interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  volta?: unknown;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 패키지명 |
| `version` | `string` | 패키지 버전 |
| `description` | `string?` | 패키지 설명 |
| `dependencies` | `Record<string, string>?` | 프로덕션 의존성 |
| `devDependencies` | `Record<string, string>?` | 개발 의존성 |
| `peerDependencies` | `Record<string, string>?` | 피어 의존성 |
| `volta` | `unknown?` | Volta 설정 |

### `BuildTarget`

빌드 타겟 타입. esbuild로 빌드된다.

```typescript
export type BuildTarget = "node" | "browser" | "neutral";
```

- `"node"`: Node.js 전용 패키지
- `"browser"`: 브라우저 전용 패키지
- `"neutral"`: Node/브라우저 공용 패키지

### `SdNpmPublishConfig`

npm 레지스트리 배포 설정.

```typescript
export interface SdNpmPublishConfig {
  type: "npm";
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"npm"` | 배포 타입 식별자 |

### `SdLocalDirectoryPublishConfig`

로컬 디렉토리 배포 설정.

```typescript
export interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local-directory"` | 배포 타입 식별자 |
| `path` | `string` | 배포 대상 경로 (환경 변수 치환 지원: `%VER%`, `%PROJECT%`) |

### `SdStoragePublishConfig`

FTP/FTPS/SFTP 스토리지 배포 설정.

```typescript
export interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | 스토리지 프로토콜 |
| `host` | `string` | 서버 호스트 |
| `port` | `number?` | 서버 포트 |
| `path` | `string?` | 원격 경로 |
| `user` | `string?` | 사용자명 |
| `password` | `string?` | 비밀번호 |

### `SdPublishConfig`

패키지 배포 설정. `type` 필드로 분기하는 discriminated union이다.

```typescript
export type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

- `type: "npm"` → `SdNpmPublishConfig`
- `type: "local-directory"` → `SdLocalDirectoryPublishConfig`
- `type: "ftp" | "ftps" | "sftp"` → `SdStoragePublishConfig`

### `SdPostPublishScriptConfig`

배포 완료 후 실행할 스크립트 설정.

```typescript
export interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"script"` | 타입 식별자 |
| `cmd` | `string` | 실행할 명령어 |
| `args` | `string[]` | 스크립트 인수 (환경 변수 치환 지원: `%VER%`, `%PROJECT%`) |

### `SdBuildPackageConfig`

node/browser/neutral 패키지 설정.

```typescript
export interface SdBuildPackageConfig {
  target: BuildTarget;
  publish?: SdPublishConfig;
  copySrc?: string[];
  watch?: SdWatchHookConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `BuildTarget` | 빌드 타겟 (`"node"` \| `"browser"` \| `"neutral"`) |
| `publish` | `SdPublishConfig?` | 배포 설정 |
| `copySrc` | `string[]?` | src/에서 dist/로 복사할 파일의 glob 패턴 (src/ 기준 상대 경로) |
| `watch` | `SdWatchHookConfig?` | watch 훅 설정 |

### `SdCapacitorSignConfig`

Capacitor Android APK/AAB 서명 설정.

```typescript
export interface SdCapacitorSignConfig {
  keystore: string;
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `keystore` | `string` | keystore 파일 경로 (패키지 디렉토리 기준 상대 경로) |
| `storePassword` | `string` | keystore 비밀번호 |
| `alias` | `string` | 키 별칭 |
| `password` | `string` | 키 비밀번호 |
| `keystoreType` | `string?` | keystore 타입 (기본값: `"jks"`) |

### `SdCapacitorPermission`

Capacitor Android 권한 설정.

```typescript
export interface SdCapacitorPermission {
  name: string;
  maxSdkVersion?: number;
  ignore?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 권한 이름 (예: `"CAMERA"`, `"WRITE_EXTERNAL_STORAGE"`) |
| `maxSdkVersion` | `number?` | 최대 SDK 버전 |
| `ignore` | `string?` | `tools:ignore` 속성 값 |

### `SdCapacitorIntentFilter`

Capacitor Android Intent Filter 설정.

```typescript
export interface SdCapacitorIntentFilter {
  action?: string;
  category?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string?` | intent 액션 (예: `"android.intent.action.VIEW"`) |
| `category` | `string?` | intent 카테고리 (예: `"android.intent.category.DEFAULT"`) |

### `SdCapacitorAndroidConfig`

Capacitor Android 플랫폼 설정.

```typescript
export interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;
  bundle?: boolean;
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;
  permissions?: SdCapacitorPermission[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `config` | `Record<string, string>?` | AndroidManifest.xml application 태그 속성 |
| `bundle` | `boolean?` | AAB 번들 빌드 플래그 (false이면 APK) |
| `intentFilters` | `SdCapacitorIntentFilter[]?` | Intent Filter 설정 |
| `sign` | `SdCapacitorSignConfig?` | APK/AAB 서명 설정 |
| `sdkVersion` | `number?` | Android SDK 버전 (minSdk, targetSdk) |
| `permissions` | `SdCapacitorPermission[]?` | 추가 권한 설정 |

### `SdCapacitorConfig`

Capacitor 설정.

```typescript
export interface SdCapacitorConfig {
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

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | 앱 ID (예: `"com.example.app"`) |
| `appName` | `string` | 앱 이름 |
| `plugins` | `Record<string, Record<string, unknown> \| true>?` | Capacitor 플러그인 설정 (key: 패키지명) |
| `icon` | `string?` | 앱 아이콘 경로 (패키지 디렉토리 기준 상대 경로) |
| `debug` | `boolean?` | 디버그 빌드 플래그 |
| `platform` | `{ android?: SdCapacitorAndroidConfig }?` | 플랫폼별 설정 |

### `SdElectronConfig`

Electron 설정.

```typescript
export interface SdElectronConfig {
  appId: string;
  portable?: boolean;
  installerIcon?: string;
  reinstallDependencies?: string[];
  postInstallScript?: string;
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `appId` | `string` | Electron 앱 ID (예: `"com.example.myapp"`) |
| `portable` | `boolean?` | 포터블 .exe (true) 또는 NSIS 설치 프로그램 (false/미지정) |
| `installerIcon` | `string?` | 설치 프로그램 아이콘 경로 (.ico, 패키지 디렉토리 기준 상대 경로) |
| `reinstallDependencies` | `string[]?` | Electron에 포함할 npm 패키지 (네이티브 모듈 등) |
| `postInstallScript` | `string?` | npm postinstall 스크립트 |
| `nsisOptions` | `Record<string, unknown>?` | NSIS 옵션 (portable이 false일 때) |
| `env` | `Record<string, string>?` | 환경 변수 (electron-main.ts에서 process.env로 접근 가능) |

### `SdPwaManifestConfig`

PWA manifest 설정.

```typescript
export interface SdPwaManifestConfig {
  name?: string;
  short_name?: string;
  display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  theme_color?: string;
  background_color?: string;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string?` | 앱 이름 |
| `short_name` | `string?` | 앱 짧은 이름 |
| `display` | `"standalone" \| "fullscreen" \| "minimal-ui" \| "browser"?` | 디스플레이 모드 |
| `theme_color` | `string?` | 테마 색상 |
| `background_color` | `string?` | 배경 색상 |
| `icons` | `Array<{ src: string; sizes: string; type?: string }>?` | 아이콘 목록 |

### `SdPwaConfig`

PWA 설정.

```typescript
export interface SdPwaConfig {
  manifest?: SdPwaManifestConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `manifest` | `SdPwaManifestConfig?` | PWA manifest 설정 |

### `SdBrowserSupportConfig`

클라이언트 패키지용 브라우저 지원 설정.

```typescript
export interface SdBrowserSupportConfig {
  browserslist?: string | string[];
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `browserslist` | `string \| string[]?` | browserslist 쿼리 (예: `"last 2 Chrome versions"`) |
| `postCss` | `{ plugins: [string, (object \| string)?][] }?` | PostCSS 플러그인 설정 ([name, options] 튜플 배열) |
| `legacyModule` | `boolean?` | 레거시 모듈 지원 (코드 분할 비활성화 + import.meta 치환) |

### `SdClientPackageConfig`

클라이언트 패키지 설정 (esbuild 기반 빌드).

```typescript
export interface SdClientPackageConfig {
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

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"client"` | 빌드 타겟 |
| `server` | `string \| number` | 연결할 서버 패키지명 또는 포트 직접 지정 |
| `env` | `Record<string, string>?` | 빌드 시 치환할 환경 변수 |
| `publish` | `SdPublishConfig?` | 배포 설정 |
| `capacitor` | `SdCapacitorConfig?` | Capacitor 설정 |
| `electron` | `SdElectronConfig?` | Electron 설정 |
| `configs` | `Record<string, unknown>?` | 런타임 설정 (빌드 시 dist/.config.json으로 기록) |
| `exclude` | `string[]?` | Capacitor/Electron package.json에 추가할 패키지 |
| `browserSupport` | `SdBrowserSupportConfig?` | 브라우저 지원 설정 |
| `pwa` | `false \| SdPwaConfig?` | PWA 설정. false이면 비활성화. 미지정 시 기본값으로 활성화 |

### `SdServerPackageConfig`

서버 패키지 설정 (Fastify 서버).

```typescript
export interface SdServerPackageConfig {
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

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"server"` | 빌드 타겟 |
| `env` | `Record<string, string>?` | 빌드 시 치환할 환경 변수 |
| `publish` | `SdPublishConfig?` | 배포 설정 |
| `configs` | `Record<string, unknown>?` | 런타임 설정 (빌드 시 dist/.config.json으로 기록) |
| `externals` | `string[]?` | esbuild 번들에 포함하지 않을 외부 모듈 |
| `pm2` | `{ name?: string; ignoreWatchPaths?: string[] }?` | PM2 설정 (지정 시 dist/pm2.config.cjs 생성) |
| `packageManager` | `"volta" \| "mise"?` | 사용할 패키지 매니저 |

### `SdWatchHookConfig`

watch 훅 설정. 파일 변경 시 명령어를 실행한다.

```typescript
export interface SdWatchHookConfig {
  target: string[];
  cmd: string;
  args?: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `string[]` | 감시할 glob 패턴 (패키지 디렉토리 기준 상대 경로) |
| `cmd` | `string` | 변경 시 실행할 명령어 |
| `args` | `string[]?` | 명령어 인수 |

### `SdScriptsPackageConfig`

스크립트 전용 패키지 설정. watch 훅이 설정되지 않으면 watch/typecheck에서 제외된다.

```typescript
export interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `"scripts"` | 빌드 타겟 |
| `publish` | `SdPublishConfig?` | 배포 설정 |
| `watch` | `SdWatchHookConfig?` | watch 훅 설정 |

### `SdPackageConfig`

패키지 설정 유니언. `target` 필드로 분기하는 discriminated union이다.

```typescript
export type SdPackageConfig =
  | SdBuildPackageConfig
  | SdClientPackageConfig
  | SdServerPackageConfig
  | SdScriptsPackageConfig;
```

- `target: "node" | "browser" | "neutral"` → `SdBuildPackageConfig`
- `target: "client"` → `SdClientPackageConfig`
- `target: "server"` → `SdServerPackageConfig`
- `target: "scripts"` → `SdScriptsPackageConfig`

### `SdConfig`

sd.config.ts 설정 타입.

```typescript
export interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `Record<string, SdPackageConfig \| undefined>` | 패키지별 설정 (key: packages/ 하위 디렉토리명) |
| `replaceDeps` | `Record<string, string>?` | 의존성 교체 설정 (node_modules 패키지를 로컬 소스로 심링크 교체). key: 패키지 glob 패턴, value: 소스 디렉토리 경로 |
| `postPublish` | `SdPostPublishScriptConfig[]?` | 배포 완료 후 실행할 스크립트 |

### `SdConfigParams`

sd.config.ts 함수에 전달되는 매개변수.

```typescript
export interface SdConfigParams {
  cwd: string;
  dev: boolean;
  opt: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cwd` | `string` | 현재 작업 디렉토리 |
| `dev` | `boolean` | 개발 모드 플래그 |
| `opt` | `string[]` | 추가 옵션 (CLI의 `-o` 플래그에서 전달) |

### `SdConfigFn`

sd.config.ts는 반드시 이 형식의 함수를 default export해야 한다.

```typescript
export type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;
```

## Angular Vite Plugin 상세

### `SdAngularPluginOptions`

sdAngularPlugin 옵션.

```typescript
export interface SdAngularPluginOptions {
  /** sd.config.ts packages 키 (패키지 디렉토리명) */
  pkg: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pkg` | `string` | sd.config.ts packages 키 (패키지 디렉토리명) |

### `sdAngularPlugin`

Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용). AngularBuildPipeline + JavaScriptTransformer를 관리한다.

```typescript
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `SdAngularPluginOptions` | 플러그인 옵션 |

**Returns**: `Plugin` (Vite 플러그인 객체)

Vite 훅: `config` (pkgDir 초기화), `watchChange` (파일 변경 추적), `buildStart` (Pipeline 초기화 + 컴파일 + emit, watch 재빌드 시 증분 재컴파일), `transform` (.ts 파일에 대해 캐싱된 JS 반환 + 인라인 소스맵 분리), `buildEnd` (pipeline 참조 해제).

## Usage Examples

### SdTsCompiler를 사용한 TypeScript 컴파일

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/workspace/packages/my-lib",
  cwd: "/workspace",
  output: { js: true, dts: true },
  lint: true,
  globalScss: true,
});

// 초기 컴파일
const result = await compiler.compileAsync();

if (result.errors) {
  console.error("Compilation errors:", result.errors);
  process.exit(1);
}

console.log(`Compiled ${result.affectedFiles?.size ?? "all"} files`);
```

### watch 모드에서 증분 컴파일

```typescript
import { SdTsCompiler } from "@simplysm/sd-cli";

const compiler = new SdTsCompiler({
  pkgDir: "/workspace/packages/my-lib",
  cwd: "/workspace",
  output: { js: true, dts: true },
});

// 초기 컴파일
let result = await compiler.compileAsync();

// 파일 변경 감지 시 증분 컴파일
const changedFiles = new Set(["/workspace/packages/my-lib/src/foo.ts"]);
result = await compiler.compileAsync(changedFiles);

// SCSS 의존성이 변경된 TS 파일 찾기
const affectedByScss = compiler.findAffectedByScss("/workspace/packages/my-lib/scss/variables.scss");
```

### sd.config.ts 작성

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": {
      target: "client",
      server: "my-server",
    },
    "my-server": {
      target: "server",
      publish: { type: "npm" },
    },
  },
});

export default config;
```

### Vite에서 Angular AOT 플러그인 사용

```typescript
import { defineConfig } from "vite";
import { sdAngularPlugin } from "@simplysm/sd-cli";

export default defineConfig({
  plugins: [sdAngularPlugin({ pkg: "my-client" })],
});
```
