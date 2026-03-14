# 설정 타입 레퍼런스

`sd.config.ts`에서 사용하는 모든 타입의 상세 레퍼런스.

## SdConfig

`sd.config.ts`의 최상위 설정 타입.

```typescript
interface SdConfig {
  packages: Record<string, SdPackageConfig | undefined>;
  replaceDeps?: Record<string, string>;
  postPublish?: SdPostPublishScriptConfig[];
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `packages` | `Record<string, SdPackageConfig>` | 패키지별 설정. 키는 `packages/` 하위 디렉토리명 |
| `replaceDeps` | `Record<string, string>` | 의존성 교체 설정. 키: glob 패턴, 값: 로컬 경로 (`*` 치환 지원) |
| `postPublish` | `SdPostPublishScriptConfig[]` | 배포 완료 후 실행할 스크립트 |

### replaceDeps 예시

```typescript
replaceDeps: {
  "@simplysm/*": "../simplysm/packages/*"
}
// @simplysm/core-common → ../simplysm/packages/core-common 으로 심링크
```

## SdConfigFn / SdConfigParams

```typescript
type SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>;

interface SdConfigParams {
  cwd: string;       // 현재 작업 디렉토리
  dev: boolean;      // 개발 모드 여부 (dev/watch: true, build/publish: false)
  options: string[];  // CLI -o 플래그 값 (예: ["key=value"])
}
```

## 패키지 설정 타입

### SdBuildPackageConfig

라이브러리 패키지 (node/browser/neutral) 설정.

```typescript
interface SdBuildPackageConfig {
  target: "node" | "browser" | "neutral";
  publish?: SdPublishConfig;
  copySrc?: string[];
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `target` | `BuildTarget` | 빌드 대상 플랫폼 |
| `publish` | `SdPublishConfig` | 배포 설정 |
| `copySrc` | `string[]` | `src/`에서 `dist/`로 복사할 파일 glob 패턴 (src 기준 상대 경로) |

### SdClientPackageConfig

클라이언트 앱 패키지 설정 (Vite + SolidJS).

```typescript
interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `target` | `"client"` | 고정값 |
| `server` | `string \| number` | 서버 패키지명(프록시 연결) 또는 Vite 포트 번호 |
| `env` | `Record<string, string>` | 빌드 시 `process.env` 치환 값 |
| `publish` | `SdPublishConfig` | 배포 설정 |
| `capacitor` | `SdCapacitorConfig` | Capacitor 설정 (모바일 앱) |
| `electron` | `SdElectronConfig` | Electron 설정 (데스크톱 앱) |
| `configs` | `Record<string, unknown>` | 런타임 설정 (`dist/.config.json`에 기록) |

### SdServerPackageConfig

서버 앱 패키지 설정 (Fastify).

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

| 필드 | 타입 | 설명 |
|------|------|------|
| `target` | `"server"` | 고정값 |
| `env` | `Record<string, string>` | `process.env.KEY` 치환 값 |
| `publish` | `SdPublishConfig` | 배포 설정 |
| `configs` | `Record<string, unknown>` | 런타임 설정 (`dist/.config.json`에 기록) |
| `externals` | `string[]` | esbuild 번들에서 제외할 외부 모듈 |
| `pm2` | `object` | PM2 설정 (`dist/pm2.config.cjs` 생성) |
| `packageManager` | `"volta" \| "mise"` | 패키지 매니저 설정 파일 생성 |

### SdScriptsPackageConfig

스크립트 전용 패키지 (빌드/watch/typecheck 제외).

```typescript
interface SdScriptsPackageConfig {
  target: "scripts";
  publish?: SdPublishConfig;
}
```

## 배포 설정 타입

### SdPublishConfig (유니온)

```typescript
type SdPublishConfig = SdNpmPublishConfig | SdLocalDirectoryPublishConfig | SdStoragePublishConfig;
```

### SdNpmPublishConfig

```typescript
interface SdNpmPublishConfig {
  type: "npm";
}
```

### SdLocalDirectoryPublishConfig

```typescript
interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;  // %VER%, %PROJECT% 치환 지원
}
```

### SdStoragePublishConfig

```typescript
interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;  // 미지정 시 SSH 키 인증 사용 (SFTP)
}
```

### SdPostPublishScriptConfig

```typescript
interface SdPostPublishScriptConfig {
  type: "script";
  cmd: string;
  args: string[];  // %VER%, %PROJECT% 치환 지원
}
```

## Capacitor 설정

### SdCapacitorConfig

```typescript
interface SdCapacitorConfig {
  appId: string;       // 예: "com.example.app"
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;       // 패키지 디렉토리 기준 상대 경로
  debug?: boolean;
  platform?: {
    android?: SdCapacitorAndroidConfig;
  };
}
```

### SdCapacitorAndroidConfig

```typescript
interface SdCapacitorAndroidConfig {
  config?: Record<string, string>;    // AndroidManifest application 속성
  bundle?: boolean;                    // true: AAB, false: APK
  intentFilters?: SdCapacitorIntentFilter[];
  sign?: SdCapacitorSignConfig;
  sdkVersion?: number;                // minSdk, targetSdk
  permissions?: SdCapacitorPermission[];
}
```

### SdCapacitorSignConfig

```typescript
interface SdCapacitorSignConfig {
  keystore: string;      // 패키지 디렉토리 기준 상대 경로
  storePassword: string;
  alias: string;
  password: string;
  keystoreType?: string; // 기본값: "jks"
}
```

### SdCapacitorPermission

```typescript
interface SdCapacitorPermission {
  name: string;           // 예: "CAMERA"
  maxSdkVersion?: number;
  ignore?: string;        // tools:ignore 속성
}
```

### SdCapacitorIntentFilter

```typescript
interface SdCapacitorIntentFilter {
  action?: string;   // 예: "android.intent.action.VIEW"
  category?: string; // 예: "android.intent.category.DEFAULT"
}
```

## Electron 설정

### SdElectronConfig

```typescript
interface SdElectronConfig {
  appId: string;                     // 예: "com.example.myapp"
  portable?: boolean;                // true: portable .exe, false: NSIS 설치
  installerIcon?: string;            // .ico 파일 경로
  reinstallDependencies?: string[];  // Electron에 포함할 npm 패키지
  postInstallScript?: string;        // npm postinstall 스크립트
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;      // electron-main.ts에서 사용할 환경 변수
}
```
