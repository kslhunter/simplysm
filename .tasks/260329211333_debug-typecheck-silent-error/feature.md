# Feature: typecheck 엔진 문자열 에러 출력

## 참조 자료

- [debug.md](./debug.md) — 근본 원인 분석 및 방안 B 선택
- 버그 위치: `packages/sd-cli/src/commands/typecheck.ts:226-228`
- 엔진 catch 블록: `packages/sd-cli/src/utils/tsc-build.ts:205-208`, `packages/sd-cli/src/utils/ngtsc-build-core.ts:394-397`, `packages/sd-cli/src/workers/server-build.worker.ts:421-426`
- 결과 출력: `packages/sd-cli/src/commands/check.ts:69-84`

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 문자열 에러 출력 방식 | 합성 ts.Diagnostic으로 변환하여 allDiagnostics에 추가 | 기존 파이프라인(ts.formatDiagnosticsWithColorAndContext)에 통합하여 일관된 출력 형식 유지 |

## 요구명세

```gherkin
Feature: typecheck 엔진 문자열 에러 출력

  Background:
    Given sd-cli typecheck가 실행 중이다

  Rule: 엔진 문자열 에러가 포매팅된 출력에 포함된다

    Scenario: 엔진 내부 예외로 문자열 에러만 반환
      Given 패키지 엔진이 내부 예외를 catch하여 dts.errors에 메시지를 담고 diagnostics는 빈 배열로 반환한다
      When typecheck 결과를 집계한다
      Then 해당 에러 메시지가 formattedOutput에 포함된다
      And errorCount가 표시된 에러 수와 일치한다

    Scenario: 복수 엔진이 문자열 에러를 반환
      Given 2개 이상의 엔진이 각각 dts.errors에 메시지를 담고 diagnostics는 빈 배열로 반환한다
      When typecheck 결과를 집계한다
      Then 모든 에러 메시지가 formattedOutput에 포함된다

  Rule: 기존 진단 출력 경로는 변경하지 않는다

    Scenario: 엔진이 diagnostics를 포함하여 반환
      Given 패키지에 TypeScript 타입 에러가 있어 엔진이 diagnostics에 에러를 포함하여 반환한다
      When typecheck 결과를 집계한다
      Then 기존과 동일하게 ts.formatDiagnosticsWithColorAndContext로 포매팅된다
```

## 구현계획

### 배경

`typecheck.ts`의 엔진 결과 집계 루프에서, 엔진이 내부 예외를 catch하여 `dts.errors`에 문자열 에러를 담고 `dts.diagnostics`를 빈 배열로 반환하면, 에러 수만 카운트되고 상세 내용이 출력되지 않는다.

### 목표

- `dts.errors`의 문자열 에러를 합성 `ts.Diagnostic`으로 변환하여 `allDiagnostics`에 추가
- 기존 진단 출력 경로는 변경하지 않음

### 비목표

- 엔진 catch 블록의 에러 메시지에 패키지명 추가 (별도 이슈)
- `check.ts`의 출력 포맷 변경

### 설계

`typecheck.ts:226-228` 코드에서 `dts.errors` 문자열을 합성 `ts.Diagnostic` 객체로 변환하여 `allDiagnostics`에 추가한다. `category: 1` (Error), `code: 0`, `file: undefined`.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| 합성 ts.Diagnostic으로 allDiagnostics에 추가 | 채택 | 기존 파이프라인 통합, 일관된 출력 |
| formattedOutput에 문자열 직접 추가 | 미채택 | 두 가지 출력 형식 혼재 |

### Vertical Slices

- [x] Slice 1: 합성 Diagnostic 생성 및 테스트
  - **구현 내용:** `typecheck.ts:226-228`에서 `dts.errors`를 합성 `ts.Diagnostic`으로 변환하여 `allDiagnostics`에 추가. 기존 테스트 유지 + 새 테스트 추가.
  - **Scenarios:**
    - Scenario: 엔진 내부 예외로 문자열 에러만 반환
    - Scenario: 복수 엔진이 문자열 에러를 반환
    - Scenario: 엔진이 diagnostics를 포함하여 반환
