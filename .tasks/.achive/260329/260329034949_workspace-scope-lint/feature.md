# Feature 워크스페이스 전체 스코프 진단/린트 및 증분 린트

## 참조 자료

### 현재 구조
- typecheck 진단: `ngtsc-build-core.ts`, `ngtsc-build.worker.ts`, `tsc-build.ts`에서 `pkgDir/src/` 하위만 필터링
- lint 대상: `lint-with-program.ts`의 `_extractFiles`에서 `pkgDir` 하위만 필터링
- ESLint 캐시: 파일 내용 해시 기반, 의존 파일 변경 시 무효화 안 됨
- 오케스트레이터: `ts.sortAndDeduplicateDiagnostics`로 진단 중복 제거 이미 구현
- `AngularCompiler.affectedFiles`, `ts.EmitAndSemanticDiagnosticsBuilderProgram`이 affected files 추적 가능

### 관련 파일
- `packages/sd-cli/src/utils/lint-with-program.ts` — `_extractFiles`, `lint()`
- `packages/sd-cli/src/utils/ngtsc-build-core.ts` — `runNgtscBuild` 진단 필터
- `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — `performWatchBuild` 진단 필터
- `packages/sd-cli/src/utils/tsc-build.ts` — `diagnosticFilter`
- `packages/sd-cli/src/utils/angular-compiler.ts` — `_findAffectedFiles`
- `packages/sd-cli/src/angular/vite-angular-plugin.ts` — `handleHotUpdate`

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 진단/lint 필터 범위 | cwd (워크스페이스 전체) | 의존 패키지의 에러도 보여야 함 |
| D2 | emit 필터 | pkgDir 유지 | 자기 패키지만 출력해야 함 |
| D3 | dev/watch lint 스코프 차이 | 이번 범위 밖 | 나중에 결정 |
| D4 | lint 증분 | affected files 기반 | ESLint 캐시는 의존 변경을 감지 못함 |
| D5 | tsc-build affected files | builder program에서 affected 추출 | incremental program은 affected 목록 API 없음 |
| D6 | ESLint 캐시 사용 안 함 | affected files만 전달하여 대체 | affected 기반 증분이 캐시보다 정확 |

## 요구명세

```gherkin
Feature: sd-cli 워크스페이스 전체 스코프 진단/린트 및 증분 린트

  Background:
    Given pnpm 모노레포에 core-common, service-server, angular 패키지가 있다
    And tsconfig.json paths에 "@simplysm/*": ["packages/*/src/index.ts"]가 설정되어 있다

  Rule: 진단 결과는 워크스페이스 전체를 포함한다

    Scenario: 의존 패키지의 타입 에러가 보인다
      Given core-common/src/utils/error.ts에 타입 에러가 있다
      When service-server 패키지를 타입체크한다
      Then core-common의 타입 에러가 진단 결과에 포함된다

    Scenario: node_modules 진단은 제외된다
      Given node_modules 내 라이브러리에 타입 경고가 있다
      When 패키지를 타입체크한다
      Then node_modules 내 진단은 결과에 포함되지 않는다

    Scenario: 여러 패키지가 같은 진단을 보고해도 중복 제거된다
      Given core-common에 타입 에러가 있다
      And service-server와 angular 모두 core-common을 참조한다
      When check 커맨드로 전체 타입체크를 실행한다
      Then core-common의 에러는 한 번만 출력된다

  Rule: lint 대상은 ts.Program의 워크스페이스 소스 전체이다

    Scenario: 의존 패키지 소스도 lint 대상이다
      Given service-server가 core-common을 import한다
      When service-server 패키지를 lint한다
      Then core-common/src 파일도 lint 결과에 포함된다

    Scenario: 비소스 파일은 제외된다
      When 패키지를 lint한다
      Then .d.ts, node_modules, .ngtypecheck.ts 파일은 lint하지 않는다

  Rule: watch rebuild 시 affected files만 lint한다

    Scenario: 의존 파일 변경 시 의존자도 re-lint된다
      Given watch 모드로 service-server가 실행 중이다
      When core-common/src/utils/error.ts가 변경된다
      Then error.ts를 import하는 service-server 파일도 re-lint된다

    Scenario: 무관한 파일은 lint하지 않는다
      Given watch 모드로 service-server가 실행 중이다
      When core-common/src/utils/error.ts가 변경된다
      Then error.ts를 import하지 않는 service-server 파일은 lint하지 않는다

  Rule: one-time build에서는 전체 lint를 수행한다

    Scenario: check 커맨드는 증분 없이 전체 lint한다
      When pnpm check를 실행한다
      Then 모든 워크스페이스 소스 파일이 lint된다

  Rule: emit은 자기 패키지만 수행한다

    Scenario: 빌드 시 의존 패키지를 emit하지 않는다
      When service-server를 빌드한다
      Then service-server/dist에만 출력 파일이 생성된다
      And core-common/dist에는 출력 파일이 생성되지 않는다
```

## 구현계획

### 배경

sd-cli의 typecheck/lint 파이프라인에서 진단 결과와 lint 대상이 `pkgDir`로 필터링되어, 의존 패키지의 에러가 누락된다. 또한 ESLint의 파일 캐시는 의존 파일 변경을 감지하지 못해, watch 모드에서 증분 lint가 부정확하다.

### 목표

- 진단/lint 필터를 `pkgDir` → `cwd`(워크스페이스)로 확장
- watch rebuild 시 affected files 기반 증분 lint 구현

### 비목표

- dev/watch에서 자기 패키지 외 포함 여부 차이 (D3: 이번 범위 밖)
- lint 결과의 패키지별 중복 제거 (진단은 이미 dedup 있음, lint은 추후)

### 설계

#### 진단 필터 변경

기존: `diag.file.fileName.startsWith(normalizedSrcDir)`
변경: `diag.file.fileName.startsWith(normalizedCwd) && !fileName.includes("/node_modules/")`

적용 대상: `ngtsc-build-core.ts`, `ngtsc-build.worker.ts`, `tsc-build.ts`

#### lint 파일 추출 변경

`_extractFiles(program)`: `pkgDir` 필터 제거 → `cwd` 범위로 변경. 제외 대상(`.d.ts`, `node_modules`, `.ngtypecheck.ts`)은 유지.

#### 증분 lint (affected files)

`LintRunOptions`에 `affectedFiles?: ReadonlySet<string>` 추가. 제공 시 `_extractFiles` 결과와 교집합하여 lint 대상 축소.

affected files 소스:
- **ngtsc worker**: `AngularCompiler.initialize()` 반환값의 `affectedFiles` (Set<ts.SourceFile>)
- **tsc-build**: `ts.createIncrementalProgram`을 `ts.createEmitAndSemanticDiagnosticsBuilderProgram`으로 전환하여 `getSemanticDiagnosticsOfNextAffectedFile`로 추적
- **vite-angular-plugin**: 이미 `initResult.affectedFiles`에 접근 가능

one-time build(`build`/`check` 커맨드)에서는 `affectedFiles`를 전달하지 않아 전체 lint. watch rebuild에서만 affected files 전달.

#### ESLint 캐시

affected files 기반 증분이 ESLint 파일 캐시보다 정확하므로, `cache: false`로 변경. affected files가 제공되지 않을 때(one-time build)는 `cache: true` 유지.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| ESLint 캐시 항목을 프로그래밍적으로 무효화 | 미채택 | ESLint API에 캐시 항목 삭제 기능 없음 |
| affected files만 `lintFiles()`에 전달 | **채택** | 가장 단순하고 정확 |
| tsc-build에서 incremental program 유지 + 별도 affected 추적 | 미채택 | builder program 전환이 더 일관적 |

### Vertical Slices

- [x] #### Slice 1: 진단 필터 cwd 확장
  - **구현 내용:** `ngtsc-build-core.ts`, `ngtsc-build.worker.ts`, `tsc-build.ts`의 진단 필터를 `cwd` + `node_modules` 제외로 변경
  - **Scenarios:**
    - Scenario: 의존 패키지의 타입 에러가 보인다
    - Scenario: node_modules 진단은 제외된다
    - Scenario: 여러 패키지가 같은 진단을 보고해도 중복 제거된다

- [x] #### Slice 2: lint 대상 cwd 확장
  - **구현 내용:** `_extractFiles`에서 `pkgDir` 필터를 `cwd` 필터로 변경. `LintRunOptions`에서 `pkgDir` 제거
  - **의존:** Slice 1
  - **Scenarios:**
    - Scenario: 의존 패키지 소스도 lint 대상이다
    - Scenario: 비소스 파일은 제외된다
    - Scenario: check 커맨드는 증분 없이 전체 lint한다

- [x] #### Slice 3: 증분 lint — affected files 전달 인프라
  - **구현 내용:** `LintRunOptions`에 `affectedFiles` 추가. 제공 시 교집합 필터. ngtsc worker의 watch rebuild에서 `AngularCompiler.affectedFiles`를 lint에 전달. ESLint 캐시 정책 변경
  - **의존:** Slice 2
  - **Scenarios:**
    - Scenario: 의존 파일 변경 시 의존자도 re-lint된다
    - Scenario: 무관한 파일은 lint하지 않는다

- [x] #### Slice 4: tsc-build affected files 추적
  - **구현 내용:** `tsc-build.ts`에서 `ts.createIncrementalProgram` → `ts.createEmitAndSemanticDiagnosticsBuilderProgram` 전환. affected files를 추출하여 `TscPackageBuildResult`에 포함. library-build/server-build worker의 watch rebuild에서 lint에 전달
  - **의존:** Slice 3
  - **Scenarios:**
    - Scenario: 의존 파일 변경 시 의존자도 re-lint된다 (tsc 경로)

- [x] #### Slice 5: emit 필터 유지 확인
  - **구현 내용:** 변경 없음 — emit 필터가 기존대로 `pkgDir` 스코프인지 검증
  - **Scenarios:**
    - Scenario: 빌드 시 의존 패키지를 emit하지 않는다
