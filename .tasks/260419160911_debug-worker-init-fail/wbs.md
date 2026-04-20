# WBS: esbuild Worker 플러그인 패턴 인식을 위한 createBrowserWorker 래퍼 제거

## 프로젝트 개요

- **배경:** `createBrowserWorker()` 래퍼 함수가 esbuild Worker 번들링 플러그인의 `new Worker(new URL(...))` AST 패턴 인식을 우회하여 Worker 파일이 클라이언트 번들에 포함되지 않음. 브라우저에서 Worker 스크립트 로드가 404로 실패하여 `Error: Worker 초기화 실패` 발생. 이전 디버그(`260416232412`)에서 올바르게 수정했으나 후속 리뷰에서 래퍼로 되돌려져 재발.
- **환경:** `@simplysm/service-client` 패키지, Angular 소비앱의 esbuild 클라이언트 빌드
- **전제조건:** 없음
- **기술적 제약:** esbuild Worker 플러그인(`esbuild-worker-plugin.ts`)은 AST에서 `new Worker(new URL(...))` / `new SharedWorker(new URL(...))` 패턴만 인식. 래퍼 함수를 통한 간접 호출은 `CallExpression`이므로 인식 불가.
- **참조 자료:**
  - `.tasks/260419160911_debug-worker-init-fail/debug.md` — 근본 원인 분석 결과
  - `.tasks/.archive/260417/260416232412_debug-onmessage-hang/debug.md` — 이전 디버그 (동일 원인)

## Impact Mapping

- **Goal:** ORM 쿼리 실행 시 Worker 초기화 실패 에러를 해소하여 정상적인 Worker 기반 encode/decode 동작을 복원한다
  - **Actor:** Angular 소비앱 개발자 / 최종 사용자
    - **Impact:** 30KB 이상 데이터 처리 시 Worker 오프로드가 정상 동작하여 메인 스레드 블로킹 없이 데이터를 처리한다
      - **Deliverable 1:** `client-protocol-wrapper.ts`에서 `createBrowserWorker` 래퍼 대신 `new Worker()` 직접 사용
      - **Deliverable 2:** 코드 주석 및 참조 문서에 재발 방지용 제약 문서화

## Feature Breakdown

### Epic 1. Worker 초기화 버그 수정

#### [x] Feature 1.1 createBrowserWorker 래퍼 제거 및 재발 방지 문서화

**의존성:** 없음

**범위:**

- `client-protocol-wrapper.ts:49-52`에서 `createBrowserWorker()` 호출을 `new Worker()` 직접 호출로 변경
- `createBrowserWorker` import 제거 (`isWorkerSupported`는 유지)
- 해당 코드에 esbuild Worker 플러그인 패턴 인식 제약에 대한 주석 추가
- `browser-compat.ts`에서 `createBrowserWorker` 함수 제거 (`BrowserWorker` 인터페이스, `isWorkerSupported`, `BlobInput`, `FileCollection` 등 나머지 export 유지)
- `.claude/references/sd-simplysm14/service-client/docs/types.md`에서 `createBrowserWorker` 관련 문서 제거 (현재 문서에 없으므로 해당 없을 수 있음)
- `.claude/references/sd-simplysm14/service-client/docs/protocol.md`에 Worker 생성 시 `new Worker()` 직접 패턴 필수 제약 문서화

**경계:**

- esbuild Worker 플러그인 자체의 수정은 이 Feature에서 다루지 않음
- Worker 파일(`client-protocol.worker.ts`) 내용은 변경하지 않음

**근거:**

- Impact Mapping Deliverable: Deliverable 1 (래퍼 제거), Deliverable 2 (재발 방지 문서화)
- 디버그 문서: `.tasks/260419160911_debug-worker-init-fail/debug.md` — 근본 원인 분석 및 사용자 선택 결과
- 사용자 요청: "직접 new Worker 써야 하는데 자꾸 sd-review 수행하면서 다시 바꿈. .claude/references/sd-simplysm14 및 해당 부분 주석에 확실하게 안내해야 함"

## 제외 사항

- esbuild Worker 플러그인에 `createBrowserWorker()` 패턴 추가 인식 — 특정 함수명 하드코딩이 필요하여 범용성이 낮고, 근본 해결(표준 패턴 사용)이 더 적절하므로 제외
