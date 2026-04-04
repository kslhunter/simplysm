# WBS

## Impact Mapping

- **Goal:** sd-cli check 명령어에서 --type 옵션에 따라 실제 동작과 로그가 정확히 일치하도록 한다
  - **Actor:** sd-cli 사용자 (개발자)
    - **Impact 1:** lint만 요청 시 typecheck 없이 lint만 실행되어, 명령어 의미와 동작이 일치한다
    - **Impact 2:** 로그 메시지가 실제 수행 중인 작업을 정확히 반영하여 (--type에 따라 "린트 실행중", "타입체크/린트 실행중" 등), 디버깅 시 혼란이 없다
      - **Deliverable 1:** check --type lint 독립 실행 경로 (ESLint 자체 Program 생성)
      - **Deliverable 2:** check 명령어 전체 로깅 정리 (실행 작업에 맞는 로그 메시지)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. lint 독립 실행 경로

- [x] Feature 1.1 check --type lint 독립 실행
  - typecheck 미포함 + lint 포함 시 `executeLint()` 직접 호출 (기존 `executeTypecheck()` 경로를 타지 않음)
  - scripts 패키지 특수 처리 제거 — 모든 패키지가 `executeLint()` 동일 경로
  - `--fix` 옵션 지원
  - lint 결과를 check 결과 형식에 맞게 반환

### Epic 2. 로깅 정리

- [x] Feature 2.1 check/typecheck 명령어 로깅 정리
  - 사용자 요청에 따라 정확한 로그 메시지 출력 ("타입체크 실행 중...", "린트 실행 중...", "타입체크/린트 실행 중..." 등)
  - 결과 출력 섹션이 실제 수행한 작업만 포함 (lint 안 했으면 LINT 섹션 미출력)
  - 워커 내부의 lint 실행이 로그에 명확히 표시
  - build/watch/dev에서도 lint 결과가 별도로 구분되어 출력

## 참조 자료

### 현재 동작 정리표

| 명령어 | 패키지 타입 | emit(JS) | typecheck | dts | lint | test |
|--------|-----------|----------|-----------|-----|------|------|
| **check** (기본: typecheck,lint,test) | 일반 | X | O | X | O (Program 공유) | O |
| | scripts | X | X | X | O (독립) | O |
| **--type typecheck** | 일반 | X | O | X | X | X |
| | scripts | X | X | X | X | X |
| **--type lint** | 전체 | X | X | X | O (독립) | X |
| **--type test** | 전체 | X | X | X | X | O |
| **--type typecheck,lint** | 일반 | X | O | X | O (Program 공유) | X |
| | scripts | X | X | X | O (독립) | X |
| **--type typecheck,test** | 일반 | X | O | X | X | O |
| | scripts | X | X | X | X | O |
| **--type lint,test** | 전체 | X | X | X | O (독립) | O |
| **build** | library / angular library | O | O | O | O (Program 공유) | X |
| | server | O (esbuild) | O | X | O (Program 공유) | X |
| | client (Angular) | O (Vite) | O | X | O (Program 공유) | X |
| **watch** | library / angular library | O | O | O | O (Program 공유) | X |
| | server/client | 제외 |
| **dev** | server | O (esbuild) | O | X | O (Program 공유) | X |
| | client (Angular) | O (Vite) | O | X | O (Program 공유) | X |
| | library | 제외 |

### lint 실행 경로 규칙

- **typecheck 포함** → lint도 있으면 빌드 워커 내에서 Program 공유로 lint 실행 (`LintWithProgramRunner`)
- **typecheck 미포함** → lint는 `executeLint()`로 독립 실행 (ESLint가 `parserOptions.project: true`로 자체 Program 생성)
- scripts 패키지의 특수 처리 불필요 — typecheck 미포함 시 모든 패키지가 동일 경로

### 현재 로깅 문제점

| 문제 | 현상 | 원인 |
|------|------|------|
| lint만 요청 시 typecheck 로그 출력 | `check --type lint` → "타입체크 시작", "타입체크 실행 중..." | lint가 `executeTypecheck()` 내부에서 실행됨 |
| typecheck+lint 시 lint 포함 여부 불명확 | "타입체크 실행 중..."만 출력, lint 포함인지 알 수 없음 | 로그 메시지가 lint 포함 여부를 반영하지 않음 |
| 워커 내부 lint 실행이 묻힘 | `lint-with-program`에서 debug 로그만 1줄 | 빌드 로그에 비해 lint 로그가 부족 |
| build 결과에 lint 에러/경고가 별도 구분 없음 | JS/DTS 결과와 lint 결과가 섞여 출력될 수 있음 | 결과 포매팅에서 lint를 별도 섹션으로 처리하지 않음 |

### 현재 로그 흐름 (check 명령어)

```
[sd:cli:check] debug: 체크 시작 { targets, types }
[sd:cli:check] debug: 워크스페이스 패키지 검증 완료
[sd:cli:check] debug: 체크 구성 { needsTypecheck, needsLint, needsTest }
[sd:cli:check] start: 체크 실행 중... ({types})
  [sd:cli:typecheck] debug: 타입체크 시작 { targets, lint }
  [sd:cli:typecheck] start: 타입체크 실행 중... (N개 작업, 동시성: M)
    [sd:cli:engine] debug: [pkg] run 시작 (js: false, dts: false)
    [sd:cli:*-build:worker] debug: [pkg] worker build 시작
    [sd:cli:tsc-build] debug: [pkg] tsc 빌드 완료 (에러: N, 경고: N)
    [sd:cli:lint-with-program] debug: [pkg] 린트 실행 (N개 파일)
    [sd:cli:engine] debug: [pkg] run 완료 (success: true)
  [sd:cli:typecheck] success: 타입체크 실행 완료
  [sd:cli:typecheck] info: 타입체크 완료 { errorCount, warningCount }
  [sd:cli:lint] debug: 린트 시작 (scripts 패키지만)
  [sd:cli:lint] start: 린트 실행 중... (N개 파일)
  [sd:cli:lint] success: 린트 완료
[sd:cli:check] success: 체크 완료
결과 출력: TYPECHECK / LINT / TEST 섹션
SUMMARY: ✔ ALL PASSED 또는 ✖ N/M FAILED
```

### 참조 파일

- `packages/sd-cli/src/commands/check.ts` — check 명령어 진입점. typecheck/lint/test 조합 분기, 결과 포매팅, SUMMARY 출력
- `packages/sd-cli/src/commands/typecheck.ts` — typecheck 실행기. executeTypecheck() 함수, 패키지별 엔진 생성, lint 옵션 전달, 로그 메시지 확인
- `packages/sd-cli/src/commands/lint.ts` — 독립 lint 실행기. executeLint(), runLint() 함수, ESLint 설정 로드, 파일 수집, 결과 반환
- `packages/sd-cli/src/engines/BaseEngine.ts` — 엔진 기반 클래스. CommonBuildWorkerEvents, 워커 이벤트 처리, lint 결과 수집
- `packages/sd-cli/src/workers/library-build.worker.ts` — library 빌드 워커. lint 실행 조건 (`info.output.lint === true`), LintWithProgramRunner 호출
- `packages/sd-cli/src/workers/ngtsc-build.worker.ts` — Angular library 빌드 워커. lint 실행 조건, Program 전달
- `packages/sd-cli/src/workers/server-build.worker.ts` — server 빌드 워커. lint 실행 조건
- `packages/sd-cli/src/utils/lint-with-program.ts` — Program 공유 lint 실행기. LintWithProgramRunner 클래스, 파일 필터링, 캐싱
- `packages/sd-cli/src/utils/tsc-build.ts` — tsc 빌드 유틸. 진단 수집, Program 반환, 로그 메시지
- `packages/sd-cli/src/utils/ngtsc-build-core.ts` — Angular 빌드 코어. 컴파일러 초기화, 진단 수집, 로그 메시지
- `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` — build 명령어 오케스트레이터. lint 포함 빌드, 결과 포매팅
- `packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts` — watch/dev 오케스트레이터. 재빌드 시 lint 포함, RebuildManager

## 제외 사항

- build/watch/dev의 lint 포함 여부 변경 — 현행 유지 (항상 lint 포함, Program 공유)
- ESLint rule 변경이나 추가
- `pnpm lint` 단독 명령어의 pnpm scripts 변경 (현행 `sd-cli check --type lint` 매핑 유지)
- lint-with-program (Program 공유 lint) 로직 변경 — 동작은 현행 유지, 로깅만 개선
