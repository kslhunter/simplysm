# @simplysm/sd-cli

Simplysm 모노레포용 빌드/개발/배포 CLI 도구. `sd.config.ts` 설정 타입과 Angular AOT Vite 플러그인(`sdAngularPlugin`)을 export한다.

## Installation

```bash
npm install @simplysm/sd-cli
```

## API Overview

### Config

| Entry | Kind | Description |
|-------|------|-------------|
| [`NpmConfig`](./docs/config/npm-config.md) | interface | npm package.json 구조 |
| [`BuildTarget`](./docs/config/build-target.md) | type | 빌드 타겟 타입 (`"node"` \| `"browser"` \| `"neutral"`) |
| [`SdPublishConfig`](./docs/config/sd-publish-config.md) | type | 패키지 배포 설정 discriminated union (`SdNpmPublishConfig` \| `SdLocalDirectoryPublishConfig` \| `SdStoragePublishConfig`) |
| [`SdPostPublishScriptConfig`](./docs/config/sd-post-publish-script-config.md) | interface | postPublish 스크립트 설정 |
| [`SdBuildPackageConfig`](./docs/config/sd-build-package-config.md) | interface | node/browser/neutral 패키지 설정 |
| [`SdCapacitorConfig`](./docs/config/sd-capacitor-config.md) | interface | Capacitor 설정 (관련 타입: `SdCapacitorSignConfig`, `SdCapacitorPermission`, `SdCapacitorIntentFilter`, `SdCapacitorAndroidConfig` 포함) |
| [`SdElectronConfig`](./docs/config/sd-electron-config.md) | interface | Electron 설정 |
| [`SdPwaConfig`](./docs/config/sd-pwa-config.md) | interface | PWA 설정 (관련 타입: `SdPwaManifestConfig` 포함) |
| [`SdBrowserSupportConfig`](./docs/config/sd-browser-support-config.md) | interface | 클라이언트 패키지용 브라우저 지원 설정 |
| [`SdClientPackageConfig`](./docs/config/sd-client-package-config.md) | interface | 클라이언트 패키지 설정 |
| [`SdServerPackageConfig`](./docs/config/sd-server-package-config.md) | interface | 서버 패키지 설정 |
| [`SdWatchHookConfig`](./docs/config/sd-watch-hook-config.md) | interface | watch 훅 설정 |
| [`SdScriptsPackageConfig`](./docs/config/sd-scripts-package-config.md) | interface | 스크립트 전용 패키지 설정 |
| [`SdPackageConfig`](./docs/config/sd-package-config.md) | type | 패키지 설정 discriminated union (target 필드로 분기) |
| [`SdConfig`](./docs/config/sd-config.md) | interface | sd.config.ts 설정 타입 (관련 타입: `SdConfigParams`, `SdConfigFn` 포함) |

### TypeScript Compiler

| Entry | Kind | Description |
|-------|------|-------------|
| [`SdTsCompiler`](./docs/ts-compiler/sd-ts-compiler.md) | class | TypeScript AOT 컴파일러 (Angular 및 일반 TS 패키지 지원, 관련 타입: `ISdTsCompilerOptions`, `ISdTsCompilerResult` 포함) |

### Angular Vite Plugin

| Entry | Kind | Description |
|-------|------|-------------|
| [`sdAngularPlugin`](./docs/angular-vite-plugin/sd-angular-plugin.md) | function | Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용, 관련 타입: `SdAngularPluginOptions` 포함) |

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
