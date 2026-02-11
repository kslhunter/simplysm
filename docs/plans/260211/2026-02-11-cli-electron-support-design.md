# CLI Electron Support Design

## Overview

`packages/cli`에 Electron 빌드/실행 지원을 추가한다. `.legacy-packages/simplysm/sd-cli`의 Electron 기능을 현재 CLI 아키텍처(Capacitor 패턴)에 맞게 마이그레이션한다.

## Design Decisions

| 결정 사항 | 선택 | 이유 |
|-----------|------|------|
| 타겟 플랫폼 | Windows만 (portable/NSIS) | 레거시와 동일, 최소 범위 |
| CLI 명령어 | 기존 `device` 명령어 확장 | 명령어 일관성 유지, Capacitor와 동일 패턴 |
| Main process 번들링 | esbuild 직접 사용 | Capacitor 패턴과 동일, 단순하고 제어 용이 |
| 개발 모드 콘텐츠 로드 | Vite dev server URL | HMR 지원, Capacitor의 device 명령어와 동일 패턴 |

## Configuration Type

`sd-config.types.ts`에 `SdElectronConfig` 추가:

```typescript
export interface SdElectronConfig {
  /** Electron 앱 ID (예: "com.example.myapp") */
  appId: string;
  /** portable .exe (true) 또는 NSIS 인스톨러 (false/미지정) */
  portable?: boolean;
  /** 인스톨러 아이콘 경로 (.ico, 패키지 디렉토리 기준 상대경로) */
  installerIcon?: string;
  /** Electron에 포함할 npm 패키지 (native 모듈 등) */
  reinstallDependencies?: string[];
  /** npm postinstall 스크립트 */
  postInstallScript?: string;
  /** NSIS 옵션 (portable이 아닌 경우) */
  nsisOptions?: Record<string, unknown>;
  /** 환경변수 (electron-main.ts에서 process.env로 접근) */
  env?: Record<string, string>;
}
```

`SdClientPackageConfig`에 `electron?` 필드 추가:

```typescript
export interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  electron?: SdElectronConfig;  // 추가
}
```

사용 예시 (`sd.config.ts`):

```typescript
const config: SdConfigFn = (params) => ({
  packages: {
    "my-client": {
      target: "client",
      server: 50580,
      electron: {
        appId: "com.example.myapp",
        reinstallDependencies: ["better-sqlite3"],
      },
    },
  },
});
```

## Electron Class

`packages/cli/src/electron/electron.ts`에 새 파일 생성. Capacitor 클래스 패턴을 따른다.

### Public API

```typescript
class Electron {
  static async create(pkgPath: string, config: SdElectronConfig): Promise<Electron>;
  async initialize(): Promise<void>;
  async build(outPath: string): Promise<void>;
  async run(url?: string): Promise<void>;
}
```

### initialize()

`.electron/` 디렉토리에 Electron 앱 구조를 준비한다.

1. `.electron/src/package.json` 생성
   - `name`: 프로젝트 package.json의 name
   - `version`: 프로젝트 package.json의 version
   - `main`: `"electron-main.js"`
   - `dependencies`: `reinstallDependencies`에 지정된 패키지만 포함
   - `scripts.postinstall`: `postInstallScript` (있는 경우)
2. `npm install` 실행 (`.electron/src/` 에서)
3. `npx electron-rebuild` 실행 (native 모듈 재빌드)

### build(outPath)

프로덕션 빌드. 웹 에셋 + Electron main process를 패키징하여 Windows 실행 파일을 생성한다.

1. **esbuild로 electron-main.ts 번들링**
   - Entry: `src/electron-main.ts`
   - Output: `.electron/src/electron-main.js`
   - Platform: `node`, Target: `node20`, Format: `cjs`
   - External: `electron`, Node built-in 모듈, `reinstallDependencies`
2. **웹 에셋 복사**: `outPath/` → `.electron/src/` (index.html, JS, CSS 등)
3. **electron-builder 설정 생성**: `.electron/builder-config.json`
   - Windows 타겟 (portable 또는 nsis)
   - 아이콘, NSIS 옵션 등
4. **electron-builder 실행**: `npx electron-builder --win --config .electron/builder-config.json`
5. **결과물 복사**: `.electron/dist/` → `dist/electron/`
   - `{description}-latest.exe` (또는 `-portable-latest.exe`)
   - `updates/{version}.exe` (자동 업데이트용)

### run(url?)

개발 모드 실행. Vite dev server URL을 Electron 창에 로드한다.

1. **esbuild로 electron-main.ts 번들링**
   - Output: `dist/electron/electron-main.js`
   - 동일한 esbuild 옵션
2. **`dist/electron/package.json` 생성** (main: "electron-main.js")
3. **Electron 프로세스 실행**
   - `npx electron .` (`dist/electron/` 에서)
   - 환경변수: `ELECTRON_DEV_URL={url}`, `NODE_ENV=development`, config.env
4. **electron-main.ts에서의 URL 분기** (사용자 구현):
   ```typescript
   // 사용자가 작성하는 electron-main.ts 예시
   const isDev = process.env.NODE_ENV === "development";
   if (isDev) {
     win.loadURL(process.env.ELECTRON_DEV_URL!);
   } else {
     win.loadFile(path.join(__dirname, "index.html"));
   }
   ```

## Directory Structure

```
packages/{name}/
├── src/
│   ├── electron-main.ts    ← 사용자 작성 (Electron main process entry)
│   └── main.ts             ← 웹 앱 entry
├── .electron/              ← 빌드 임시 디렉토리 (.gitignore 대상)
│   ├── src/                ← electron-builder 입력
│   │   ├── package.json    ← 자동 생성
│   │   ├── electron-main.js
│   │   ├── index.html      ← 웹 빌드 결과물 복사
│   │   └── node_modules/
│   ├── dist/               ← electron-builder 출력
│   └── builder-config.json
└── dist/
    └── electron/           ← 최종 배포물
        ├── electron-main.js       ← 개발 모드용
        ├── package.json           ← 개발 모드용
        ├── {name}-latest.exe      ← 프로덕션 인스톨러
        └── updates/
            └── {version}.exe      ← 자동 업데이트용
```

## CLI Integration

### build.ts 변경

`BuildResult.type`에 `"electron"` 추가. client 패키지 빌드 루프에서 Capacitor 빌드 뒤에 Electron 빌드 추가:

```typescript
// 기존 Capacitor 빌드
if (config.capacitor != null) { ... }

// Electron 빌드 추가
if (config.electron != null) {
  const outPath = path.join(pkgDir, "dist");
  try {
    const electron = await Electron.create(pkgDir, config.electron);
    await electron.initialize();
    await electron.build(outPath);
    results.push({ name, target: "client", type: "electron", success: true });
  } catch (err) {
    results.push({
      name, target: "client", type: "electron", success: false,
      errors: [err instanceof Error ? err.message : String(err)],
    });
    state.hasError = true;
  }
}
```

### device.ts 변경

electron/capacitor를 config에 따라 분기:

```typescript
if (clientConfig.electron != null) {
  const electron = await Electron.create(pkgDir, clientConfig.electron);
  await electron.run(serverUrl);
} else if (clientConfig.capacitor != null) {
  const cap = await Capacitor.create(pkgDir, clientConfig.capacitor);
  await cap.runOnDevice(serverUrl);
} else {
  consola.error("electron 또는 capacitor 설정이 없습니다");
  process.exitCode = 1;
  return;
}
```

개발 서버 URL 패턴:
- Capacitor: `http://localhost:{port}/{pkg}/capacitor/`
- Electron: `http://localhost:{port}/{pkg}/` (별도 경로 불필요)

### sd-cli.ts

변경 없음. 기존 `device`, `build` 명령어가 config 기반으로 자동 처리.

## Dependencies

CLI 자체에 electron 관련 의존성을 추가하지 않는다. 모두 `npx`로 실행하며, 사용자 프로젝트에서 설치해야 한다:

```bash
pnpm add -D electron electron-builder @electron/rebuild
```

`esbuild`는 이미 CLI의 의존성이므로 추가 불필요.

## Export Changes

`packages/cli/src/index.ts`에 추가:

```typescript
export type { SdElectronConfig } from "./sd-config.types";
export { Electron } from "./electron/electron";
```

## File Change Summary

| 파일 | 변경 |
|------|------|
| `packages/cli/src/sd-config.types.ts` | `SdElectronConfig` 타입 추가, `SdClientPackageConfig.electron?` 필드 추가 |
| `packages/cli/src/electron/electron.ts` | **신규** — Electron 클래스 |
| `packages/cli/src/commands/build.ts` | `"electron"` result type 추가, client 빌드 후 electron 빌드 |
| `packages/cli/src/commands/device.ts` | electron/capacitor 분기 처리 |
| `packages/cli/src/index.ts` | export 추가 |

## Reference

- 레거시 코드: `.legacy-packages/simplysm/sd-cli/src/entry/SdCliElectron.ts`
- 레거시 설정: `.legacy-packages/simplysm/sd-cli/src/types/config/ISdProjectConfig.ts`
- Capacitor 참조 패턴: `packages/cli/src/capacitor/capacitor.ts`
