# WBS: sd-cli에서 Vite 제거 및 esbuild 기반 빌드 시스템 전환

## 프로젝트 개요

- **배경:** sd-cli의 client 패키지 빌드가 Vite를 경유하지만, Vite가 실질적으로 제공하는 가치가 없음. Angular HMR 로직은 sd-cli 자체 코드가 처리하고, Vite의 pre-bundling은 replaceDeps와 충돌하여 오히려 문제를 일으키고 있음. Vite는 빌드 결과를 서빙하는 HTTP 서버 역할만 하고 있는 상태.
- **환경:** simplysm 모노레포, `packages/sd-cli` 패키지. Angular 21, esbuild, TypeScript 5.9.
- **전제조건:** v12의 esbuild 기반 구조를 참고하지 않고, Angular 21이 제공하는 API를 기반으로 새로 설계한다.
- **기술적 제약:**
  - Angular 공개 API(`@angular/compiler-cli`) 및 `@angular/build/private` export 경로만 사용. deep internal path import 금지.
  - Chrome 61+ 타겟 지원 (esbuild target으로 문법 다운레벨, legacyModule 기능 esbuild로 통합)
  - 기존 template/styles HMR 수준 유지 (TS 로직 HMR은 범위 외)
  - **Vite 제거 범위는 빌드 파이프라인(dev/build)에 한정.** Vitest는 Vite 기반이므로 테스트용 Vite 플러그인(`sdAngularPlugin`)은 유지. `vite`는 devDependency로 남음.
- **핵심 설계 결정:**
  - **AOT 컴파일**: `createCompilerPlugin`(`@angular/build/private`) 사용. AOT 컴파일, JS 변환, 컴포넌트 스타일시트 번들링, 증분 캐싱(LMDB), Web Worker 번들링, FileReferenceTracker(SCSS 역추적)를 내장. PostCSS는 `BundleStylesheetOptions.postcssConfiguration`으로 컴파일 시점에 적용 (기존 `processPostCssInline` 후처리 불필요).
  - **dev 서빙 방식**: 디스크 기반. `esbuild context.watch()` → `dist/`에 증분 빌드 → HTTP 서버가 `dist/` 서빙. Capacitor/Electron 연동 자연스러움.
  - **Side-effect SCSS**: esbuild `onLoad` 플러그인으로 `.scss` 파일을 sass 컴파일 → `loader: 'css'`로 반환. esbuild가 CSS 번들에 자동 포함. 현재의 5단계 처리(`rewriteScssImports` 등) 대신 3단계로 단순화.
- **참조 자료:**
  - `packages/sd-cli/src/` — 현재 Vite 기반 빌드 코드 (제거 대상 식별용)
  - `@angular/build/private` exports — `createCompilerPlugin`, `IndexHtmlGenerator`, `augmentAppWithServiceWorker`, `SourceFileCache` 등
  - `@angular/compiler-cli` — `NgtscProgram`, `OptimizeFor` (createCompilerPlugin이 내부적으로 사용)
  - `vitest.config.ts` — 루트 Vitest 설정. `sdAngularPlugin`을 Angular 테스트 프로젝트에서 Vite 플러그인으로 사용 중
  - `createCompilerPlugin` 분석 결과 — `CompilerPluginOptions`: `sourcemap`, `tsconfig`, `jit`, `advancedOptimizations`, `thirdPartySourcemaps`, `fileReplacements`, `sourceFileCache`, `loadResultCache`, `incremental`, `externalRuntimeStyles`, `instrumentForCoverage`, `templateUpdates`

## Impact Mapping

- **Goal:** replaceDeps + pre-bundling 충돌 문제 근본 해결 및 빌드 파이프라인 단순화
  - **Actor:** sd-cli를 사용하는 개발자
    - **Impact:** replaceDeps 관련 빌드 오류 없이 안정적으로 개발한다
      - **Deliverable:** Vite 제거 + esbuild 기반 빌드/dev 파이프라인
    - **Impact:** 단일 빌드 엔진(esbuild)으로 디버깅이 용이해진다
      - **Deliverable:** dev/build/legacy 모드 통합 빌드 파이프라인
    - **Impact:** 기존 개발 경험(HMR, live reload)을 그대로 유지한다
      - **Deliverable:** 커스텀 dev server + HMR 서비스

## Feature Breakdown

### Epic 1. esbuild 기반 빌드 파이프라인

#### [x] Feature 1.1a 코어 빌드 파이프라인 (esbuild + createCompilerPlugin)

**의존성:** 없음

**범위:**

- esbuild context 생성 및 빌드 실행 (`bundle`, `splitting`, `format: 'esm'`, `outdir`, `metafile`, `write` 등)
- `createCompilerPlugin`(`@angular/build/private`) 통합:
  - `CompilerPluginOptions` 구성: `tsconfig`, `sourcemap`, `advancedOptimizations`, `thirdPartySourcemaps`, `incremental: true`, `templateUpdates` (HMR용 Map)
  - `BundleStylesheetOptions` 구성: `postcssConfiguration`, `sourcemap`, `includePaths`, `target`, `cacheOptions`, `outputNames`
  - `SourceFileCache`(`@angular/build/private`) 활용 (LMDB 디스크 캐시 포함)
- `define` 주입 (`ngDevMode`, `ngJitMode`, `ngHmrMode`, 커스텀 env)
- 소스맵 처리 (dev: linked, prod: 없음)
- build/watch 실행 모드: 일회성 빌드(`context.rebuild()` + `context.dispose()`) 및 watch 모드(`context.watch()`)

**경계:**

- side-effect SCSS, tsconfigPaths는 Feature 1.1b-1에서 처리
- polyfills, 에셋 복사, browserslist, 출력 네이밍은 Feature 1.1b-2에서 처리
- index.html 생성은 Feature 1.2에서 처리
- PWA/Service Worker는 Feature 1.3에서 처리
- legacyModule 특수 처리는 Feature 1.4에서 처리
- dev server/HMR은 Epic 2에서 처리
- 기존 `AngularCompiler`, `AngularBuildPipeline` 직접 사용 없음 — `createCompilerPlugin`이 내부적으로 `AngularCompilation` 관리

**근거:**

- 사용자 요청: "esbuild로 만들고 HMR서비스는 직접 만드는게 더 효율적"
- `createCompilerPlugin` 분석 결과: AOT, JS 변환, SCSS 번들링, PostCSS, 증분 캐싱, Web Worker 번들링, FileReferenceTracker 내장. sd-cli 요구사항의 90%+ 충족.
- `processPostCssInline`(JS 후처리 PostCSS)은 `BundleStylesheetOptions.postcssConfiguration`으로 대체되어 불필요.
- SPIDR Path 분리: 핵심 복잡도(createCompilerPlugin 통합)를 독립 검증 가능하도록 분리.

**설계 결정 (Feature 1.1a 계획 시 확정):**

- **D1 Solid 제거**: Solid 프레임워크는 더이상 미사용. Feature 1.1a에서 Solid 분기 불필요. Solid 관련 코드/의존성 삭제는 Feature 3.1/3.2에서 처리.
- **D2 inlineStyleLanguage 고정**: `BundleStylesheetOptions.inlineStyleLanguage`를 `'scss'`로 고정. sd-cli 프로젝트는 항상 SCSS 사용.
- **D3 PostCSS 소스**: `sd.config.ts`의 `browserSupport.postCss.plugins`를 유지. `loadPostcssConfiguration` 미사용.
- **D4 PostCSS 포맷 변경**: `postCss.plugins` 타입을 `unknown[]` → `[string, (object | string)?][]` 튜플로 변경. Angular의 `PostcssConfiguration` 포맷과 일치. 기존 소비처(vite-config.ts, vite-postcss-inline-plugin.ts) 모두 제거되므로 호환성 문제 없음.

#### [x] Feature 1.1b-1 esbuild 커스텀 플러그인 (SCSS + tsconfigPaths)

**의존성:** Feature 1.1a

**범위:**

- side-effect SCSS 처리: esbuild `onLoad` 플러그인으로 `.scss` 파일 → sass 컴파일 → `loader: 'css'` 반환. esbuild가 CSS 번들에 자동 포함. 기존 `rewriteScssImports` 불필요.
- tsconfigPaths 해석: esbuild 네이티브 `tsconfig` 옵션으로 paths 매핑 자동 해석 (현재 `vite-tsconfig-paths` 대체). ~~커스텀 onResolve 플러그인~~ → 네이티브 옵션으로 변경 (서버 빌드 `esbuild-config.ts:94`와 동일 패턴, Feature 계획 시 D1 결정)

**경계:**

- esbuild context 생성 및 createCompilerPlugin 통합은 Feature 1.1a에서 처리 완료
- browserslist, polyfills, 에셋 복사, 출력 네이밍은 Feature 1.1b-2에서 처리
- 이 Feature는 1.1a의 `plugins` 옵션에 전달할 esbuild 플러그인 구현에 집중

**근거:**

- side-effect SCSS는 esbuild onLoad 네이티브 처리로 현재의 5단계→3단계 단순화.
- tsconfigPaths는 esbuild 네이티브 `tsconfig` 옵션으로 해석 가능 — 커스텀 플러그인 불필요, `vite-tsconfig-paths` 의존 제거.
- SPIDR Path 분리: 커스텀 플러그인(복잡)과 설정 통합(단순)을 분리하여 독립 검증 가능.

#### [x] Feature 1.1b-2 빌드 설정 통합 (browserslist, polyfills, assets, naming)

**의존성:** Feature 1.1a

**범위:**

- browserslist → esbuild target 변환 (기존 `browserslist-to-esbuild` 로직 유지)
- polyfills 주입: `src/polyfills.ts` 자동 감지, esbuild `entryPoints`에 추가
- 에셋(public/) 복사: `public/` → `dist/` 복사 (기존 `copy-public.ts` 재활용, esbuild는 public 디렉토리 자동 처리 안 함)
- 출력 파일 네이밍: `entryNames`, `chunkNames`, `assetNames` 설정. **플랫 패턴**: dev `[name]`, build `[name]-[hash]` (dist/ 루트 출력)

**경계:**

- esbuild context 생성 및 createCompilerPlugin 통합은 Feature 1.1a에서 처리 완료
- esbuild 커스텀 플러그인은 Feature 1.1b-1에서 처리
- 이 Feature는 1.1a의 설정값 보강 및 기존 유틸리티 통합에 집중
- **polyfills HTML `<script>` 주입은 Feature 1.2(index.html 생성)에서 처리** — 이 Feature는 entryPoints 추가만 담당
- **에셋 복사 호출은 Feature 3.1(EsbuildClientEngine)에서 통합** — 이 Feature는 기존 유틸 재활용 가능 확인만

**근거:**

- browserslist 변환은 기존 `browserslistToEsbuild()` 호출로 단순 적용.
- polyfills, 에셋 복사는 기존 패턴(`client.worker.ts`, `copy-public.ts`) 재활용.
- SPIDR Path 분리: 설정 항목은 기존 유틸 호출/조합으로 리스크 낮음.

**설계 결정 (Feature 1.1b-2 계획 시 확정):**

- **D1 polyfills 범위**: entryPoints 추가만 담당. HTML `<script>` 태그 주입은 Feature 1.2로 위임.
- **D2 출력 네이밍**: `[name]-[hash]` 플랫 패턴 (dist/ 루트). `assets/` 하위 디렉토리 미사용.
- **D3 dev 해시**: dev 모드 `[name]` (해시 없음) / build 모드 `[name]-[hash]`. dev에서 파일명 안정성 확보.
- **D4 에셋 복사 위치**: `createClientEsbuildContext` 외부(호출자) 담당. config 함수는 esbuild 설정 전용.

#### [x] Feature 1.2 index.html 생성

**의존성:** Feature 1.1a, Feature 1.1b-1, Feature 1.1b-2

**범위:**

- `IndexHtmlGenerator`(`@angular/build/private`) 활용 — **현재 sd-cli에 없는 완전히 새로운 코드**
- 생성자 옵션 구성: `indexPath` (src/index.html), `entrypoints` ([name, isModule][]), `sri` (prod만), `crossOrigin`
- `process()` 호출: `baseHref`, `outputPath`, `files` (빌드 결과 JS/CSS 파일 정보) 매핑
- 빌드 결과물의 script/link 태그 자동 주입
- integrity 해시 계산 및 삽입 (prod)
- `<base href>` 설정
- dev 모드: HMR 클라이언트 스크립트 주입 (`postTransform` 또는 생성 후 후처리)
- polyfills 스크립트 태그 주입 (entrypoints에 포함)
- esbuild 빌드 결과의 `metafile.outputs`에서 파일 목록 추출 → `IndexHtmlGeneratorProcessOptions.files`로 변환

**경계:**

- HMR 클라이언트 스크립트의 실제 구현은 Feature 2.2에서 처리
- SSR 관련 옵션(`generateDedicatedSSRContent`)은 사용하지 않음

**근거:**

- 현재 Vite가 index.html을 자동 처리하므로 sd-cli에 명시적 생성 코드가 없음. Vite 제거 시 반드시 구현 필요.
- `IndexHtmlGenerator` API: `new IndexHtmlGenerator(options).process(processOptions)` → `{ csrContent: string }`

#### [x] Feature 1.3 PWA / Service Worker

**의존성:** Feature 1.2

**범위:**

- `augmentAppWithServiceWorker()`(`@angular/build/private`) 활용 — 파일시스템 기반 시그니처 사용: `appRoot`, `workspaceRoot`, `outputPath`, `baseHref`, `ngswConfigPath`
- `ngsw-config.json` 기반 `ngsw.json` 생성
- Service Worker 스크립트 생성
- manifest.json 생성
- PWA 아이콘 자동 생성 (sharp, 기존 `generate-pwa-icons.ts` 재활용)
- build 모드에서만 활성화 (dev 모드 제외)

**경계:**

- PWA 비활성화 옵션(`pwa: false`) 처리 포함
- Workbox 설정 커스터마이징은 `ngsw-config.json`으로 제한

**근거:**

- 현재 `VitePWA` 플러그인 + `vite-pwa-plugin.ts`로 처리 중
- 디스크 기반 서빙이므로 파일시스템 기반 시그니처 적합

**설계 결정 (Feature 1.3 계획 시 확정):**

- **D1 ngsw-config.json 자동 생성**: pwa 활성화 시 ngsw-config.json이 없으면 프로젝트 디렉토리에 기본 파일 자동 생성. 기존 제로 설정 경험 유지. 기본 assetGroups: "app"(prefetch: html,css,js), "assets"(lazy: 이미지,폰트).
- **D2 아이콘 출력 위치**: `generatePwaIcons` → `public/icons/` 생성 후 `dist/icons/`에 복사. copy-public 타이밍 의존 제거.
- **D3 SW 등록 스크립트**: `sd-pwa-update-ready` CustomEvent 유지. `ngsw-worker.js` 등록. ngsw-worker.js도 SKIP_WAITING 메시지 지원.
- **D4 SdPwaConfig.workbox 미사용**: 새 코드에서 workbox 필드 참조하지 않음. 타입 제거는 Feature 3.2로 위임.

#### [x] Feature 1.4 legacyModule 지원

**의존성:** Feature 1.1a, Feature 1.1b-1, Feature 1.1b-2

**범위:**

- 코드 스플리팅 비활성화 (`splitting: false`)
- `import.meta` 변환 (`esbuild.supported: {"import-meta": false}`)
- 잔여 dynamic `import()` 제거 (esbuild `onEnd` 플러그인으로 디스크 파일 재작성 — D1 결정)

**경계:**

- HMR은 legacyModule에서도 동작 (커스텀 HMR 클라이언트를 Chrome 61 호환 문법으로 작성하므로 별도 제한 없음)
- `format: "esm"` 유지 — Chrome 61은 ES 모듈 지원. import.meta(62+)와 dynamic import()(63+)만 별도 처리 (D2 결정)

**근거:**

- 현재 `vite-config.ts:285-320`에서 Rollup 옵션으로 처리 중
- esbuild의 동일 옵션으로 100% 대체 가능

**설계 결정 (Feature 1.4 계획 시 확정):**

- **D1 Dynamic import 제거 메커니즘**: esbuild `onEnd` 플러그인 (디스크 파일 재작성). Rollup `renderChunk` 대응. esbuild에 in-memory chunk 변환 API 없음.
- **D2 ESM format 유지**: Chrome 61은 ES 모듈(static import/export) 지원. `format: "esm"` 유지.

### Epic 2. 커스텀 Dev Server + HMR

#### [x] Feature 2.1 HTTP Dev Server

**의존성:** Feature 1.1a, Feature 1.1b-1, Feature 1.1b-2

**범위:**

- HTTP 서버 생성 (Node.js `http` 모듈)
- esbuild `context.watch()` 결과인 `dist/` 디렉토리의 파일을 HTTP로 서빙
- SPA fallback (404 → index.html)
- 정적 파일 서빙 (public/, assets/)
- MIME type 처리
- 포트 자동 할당 / 지정 포트 지원
- `.dev-port` 파일 기록 (device 명령어 연동 — Capacitor/Electron)
- `.config.json` 파일 기록 (런타임 설정)

**경계:**

- HMR WebSocket은 Feature 2.2에서 처리
- 프록시 기능은 기존 `server-runtime.worker.ts`의 `@fastify/http-proxy`가 담당 (변경 없음)

**근거:**

- legacy 모드에서 이미 `createLegacyHttpServer()`로 자체 HTTP 서버 구현 (`client.worker.ts:105-172`)
- 디스크 기반 서빙으로 구현 단순화

**설계 결정 (Feature 2.1 계획 시 확정):**

- **D1 index.html 부재 시 동작**: 404 반환 (기존 `createLegacyHttpServer` 동일 패턴, `client.worker.ts:166-168`)
- **D2 구현 위치**: `packages/sd-cli/src/utils/dev-http-server.ts`에 `createDevHttpServer()` 함수로 독립 추출. 기존 `createLegacyHttpServer`에서 SSE/live-reload 제거, `httpServer` 인스턴스 외부 노출 (Feature 2.2 WebSocket 연결용)
- **D3 파일 기록 책임**: `.dev-port`/`.config.json` 기록은 호출자(worker/engine) 책임. `createDevHttpServer`는 HTTP 서빙에만 집중 (단일 책임)

#### [x] Feature 2.2 HMR 서비스 (template/styles)

**의존성:** Feature 2.1

**범위:**

- **WebSocket 서버** 생성 (Node.js `ws` 패키지, 직접 의존성으로 추가)
- **import.meta.hot 폴리필** (esbuild `banner` 옵션으로 주입) — Angular HMR 런타임이 `import.meta.hot.on('angular:component-update', ...)` 사용하므로 폴리필 필수. `globalThis.__hmr_dispatch` 브릿지로 외부(WebSocket 클라이언트)에서 이벤트 트리거.
- **HMR 클라이언트 스크립트** (브라우저 측, index.html에 주입) — **완전히 새로 작성**:
  - WebSocket 연결 유지 + 자동 재연결
  - `component-update` 메시지 → `globalThis.__hmr_dispatch('angular:component-update', ...)` → Angular 런타임이 `import('/@ng/component?c=<id>')` 로드
  - `full-reload` 메시지 → `location.reload()`
  - `css-update` 메시지 → `<link>` 태그 href에 cache-busting query 추가
  - **Chrome 61 호환 문법으로 작성** (legacyModule에서도 WS 클라이언트/CSS swap/reload 동작)
- **서버 측 HMR 로직**:
  - 파일 변경 감지 (esbuild watch의 `onEnd` 콜백)
  - 변경 유형 판별: `templateUpdates` Map 확인 (hmr-candidates.ts 미사용 — `createCompilerPlugin`이 NgCompiler를 노출하지 않으므로 재활용 불가)
  - `templateUpdates.size > 0` → `component-update` WS 메시지
  - CSS-only 출력 변경 → `css-update` WS 메시지
  - 그 외 → `full-reload` WS 메시지
  - 100ms 배칭 (외부 debounce 구현)
  - `templateUpdates.clear()` — esbuild `onStart` 플러그인에서 매 빌드 시작 전 호출
- **`/@ng/component?c=<componentId>` HTTP 엔드포인트**:
  - `dev-http-server.ts`에 `onRequest` 훅 추가 (정적 파일 서빙 전 인터셉트)
  - `templateUpdates` Map에서 componentId로 조회
  - `Content-Type: text/javascript`, `Cache-Control: no-cache`로 응답
- **SCSS 역방향 의존성 추적**: `createCompilerPlugin` 내장 `FileReferenceTracker` 활용 (명시적 코드 불필요)

**경계:**

- TS 로직 HMR은 범위 외 (full-reload 처리)
- **legacyModule에서 Angular HMR 미동작** — Angular의 `compileHmrInitializer`가 `import.meta.hot.on()` + `import()` 사용하나, legacyModule에서 `import.meta` 비활성화(`supported: {"import-meta": false}`) + `import()` 제거로 HMR 초기화 불가. CSS hot swap + full-reload만 동작.
- Vite의 `moduleGraph` 불필요 (디스크 기반이므로 파일 경로로 직접 매핑)

**근거:**

- HMR 클라이언트 스크립트: 현재 Vite의 `/@vite/client`가 담당 → 직접 작성 필요
- `hmr-candidates.ts`: `createCompilerPlugin`이 NgCompiler를 외부에 노출하지 않으므로 재활용 불가. `templateUpdates` Map으로 대체
- `createCompilerPlugin`의 `templateUpdates` 옵션으로 HMR 템플릿 업데이트 수신 가능
- Angular `compileHmrInitializer`가 `import.meta.hot.on('angular:component-update', ...)` 사용 → esbuild banner로 폴리필 필요

**설계 결정 (Feature 2.2 계획 시 확정):**

- **D1 legacyModule HMR**: 미지원. Angular HMR 초기화가 `import.meta.hot` + `import()` 사용. legacyModule에서 둘 다 비활성화. CSS hot swap + full-reload만 동작.
- **D2 hmr-candidates.ts**: 미사용. `createCompilerPlugin`이 NgCompiler를 외부에 노출하지 않아 재활용 불가. `templateUpdates` Map으로 HMR 후보 판별.
- **D3 WebSocket 라이브러리**: `ws` 패키지를 sd-cli 직접 의존성으로 추가.
- **D4 import.meta.hot 제공**: esbuild `banner` 옵션으로 폴리필 주입. `globalThis.__hmr_dispatch` 브릿지로 WS 클라이언트에서 Angular HMR 이벤트 트리거.
- **D5 CSS hot swap**: 모든 CSS 파일명을 WS 메시지로 전송, 클라이언트에서 cache-busting refetch.
- **D6 templateUpdates 클리어**: esbuild `onStart` 플러그인에서 매 빌드 시작 전 `templateUpdates.clear()` 호출.

#### [x] Feature 2.3 replaceDeps 감시 통합

**의존성:** Feature 2.2

**범위:**

- replaceDeps 소스 변경 감지 → 대상 파일 복사 (기존 `replace-deps.ts` 재활용)
- `watchReplaceDeps`에 `onChanged` 콜백 추가 (복사 완료 후 로깅/UI 피드백용)
- esbuild `context.watch()`가 node_modules 변경을 자동 감지하여 rebuild → HMR/full-reload 발송
- pre-bundling 없이 직접 resolve (esbuild의 자연스러운 모듈 해석 활용)

**경계:**

- replaceDeps의 파일 복사 로직 자체는 기존 코드 유지
- Vite의 `server.restart()` / `optimizeDeps` 관련 코드 전부 제거

**근거:**

- 사용자: "지금 vite의 pre-bundling때문에 replaceDeps가 다 꼬여서 답이 안나오는 상황"
- pre-bundling 제거가 이 프로젝트의 핵심 동기

**설계 결정 (Feature 2.3 계획 시 확정):**

- **D1 rebuild 트리거 방식**: esbuild watch 자동 감지 의존. `context.rebuild()` 명시 호출 불필요. `context.watch()`가 import graph의 모든 파일 변경을 자동 감지하므로, `watchReplaceDeps`가 node_modules에 복사하면 esbuild가 자동 rebuild. `context.rebuild()` 동시 호출 시 이중 rebuild 위험.
- **D2 변경 통지 메커니즘**: `watchReplaceDeps`에 `onChanged` 콜백 파라미터 추가 (로깅/UI용). 기존 `sdScopeWatchPlugin`의 `onScopeRebuild` 패턴과 동일.
- **D3 pre-bundling 처리**: 불필요. esbuild는 모듈을 직접 resolve하므로 `optimizeDeps` 관련 코드 전부 불필요.

### Epic 3. Vite 제거 및 통합

#### [x] Feature 3.1 ViteEngine → EsbuildClientEngine 전환

**의존성:** Feature 1.1a, Feature 1.1b-1, Feature 1.1b-2, Feature 2.1, Feature 2.2

**범위:**

- `ViteEngine.ts` → 새 `EsbuildClientEngine.ts`로 교체
- Worker 이벤트 구조 통합 (`buildStart`, `build`, `serverReady`, `error`)
- `client.worker.ts` 재작성 (Vite API 제거, esbuild context + HTTP 서버)
- 제거 대상 파일:
  - `vite-config.ts` — esbuild 설정으로 대체
  - `vite-scope-watch-plugin.ts` — Feature 2.3으로 대체
  - `vite-postcss-inline-plugin.ts` — `createCompilerPlugin`의 PostCSS 통합으로 불필요
  - `vite-pwa-plugin.ts` — Feature 1.3으로 대체
- `vite-angular-plugin.ts` 리팩토링:
  - 빌드용 로직 제거 (HMR 배칭, scope watch 연동, Vite server API, config/configResolved/buildStart/handleHotUpdate/configureServer 훅)
  - Vitest용 transform 로직만 유지 (AOT 컴파일, JS 변환 — Vite 플러그인 형태)
- **Solid 관련 코드 제거** (D1): `vite-config.ts`의 Solid 분기, `sd-config.types.ts`의 `framework?: "angular" | "solid"` 타입 정리
- Capacitor/Electron 연동 검증: `dist/` 출력 구조 유지, `.dev-port` 호환성, device 명령어 동작

**경계:**

- BuildOrchestrator, DevWatchOrchestrator의 엔진 호출 인터페이스는 유지
- ServerEsbuildEngine, TscEngine, NgtscEngine은 변경 없음
- `sdAngularPlugin`은 Vitest용으로 존속

**근거:**

- 현재: `ViteEngine → client.worker → createServer(viteConfig)`
- 변경: `EsbuildClientEngine → client.worker → esbuild context + HTTP 서버`

**설계 결정 (Feature 3.1 계획 시 확정):**

- **D1 BaseEngine 상속**: 미상속. ViteEngine 패턴으로 독립 구현. serverReady/port 관리가 BaseEngine과 호환되지 않으며, BaseEngine 수정은 다른 엔진에 영향.
- **D2 scopeRebuild 이벤트**: 제거. Worker 이벤트 4종(buildStart, build, serverReady, error)만 유지. replaceDeps 감시는 Feature 2.3으로 위임.
- **D3 framework 필드**: 제거. Solid 미사용 확정. sd.config.ts에서 framework을 명시하는 소비처 없음 (grep 확인).
- **D4 ClientBuildInfo.exclude**: 제거. Vite optimizeDeps.exclude 전용이었으며 esbuild에는 해당 개념 없음.
- **D5 dev 모드 public/ 감시**: `watchPublicFiles()` 사용. copy-public.ts가 FsWatcher 기반 감시를 제공하므로 초기 복사 + 변경 자동 반영.
- **D6 legacy 모드 HMR**: 동일 WebSocket 기반. createLegacyHttpServer(SSE) 제거. Chrome 61 호환 HMR 클라이언트가 CSS swap + full-reload 처리.

#### [x] Feature 3.2 Vite 빌드 의존성 정리

**의존성:** Feature 3.1

**범위:**

- `package.json`에서 빌드 전용 Vite 관련 의존성 제거 (`vite-plugin-pwa`, `vite-plugin-solid` 등)
- `vite`, `vite-tsconfig-paths`는 devDependency로 유지 (Vitest 의존)
- Vite 관련 빌드 타입 import 제거
- **Solid 관련 의존성 제거** (D1): `vite-plugin-solid`, Solid 관련 타입/설정
- sd-config.types.ts에서 Vite 관련 타입 정리: `SdPwaWorkboxConfig` 인터페이스 및 `SdPwaConfig.workbox` 필드 제거 (Feature 1.3 D4 위임분)
- ~~`postCss.plugins` 타입 변경 (D4: `unknown[]` → `[string, (object | string)?][]`)~~ → Feature 1.1a D4에서 이미 완료
- ViteEngine.ts 삭제 (D2: engines/index.ts에서 미참조, 빌드 의존성 정리의 일환)

**경계:**

- 소비 프로젝트(sd.config.ts)의 설정 호환성 유지 (API 변경 최소화)
- `vite` 자체는 devDependency로 유지

**근거:**

- 빌드 파이프라인에서 Vite 제거, 테스트 파이프라인에서는 유지

**설계 결정 (Feature 3.2 계획 시 확정):**

- **D1 Solid 관련**: wbs 기존 D1 유지. `vite-plugin-solid` 및 Solid 관련 코드 제거.
- **D2 ViteEngine.ts 삭제**: Feature 3.2에서 삭제. engines/index.ts에서 이미 미참조. 빌드 의존성 정리의 자연스러운 연장.

#### [x] Feature 3.3 테스트 업데이트

**의존성:** Feature 3.1, Feature 3.2

**범위:**

- 기존 Vite 빌드 관련 테스트 업데이트/제거:
  - `tests/utils/vite-config.spec.ts` → 제거 또는 esbuild 설정 테스트로 교체
  - `tests/angular/vite-angular-plugin.spec.ts` → esbuild 플러그인 테스트로 교체, Vitest용 테스트 유지
  - `tests/angular/vite-angular-plugin-legacy-watch.spec.ts` → esbuild watch 테스트로 교체
  - `tests/workers/client-worker.spec.ts` → esbuild + HTTP 서버 테스트로 교체
  - `tests/workers/client-worker-legacy.spec.ts` → 통합 legacy 모드 테스트로 교체
  - `tests/engines/` 내 ViteEngine 테스트 → EsbuildClientEngine 테스트로 교체
- 통합 테스트 업데이트:
  - `tests/sd-cli-client/` → esbuild define 테스트로 업데이트
  - `tests/vite-css-hmr/` → 커스텀 HMR CSS 테스트로 교체 또는 제거
- 루트 `vitest.config.ts`의 "angular" 프로젝트 설정 유지

**경계:**

- `hmr-candidates`, `angular-compiler` 등 Vite 비의존 테스트는 변경 최소
- `vitest.config.ts` 구조 변경 최소화

**근거:**

- 기존 테스트가 Vite API를 모킹하고 있어 전면 업데이트 필요

**설계 결정 (Feature 3.3 계획 시 확정):**

- **D1 vite-css-hmr 통합 테스트**: 제거. unit 테스트(esbuild-scss-plugin.spec.ts, hmr-service.spec.ts)가 이미 개별 검증 수행 중. Vite moduleGraph/hot API 결합 통합 테스트 불필요.
- **D2 sd-cli-client 모드 분리**: build 모드 단일 테스트. esbuild define은 dev/build 구분 없이 동일 동작. sd-cli-server.spec.ts와 동일 패턴(esbuild.build() + define).
- **D3 hmr-fallback 전환 테스트**: 제거. 마이그레이션 완료 후 불필요. TypeScript 타입 시스템이 미사용 훅 자동 감지.

## 제외 사항

- **TS 로직 HMR**: 별도 프로젝트로 분리 (사용자 결정. Angular 내부 API 의존 + 상태 보존 복잡도)
- **Webpack 호환성**: 미지원 (esbuild 단일 파이프라인)
- **SSR/Prerendering**: sd-cli 미사용, 범위 외
- **v12 코드 참조**: 사용자 명시적 제외. Angular 21 API 기반 새 설계
- **processPostCssInline 유지**: `createCompilerPlugin`의 `postcssConfiguration`이 컴파일 시점에 PostCSS 적용하므로 JS 후처리 불필요 (제거 대상)
- **AngularCompiler/AngularBuildPipeline 빌드 직접 사용**: `createCompilerPlugin`이 내부 관리. 단, Vitest용 `sdAngularPlugin`에서는 기존 로직 유지
- **Solid 프레임워크 지원**: 더이상 미사용이므로 전환 대신 삭제 (Feature 3.1/3.2에서 처리)
