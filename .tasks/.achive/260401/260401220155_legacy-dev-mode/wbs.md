# WBS

## Impact Mapping

- **Goal:** `legacyModule: true` 설정 시 dev 모드에서 Chrome 61 실기기 확인이 가능해야 한다
  - **Actor:** sd-cli 사용 개발자
    - **Impact:** Chrome 61 타겟 프로젝트를 dev 모드에서 실시간으로 확인하며 개발한다
      - **Deliverable:** `vite build --watch` + HTTP 파일 서버 + live reload 기반 legacy dev 모드

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. legacy dev 모드

- [x] Feature 1.1 `sd-legacy-import-meta` 플러그인 제거
  - build 모드에서 esbuild가 `target: "chrome61"`로 `import.meta`를 자동 치환하므로 플러그인 불필요
  - 플러그인 코드 및 관련 테스트 정리

- [x] Feature 1.2 legacy dev 모드: `vite build --watch` 전환
  - `legacyModule: true` + dev일 때 `createServer()` 대신 `viteBuild({ build: { watch: {} } })` 사용
  - worker 이벤트(buildStart, build, error) 연동

- [x] Feature 1.3 legacy dev 모드: HTTP 파일 서버 + live reload
  - build 결과물(`dist/`) 서빙하는 HTTP 서버
  - 파일 변경 감지 시 브라우저에 reload 신호 전송
  - Feature 1.2 결정: emptyOutDir은 첫 빌드만 true → 재빌드 시 dist 파일 서빙 끊김 없음

- [x] Feature 1.4 legacyModule esbuild.supported 오버라이드
  - Vite가 `defaultEsbuildSupported`에서 `import-meta: true, dynamic-import: true`를 강제하여 esbuild 변환 무력화
  - `legacyModule: true`일 때 `esbuild.supported`에 `import-meta: false, dynamic-import: false` 오버라이드

## 참조 자료

### Vite dev 모드 Chrome 61 비호환 원인
- Vite의 `/@vite/client` 내부 코드에 `?.`(optional chaining), `import()`(dynamic import), `import.meta` 사용
- Vite dev 모드는 esbuild target을 `esnext`로 하드코딩 — 사용자 설정 무시
- `@vitejs/plugin-legacy`도 build 모드에서만 동작

### esbuild의 import.meta 자동 치환
- `esbuild.transformSync(code, { target: 'chrome61', format: 'esm' })` 시 `import.meta` → `const import_meta = {};`로 자동 치환
- 단, `import_meta.url`은 빈 객체이므로 `undefined` — `import.meta.url`을 런타임에 사용하는 코드가 있으면 별도 대응 필요

### 현재 legacyModule 구현 (제거 대상)
- `vite-config.ts:220-252` — `sd-legacy-import-meta` 플러그인 (enforce: "post", replaceAll)
- `vite-config.ts:221-228` — `inlineDynamicImports: true` (build 전용 rollupOptions)

### 참조 파일
- `packages/sd-cli/src/utils/vite-config.ts` — legacyModule 관련 플러그인 코드 위치 (line 220-252)
- `packages/sd-cli/src/workers/client.worker.ts` — dev/build 분기 로직 (startWatch, build 함수)
- `packages/sd-cli/src/engines/ViteEngine.ts` — 엔진 레벨의 dev/build 흐름
- `packages/sd-cli/tests/utils/vite-config.spec.ts` — legacyModule 관련 테스트 (line 222-314)
- `packages/sd-cli/src/sd-config.types.ts` — `SdBrowserSupportConfig` 타입 정의 (line 203-210)

## 제외 사항

- Vite dev 서버의 모듈 단위 HMR — build --watch 방식이므로 full reload만 지원
- Vite dev 서버 자체의 Chrome 61 호환화 — Vite 내부 코드 변경은 범위 밖
