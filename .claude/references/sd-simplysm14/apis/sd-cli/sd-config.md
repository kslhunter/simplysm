# @simplysm/sd-cli — sd-config

`sd.config.ts` 작성용 타입 모음. 진실 근거: `packages/sd-cli/src/sd-config.types.ts`.

## 진입 타입

```typescript
import type { SdConfig, SdConfigFn, SdConfigParams } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
  },
});
export default config;
```

- `SdConfigFn = (params: SdConfigParams) => SdConfig | Promise<SdConfig>`
- `SdConfigParams = { cwd: string; dev: boolean; opt: string[] }` — `opt` 는 CLI `-o` 플래그.
- `SdConfig = { packages: Record<string, SdPackageConfig | undefined>; replaceDeps?: Record<string, string>; postPublish?: SdPostPublishScriptConfig[] }`
  - `packages` 키 = `packages/` 하위 디렉토리명.
  - `replaceDeps`: node_modules 의 패키지를 로컬 소스로 심링크 교체. 예: `{ "@simplysm/*": "../simplysm/packages/*" }` (key 의 `*` 가 value 의 `*` 로 치환).

## 패키지 설정

`SdPackageConfig = SdBuildPackageConfig | SdClientPackageConfig | SdServerPackageConfig | SdScriptsPackageConfig`.

### SdBuildPackageConfig (라이브러리: node/browser/neutral)

```typescript
{
  target: "node" | "browser" | "neutral";   // BuildTarget
  publish?: SdPublishConfig;
  copySrc?: string[];                        // src/ 기준 glob → dist/ 로 복사
  watch?: SdWatchHookConfig;                 // watch 모드 훅
}
```

### SdClientPackageConfig (Frontend 앱)

```typescript
{
  target: "client";
  server: string | number;                   // 연결 서버 패키지명, 또는 포트
  env?: Record<string, string>;              // esbuild define 으로 process.env 치환
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;
  configs?: Record<string, unknown>;         // 런타임 설정 → dist/.config.json
  exclude?: string[];                        // Capacitor/Electron package.json 에 추가
  browserSupport?: SdBrowserSupportConfig;
  pwa?: false | SdPwaConfig;                 // 미지정 시 기본값으로 활성
}
```

### SdServerPackageConfig (Fastify 서버)

```typescript
{
  target: "server";
  env?: Record<string, string>;              // esbuild banner 로 process.env.KEY 상수 치환
  publish?: SdPublishConfig;
  configs?: Record<string, unknown>;         // 런타임 설정 → dist/.config.json
  externals?: string[];                      // esbuild external (binding.gyp 자동 감지에 추가)
  pm2?: { name?: string; ignoreWatchPaths?: string[] };  // 지정 시 dist/pm2.config.cjs 생성
  packageManager?: "volta" | "mise";         // mise.toml / volta 설정 생성에 영향
}
```

### SdScriptsPackageConfig (유틸·임의 명령 실행)

```typescript
{
  target: "scripts";
  publish?: SdPublishConfig;
  watch?: SdWatchHookConfig;                 // 미지정이면 watch/typecheck 에서 제외
}
```

`SdWatchHookConfig`: `{ target: string[]; cmd: string; args?: string[] }`. `target` 은 패키지 디렉토리 기준 glob. 매칭 변경 시 `cmd args` 실행.

## 배포 설정

`SdPublishConfig`:
- `{ type: "npm" }` — npm 레지스트리.
- `{ type: "local-directory"; path: string }` — 로컬 복사. `path` 에 `%VER%`, `%PROJECT%` 치환.
- `{ type: "ftp" | "ftps" | "sftp"; host; port?; path?; user?; password? }`.

`postPublish` 항목 `SdPostPublishScriptConfig`: `{ type: "script"; cmd: string; args: string[] }`. `args` 의 `%VER%`, `%PROJECT%` 치환.

## 클라이언트 부속 옵션

### SdCapacitorConfig

```typescript
{
  appId: string;                             // 예 "com.example.app"
  appName: string;
  plugins?: Record<string, Record<string, unknown> | true>;
  icon?: string;                             // 패키지 기준 상대 경로
  debug?: boolean;
  platform?: { android?: SdCapacitorAndroidConfig };
}
```

`SdCapacitorAndroidConfig`: `config`(AndroidManifest application 속성), `bundle`(true=AAB, false=APK), `intentFilters`, `sign: SdCapacitorSignConfig`, `sdkVersion`, `permissions: SdCapacitorPermission[]`.

- `SdCapacitorSignConfig`: `keystore, storePassword, alias, password, keystoreType?` (기본 `"jks"`).
- `SdCapacitorPermission`: `{ name; maxSdkVersion?; ignore? }`.
- `SdCapacitorIntentFilter`: `{ action?; category? }`.

### SdElectronConfig

```typescript
{
  appId: string;
  portable?: boolean;                        // true=포터블 exe, 미지정/false=NSIS 설치본
  installerIcon?: string;                    // .ico, 패키지 기준 상대 경로
  reinstallDependencies?: string[];          // 네이티브 모듈 등
  postInstallScript?: string;
  nsisOptions?: Record<string, unknown>;
  env?: Record<string, string>;              // electron-main.ts 의 process.env
}
```

### SdPwaConfig

```typescript
{
  manifest?: {
    name?; short_name?;
    display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
    theme_color?; background_color?;
    icons?: Array<{ src: string; sizes: string; type?: string }>;
  };
}
```

`pwa: false` 로 비활성. 미지정 시 기본값으로 활성.

### SdBrowserSupportConfig

```typescript
{
  browserslist?: string | string[];          // 예 "last 2 Chrome versions"
  postCss?: { plugins: [string, (object | string)?][] };
  legacyModule?: boolean;                    // 코드 분할 비활성 + import.meta 치환
}
```

## 부수 타입

- `BuildTarget = "node" | "browser" | "neutral"` — `SdBuildPackageConfig.target`.
- `NpmConfig` — `package.json` 구조 헬퍼 (`name`, `version`, `dependencies`, `devDependencies`, `peerDependencies`, `volta?`).
