# CLI `check` 명령 추가 디자인

## 개요

`sd-cli`에 `check` 명령을 추가하여 typecheck, lint, test를 병렬로 실행하고 결과를 통합 출력한다.

## CLI 인터페이스

```
sd check [targets..] [--type <types>]
```

| 사용 예시 | 설명 |
|-----------|------|
| `pnpm check` | 전체 프로젝트, 3가지 모두 |
| `pnpm check packages/core-common` | 특정 경로, 3가지 모두 |
| `pnpm check --type typecheck` | 전체, typecheck만 |
| `pnpm check --type lint,test` | 전체, lint + test만 |
| `pnpm check packages/solid --type test` | 특정 경로 + test만 |

- `--type` 값: `typecheck`, `lint`, `test` (쉼표 구분)
- 기본값: 3가지 모두 실행

## 아키텍처

### 실행 방식

| 체크 | 방식 | 이유 |
|------|------|------|
| typecheck | `executeTypecheck()` (main thread, 내부 dts.worker 병렬) | 기존 Worker 인프라 재사용 |
| lint | lint.worker에서 `executeLint()` 실행 | Worker thread로 main thread 비차단 |
| test | subprocess (`vitest --run`) | Playwright/vite-plugin-solid 등 복잡한 환경 |

### 실행 흐름

```
runCheck()
  ├── Worker: executeLint()          ─┐
  ├── executeTypecheck()             ─┼── Promise.all (병렬)
  └── spawn: vitest --run            ─┘
  │
  └── 결과 수집 → 섹션별 포맷팅 → 출력
```

### 리팩토링

기존 `runLint()`/`runTypecheck()`에서 핵심 로직을 `executeLint()`/`executeTypecheck()`로 분리한다.
기존 명령은 execute 함수를 호출 후 출력하는 래퍼로 유지하여 하위호환 보장.

**typecheck.ts 변경:**
- `executeTypecheck(options)` 추출: `{ errorCount, warningCount, formattedOutput }` 반환
- `runTypecheck()`: `executeTypecheck()` 호출 + stdout 출력 (기존 동작 유지)

**lint.ts 변경:**
- `executeLint(options)` 추출: `{ errorCount, warningCount, formattedOutput }` 반환
- `runLint()`: `executeLint()` 호출 + stdout 출력 (기존 동작 유지)

**lint.worker.ts 변경:**
- `executeLint()` 호출하여 구조화된 결과 반환

## 출력 형식

세 체크 모두 완료 후 버퍼링된 결과를 섹션별로 출력:

```
====== TYPECHECK ======
✔ 0 errors, 2 warnings

packages/core-common/src/utils.ts(10,5): warning TS6133: ...

====== LINT ======
✖ 3 errors, 1 warning

/path/to/src/foo.ts
  10:5  error  no-unused-vars  ...

====== TEST ======
✔ 47 tests passed

====== SUMMARY ======
✖ 1/3 FAILED (lint)
Total: 3 errors, 3 warnings
```

**규칙:**
- 성공: `✔` + 요약 1줄
- 실패: `✖` + 요약 1줄 + 상세 에러 출력
- SUMMARY: 전체 pass/fail 현황 + 총 에러/경고 수
- `process.exitCode = 1`: 하나라도 실패 시

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `commands/check.ts` | **새 파일** — `runCheck()` 함수 |
| `commands/typecheck.ts` | `executeTypecheck()` 추출 |
| `commands/lint.ts` | `executeLint()` 추출 |
| `workers/lint.worker.ts` | `executeLint()` 사용, 구조화된 결과 반환 |
| `sd-cli-entry.ts` | `check` 명령 등록 |
| `package.json` (root) | `"check"` 스크립트 추가 |

## 결과 타입 정의

```typescript
interface CheckResult {
  name: string;           // "TYPECHECK" | "LINT" | "TEST"
  success: boolean;
  errorCount: number;
  warningCount: number;
  formattedOutput: string; // 에러 상세 출력용 포맷된 텍스트
}
```
