# Feature 2 일관성/공통화

## 참조 자료

- [wbs.md](wbs.md)
- [review.md](../260329162645_review-sd-cli-tasks/review.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 공통 진단 필터링/포맷 함수 위치 | 새 파일 `utils/diagnostic-utils.ts` | 기존 파일 중 적합한 곳이 없고, 3곳에서 import할 공통 모듈이 필요 |
| D2 | lint-utils.ts의 runLint 이름 변경 | `runLintInWorker`로 변경 | Worker 기반 실행임을 명시하여 lint.ts의 `runLint`와 구분 |
| D3 | lint-with-program.ts 캐시 경로 수정 | pkgName의 `/`를 `-`로 치환 | 최소 변경으로 scoped 패키지명 문제 해결 |
| D4 | vite-angular-plugin lintRunner 중복 제거 | 클로저 레벨 헬퍼 함수 추출 | 플러그인 함수 내부에서만 사용되므로 모듈 레벨 export 불필요 |

## 요구명세

```gherkin
Feature: 2 일관성/공통화

  Background:
    Given sd-cli 패키지의 빌드/린트 파이프라인이 동작한다

  Rule: 진단 필터링은 단일 공통 함수를 사용한다

    Scenario: ngtsc-build-core에서 공통 필터 함수 사용
      Given ngtsc-build-core.ts에서 진단을 수집한다
      When 워크스페이스 스코프 필터링을 적용한다
      Then diagnostic-utils.ts의 공통 함수가 호출된다
      And cwd 하위 파일만 포함되고 node_modules는 제외된다

    Scenario: vite-angular-plugin에서 공통 필터 함수 사용
      Given vite-angular-plugin.ts에서 진단을 수집한다
      When 워크스페이스 스코프 필터링을 적용한다
      Then diagnostic-utils.ts의 공통 함수가 호출된다

    Scenario: tsc-build에서 공통 필터 함수 사용
      Given tsc-build.ts에서 진단을 수집한다
      When 워크스페이스 스코프 필터링을 적용한다
      Then diagnostic-utils.ts의 공통 함수가 호출된다

  Rule: 에러 포맷은 단일 공통 함수를 사용한다

    Scenario: 모든 빌드 경로에서 동일 포맷으로 에러 출력
      Given 타입 에러가 발생한다
      When 에러 메시지를 포맷한다
      Then "파일:줄:열: TS코드: 메시지" 형식으로 통일된다

  Rule: lintRunner 초기화 로직이 중복되지 않는다

    Scenario: vite-angular-plugin에서 lintRunner 초기화가 단일 함수로 처리
      Given sdAngularPlugin이 동작한다
      When buildStart 또는 handleHotUpdate에서 lintRunner가 필요하다
      Then 동일한 헬퍼 함수를 통해 초기화된다

  Rule: runLint 함수명이 모듈 간 구분된다

    Scenario: lint-utils.ts의 Worker 기반 lint 함수명 구분
      Given check.ts에서 Worker 기반 lint를 호출한다
      When lint-utils.ts의 함수를 import한다
      Then 함수명이 runLintInWorker이다

  Rule: ESLint 캐시 경로가 scoped 패키지명을 안전하게 처리한다

    Scenario: @simplysm/angular 같은 scoped 패키지명으로 캐시 생성
      Given pkgName이 "@simplysm/angular"이다
      When ESLint 캐시 경로를 생성한다
      Then 캐시 파일명이 "eslint-@simplysm-angular.cache"이다
      And 불필요한 서브디렉토리가 생성되지 않는다
```

## 구현계획

### 배경

sd-cli 빌드 파이프라인의 진단 필터링, 에러 포맷, lint 초기화 코드가 여러 모듈에 중복·분산되어 있다. 동일 로직을 공통 유틸로 추출하고, 네이밍 불일치를 해소한다.

### 목표

- 진단 필터링(`isWorkspaceDiagnostic`)과 에러 포맷(`formatDiagnosticError`) 공통 함수 추출
- vite-angular-plugin의 lintRunner 초기화 중복 제거
- `runLint` → `runLintInWorker` 이름 변경
- lint-with-program의 캐시 경로 scoped 패키지명 안전 처리

### 비목표

- 진단 필터링의 동작 변경 (기존 동작 유지, 구현만 통합)
- 기존 `runLint` (lint.ts) 이름 변경 (CLI 엔트리포인트이므로 유지)

### 설계

#### diagnostic-utils.ts (신규)

```typescript
/** 워크스페이스 스코프 진단 필터 — cwd 하위 + node_modules 제외 */
export function isWorkspaceDiagnostic(diagnostic: ts.Diagnostic, cwd: string): boolean

/** 진단 에러를 "파일:줄:열: TS코드: 메시지" 형식으로 포맷 */
export function formatDiagnosticError(diagnostic: ts.Diagnostic): string
```

#### 소비자 변경

| 파일 | 기존 | 변경 |
|------|------|------|
| `ngtsc-build-core.ts` | 인라인 `startsWith + includes` 필터 | `isWorkspaceDiagnostic` 호출 |
| `ngtsc-build.worker.ts` (performWatchBuild) | 동일 인라인 필터 | `isWorkspaceDiagnostic` 호출 |
| `vite-angular-plugin.ts` (collectAndFormatDiagnostics) | 인라인 필터 + 다른 포맷 | `isWorkspaceDiagnostic` + `formatDiagnosticError` 호출 |
| `tsc-build.ts` | `pathx.isChildPath` + `includes` 필터 | `isWorkspaceDiagnostic` 호출 |
| `lint-utils.ts` | `runLint` export | `runLintInWorker` export |
| `check.ts` | `import { runLint }` | `import { runLintInWorker }` |
| `lint-with-program.ts` | `eslint-${this._pkgName}.cache` | `eslint-${safeName}.cache` (슬래시→하이픈) |

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| 기존 typecheck-serialization.ts에 필터/포맷 추가 | 미채택 | 직렬화와 필터링은 별개 관심사 |
| vite-angular-plugin의 collectAndFormatDiagnostics를 완전히 제거 | 미채택 | Vite 플러그인 내부에서 DiagnosticMessage→콘솔 출력 경로가 별도로 필요 |

### Vertical Slices

- [x] Slice 1: diagnostic-utils.ts 생성 + ngtsc-build-core/tsc-build/worker 적용
- [x] Slice 2: vite-angular-plugin 진단 통합 + lintRunner 중복 제거
- [x] Slice 3: runLint → runLintInWorker 이름 변경
- [x] Slice 4: lint-with-program 캐시 경로 수정

#### Slice 1: diagnostic-utils.ts 생성 + 소비자 적용

- **구현 내용:** `utils/diagnostic-utils.ts` 신규 생성 (`isWorkspaceDiagnostic`, `formatDiagnosticError`). `ngtsc-build-core.ts`, `ngtsc-build.worker.ts` (performWatchBuild), `tsc-build.ts`의 인라인 필터/포맷을 공통 함수로 교체
- **파일:** `utils/diagnostic-utils.ts` (신규), `utils/ngtsc-build-core.ts`, `workers/ngtsc-build.worker.ts`, `utils/tsc-build.ts`
- **Scenarios:**
  - Scenario: ngtsc-build-core에서 공통 필터 함수 사용
  - Scenario: tsc-build에서 공통 필터 함수 사용
  - Scenario: 모든 빌드 경로에서 동일 포맷으로 에러 출력

#### Slice 2: vite-angular-plugin 진단 통합 + lintRunner 중복 제거

- **구현 내용:** `collectAndFormatDiagnostics`에서 `isWorkspaceDiagnostic` 사용. lintRunner 초기화를 클로저 내 헬퍼 함수로 추출
- **의존:** Slice 1
- **파일:** `angular/vite-angular-plugin.ts`
- **Scenarios:**
  - Scenario: vite-angular-plugin에서 공통 필터 함수 사용
  - Scenario: vite-angular-plugin에서 lintRunner 초기화가 단일 함수로 처리

#### Slice 3: runLint → runLintInWorker 이름 변경

- **구현 내용:** `lint-utils.ts`의 `runLint`를 `runLintInWorker`로 이름 변경. `check.ts`의 import 갱신
- **파일:** `utils/lint-utils.ts`, `commands/check.ts`
- **Scenarios:**
  - Scenario: lint-utils.ts의 Worker 기반 lint 함수명 구분

#### Slice 4: lint-with-program 캐시 경로 수정

- **구현 내용:** `lint-with-program.ts`에서 `this._pkgName`의 `/`를 `-`로 치환하여 캐시 파일명 생성
- **파일:** `utils/lint-with-program.ts`
- **Scenarios:**
  - Scenario: @simplysm/angular 같은 scoped 패키지명으로 캐시 생성
