# WBS: esbuild Worker 번들링 플러그인 및 service-client Worker 수정

## 프로젝트 개요

- **배경:** Angular 소비앱에서 `queryable.execute()` 호출 시 Worker 초기화 실패로 60초 hang 후 타임아웃 오류 발생. 근본 원인은 sd-cli의 esbuild 클라이언트 빌드에서 `new Worker(new URL("...", import.meta.url))` 패턴의 Worker 파일을 별도 번들로 분리하지 못하는 것.
- **환경:** sd-cli esbuild 빌드 (클라이언트: Angular + esbuild, 서버: esbuild). `@simplysm/service-client` 패키지가 Worker를 사용하여 프로토콜 encode/decode를 오프로드.
- **전제조건:** 기존 TypeScript transformer 기반 Worker 처리(`web-worker-transformer.ts`)가 존재하나, .ts 파일에서만 동작하고 dist/.js 파일은 처리하지 못함.
- **기술적 제약:** esbuild plugin onLoad 단계에서 처리해야 .js/.ts 모두 커버 가능. 서버(Node.js)와 클라이언트(브라우저) 모두에서 Worker 패턴이 사용됨.
- **참조 자료:**
  - `.tasks/260416232412_debug-onmessage-hang/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/angular/web-worker-transformer.ts` — 기존 TS transformer 기반 Worker 처리 (제거 대상)
  - `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:161-197` — 기존 `bundleWebWorker` 함수 및 `createWebWorkerProcessor` (제거/이동 대상)
  - `packages/sd-cli/src/esbuild/esbuild-client-config.ts` — 클라이언트 esbuild 설정 (플러그인 적용 대상)
  - `packages/sd-cli/src/esbuild/esbuild-config.ts:77-97` — 서버 esbuild 설정 (플러그인 적용 대상)
  - `packages/sd-cli/src/workers/server-esbuild-context.ts:65-70` — 서버 esbuild context (플러그인 적용 대상)
  - `packages/service-client/src/protocol/client-protocol-wrapper.ts` — `createBrowserWorker` 래퍼 사용 (수정 대상)
  - `packages/service-client/src/types/browser-compat.ts` — `createBrowserWorker` 정의 (정리 대상)

## Impact Mapping

- **Goal:** 소비앱에서 Worker 기반 프로토콜 처리가 정상 동작하여 메인 스레드 블로킹 없이 encode/decode 수행
  - **Actor:** 소비앱 (Angular 클라이언트, Node.js 서버)
    - **Impact:** Worker 스크립트가 빌드 시 자동으로 별도 번들링되어 런타임에 정상 로드됨
      - **Deliverable:** esbuild Worker 번들링 플러그인
      - **Deliverable:** service-client의 Worker 생성 패턴 표준화

## Feature Breakdown

### Epic 1. esbuild Worker 번들링

#### [x] Feature 1.1 esbuild Worker 번들링 플러그인 생성

**의존성:** 없음

**범위:**

- esbuild onLoad에서 `.js`/`.ts` 파일 내용을 검사하여 `new Worker(new URL("path", import.meta.url))` 및 `new SharedWorker(new URL("path", import.meta.url))` 패턴 감지
- 감지된 Worker 파일 경로를 resolve하여 `esbuild.buildSync()`로 별도 ESM 번들 빌드
- 원본 코드의 URL 경로를 번들된 파일 경로로 치환
- 기존 `bundleWebWorker` 함수(`esbuild-angular-compiler-plugin.ts:167-197`)의 빌드 로직 재사용

**경계:**

- 플러그인은 범용 esbuild 플러그인으로 생성하며, Angular/서버 특화 로직을 포함하지 않음
- Worker 내부의 런타임 에러 처리는 이 Feature에서 다루지 않음 (이미 수정 적용됨)

**근거:**

- 현재 TypeScript transformer(`web-worker-transformer.ts`)는 `.ts` AST에서만 동작하여 dist/.js 참조 시 Worker를 감지하지 못함
- 사용자 요청: "dist/.js로 참조되는것도 worker 감지 해야지"

**설계 결정 (Feature 1.1 plan에서 결정):**

- D1: `bundleWebWorker` 호출 시 `write` 옵션을 메인 빌드의 `build.initialOptions.write`와 동일하게 설정 (esbuild 위임). 기존 `additionalResults` 방식은 `write: true` 시 Worker 파일 미출력 버그 있음.
- D2: `createWorkerBundlePlugin()` 플러그인 + `transformWorkerPatterns()` transform 함수 모두 export. Feature 1.2에서 Angular 플러그인 내부에서 `.ts` 파일의 Worker 패턴 처리에 transform 함수 호출 필요.
- Angular 클라이언트 빌드에서 `.ts` 파일: Angular 컴파일러 플러그인의 onLoad가 먼저 처리하므로 Worker 플러그인의 onLoad 미실행. Feature 1.2에서 Angular 플러그인이 `transformWorkerPatterns()` 직접 호출하여 해결.
- Feature 문서: `1.1-esbuild-worker-bundle-plugin.md`

#### [x] Feature 1.2 클라이언트 빌드에 플러그인 적용 및 기존 TS transformer 제거

**의존성:** Feature 1.1 (esbuild Worker 번들링 플러그인)

**범위:**

- `esbuild-angular-compiler-plugin.ts`에서 기존 Worker 처리 코드 제거: `createWebWorkerProcessor`, `workerTransformer`, `bundleWebWorker` 호출부, `AdditionalResult`, `additionalResults`
- `esbuild-angular-compiler-plugin.ts`에서 `transformWorkerPatterns()` 직접 호출로 대체: `.ts` 파일은 onStart에서 TS 컴파일 후 적용, `.js` 파일은 JS onLoad에서 JavaScriptTransformer 후 적용
- `web-worker-transformer.ts` 파일 및 테스트 삭제
- `bundleWebWorker` 함수는 새 플러그인으로 이동했으므로 원본에서 제거

**경계:**

- Angular compiler plugin의 다른 기능(AOT 컴파일, 스타일시트 변환 등)은 변경하지 않음
- `esbuild-client-config.ts`는 변경하지 않음 (Worker 플러그인 미추가 — D1 결정)

**근거:**

- 기존 TS transformer는 `transformWorkerPatterns()` 직접 호출로 대체됨
- `esbuild-angular-compiler-plugin.ts:427-434`에서 workerTransformer를 additionalTransformers로 전달하는 코드 제거 필요

**설계 결정 (Feature 1.2 plan에서 결정):**

- D1: Worker 플러그인을 client config에 추가하지 않음. esbuild onLoad 충돌으로 Worker 플러그인 standalone이 Angular 빌드에서 동작 불가 (앞 배치: .ts AOT 컴파일 누락, 뒤 배치: no-op). Angular 플러그인 내부에서 `transformWorkerPatterns()` 직접 호출로 해결.
- D2: `.js` 파일 Worker 패턴은 Angular 플러그인 JS onLoad에서 JavaScriptTransformer 후 `transformWorkerPatterns()` 호출. JavaScriptTransformer의 최적화(advanced optimizations, linker, source map) 보존.
- Feature 문서: `1.2-client-build-plugin-apply-ts-transformer-remove.md`

#### [x] Feature 1.3 서버 빌드에 플러그인 적용

**의존성:** Feature 1.1 (esbuild Worker 번들링 플러그인)

**범위:**

- `server-build.worker.ts`의 프로덕션 빌드 `esbuild.build()` plugins 배열에 `createWorkerBundlePlugin()` 추가
- `server-esbuild-context.ts`의 watch/dev 빌드 `esbuild.context()` plugins 배열에 `createWorkerBundlePlugin()` 추가
- 서버의 Worker(`service-server/src/workers/service-protocol.worker.ts`)는 Node.js `worker_threads` 기반(`createWorker`)이므로 `new Worker(new URL(...))` 패턴이 아님 — 현재 서버 자체 Worker는 대상이 아니지만, 서버가 참조하는 외부 패키지의 브라우저 Worker 패턴이 있을 경우를 대비하여 플러그인을 적용

**경계:**

- 서버 빌드의 기존 tsc 플러그인, external 처리 등은 변경하지 않음

**근거:**

- 사용자 요청: "이건 server 빌드도 마찬가지임"

**설계 결정 (Feature 1.3 plan에서 결정):**

- D1: 호출 측(call site)에서 plugins 배열에 직접 추가. `createServerEsbuildOptions`는 plugins를 반환하지 않고, 호출 측이 spread로 plugins를 관리하는 기존 패턴 유지.
- Feature 문서: `1.3-server-build-plugin-apply.md`

### Epic 2. service-client Worker 패턴 표준화

#### [x] Feature 2.1 `createBrowserWorker` 래퍼 제거 및 `new Worker` 직접 사용

**의존성:** 없음

**범위:**

- `client-protocol-wrapper.ts`에서 `createBrowserWorker(new URL(...))` → `new Worker(new URL(...))` 패턴으로 변경
- `isWorkerSupported()` 체크는 유지 (`getWorker()` 내에서 `isWorkerAvailable()` 체크)
- `browser-compat.ts`에서 `createBrowserWorker` 함수 제거
- `WorkerLike` 인터페이스는 제거 (DOM `Worker` 타입 직접 사용, tsconfig에 DOM lib 포함되어 있으므로 문제없음 — 설계 결정 D1)
- `isWorkerSupported` 함수는 유지 (`isWorkerAvailable()`에서 사용 중)
- Worker URL의 확장자를 `.ts`에서 `.js`로 변경 (dist 참조 시 `.js`가 정확)

**경계:**

- `worker.onerror` 핸들러, decode try-catch 등 이미 적용된 에러 처리 수정은 유지
- Worker 내부 로직(`client-protocol.worker.ts`)은 변경하지 않음

**근거:**

- `web-worker-transformer.ts:17-23`에서 `new Worker` 또는 `new SharedWorker` 패턴만 감지
- 새 esbuild 플러그인도 동일 패턴을 감지하므로 표준 패턴 사용 필수

## 제외 사항

- Worker 내부 성능 최적화 (encode/decode 처리 속도) — 현재 범위 외
- `service-server`의 Node.js Worker Thread(`createWorker` 패턴) 처리 — 브라우저 Worker 패턴과 다른 메커니즘이므로 별도 이슈
