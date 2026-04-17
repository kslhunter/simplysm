# WBS: 서버 빌드 Node.js Worker 파일 번들링

## 프로젝트 개요

- **배경:** 서버 esbuild 빌드(`bundle: true`)에서 `@simplysm/service-server`의 `Worker.create(import.meta.resolve("../workers/service-protocol.worker"))` 패턴이 번들 결과물에 그대로 남지만, Worker 파일이 dist에 출력되지 않아 런타임에 Worker 생성이 실패한다.
- **환경:** sd-cli esbuild 서버 빌드. `@simplysm/core-node`의 `Worker.create()`로 Node.js `worker_threads` Worker를 생성하며, `import.meta.resolve()`로 Worker 파일 경로를 해석한다.
- **전제조건:** `esbuild-worker-plugin.ts`가 이미 존재하며 브라우저 Worker 패턴(`new Worker(new URL(..., import.meta.url))`)을 처리한다. 서버 빌드에 `createWorkerBundlePlugin()`이 이미 적용되어 있다.
- **기술적 제약:** esbuild는 `import.meta.resolve()`를 번들 시 그대로 유지한다. 번들 후 `import.meta.resolve()`는 번들된 파일 위치 기준으로 해석되므로 Worker 파일이 올바른 상대 경로에 존재해야 한다.
- **참조 자료:**
  - `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts` — 기존 브라우저 Worker 번들링 플러그인 (확장 대상)
  - `packages/sd-cli/src/esbuild/esbuild-config.ts:77-97` — `createServerEsbuildOptions` (서버 esbuild 설정, platform: "node")
  - `packages/service-server/src/protocol/protocol-wrapper.ts:33-43` — Node.js Worker 생성 코드
  - `packages/service-server/src/workers/service-protocol.worker.ts` — Worker 진입점
  - `packages/core-node/src/worker/worker.ts:28-68` — `WorkerInternal` 생성자 (file:// URL → 절대경로 변환)
  - `D:\workspaces-14\adtek\packages\server\dist\main.js` — 소비앱 번들 결과물 (Worker 파일 미출력 확인됨)

## Impact Mapping

- **Goal:** 소비앱 서버에서 Worker 기반 프로토콜 encode/decode가 정상 동작하여 무거운 메시지 처리를 Worker thread로 오프로드
  - **Actor:** 소비앱 서버 (Node.js)
    - **Impact:** 서버 빌드 후 Worker 파일이 dist에 자동 출력되어 런타임에 정상 로드됨
      - **Deliverable:** esbuild Worker 번들링 플러그인의 Node.js `import.meta.resolve` 패턴 지원

## Feature Breakdown

### Epic 1. esbuild Worker 플러그인 Node.js 패턴 지원

#### [x] Feature 1.1 `import.meta.resolve` Worker 패턴 감지 및 번들링

**의존성:** 없음

**범위:**

- esbuild onLoad에서 `Worker.create(import.meta.resolve("path"))` 패턴을 정규식으로 감지
- 감지된 Worker 파일 경로를 resolve하여 별도 Node.js 번들로 빌드 (platform: "node", format: "esm")
- 원본 코드의 `import.meta.resolve("path")`를 번들된 파일 경로 기반의 `new URL("bundled-path", import.meta.url).href`로 치환 (import.meta.resolve가 file:// URL을 반환하므로 동일하게 file:// URL을 반환하는 표현 사용)
- 기존 `transformWorkerPatterns` 함수를 확장하여 브라우저 + Node.js 패턴 모두 처리
- Worker 번들의 outputFiles/metafile을 기존과 동일하게 onEnd에서 병합

**경계:**

- 브라우저 Worker 패턴(`new Worker(new URL(...))`) 처리는 변경하지 않음 — 기존 동작 유지
- `import.meta.resolve`가 Worker 생성 이외의 목적으로 사용되는 경우는 처리하지 않음 (Worker.create의 첫 번째 인자에 위치한 경우만 감지)

**근거:**

- `adtek/packages/server/dist`에서 `dist/workers/service-protocol.worker.js`가 존재하지 않아 런타임 Worker 생성 실패 확인
- `protocol-wrapper.ts:36`에서 `Worker.create(import.meta.resolve("../workers/service-protocol.worker"))` 패턴 사용

**설계 결정 (Feature plan에서 결정):**

- D1: Node.js Worker 번들 빌드 platform — 메인 빌드의 `build.initialOptions.platform` 계승 (서버=node, 클라이언트=browser). 브라우저 Worker 패턴은 기존대로 "browser" 고정.
- D2: 경로 치환 방식 — `import.meta.resolve("path")` → `new URL("worker-HASH.js", import.meta.url).href`. file:// URL 반환으로 core-node Worker 호환.
- D3: 감지 범위 — `Worker.create`에 한정하지 않고 `import.meta.resolve("상대경로")` 패턴 전체 감지. minification 후 함수명 변경 가능하므로.
- Feature 문서: `1.1-import-meta-resolve-worker-bundle.md`

## 제외 사항

- `@simplysm/core-node`의 `Worker.create` 구현 변경 — 사유: 플러그인 레벨에서 해결 가능, 라이브러리 API 변경 불필요
- `import.meta.resolve`의 범용 처리 (Worker 이외 용도) — 사유: Worker 생성 이외의 `import.meta.resolve`는 esbuild가 올바르게 유지하며 런타임에 정상 동작
