# WBS: esbuild 마이그레이션 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** `.tasks/260410180818_vite-removal-esbuild-migration` 구현에 대한 심층 리뷰에서 8건의 이슈 발견 (Critical 1, Medium 3, Low 4). HMR 비작동 크리티컬 버그 포함.
- **환경:** simplysm 모노레포, `packages/sd-cli` 패키지. Angular 21, esbuild, TypeScript 5.9.
- **전제조건:** `.tasks/260410180818_vite-removal-esbuild-migration`의 구현이 완료된 상태.
- **기술적 제약:** 기존 구현의 인터페이스/동작 유지. 수정 범위를 리뷰 이슈로 한정.
- **참조 자료:**
  - `.tasks/260411122731_review-vite-removal-esbuild-migration/review.md` — 리뷰 리포트 (8건 이슈 상세)
  - `packages/sd-cli/src/utils/esbuild-client-config.ts` — LOGIC-001 수정 대상
  - `packages/sd-cli/src/workers/client.worker.ts` — DESIGN-001, LOGIC-002 수정 대상
  - `packages/sd-cli/src/utils/dev-http-server.ts` — DESIGN-002 수정 대상
  - `packages/sd-cli/src/utils/hmr-service.ts` — DESIGN-003, DESIGN-005, LOGIC-003 수정 대상
  - `packages/sd-cli/src/utils/hmr-client-script.ts` — DESIGN-005 수정 대상

## Impact Mapping

- **Goal:** 리뷰에서 발견된 HMR 비작동 버그 해결 및 빌드/dev 안정성 확보
  - **Actor:** sd-cli를 사용하는 개발자
    - **Impact:** template/styles HMR이 정상 작동하여 개발 생산성을 유지한다
      - **Deliverable:** 리뷰 이슈 8건 수정
    - **Impact:** 빌드 실패 시 원인을 빠르게 파악할 수 있다
      - **Deliverable:** esbuild 에러 상세 전파 개선

## Feature Breakdown

### Epic 1. 리뷰 이슈 수정

#### [x] Feature 1.1 HMR 수정

**의존성:** 없음

**범위:**

- **LOGIC-001 (Critical):** dev 모드에서 `isDev && templateUpdates != null && legacyModule !== true`일 때 `ngHmrMode`를 `"true"`로 define. Angular HMR 초기화 코드와 `import.meta.hot` 폴리필 배너가 동작하도록 함. (`esbuild-client-config.ts:118-124`) — 리뷰 제안에 `isDev` 체크 누락 보완 (D1: build 함수도 templateUpdates 전달하므로 isDev 필수)
- **DESIGN-003 (Low):** `HmrService` 인터페이스 및 구현에서 `onBuildStart()` 메서드 제거. `sd-hmr-reset` 플러그인이 `templateUpdates.clear()`를 담당. (`hmr-service.ts:19,45-47`)
- **DESIGN-005 (Low):** HMR 클라이언트 스크립트에서 `css-update` 메시지 처리 시 `msg.files`와 매칭되는 `<link>` 태그만 업데이트하도록 변경. (`hmr-client-script.ts:29-36`)
- **LOGIC-003 (Low):** `hmr-service.ts`의 `handleRequest`에서 `encodeURIComponent(componentId)` 제거. `templateUpdates.get(componentId)`로 직접 조회. (`hmr-service.ts:164`)

**경계:**

- 빌드 파이프라인/서버 수정은 Feature 1.2에서 처리
- 기존 테스트의 대폭 변경 없음 — 수정에 필요한 최소한의 테스트 업데이트만 수행

**근거:**

- `.tasks/260411122731_review-vite-removal-esbuild-migration/review.md` 리뷰 리포트
- LOGIC-001: Angular의 공식 dev server(@angular/build)가 HMR 활성화 시 `ngHmrMode: "true"`를 define하는 패턴 참조

#### [x] Feature 1.2 빌드/서버 수정

**의존성:** 없음

**범위:**

- **DESIGN-001 (Medium):** `CreateClientEsbuildOptions.onEnd` 타입을 `void | Promise<void>`로 변경하고, `sd-on-end` 플러그인 래퍼에서 Promise를 반환. `client.worker.ts`의 onEnd에서 `void (async () => ...)()` 패턴을 제거하고 async 함수로 직접 전달. (`esbuild-client-config.ts:29`, `client.worker.ts:240-294`)
- **DESIGN-002 (Medium):** dev HTTP 서버의 정적 파일 응답 및 SPA fallback HTML 응답에 `Cache-Control: no-cache` 헤더 추가. (`dev-http-server.ts:66,73`)
- **LOGIC-002 (Medium):** `client.worker.ts` build() 함수의 catch 블록에서 esbuild BuildFailure의 `.errors` 배열을 추출하여 상세 에러 메시지 전파. (`client.worker.ts:177-180`)
- **DESIGN-004 (Low):** `ClientBuildInfo`에 `browserSupport` 필드를 추가하고, `EsbuildClientEngine`에서 설정을 전달하여 Worker 내 `loadSdConfig()` 이중 호출 제거. `resolvePackageInfo`를 동기 함수로 변환. (`client.worker.ts:71-92`, `EsbuildClientEngine.ts:64-73`)

**경계:**

- HMR 관련 수정은 Feature 1.1에서 처리
- 기존 테스트의 대폭 변경 없음 — 수정에 필요한 최소한의 테스트 업데이트만 수행

**설계 결정:**

- D1: DESIGN-002 — SPA fallback HTML 응답에도 Cache-Control 적용 (dev 모드에서 index.html도 매 빌드마다 재생성)
- D2: DESIGN-004 — resolvePackageInfo에서 package.json pkgName 읽기는 유지 (readFileSync 비용 무시 가능, info.name과의 동일성 계약이 명시적이지 않음)

**근거:**

- `.tasks/260411122731_review-vite-removal-esbuild-migration/review.md` 리뷰 리포트
- DESIGN-004: 기존 `ServerEsbuildEngine`은 env를 `ClientBuildInfo`에 포함하여 전달하는 패턴과 동일

**구현계획:** [`1.2-build-server-fixes.md`](./1.2-build-server-fixes.md)

## 제외 사항

- **성능 최적화**: dev 서버의 동기 파일 I/O를 비동기로 전환하는 것은 dev 서버 특성상 불필요 (사유: 단일 사용자 대상, 현재 성능 충분)
