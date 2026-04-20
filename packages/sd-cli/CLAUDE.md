# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/sd-cli` -- Simplysm 모노레포용 빌드/개발/배포 CLI 도구. 106개 TypeScript 소스 파일.

`pnpm sd-cli <command>`로 실행되며 `sd.config.ts`를 읽어 패키지별 빌드 전략을 결정한다.

## Public API

npm 패키지로 배포되는 공개 API:

- **Config Types** (`src/sd-config.types.ts`): `SdConfig`, `SdPackageConfig`, `BuildTarget`, `SdPublishConfig` 등 — sd.config.ts 작성용 타입
- **TypeScript Compiler** (`src/ts-compiler/SdTsCompiler.ts`): `SdTsCompiler` 클래스, `ISdTsCompilerOptions`, `ISdTsCompilerResult` — Angular/TS 패키지 프로그래매틱 컴파일용
- **Angular Vite Plugin** (`src/angular/vite-angular-plugin.ts`): `sdAngularPlugin` 함수, `SdAngularPluginOptions` — Vitest 환경에서 Angular 테스트 수행용

## Architecture

```
src/
├── sd-cli.ts              ← CLI 런처 (affinity 설정 + replaceDeps 처리 후 sd-cli-entry 실행)
├── sd-cli-entry.ts        ← yargs 커맨드 등록 진입점
├── sd-config.types.ts     ← sd.config.ts 타입 정의 (SdConfig, SdPackageConfig 등)
│
├── commands/              ← CLI 커맨드 구현 (build, dev, watch, check, lint, typecheck, publish, device, replace-deps)
├── orchestrators/         ← 커맨드-엔진 조율
│   ├── types.ts                 ← Orchestrator 공통 타입 정의
│   ├── BaseOrchestrator.ts      ← watch/dev 공통 기반 (추상 클래스)
│   ├── WatchOrchestrator.ts     ← watch 모드 (라이브러리 빌드 + 스크립트 훅)
│   ├── DevOrchestrator.ts       ← dev 모드 (서버 런타임 + 클라이언트 dev server)
│   ├── ServerRuntimeManager.ts  ← dev 모드 서버 런타임 워커 관리
│   ├── BuildOrchestrator.ts     ← 프로덕션 빌드 (일회성)
│   └── TypecheckOrchestrator.ts ← TypeScript 타입체크 (typecheck/check 커맨드 공용)
├── engines/               ← 빌드 엔진 추상화
│   ├── types.ts           ← BuildEngine 인터페이스, PackageInfo, EngineResult
│   ├── BaseEngine.ts      ← 템플릿 메서드 추상 기반 클래스 (TscEngine, NgtscEngine, ServerEsbuildEngine 공유)
│   ├── TscEngine.ts       ← node/browser/neutral 패키지용 esbuild+tsc 엔진
│   ├── NgtscEngine.ts     ← Angular 라이브러리용 ngtsc 엔진 (angularCompilerOptions 감지)
│   ├── ServerEsbuildEngine.ts ← server 패키지용 esbuild 엔진
│   ├── EsbuildClientEngine.ts ← client 패키지용 esbuild+Vite 엔진 (BaseEngine 미사용)
│   └── engine-factory.ts  ← createBuildEngine / createTypecheckEngine 팩토리
├── workers/               ← Node.js Worker Thread 모듈
│   ├── library-build.worker.ts  ← node/browser/neutral 및 Angular 라이브러리 빌드 (SdTsCompiler 사용)
│   ├── server-build.worker.ts   ← server 패키지 esbuild + tsc 플러그인 통합 빌드
│   ├── server-esbuild-context.ts ← esbuild watch context + tsc 플러그인 관리 (모듈 스코프 상태)
│   ├── server-watch-manager.ts  ← server-build watch 루프 설정
│   ├── server-runtime.worker.ts ← dev 모드 서버 프로세스 실행
│   ├── client.worker.ts         ← Vite dev server / 프로덕션 빌드
│   ├── lint.worker.ts           ← ESLint 독립 실행
│   ├── shared-worker-lifecycle.ts ← Worker 공통 초기화 (consola + cleanup + guard)
│   ├── build-change-filter.ts   ← 파일 변경 필터링 (shouldSkipRebuild, hasFileAddOrRemove)
│   └── build-watch-paths.ts     ← watch 대상 경로 수집 (buildWatchPaths)
├── angular/               ← Angular AOT 컴파일 + Vite 플러그인
│   ├── vite-angular-plugin.ts        ← sdAngularPlugin (SdTsCompiler + JavaScriptTransformer)
│   ├── client-transform-stylesheet.ts
│   ├── angular-compiler.ts           ← AngularSourceFileCache, augmentHostWithCaching, EmitResult/EmitOptions
│   ├── angular-build.ts              ← NgtscProgram 래퍼
│   ├── ngtsc-build-core.ts           ← Angular SCSS 유틸 (createLibraryTransformStylesheet, compileSideEffectScss, compileGlobalScss, writeEmitResults)
│   └── scss-compiler.ts              ← sass 컴파일 (compileScssString, compileScssFile)
├── esbuild/               ← esbuild 설정 및 플러그인
│   ├── esbuild-config.ts                  ← esbuild 공통 설정 생성
│   ├── esbuild-client-config.ts           ← 클라이언트용 esbuild 설정
│   ├── esbuild-tsc-plugin.ts              ← 서버 빌드용 tsc 플러그인 (타입체크 + DTS)
│   ├── esbuild-angular-compiler-plugin.ts ← 클라이언트 빌드용 Angular 컴파일러 플러그인
│   ├── esbuild-worker-plugin.ts           ← Worker 번들 플러그인 (new Worker() 패턴 탐지 및 번들)
│   ├── esbuild-scss-plugin.ts             ← esbuild SCSS 플러그인
│   ├── esbuild-postcss-plugin.ts          ← esbuild PostCSS 플러그인 (빌드 후 CSS에 PostCSS 적용)
│   ├── esbuild-index-html.ts              ← index.html 생성
│   └── esbuild-pwa.ts                     ← PWA 설정 적용
├── dev-server/            ← HMR 및 개발 서버
│   ├── dev-http-server.ts            ← 개발용 HTTP 서버
│   ├── hmr-service.ts                ← HMR 서비스
│   └── hmr-client-script.ts          ← HMR 클라이언트 스크립트
├── lint/                  ← ESLint 실행
│   ├── lint-core.ts                  ← ESLint 실행 핵심 로직 (LintOptions, runLint)
│   ├── lint-with-program.ts          ← ESLint + ts.Program 통합 실행
│   └── lint-utils.ts                 ← runLintInWorker (lint Worker 유틸)
├── typecheck/             ← TypeScript 타입체크 유틸리티
│   ├── typecheck-serialization.ts    ← ts.Diagnostic 직렬화/역직렬화 (Worker 경계 통과용)
│   └── typecheck-non-package.ts      ← sd.config.ts에 없는 패키지의 typecheck 처리
├── deps/                  ← 의존성 관리
│   ├── replace-deps/                  ← 개발 시점 의존성 관리
│   │   ├── replace-deps.ts               ← replaceDeps 실행 (setupReplaceDeps, watchReplaceDeps)
│   │   ├── replace-deps-resolve.ts       ← replaceDeps 패턴 해석 (resolveReplaceDepEntries, parseWorkspaceGlobs)
│   │   └── collect-deps.ts               ← 의존성 수집 (collectDeps)
│   └── server-externals/              ← 빌드 시점 산출물 생성
│       └── server-production-files.ts    ← 서버 프로덕션 외부 모듈 수집 및 파일 복사
├── runtime/               ← 런타임 유틸리티
│   ├── ResultCollector.ts            ← 빌드 결과 중앙 수집 (key: "패키지명:타입")
│   ├── SignalHandler.ts              ← SIGINT/SIGTERM 감지, waitForTermination() 제공
│   ├── rebuild-manager.ts            ← RebuildManager 구현
│   ├── worker-utils.ts               ← Worker 관련 유틸리티
│   ├── worker-events.ts              ← Worker 이벤트 타입 정의
│   ├── engine-stop.ts                ← 엔진 중지 유틸리티
│   └── engine-watch-events.ts        ← watch 이벤트 공통 처리 (setupWatchEvents)
├── capacitor/             ← Capacitor Android 빌드 유틸
│   ├── capacitor.ts       ← Capacitor 프로젝트 관리 클래스 (초기화 + 실행 오케스트레이션)
│   ├── capacitor-android.ts ← Android SDK/Java 설정 유틸
│   ├── capacitor-build.ts ← Gradle 빌드 + 서명 설정 + 산출물 복사
│   ├── capacitor-icon.ts  ← Sharp 아이콘 생성
│   ├── capacitor-config-writer.ts ← capacitor.config.ts 파일 생성
│   └── capacitor-npm-config.ts    ← .capacitor/package.json 구성 및 의존성 관리
├── electron/              ← Electron 빌드 유틸
│   └── electron.ts        ← Electron 프로젝트 관리 클래스 (초기화 + 빌드 + 패키징)
└── utils/                 ← 범용 빌드 유틸리티
    ├── sd-config.ts             ← loadSdConfig (jiti로 sd.config.ts 동적 로드)
    ├── tsconfig.ts              ← parseTsconfig, getPackageSourceFiles, TypecheckEnv
    ├── package-utils.ts         ← 워크스페이스 패키지 탐색·검증 (validateTargets, discoverWorkspacePackages)
    ├── package-classify.ts      ← 패키지 분류·필터링 (classifyWatchPackages, classifyDevPackages)
    ├── diagnostic-utils.ts      ← isWorkspaceDiagnostic, formatDiagnosticError
    ├── output-utils.ts          ← formatBuildMessages, printDiagnostics, printServers
    ├── output-path-rewriter.ts  ← 출력 경로 변환
    ├── concurrency.ts           ← runWithConcurrency, getMaxConcurrency
    ├── build-env.ts             ← 빌드 환경 변수 처리
    ├── copy-public.ts           ← public/ 디렉토리 복사
    ├── copy-src.ts              ← copySrc 패턴에 따른 src→dist 파일 복사
    ├── generate-pwa-icons.ts    ← PWA 아이콘 생성 (sharp 사용)
    └── orchestrator-utils.ts    ← Orchestrator 공통 유틸리티
```

## Key Patterns

### sd.config.ts 타입 구조

`src/sd-config.types.ts`가 프로젝트의 `sd.config.ts`가 따르는 계약을 정의한다:

```typescript
// SdPackageConfig 유니언: 패키지 target에 따라 다른 타입
type SdPackageConfig =
  | SdBuildPackageConfig    // target: "node" | "browser" | "neutral" -- JS+dts 빌드
  | SdClientPackageConfig   // target: "client" -- Vite 빌드
  | SdServerPackageConfig   // target: "server" -- esbuild JS 빌드
  | SdScriptsPackageConfig; // target: "scripts" -- 빌드 제외, watch hook만 가능

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

`TscEngine`, `NgtscEngine`, `ServerEsbuildEngine`은 `BaseEngine`을 상속하고 4개 추상 메서드만 구현한다. `EsbuildClientEngine`은 worker 이벤트 구조가 달라 BaseEngine을 사용하지 않는다:

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

Orchestrator는 `initialize() -> start() -> awaitTermination() -> shutdown()` 순서로 호출한다. 모든 외부 리소스(Worker, FsWatcher)는 `shutdown()`에서 정리한다:

```typescript
// watch 모드
const orch = new WatchOrchestrator(options);
await orch.initialize(); // sd.config.ts 로드, 엔진 생성
await orch.start();      // 초기 빌드 실행
await orch.awaitTermination(); // SIGINT/SIGTERM 대기
await orch.shutdown();   // 리소스 정리

// dev 모드
const orch = new DevOrchestrator(options);
// 동일한 생명주기
```

`WatchOrchestrator`와 `DevOrchestrator`는 `BaseOrchestrator`를 상속하여 공통 초기화(config 로드, pathMap 구축, replaceDeps 감시, 런타임 인프라 생성)를 공유한다. `BuildOrchestrator`와 `TypecheckOrchestrator`는 독립 클래스이다.

### Angular AOT 컴파일 (sdAngularPlugin)

`src/angular/vite-angular-plugin.ts`의 `sdAngularPlugin`은 Vite 플러그인으로 Angular AOT 컴파일을 수행한다 (Vitest 전용):

- `config`: `resolvedPkgDir` 초기화
- `watchChange`: Vitest watch 모드에서 변경 파일 경로 수집 (`pendingWatchChanges`)
- `buildStart`: `AngularBuildPipeline` 초기화 -> 전체 컴파일 -> `emit`으로 파일 캐싱. watch 재빌드 시 변경 파일 캐시 무효화 후 증분 재컴파일
- `transform`: `.ts` 파일 요청 시 캐싱된 JS 반환, 인라인 소스맵 분리
- `buildEnd`: `pipeline` 참조 해제 (정리)

### typecheck-serialization

`ts.Diagnostic`은 Worker 경계를 직렬화 없이 통과할 수 없다. Worker 내부에서 `serializeDiagnostic()`으로 직렬화하고, Orchestrator에서 `deserializeDiagnostic()`으로 복원한다:

```typescript
// worker 내부
const serialized = serializeDiagnostic(diagnostic);

// orchestrator
const fileCache = new Map<string, string>();
const restored = deserializeDiagnostic(serialized, fileCache);
```

### esbuild tsc 플러그인 (서버 빌드)

`src/esbuild/esbuild-tsc-plugin.ts`의 `createTscPlugin`은 esbuild 플러그인으로 tsc 타입체크 + DTS emit을 통합한다. esbuild Go 네이티브 transpile과 Node.js 메인 스레드의 tsc를 microtask로 병렬 실행한다:

```typescript
// 플러그인 생성 (one-shot build: 로컬 변수, watch: 모듈 스코프)
const tscPlugin = createTscPlugin({ pkgDir, cwd, output: { dts: true } });

// esbuild.build()에 플러그인으로 전달
await esbuild.build({ ...options, plugins: [tscPlugin.plugin] });

// onStart: Promise.resolve().then(() => runTscPackageBuild()) — microtask로 tsc 스케줄링
// onEnd: tsc Promise를 await하여 결과를 내부 상태에 저장 (result.errors에 push하지 않음)

// 결과는 getter로 외부 조회
tscPlugin.getErrors();        // tsc 에러 (string[])
tscPlugin.getProgram();       // ts.Program (lint용)
tscPlugin.getDiagnostics();   // SerializedDiagnostic[]
tscPlugin.getAffectedFiles(); // 증분 lint용 affected files
```

watch 모드에서는 `server-esbuild-context.ts`가 플러그인 인스턴스를 모듈 스코프에 보관하고 위임 메서드(`getTscProgram()` 등)로 접근한다. context 재생성 시 `resetBuilderProgram()`으로 증분 빌드 상태를 리셋한다.

## Testing

**프레임워크**: Vitest

테스트 디렉토리는 `src/` 구조를 미러링한다:

```
tests/
├── angular/        ← sdAngularPlugin, vite-angular-plugin, scss-compiler, hmr-candidates 등
├── capacitor/      ← Capacitor 빌드 테스트 (init, build, run, icon, workspace)
├── commands/       ← 커맨드별 단위 테스트 (build, dev, watch, check, lint, typecheck, publish, device)
├── electron/       ← Electron 빌드 테스트
├── engines/        ← 엔진 단위 및 통합 테스트 (base-engine, tsc, ngtsc, server-esbuild, vite, engine-selection)
├── esbuild/        ← esbuild 플러그인 테스트 (tsc-plugin 등)
├── runtime/        ← ResultCollector, SignalHandler
├── orchestrators/  ← BuildOrchestrator, WatchOrchestrator, DevOrchestrator
├── utils/          ← 유틸 함수 단위 테스트
├── workers/        ← Worker 모듈 단위 테스트
└── sd-cli-entry.spec.ts       ← CLI 엔트리 테스트
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

## 자주하는 실수

- **build/dev에서 lint 실행 금지**: `BuildOrchestrator`/`WatchOrchestrator`/`DevOrchestrator`에서 `lint: true`로 넘기면 안 된다. lint는 `pnpm check` (lint 커맨드)에서만 실행한다