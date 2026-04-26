# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/sd-cli/README.md`를 참조한다.

## Package Overview

- 패키지명: `@simplysm/sd-cli`
- 설명: Simplysm 워크스페이스의 build, watch, dev, check, lint, publish, device 명령을 실행하는 CLI 도구.
- 공개 API: `src/index.ts`에서 `sd.config.ts` 설정 타입, `sdAngularPlugin`, `SdTsCompiler`만 export한다.
- 소스 파일 수: 병합 소스 기준 `src/` TypeScript 파일 108개.

## Architecture

`src/` 하위 구조:

```text
angular/        Angular AOT 컴파일, SCSS 변환, Vite 플러그인
capacitor/      Capacitor Android 프로젝트 생성, 설정, 아이콘, 빌드
commands/       yargs 명령 핸들러와 publish 단계 구현
deps/           replace-deps와 서버 배포용 external/package 산출물 생성
dev-server/     개발 HTTP 서버, proxy, HMR WebSocket 서비스
electron/       Electron 앱 패키징과 installer 설정 생성
engines/        build/typecheck 엔진 추상화와 패키지 타겟별 엔진
esbuild/        client/server esbuild 옵션, 플러그인, index.html/PWA 처리
lint/           ESLint 실행, program 공유 lint runner
orchestrators/  build/dev/typecheck/watch 생명주기 조율
runtime/        worker 이벤트, 재빌드 관리, signal/cleanup 처리
ts-compiler/    TypeScript/Angular 증분 컴파일러 공개 API
typecheck/      non-package 타입체크와 diagnostic 직렬화
utils/          tsconfig, package 탐색, 출력 경로, 진단 포맷 유틸
workers/        client/server/library/lint/runtime worker 진입점
```

## Key Patterns

### 공개 API와 CLI 내부 API 분리

`src/index.ts`는 소비자에게 필요한 타입과 저수준 컴파일 API만 공개한다. `commands/`, `orchestrators/`, `workers/`, `engines/`의 export는 내부 테스트와 모듈 간 조립용이며 패키지 공개 API로 재노출하지 않는다.

```typescript
// src/index.ts
export * from "./sd-config.types";
export { sdAngularPlugin, type SdAngularPluginOptions } from "./angular/vite-angular-plugin";
export { SdTsCompiler } from "./ts-compiler/SdTsCompiler";
export type { ISdTsCompilerOptions } from "./ts-compiler/sd-ts-compiler-options";
export type { ISdTsCompilerResult } from "./ts-compiler/sd-ts-compiler-result";
```

새 소비자 API를 추가할 때는 `src/index.ts`에서 의도적으로 공개할지 먼저 판단한다. 내부 orchestration 타입을 편의상 re-export하지 않는다.

### Orchestrator 생명주기

장기 실행 명령은 `OrchestratorLifecycle<TStartResult>` 형태의 `startAsync()` / `stopAsync()` 계약으로 묶는다. `BuildOrchestrator`, `DevOrchestrator`, `TypecheckOrchestrator`, `WatchOrchestrator`가 이 패턴을 따른다.

```typescript
export interface OrchestratorLifecycle<TStartResult = void> {
  startAsync(): Promise<TStartResult>;
  stopAsync?(): Promise<void>;
}
```

명령 핸들러는 옵션 파싱과 종료 코드 처리에 집중하고, 실제 패키지 분류와 worker 실행은 orchestrator에 둔다.

### Worker 이벤트 계약

worker는 `@simplysm/core-common`의 `EventEmitter` 타입 계약을 사용한다. 이벤트 payload interface는 각 worker 파일 근처에 두고, 공통 종료/cleanup 처리는 `runtime/shared-worker-lifecycle.ts`와 `runtime/worker-utils.ts`를 재사용한다.

### TypeScript/Angular 증분 컴파일

`SdTsCompiler`는 `tsconfig.json`의 `angularCompilerOptions` 존재 여부로 Angular 컴파일을 분기한다. Angular 경로에서는 `NgtscProgram`, `AngularSourceFileCache`, SCSS dependency map을 유지해 watch 재빌드와 HMR 후보 판정에 사용한다.

SCSS 관련 상태는 compile cycle마다 `scssErrors`와 `scssDependencies`를 리셋하지만, side-effect SCSS registry는 compile 호출 간 유지된다.

### 설정 타입은 discriminated union으로 유지

`sd-config.types.ts`의 `SdPackageConfig`와 `SdPublishConfig`는 `target` 또는 `type` 필드로 분기한다. 새 패키지 target 또는 publish type을 추가하면 타입, package classify, orchestrator/engine 선택, 소비자 문서를 함께 갱신한다.

## Testing

테스트는 `packages/sd-cli/tests` 아래에 소스 디렉토리와 같은 축으로 배치한다.

- `angular/`, `esbuild/`, `ts-compiler/`, `workers/`는 fixture와 증분 빌드 동작을 함께 검증한다.
- `*.spec.ts`는 Vitest 실행 테스트다.
- `*.verify.md`는 동작 설명 또는 수동 검증 기록이다.
- fixture 하위의 `node_modules`와 `dist`는 테스트 입력/기대 산출물로 취급한다.

변경한 영역과 같은 하위 테스트를 우선 확인한다. 공개 API 문서만 바꾸는 작업은 테스트 실행 대신 링크/시그니처 정합성 확인을 보고한다.
