# WBS: service-client Worker 환경별 분기

## 프로젝트 개요

- **배경:** `service-client` 패키지는 target `neutral`로 node/browser 이중 typecheck를 수행한다. `sd-cli check`의 `getCompilerOptionsForEnv`가 node 환경에서 DOM/WebWorker lib를 제거하므로, DOM `Worker` 생성자를 직접 사용하는 `client-protocol-wrapper.ts`에서 TS2693 에러가 발생한다. 또한 node 환경에서는 Worker 오프로딩이 아예 비활성화되어 대용량 메시지 처리 시 메인 스레드가 블로킹된다.
- **환경:** simplysm 모노레포, TypeScript 5.9, esbuild Worker 번들링 플러그인(`sd-worker-bundle`)
- **전제조건:** esbuild Worker 번들링 플러그인이 browser 패턴(`new Worker(new URL("path", import.meta.url))`)과 node 패턴(`import.meta.resolve("./path")`)을 모두 AST에서 인식한다 (확인 완료: `esbuild-worker-plugin.ts`)
- **기술적 제약:**
  - esbuild 플러그인이 `new Worker(new URL(...))` 패턴을 인식하려면 `Worker` 식별자가 `NewExpression.callee`에 그대로 있어야 한다 (`globalThis.Worker` 등 우회 불가)
  - neutral 패키지의 모든 소스 파일이 node/browser 양쪽에서 typecheck된다
  - `import("worker_threads")`는 동적 import이므로 async 처리 필요
- **참조 자료:**
  - `packages/service-client/src/protocol/client-protocol-wrapper.ts` — 수정 대상 파일
  - `packages/service-client/src/types/browser-compat.ts` — 환경 호환 타입/유틸
  - `packages/service-client/src/workers/client-protocol.worker.ts` — Worker 진입점
  - `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts` — esbuild Worker 번들링 플러그인 (패턴 인식 방식 확인용)
  - `packages/sd-cli/src/utils/tsconfig.ts:41-64` — `getCompilerOptionsForEnv` (node env에서 DOM lib 제거 로직)
  - `sd.config.ts:27` — `service-client` target: `neutral` 설정

## Impact Mapping

- **Goal:** `service-client` neutral 패키지가 node/browser 양쪽 typecheck를 통과하고, 양 환경에서 Worker 오프로딩이 동작한다
  - **Actor:** `service-client` 패키지 소비자 (browser 클라이언트 앱, Node.js 클라이언트)
    - **Impact:** node 환경에서도 대용량 메시지 encode/decode를 Worker 스레드로 오프로드하여 메인 스레드 블로킹을 방지한다
      - **Deliverable:** 환경별 Worker 생성 분기 로직 (browser: DOM Worker, node: worker_threads.Worker)

## Feature Breakdown

### Epic 1. Worker 환경별 분기

#### [x] Feature 1.1 환경 감지 및 Worker 생성 분기

**의존성:** 없음

**범위:**

- node 환경 감지 (`worker_threads` 사용 가능 여부)
- browser 환경에서 DOM `Worker`로 생성 (기존 `new Worker(new URL(...))` 패턴 유지 — esbuild 플러그인 호환)
- node 환경에서 `worker_threads.Worker`로 생성 (`import.meta.resolve(...)` 패턴 — esbuild 플러그인 호환)
- node `worker_threads.Worker`를 `BrowserWorker` 인터페이스로 어댑팅 (`on("message")` → `onmessage`, `on("error")` → `onerror`)
- `getWorker()` 비동기화 및 호출부 대응 (`runWorker` 등)
- node/browser 양쪽 typecheck 통과

**경계:**

- Worker 내부 encode/decode 로직(`client-protocol.worker.ts`)은 변경하지 않음 (메시지 패싱 어댑터만 추가 — `self.onmessage`/`self.postMessage`는 Node.js에 없으므로 환경 분기 필수)
- `BlobInput`, `FileCollection` 등 `browser-compat.ts`의 다른 타입은 변경하지 않음
- sd-cli typecheck 로직(`getCompilerOptionsForEnv`)은 변경하지 않음

**근거:**

- Impact Mapping Deliverable: "환경별 Worker 생성 분기 로직"
- 사용자 지시: "node에선 node worker client에선 client worker를 써야지"
- typecheck 에러: `TS2693: 'Worker' only refers to a type, but is being used as a value here` (pnpm check 실행 결과)
- 이전 시도 (commit 2369f3be0)에서 `createBrowserWorker()` 래퍼를 제거하고 직접 `new Worker(...)` 사용으로 변경했으나, neutral 이중 typecheck를 고려하지 않아 발생

## 제외 사항

- sd-cli의 `getCompilerOptionsForEnv` 동작 변경 — 사유: neutral 패키지의 이중 typecheck는 정상 동작이며, 패키지 코드가 양 환경에 대응하는 것이 올바른 방향
- Worker 내부 encode/decode 로직 변경 — 사유: Goal 범위 밖 (Worker 생성 분기만 대상)
