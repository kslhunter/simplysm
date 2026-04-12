# WBS: sd-cli 패키지 리팩토링

## 프로젝트 개요

- **배경:** sd-cli의 `src/utils/` 디렉토리가 41개 파일의 catch-all이 되어 도메인 경계를 반영하지 못함. Angular, esbuild, lint 등 명확한 도메인 파일들이 "utils" 아래에 혼재. BaseEngine 서브클래스 간 코드 중복, BuildOrchestrator 내 책임 혼재도 존재.
- **환경:** `packages/sd-cli` — pnpm 모노레포 내 CLI 빌드 도구. 71개 TypeScript 소스 파일.
- **전제조건:** 기존 기능의 동작 변경 없음 (순수 리팩토링). 모든 import 경로 변경 후 typecheck + lint 통과 필수.
- **기술적 제약:** barrel export 금지 (하위 디렉토리에 re-export용 index.ts 생성 불가). 개별 파일 경로로 직접 import.
- **참조 자료:**
  - `.tasks/260411163046_refactor-sd-cli/refactor.md` — 리팩토링 분석 리포트 (이슈 상세, 도메인별 파일 분산 현황, 의존 관계)
  - `packages/sd-cli/CLAUDE.md` — sd-cli 아키텍처 문서 (현재 디렉토리 구조, Key Patterns, 테스트 가이드)

## Impact Mapping

- **Goal:** sd-cli 코드베이스의 탐색성 향상 — 도메인별 파일 탐색 시 확인해야 할 디렉토리 수를 줄임
  - **Actor:** sd-cli 유지보수 개발자
    - **Impact:** 특정 도메인(Angular, esbuild, lint 등) 수정 시 관련 파일을 한 디렉토리에서 찾음
      - **Deliverable:** src/ 도메인 기반 디렉토리 재구조화
    - **Impact:** 엔진 결과 처리 변경 시 한 곳만 수정하면 됨
      - **Deliverable:** BaseEngine result normalization 통합
    - **Impact:** 네이티브 빌드 로직 변경 시 책임 소재가 명확함
      - **Deliverable:** BuildOrchestrator 네이티브 빌드 메서드 분리

## Feature Breakdown

### Epic 1. sd-cli 리팩토링

#### [x] Feature 1.1 src/ 도메인 기반 디렉토리 재구조화

**의존성:** 없음

**범위:**

- `utils/`에서 `angular/`로 5파일 이동: angular-compiler.ts, angular-build-pipeline.ts, angular-build.ts, ngtsc-build-core.ts, scss-compiler.ts
- `esbuild/` 디렉토리 신설, `utils/`에서 5파일 이동: esbuild-config.ts, esbuild-client-config.ts, esbuild-scss-plugin.ts, esbuild-index-html.ts, esbuild-pwa.ts
- `dev-server/` 디렉토리 신설, `utils/`에서 3파일 이동: hmr-client-script.ts, hmr-service.ts, dev-http-server.ts
- `lint/` 디렉토리 신설, `utils/`에서 3파일 이동: lint-core.ts, lint-with-program.ts, lint-utils.ts
- `typecheck/` 디렉토리 신설, `utils/`에서 2파일 이동: typecheck-serialization.ts, typecheck-non-package.ts
- `deps/` 디렉토리 신설, `utils/`에서 4파일 이동: replace-deps.ts, replace-deps-resolve.ts, collect-deps.ts, server-production-files.ts
- `utils/`에서 `runtime/`으로 5파일 이동: rebuild-manager.ts, worker-utils.ts, worker-events.ts, engine-stop.ts, engine-watch-events.ts
- 이동된 27파일을 참조하는 모든 import 경로 갱신
- `packages/sd-cli/CLAUDE.md` 아키텍처 문서의 디렉토리 구조 갱신
- tests/ 디렉토리 내 import 경로 갱신 (해당 시)

**경계:**

- 파일 내용(코드 로직) 변경 없음 — 파일 이동 + import 경로 변경만 수행
- utils/에 잔류하는 14파일은 이동하지 않음 (build-env, concurrency, copy-public, copy-src, diagnostic-utils, generate-pwa-icons, orchestrator-utils, output-path-rewriter, output-utils, package-classify, package-utils, sd-config, tsc-build, tsconfig)

**근거:**

- 리팩토링 리포트 STRUCT-001: utils/ 41파일 중 8개+ 도메인이 혼재, 도메인 디렉토리(angular/ 등)가 관련 파일을 포함하지 못함
- 사용자 확인: 7건의 도메인별 이동 방향 모두 승인됨

#### [x] Feature 1.2 BaseEngine result normalization 중복 제거

**의존성:** 없음

**범위:**

- BaseEngine에 `_normalizeResult()` protected 메서드 추가
- TscEngine._callBuild()의 result normalization 코드를 `this._normalizeResult()` 호출로 교체
- NgtscEngine._callBuild()의 result normalization 코드를 `this._normalizeResult()` 호출로 교체
- ServerEsbuildEngine._callBuild()의 result normalization 코드를 `this._normalizeResult()` 호출로 교체

**경계:**

- EsbuildClientEngine은 BaseEngine을 상속하지 않으므로 대상 아님
- Worker 측 결과 구조는 변경하지 않음

**근거:**

- 리팩토링 리포트 DESIGN-001: 동일한 8줄 코드가 3곳에서 반복

#### [x] Feature 1.3 BuildOrchestrator 네이티브 빌드 메서드 추출

**의존성:** 없음

**범위:**

- BuildOrchestrator에 `_runNativeBuilds()` private 메서드 추출 (현재 393-434행의 Capacitor/Electron 빌드 로직)
- `_addClientPackageTasks()`에서 추출한 메서드 호출로 교체

**경계:**

- DevOrchestrator의 Capacitor 초기화 로직은 대상 아님 (다른 생명주기)

**근거:**

- 리팩토링 리포트 DESIGN-002: _addClientPackageTasks 내부에 네이티브 빌드 로직 인라인
- 사용자 확인: 메서드 추출 방향 승인됨

## 제외 사항

- utils/ 잔류 14파일의 추가 재구조화 — 범용 유틸리티로 현재 배치가 적절 (사용자 미요청)
- TypecheckOrchestrator 결과 집계 분리 — 리팩토링 리포트에서 거짓양성으로 판정
- Worker 파일 비대화 해소 — 리팩토링 리포트에서 거짓양성으로 판정 (Worker 경계 훼손)
