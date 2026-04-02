# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/sd-cli` — Simplysm 모노레포용 빌드·개발·배포 CLI 도구. 68개 TypeScript 소스 파일.

`pnpm sd-cli <command>`로 실행되며 `sd.config.ts`를 읽어 패키지별 빌드 전략을 결정한다.

## Architecture

```
src/
├── sd-cli.ts              ← CLI 런처 (affinity 설정 + replaceDeps 처리 후 sd-cli-entry 실행)
├── sd-cli-entry.ts        ← yargs 커맨드 등록 진입점
├── sd-config.types.ts     ← sd.config.ts 타입 정의 (SdConfig, SdPackageConfig 등)
├── vitest-plugin.ts       ← Vitest용 Angular AOT 컴파일 플러그인 (angularVitestPlugin)
│
├── commands/              ← CLI 커맨드 구현 (build, dev, watch, check, lint, typecheck, publish, device, replace-deps)
├── orchestrators/         ← 커맨드-엔진 조율
│   ├── BuildOrchestrator.ts     ← 프로덕션 빌드 (일회성)
│   └── DevWatchOrchestrator.ts  ← watch/dev 모드 (상시 감시)
├── engines/               ← 빌드 엔진 추상화
│   ├── types.ts           ← BuildEngine 인터페이스, PackageInfo, EngineResult
│   ├── BaseEngine.ts      ← 템플릿 메서드 추상 기반 클래스 (TscEngine, NgtscEngine, ServerEsbuildEngine 공유)
│   ├── TscEngine.ts       ← node/browser/neutral 패키지용 esbuild+tsc 엔진
│   ├── NgtscEngine.ts     ← Angular 라이브러리용 ngtsc 엔진 (angularCompilerOptions 감지)
│   ├── ServerEsbuildEngine.ts ← server 패키지용 esbuild 엔진
│   ├── ViteEngine.ts      ← client 패키지용 Vite 엔진 (BaseEngine 미사용)
│   └── index.ts           ← createBuildEngine 팩토리
├── workers/               ← Node.js Worker Thread 모듈
│   ├── library-build.worker.ts  ← node/browser/neutral 빌드
│   ├── ngtsc-build.worker.ts    ← Angular 라이브러리 빌드
│   ├── server-build.worker.ts   ← server 패키지 esbuild 빌드
│   ├── server-runtime.worker.ts ← dev 모드 서버 프로세스 실행
│   ├── client.worker.ts         ← Vite dev server / 프로덕션 빌드
│   └── lint.worker.ts           ← ESLint 독립 실행
├── angular/               ← Vite 플러그인 (Angular AOT, PostCSS inline)
│   ├── vite-angular-plugin.ts   ← sdAngularPlugin (AngularCompiler + JavaScriptTransformer)
│   ├── vite-postcss-inline-plugin.ts
│   └── client-transform-stylesheet.ts
├── infra/                 ← 인프라 유틸리티
│   ├── ResultCollector.ts ← 빌드 결과 중앙 수집 (key: "패키지명:타입")
│   ├── RebuildManager.ts  ← watch 모드 배치 빌드 조율 + batchComplete 이벤트
│   ├── SignalHandler.ts   ← SIGINT/SIGTERM 감지, waitForTermination() 제공
│   └── WorkerManager.ts   ← Worker 생명주기 관리
├── capacitor/             ← Capacitor Android 빌드 유틸
├── electron/              ← Electron 빌드 유틸
└── utils/                 ← 빌드 유틸리티 함수 모음
    ├── angular-compiler.ts      ← AngularCompiler, AngularSourceFileCache (증분 재컴파일, HMR 지원)
    ├── ngtsc-build-core.ts      ← Angular 라이브러리 빌드 핵심 로직 (runNgtscBuild)
    ├── angular-build.ts         ← NgtscProgram 래퍼
    ├── sd-config.ts             ← loadSdConfig (jiti로 sd.config.ts 동적 로드)
    ├── tsconfig.ts              ← parseTsconfig, getPackageSourceFiles, TypecheckEnv
    ├── esbuild-config.ts        ← esbuild 설정 생성
    ├── vite-config.ts           ← Vite 설정 생성
    ├── scss-compiler.ts         ← sass 컴파일
    ├── lint-with-program.ts     ← ESLint + ts.Program 통합 실행
    ├── rebuild-manager.ts       ← RebuildManager 구현
    ├── package-utils.ts         ← 패키지 분류·필터링 (classifyWatchPackages, classifyDevPackages)
    ├── typecheck-serialization.ts ← ts.Diagnostic 직렬화/역직렬화 (Worker 경계 통과용)
    ├── concurrency.ts           ← runWithConcurrency, getMaxConcurrency
    └── ...
```

## Key Patterns

### sd.config.ts 타입 구조

`src/sd-config.types.ts`가 프로젝트의 `sd.config.ts`가 따르는 계약을 정의한다:

```typescript
// SdPackageConfig 유니언: 패키지 target에 따라 다른 타입
type SdPackageConfig =
  | SdBuildPackageConfig    // target: "node" | "browser" | "neutral" — JS+dts 빌드
  | SdClientPackageConfig   // target: "client" — Vite 빌드
  | SdServerPackageConfig   // target: "server" — esbuild JS 빌드
  | SdScriptsPackageConfig; // target: "scripts" — 빌드 제외, watch hook만 가능

// sd.config.ts는 반드시 이 형식으로 default export한다
const config: SdConfigFn = (params: SdConfigParams) => ({
  packages: { "core-common": { target: "neutral" } },
});
export default config;
```

### BuildEngine 인터페이스

모든 엔진이 따르는 공통 계약. `BuildOutput`으로 출력 방식을 제어한다:

```typescript
interface BuildEngine {
  run(output: BuildOutput): Promise<EngineResult>;       // 프로덕션 1회 빌드
  startWatch(output: BuildOutput): Promise<void>;        // 초기 빌드 완료 시 resolve, 이후 ResultCollector로 보고
  stop(): Promise<void>;                                 // 리소스 정리
}

interface BuildOutput {
  js: boolean;      // JS emit 여부
  dts: boolean;     // 타입 선언 emit 여부 (server/client: false)
  lint?: boolean;   // ESLint 실행 여부
  env?: TypecheckEnv;
  includeTests?: boolean;
}
```

### BaseEngine 템플릿 메서드 패턴

`TscEngine`, `NgtscEngine`, `ServerEsbuildEngine`은 `BaseEngine`을 상속하고 4개 추상 메서드만 구현한다. `ViteEngine`은 worker 이벤트 구조가 달라 BaseEngine을 사용하지 않는다:

```typescript
abstract class BaseEngine<TPkg, TWorkerModule> implements BuildEngine {
  // 서브클래스가 구현할 추상 메서드
  protected abstract _getWorkerPath(): string;
  protected abstract _getTarget(): string;
  protected abstract _callBuild(output: BuildOutput): Promise<EngineResult>;
  protected abstract _callStartWatch(output: BuildOutput): Promise<void>;
}
```

### Worker 기반 격리

빌드 작업은 Node.js Worker Thread로 격리한다. 엔진이 Worker를 생성하고 이벤트를 구독한다:

```typescript
// 엔진이 Worker를 생성
this._worker = Worker.create<TWorkerModule>(workerPath);

// 워커가 발행하는 공통 이벤트 (library-build, ngtsc-build, server-build 공유)
interface CommonBuildWorkerEvents {
  buildStart: Record<string, never>;
  build: { build: { success: boolean; errors?: string[]; warnings?: string[] }; lint?: LintWithProgramResult };
  error: { message: string };
}
```

### ResultCollector + RebuildManager

watch/dev 모드에서 빌드 결과를 중앙에서 수집하고 배치 완료 시 콜백을 실행한다:

```typescript
// 결과 키: "패키지명:build" | "패키지명:lint" | "패키지명:server"
resultCollector.add({ name, target, type: "build", status: "success" });

// 빌드가 등록되면 다음 microtask에서 배치 실행
const resolve = rebuildManager.registerBuild("core-common:build", "core-common (node)");
// ... 빌드 완료 후
resolve(); // batchComplete 이벤트 발행
```

### Orchestrator 생명주기

Orchestrator는 `initialize() → start() → awaitTermination() → shutdown()` 순서로 호출한다. 모든 외부 리소스(Worker, FsWatcher)는 `shutdown()`에서 정리한다:

```typescript
const orch = new DevWatchOrchestrator(options);
await orch.initialize(); // sd.config.ts 로드, 엔진 생성
await orch.start();      // 초기 빌드 실행
await orch.awaitTermination(); // SIGINT/SIGTERM 대기
await orch.shutdown();   // 리소스 정리
```

### Angular AOT 컴파일 (sdAngularPlugin)

`src/angular/vite-angular-plugin.ts`의 `sdAngularPlugin`은 Vite 플러그인으로 Angular AOT 컴파일을 수행한다:

- `buildStart`: `AngularCompiler` 초기화 → 전체 컴파일 → `emit`으로 파일 캐싱
- `transform`: `.ts` 파일 요청 시 캐싱된 JS 반환 + `JavaScriptTransformer` 적용
- `handleHotUpdate`: 변경 파일 감지 → 증분 재컴파일 → HMR 또는 full-reload
- `buildEnd`: `AngularCompiler` dispose

### angularVitestPlugin

`src/vitest-plugin.ts`는 Vitest 환경에서 Angular 패키지를 테스트할 때 사용하는 Vite 플러그인이다. `src/` 파일과 `.fixture.` 파일을 Angular AOT 컴파일하여 캐싱한 뒤 `transform` 훅에서 반환한다.

```typescript
// vitest.config.ts에서 사용
import { angularVitestPlugin } from "@simplysm/sd-cli/vitest-plugin";

export default defineConfig({
  plugins: [angularVitestPlugin({ tsconfig: "./tsconfig.json" })],
});
```

### typecheck-serialization

`ts.Diagnostic`은 Worker 경계를 직렬화 없이 통과할 수 없다. Worker 내부에서 `serializeDiagnostic()`으로 직렬화하고, Orchestrator에서 `deserializeDiagnostic()`으로 복원한다:

```typescript
// worker 내부
const serialized = serializeDiagnostic(diagnostic);

// orchestrator
const fileCache = new Map<string, string>();
const restored = deserializeDiagnostic(serialized, fileCache);
```

## Testing

**프레임워크**: Vitest

테스트 디렉토리는 `src/` 구조를 미러링한다:

```
tests/
├── angular/        ← sdAngularPlugin, vite-angular-plugin, scss-compiler 등
├── commands/       ← 커맨드별 단위 테스트
├── engines/        ← 엔진 단위 및 통합 테스트
├── infra/          ← ResultCollector, SignalHandler, WorkerManager
├── orchestrators/  ← BuildOrchestrator, DevWatchOrchestrator
├── utils/          ← 유틸 함수 단위 테스트
└── workers/        ← Worker 모듈 단위 테스트
```

**Worker 모킹 패턴**: Worker Thread를 직접 실행하지 않고 `vi.mock("@simplysm/core-node")`으로 Worker 팩토리를 모킹한다. `vi.mock`은 호이스팅되므로 동적 import(`await import(...)`) 이전에 선언한다:

```typescript
vi.mock("@simplysm/core-node", () => ({
  Worker: { create: vi.fn(() => mockWorker) },
}));

// vi.mock 호이스팅 이후 동적 import
const { TscEngine } = await import("../../src/engines/TscEngine");
```

**Angular 플러그인 테스트**: `tests/angular/fixtures/basic-app/`에 최소 Angular 앱 픽스처를 두고 실제 컴파일을 수행하는 통합 테스트를 작성한다. 컴파일러 내부(AngularCompiler 메서드)는 직접 테스트하지 않고 플러그인 훅(buildStart, transform, handleHotUpdate)을 통해 검증한다.