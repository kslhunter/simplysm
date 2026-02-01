---
title: 'CLI build 명령어 추가'
slug: 'cli-build-command'
created: '2026-02-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - esbuild
  - Vite (vite build)
  - listr2
  - Worker threads (@simplysm/core-node Worker)
files_to_modify:
  - packages/cli/src/sd-cli.ts
  - packages/cli/src/commands/build.ts (신규)
  - packages/cli/src/workers/build.worker.ts (신규)
  - packages/cli/src/workers/dts.worker.ts
code_patterns:
  - Worker.create<T>() + createWorker() 패턴
  - Listr2 concurrent 실행
  - esbuild context-free 빌드
  - TypeScript incremental 컴파일 (tsBuildInfoFile)
  - 패키지 타겟별 분기 (node/browser/neutral/client/scripts)
test_patterns:
  - 현재 CLI 테스트 없음 (향후 추가 가능)
---

# Tech-Spec: CLI build 명령어 추가

**Created:** 2026-02-01

## Overview

### Problem Statement

프로덕션 publish를 위한 일회성 빌드 명령이 없음. 현재는 `watch`만 있어서 개발용 파일 변경 감지 모드만 사용 가능. npm publish 전에 lint, typecheck, dts 생성, JS 빌드를 한 번에 실행할 방법이 필요함.

### Solution

`sd build [targets..]` 명령어 추가. lint, typecheck+dts, js빌드를 Worker를 통해 병렬 실행하고 완료 시 종료. Listr로 진행 상황을 표시하며, 하나라도 실패하면 오류를 표시하고 `process.exitCode = 1` 설정.

### Scope

**In Scope:**
- `build` 명령어 추가 (`sd-cli.ts`)
- `build.ts` 명령 파일 생성 (lint/dts/js/vite 병렬 오케스트레이션)
- `dts.worker.ts`에 일회성 `buildDts` 함수 추가 (타입체크 결과 포함)
- `build.worker.ts` 생성 (esbuild 일회성 JS 빌드)
- client 타겟: Vite production build + lint/typecheck
- Listr로 진행 표시

**Out of Scope:**
- `watch` 명령어 변경
- `typecheck` 명령어 변경 (별도 유지)
- 새로운 빌드 타겟 추가

## Context for Development

### Codebase Patterns

**현재 CLI 구조:**
- `sd-cli.ts`: yargs 기반 CLI 파서, 명령어별 handler 등록
- `commands/*.ts`: 각 명령어 구현 (`runLint`, `runTypecheck`, `runWatch`)
- `workers/*.ts`: Worker thread 구현 (`createWorker` 사용)

**병렬 실행 패턴:**
- `typecheck.ts`: Worker 풀 생성 → 작업 큐 → listr2로 진행 표시
- `watch.ts`: 패키지별 Worker 생성 → 이벤트 기반 결과 수집

**Worker 패턴:**
- `@simplysm/core-node`의 `Worker.create<T>()` 사용
- `createWorker({ fnName: fn })` 형태로 export
- 이벤트: `buildStart`, `build`, `error` 등

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/cli/src/sd-cli.ts` | CLI 파서, 명령어 등록 패턴 참조 |
| `packages/cli/src/commands/watch.ts` | 패키지별 병렬 빌드 + Listr 패턴 참조 |
| `packages/cli/src/commands/typecheck.ts` | Worker 풀 + 작업 큐 패턴 참조 |
| `packages/cli/src/commands/lint.ts` | lint 실행 로직 (재사용) |
| `packages/cli/src/workers/watch.worker.ts` | esbuild 빌드 로직 참조 |
| `packages/cli/src/workers/dts.worker.ts` | dts 생성 로직, 확장 대상 |
| `packages/cli/src/utils/tsconfig.ts` | tsconfig 파싱 유틸리티 |
| `packages/cli/src/utils/sd-config.ts` | sd.config.ts 로드 |

### Technical Decisions

1. **lint는 별도 Worker 없이 메인 프로세스에서 실행**: 기존 `runLint` 재사용, ESLint는 이미 내부적으로 병렬 처리
2. **dts.worker 확장**: 기존 watch용 함수 + 새로운 일회성 `buildDts` 함수 추가. 타입체크 결과(diagnostics)도 함께 반환. client 타겟용으로 `noEmit` 옵션 지원 (dts 없이 typecheck만)
3. **build.worker 신규 생성**: esbuild 일회성 빌드 전용 (watch.worker는 context.watch() 사용하므로 분리)
4. **client 타겟**: Vite build는 메인 프로세스에서 `vite.build()` API 직접 호출 (별도 Worker 불필요). typecheck는 dts.worker의 noEmit 옵션 사용
5. **scripts 타겟 제외**: 기존 watch와 동일하게 빌드 대상에서 제외
6. **타겟별 빌드 분기**:
   - `node/browser/neutral`: esbuild JS 빌드 + dts 생성 (타입체크 포함)
   - `client`: Vite production build + typecheck (dts 불필요)
   - `scripts`: 빌드 제외 (lint만 적용)
7. **neutral 타겟 dts**: browser 환경으로 단일 생성 (기존 watch 패턴 유지, dts는 플랫폼 독립적)
8. **빌드 순서**: 패키지 간 의존성 무시하고 병렬 빌드 (bundle: false이므로 의존성 무관)
9. **실패 시 동작**: 하나의 작업이 실패해도 나머지는 계속 진행, 최종 결과에서 실패 처리
10. **dist 폴더 정리**: 빌드 전 dist/ 폴더 삭제 (clean build) - publish용이므로 이전 빌드 잔재 방지
11. **Worker 동시성**: 별도 제한 불필요 (패키지당 1 Worker, typecheck처럼 파일 수가 많지 않음)

## Implementation Plan

### Tasks

#### Task 1: build.worker.ts 생성 (esbuild 일회성 JS 빌드)

- [x] **File**: `packages/cli/src/workers/build.worker.ts` (신규)
- [ ] **Action**: esbuild 일회성 빌드 Worker 생성
- [ ] **Details**:
  ```typescript
  // Types
  interface BuildInfo {
    name: string;
    config: SdBuildPackageConfig;
    cwd: string;
    pkgDir: string;
  }

  interface BuildResult {
    success: boolean;
    errors?: string[];
  }

  // Main function
  async function build(info: BuildInfo): Promise<BuildResult>
  ```
- [ ] **구현 내용**:
  - `watch.worker.ts`의 `startEsbuildWatch` 참조하여 일회성 버전 작성
  - `esbuild.build()` 사용 (context 없이)
  - `getPackageSourceFiles()`로 엔트리포인트 수집
  - `getCompilerOptionsForPackage()`로 타겟별 옵션 생성
  - 결과 반환: `{ success, errors }`

#### Task 2: dts.worker.ts 확장 (일회성 buildDts 함수 추가)

- [x] **File**: `packages/cli/src/workers/dts.worker.ts`
- [ ] **Action**: 기존 watch 함수 유지 + `buildDts` 함수 추가
- [ ] **Details**:
  ```typescript
  interface DtsBuildInfo {
    name: string;
    cwd: string;
    pkgDir: string;
    env: TypecheckEnv;
    noEmit?: boolean;  // true면 dts 생성 없이 typecheck만 (client 타겟용)
  }

  interface DtsBuildResult {
    success: boolean;
    errors?: string[];
    diagnostics: SerializedDiagnostic[];  // typecheck 결과
    errorCount: number;
    warningCount: number;
  }

  async function buildDts(info: DtsBuildInfo): Promise<DtsBuildResult>
  ```
- [ ] **구현 내용**:
  - `ts.createIncrementalProgram()` 사용 (watch가 아닌 일회성)
  - `noEmit: false`일 때: `emitDeclarationOnly: true`, `declaration: true`, `declarationMap: true`
  - `noEmit: true`일 때: typecheck만 수행 (client 타겟용)
  - 타입체크 diagnostics 수집 및 직렬화
  - `serializeDiagnostic()` 사용 (typecheck-serialization.ts)
  - `createWorker`에 `buildDts` 추가

#### Task 3: build.ts 생성 (빌드 오케스트레이션)

- [x] **File**: `packages/cli/src/commands/build.ts` (신규)
- [ ] **Action**: lint/dts/js/vite 병렬 실행 오케스트레이터
- [ ] **Details**:
  ```typescript
  interface BuildOptions {
    targets: string[];
    options: string[];
  }

  async function runBuild(options: BuildOptions): Promise<void>
  ```
- [ ] **구현 내용**:
  1. **sd.config.ts 로드**: `loadSdConfig()` 사용
  2. **패키지 분류**:
     - `buildPackages`: node/browser/neutral 타겟 (JS + dts)
     - `clientPackages`: client 타겟 (Vite build + typecheck)
     - scripts 타겟 제외
  3. **Listr 구조** (순차 + 병렬 조합):
     ```typescript
     new Listr([
       { title: 'Lint', task: () => runLint(...) },  // lint는 독립적
       { title: 'Clean', task: () => cleanDistFolders(packages) },  // dist 정리 먼저
       { title: 'Build', task: () => new Listr([...buildTasks], { concurrent: true, exitOnError: false }) },
     ], { concurrent: false })  // Clean → Build 순차 보장
     ```
  4. **병렬 빌드 작업**:
     - buildPackages: 패키지별 build.worker + dts.worker
     - clientPackages: 패키지별 `vite.build()` 직접 호출 + dts.worker(noEmit: true)
  5. **Vite build 설정** (watch.worker와 동일):
     ```typescript
     vite.build({
       root: pkgDir,
       base: `/${name}/`,
       plugins: [tsconfigPaths(), solidPlugin(), vanillaExtractPlugin()],
       esbuild: { tsconfigRaw: { compilerOptions } },
     })
     ```
  6. **결과 집계**:
     - 에러 수집 및 출력
     - diagnostics 포맷팅 (`ts.formatDiagnosticsWithColorAndContext`)
     - 하나라도 실패 시 `process.exitCode = 1`

#### Task 4: sd-cli.ts 수정 (build 명령어 등록)

- [x] **File**: `packages/cli/src/sd-cli.ts`
- [ ] **Action**: build 명령어 추가
- [ ] **Details**:
  ```typescript
  .command(
    "build [targets..]",
    "프로덕션 빌드를 실행한다.",
    (cmd) => cmd
      .positional("targets", { ... })
      .options({ options: { ... } }),
    async (args) => {
      await runBuild({ targets: args.targets, options: args.options });
    },
  )
  ```
- [ ] **구현 내용**:
  - `import { runBuild } from "./commands/build"` 추가
  - watch 명령어와 동일한 인자 구조 사용

### Acceptance Criteria

- [ ] **AC 1**: Given 프로젝트 루트에서, When `sd build` 실행, Then lint/typecheck/dts/js빌드가 모두 성공하고 `process.exitCode`가 0
- [ ] **AC 2**: Given node/browser/neutral 타겟 패키지, When `sd build` 실행, Then `dist/` 폴더에 `.js`, `.js.map`, `.d.ts`, `.d.ts.map` 파일 생성
- [ ] **AC 3**: Given client 타겟 패키지, When `sd build` 실행, Then Vite production 빌드 결과물 생성
- [ ] **AC 4**: Given lint 에러가 있는 상태, When `sd build` 실행, Then 에러 메시지 출력되고 `process.exitCode = 1`
- [ ] **AC 5**: Given 타입 에러가 있는 상태, When `sd build` 실행, Then 에러 메시지 출력되고 `process.exitCode = 1`
- [ ] **AC 6**: Given `sd build core-common solid` 실행, When 빌드 완료, Then 지정된 패키지만 빌드됨
- [ ] **AC 7**: Given scripts 타겟 패키지, When `sd build` 실행, Then 해당 패키지는 빌드 대상에서 제외 (lint만 적용)
- [ ] **AC 8**: Given 빌드 진행 중, When Listr 출력 확인, Then 각 작업의 진행 상황이 표시됨
- [ ] **AC 9**: Given 이전 빌드 잔재가 dist/에 있는 상태, When `sd build` 실행, Then dist/ 폴더가 정리되고 새 파일만 존재
- [ ] **AC 10**: Given 여러 패키지에서 동시에 에러 발생, When `sd build` 완료, Then 모든 에러가 출력됨

## Additional Context

### Dependencies

- 기존 의존성 내에서 구현 (추가 설치 불필요)
  - `esbuild`: JS 빌드
  - `vite`: client 타겟 production 빌드
  - `typescript`: dts 생성 + 타입체크
  - `listr2`: 진행 표시
  - `@simplysm/core-node`: Worker 유틸리티

### Testing Strategy

**수동 테스트**:
1. `sd build` - 전체 패키지 빌드
2. `sd build core-common` - 단일 패키지 빌드
3. `sd build solid solid-demo` - 복수 패키지 빌드
4. 타입 에러 주입 후 `sd build` - 에러 출력 확인
5. lint 에러 주입 후 `sd build` - 에러 출력 확인

**향후 자동화 테스트** (Out of Scope):
- Worker 함수 단위 테스트
- CLI 통합 테스트

### Notes

- `scripts` 타겟 패키지는 빌드 대상에서 제외 (기존 watch와 동일)
- neutral 타겟은 browser로 JS/dts 빌드 (기존 watch와 동일, dts는 플랫폼 독립적)
- Vite build 출력 경로는 기본값 (`dist/`) 사용
- incremental 컴파일 캐시는 `.cache/` 디렉토리에 저장 (기존 패턴 유지)
- lint는 전체 패키지를 한 번에 실행 (ESLint 내부 병렬 처리 활용)
- **빌드 전 dist/ 폴더 삭제** (clean build) - publish용이므로 이전 빌드 잔재 방지
- 하나의 작업이 실패해도 나머지는 계속 진행 (최종 결과에서 실패 처리)

## Review Notes

- Adversarial review completed
- Findings: 10 total, 3 fixed, 7 skipped
- Resolution approach: auto-fix
- Fixed: F1 (JS/DTS 병렬 실행), F4 (type import), F7 (완료 로그)
- Implementation date: 2026-02-01
