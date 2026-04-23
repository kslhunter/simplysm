# @simplysm/sd-cli

Simplysm 모노레포용 빌드/개발/배포 CLI 도구. `sd.config.ts` 설정 타입과 Angular AOT Vite 플러그인(`sdAngularPlugin`)을 export한다.

## Installation

```bash
npm install @simplysm/sd-cli
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| `sd.config.ts` 작성 | [SdConfig](./config/sd-config.md), [SdPackageConfig](./config/sd-package-config.md) |
| 클라이언트 패키지 설정 | [SdClientPackageConfig](./config/sd-client-package-config.md) |
| 서버 패키지 설정 | [SdServerPackageConfig](./config/sd-server-package-config.md) |
| 배포 설정 (npm/FTP/SFTP) | [SdPublishConfig](./config/sd-publish-config.md) |
| Capacitor 앱 설정 | [SdCapacitorConfig](./config/sd-capacitor-config.md) |
| Electron 앱 설정 | [SdElectronConfig](./config/sd-electron-config.md) |
| 프로그래매틱 TypeScript 컴파일 | [SdTsCompiler](./ts-compiler/sd-ts-compiler.md) |
| Vitest Angular 테스트 | [sdAngularPlugin](./angular-vite-plugin/sd-angular-plugin.md) |

## API Overview

### Config

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`SdConfig`](./config/sd-config.md) | interface | `sd.config.ts` 작성 시 최상위 설정 타입이 필요할 때 |
| [`SdPackageConfig`](./config/sd-package-config.md) | type | 패키지 target에 따라 분기해야 할 때 (`target` 필드 discriminated union) |
| [`SdBuildPackageConfig`](./config/sd-build-package-config.md) | interface | `node`/`browser`/`neutral` 라이브러리 패키지를 설정할 때 |
| [`SdClientPackageConfig`](./config/sd-client-package-config.md) | interface | `client` 타겟 프론트엔드 패키지를 설정할 때 |
| [`SdServerPackageConfig`](./config/sd-server-package-config.md) | interface | `server` 타겟 Fastify 서버 패키지를 설정할 때 |
| [`SdScriptsPackageConfig`](./config/sd-scripts-package-config.md) | interface | 빌드 없이 watch 훅만 실행하는 스크립트 패키지를 설정할 때 |
| [`BuildTarget`](./config/build-target.md) | type | 라이브러리 패키지의 빌드 플랫폼을 지정할 때 (`"node"` \| `"browser"` \| `"neutral"`) |
| [`SdPublishConfig`](./config/sd-publish-config.md) | type | 패키지 배포 방식을 설정할 때 (npm / 로컬 디렉토리 / FTP·SFTP) |
| [`SdPostPublishScriptConfig`](./config/sd-post-publish-script-config.md) | interface | 배포 후 스크립트를 실행할 때 |
| [`SdCapacitorConfig`](./config/sd-capacitor-config.md) | interface | 클라이언트 패키지에 Capacitor 모바일 앱 설정을 추가할 때 |
| [`SdElectronConfig`](./config/sd-electron-config.md) | interface | 클라이언트 패키지에 Electron 데스크톱 앱 설정을 추가할 때 |
| [`SdPwaConfig`](./config/sd-pwa-config.md) | interface | PWA manifest를 설정할 때 |
| [`SdBrowserSupportConfig`](./config/sd-browser-support-config.md) | interface | 클라이언트 패키지의 브라우저 호환성(browserslist, PostCSS)을 설정할 때 |
| [`SdWatchHookConfig`](./config/sd-watch-hook-config.md) | interface | watch 모드에서 파일 변경 시 명령어 훅을 실행할 때 |
| [`NpmConfig`](./config/npm-config.md) | interface | `package.json` 구조를 타입으로 참조해야 할 때 |

### TypeScript Compiler

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`SdTsCompiler`](./ts-compiler/sd-ts-compiler.md) | class | Angular/TS 패키지를 프로그래매틱하게 AOT 컴파일할 때 |

### Angular Vite Plugin

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`sdAngularPlugin`](./angular-vite-plugin/sd-angular-plugin.md) | function | Vitest에서 Angular 컴포넌트 테스트 시 AOT 컴파일이 필요할 때 |

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
