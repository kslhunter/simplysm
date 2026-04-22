# WBS: SdTsCompiler 에러 처리 고도화

## 프로젝트 개요

- **배경:** adtek 프로젝트 `pnpm check` 시 TS 5.9.3 컴파일러 크래시가 발생하나, 에러 메시지에 원인 파일 정보가 없어 디버깅 불가. 또한 한 단계 크래시 시 독립적으로 실행 가능한 후속 단계까지 전부 스킵되는 구조적 문제.
- **환경:** simplysm 모노레포, `@simplysm/sd-cli` 패키지
- **전제조건:** 없음
- **기술적 제약:** TypeScript 5.9.3 컴파일러 내부 크래시는 TS 자체 버그이므로 근본 수정 불가 — sd-cli에서 방어적으로 처리해야 함
- **참조 자료:**
  - `.tasks/260422154640_debug-tscompiler-error-handling/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/ts-compiler/SdTsCompiler.ts` — 수정 대상 파일

## Impact Mapping

- **Goal:** 컴파일러 크래시 시 원인 파일을 포함한 상세 에러 정보를 제공하여 디버깅 시간을 단축한다
  - **Actor:** sd-cli 사용자 (개발자)
    - **Impact:** 크래시 에러 메시지만으로 원인 파일을 특정하여 빠르게 대응할 수 있다
      - **Deliverable:** SdTsCompiler `compileAsync()` 에러 처리 고도화

## Feature Breakdown

### Epic 1. SdTsCompiler 에러 처리

#### [x] Feature 1.1 compileAsync 에러 처리 고도화

**의존성:** 없음

**범위:**

- 단계별 try-catch 도입: analyzeAsync, findAffectedFiles, emit, collectDiagnostics, lintAndGlobalScss 각 단계를 개별 try-catch로 감싸서 한 단계 크래시 시에도 다음 단계 계속 진행
- 크래시 에러를 SdError(원본에러, "단계명", "파일명")로 감싸서 cause chain 보존 후 diagnostics에 누적
- 파일 추적 일원화: 파일 단위 루프가 있는 모든 곳에서 `_setCrashContext`로 현재 파일 추적
  - `_findAffectedFilesForTsc`: `ignoreSourceFile` 콜백으로 현재 파일 추적
  - `_findAffectedFilesForAngular`: 기존 `ignoreSourceFile` 콜백에 파일 추적 추가
  - `_collectDiagnosticsForTsc`: 파일 단위 루프로 분리하여 파일 추적
- per-file 프로브 제거: `_probeCrashPerFileAngular`, `_probeCrashPerFileTsc` 메서드 삭제 — 단계별 catch + 파일 추적으로 대체
- 바깥 try-catch는 최종 안전망으로 유지

**경계:**

- TS 컴파일러 버그 자체의 수정은 이 Feature에서 다루지 않음
- `esbuild-angular-compiler-plugin.ts`, `esbuild-tsc-plugin.ts` 등 다른 파일의 에러 처리는 범위 밖

**근거:**

- Impact Mapping Deliverable: "SdTsCompiler compileAsync() 에러 처리 고도화"
- debug.md 근본 원인 분석: 파일 추적 공백 5곳 중 3곳 미추적, 단일 try-catch로 전체 포기, per-file 프로브 한계
- 사용자 요청: "전반적으로 에러 처리 고도화 한다 생각하고 전반적으로 깊이 생각해서 고도화 해보자"

## 제외 사항

- TS 컴파일러 버그 자체 수정 — TS 외부 프로젝트 범위
- 다른 파일(esbuild 플러그인 등)의 에러 처리 — 이번 개선 범위 외
