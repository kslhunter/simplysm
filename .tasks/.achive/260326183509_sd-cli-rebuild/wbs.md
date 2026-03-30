# WBS

## Impact Mapping

- **Goal:** sd-cli v14로 모든 패키지 타입(Library, Server, Client)의 빌드/개발/배포를 통일된 빌드 엔진으로 수행한다
  - **Actor:** monorepo 개발자
    - **Impact:** 패키지 타입에 관계없이 일관된 빌드/개발 경험을 제공한다
      - **Deliverable:** BuildEngine 추상화 및 통합 명령어 체계
    - **Impact:** Angular 컴포넌트 라이브러리를 빌드/배포한다
      - **Deliverable:** Angular Library 빌드 엔진
    - **Impact:** Angular 기반 클라이언트 앱을 빌드/개발한다
      - **Deliverable:** Client 빌드 엔진 및 개발 서버
    - **Impact:** 일관된 브라우저 호환성을 유지하며 빌드한다
      - **Deliverable:** 브라우저 호환성 파이프라인
    - **Impact:** 네이티브 플랫폼(Android/Windows)에 앱을 배포한다
      - **Deliverable:** Capacitor/Electron 빌드 통합

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. 빌드 엔진 아키텍처

- [x] Feature 1.1 빌드 인프라 및 CLI 프레임워크
  - Worker 스레드 관리 인프라
  - 빌드 결과 수집 및 보고
  - 프로세스 시그널 처리
  - CLI 진입점 및 명령어 등록
  - 설정 파일 로딩 및 검증

- [x] Feature 1.2 패키지별 tsconfig.json 도입
  - 각 패키지에 자체 tsconfig.json 생성
  - sd-cli가 패키지 tsconfig를 읽고 필요한 옵션만 오버라이드
  - 기존 환경 추측 로직 제거

- [x] Feature 1.3 BuildEngine 추상화 레이어
  - 통일된 빌드 엔진 인터페이스 정의
  - EsbuildEngine 구현 (Library 전용 — library.worker + dts.worker 래핑)
  - 패키지별 엔진 선택 로직
  - 출력물(js/dts) 제어를 tsconfig 옵션으로 통일
  - DtsBuilder가 BaseBuilder.buildResolvers 내부 구현에 직접 의존하는 문제 해소 (review DESIGN-002)
  - Builder 패턴 파일(BaseBuilder/LibraryBuilder/DtsBuilder) 제거
  - WatchOrchestrator + BuildOrchestrator(Library 부분) → BuildEngine 전환

- [x] Feature 1.4 Library 빌드 엔진 통합
  - JS emit과 typecheck/.d.ts를 단일 엔진으로 통합
  - 별도 스레드 병렬 처리 유지
  - Watch mode incremental compilation

- [x] Feature 1.5 Server 빌드 엔진 통합
  - 기존 서버 빌드에 typecheck 통합 (esbuild + tsc 병렬)
  - ServerEsbuildEngine 구현 (BuildEngine 인터페이스)
  - server-build.worker 생성 (기존 server.worker 제거)
  - BuildOrchestrator + DevOrchestrator server→BuildEngine 전환
  - createBuildEngine 팩토리 server 지원

- [x] Feature 1.6a 명령어 통합
  - typecheck/lint/test를 check --type으로 통합
  - typecheck 명령어의 dts.worker 의존을 정리 (Feature 1.4 D4에서 유지한 임시 상태)
  - BuildOrchestrator에서 Worker 동시 생성 수 제한 도입 (review PERF-001)

- [x] Feature 1.6b Orchestrator 통합
  - DevOrchestrator + WatchOrchestrator → 단일 DevWatchOrchestrator
  - dev 명령어: server + client 대상 (library 제외)
  - watch 명령어: 전체 패키지(Library + Server + Scripts) 대상

- [x] Feature 1.7 배포 파이프라인
  - 여러 배포 방식 지원
  - 버전 관리 및 소스 관리 통합

- [x] Feature 1.8 Library tsc emit 통합
  - EsbuildEngine → TscEngine 전환 (tsc 단일 프로세스로 JS + dts emit)
  - ESM 상대 import 경로 .js 확장자 처리 (writeFile hook)
  - Library 전용 esbuild 설정 및 로직 제거

- [x] Feature 1.9 watch 명령어 재정의
  - watch 대상에서 server 제거 (Library + Scripts만 대상)
  - watch hook을 Library + Scripts 패키지에서 사용 가능하게 확장
  - 라이브러리 패키지 watch 시 workspace 의존성 패키지의 소스 변경 감지 (tsconfig paths → src/)
  - 변경 감지 시 의존하는 패키지의 incremental 리빌드 트리거

- [x] Feature 1.10 Typecheck 환경 동적 조작 복원
  - Feature 1.2에서 제거된 환경 동적 조작 로직 복원
  - target별 lib/types 조작 (node env: browser lib 제거, browser env: @types/node 제거)
  - neutral 패키지 node+browser 이중 typecheck
  - Angular 감지: tsconfig angularCompilerOptions → package.json @angular/core
  - angularCompilerOptions를 루트 tsconfig로 이동

### Epic 2. Angular 빌드

- [x] Feature 2.1 Angular 빌드 어댑터
  - 빌드 API 래핑 모듈
  - 버전 변경 시 어댑터만 수정하는 격리 구조

- [x] Feature 2.2 Angular Vitest 플러그인
  - Angular 빌드 어댑터(2.1)를 사용해 빌드 결과를 인메모리로 서빙하는 Vite 플러그인
  - @angular/build의 unit-test 빌더와 동일 구조 (빌드 → 인메모리 서빙 → Vitest 실행)
  - angular-migration의 임시 esbuild decorator lowering 플러그인 대체

- [x] Feature 2.3 Angular Library 빌드 엔진
  - Angular 컴파일러를 통한 데코레이터/템플릿 컴파일
  - 빌드 엔진 인터페이스 구현
  - tsconfig angularCompilerOptions 자동 감지

- [x] Feature 2.4 Library SCSS 컴파일
  - SCSS → CSS 컴파일 모듈화
  - Import 경로 해석
  - 인라인 스타일(SCSS) 기본 컴파일 (Feature 2.3에서 이관)

### Epic 3. Client 빌드

- [x] Feature 3.1 Client 빌드 엔진
  - Vite 직접 제어 + Angular 컴파일 플러그인 (AngularFacade)
  - 빌드 엔진 인터페이스 구현
  - 기존 buildApplicationInternal 기반 코드 제거

- [x] Feature 3.2 Client 프로덕션 빌드 통합
  - build 명령어에 Client 패키지 포함
  - 빌드 산출물 출력

- [x] Feature 3.3 Client 개발 서버 통합
  - dev 명령어에 Client 패키지 포함
  - HMR 지원

- [x] Feature 3.4 Client 빌드 설정 주입
  - 빌드 시 환경 정보 및 런타임 설정 주입

### Epic 4. 리팩토링

- [x] Feature 4.1 Engine 공통 베이스 추출
  - 3개 엔진의 공통 로직을 베이스 클래스로 추출
  - worker 경로와 config 매핑만 서브클래스에서 제공
  - 기존 3개 엔진을 베이스 기반으로 전환

- [x] Feature 4.2 Orchestrator 및 명령어 공통 로직 추출
  - 두 Orchestrator의 초기화 중복을 공유 유틸로 추출
  - config 로드, 타겟 검증, 패키지 분류, 엔진 생성 공통화
  - typecheck의 tests/ 별도 경로 제거 (mergeTestsPackagesIntoConfig 통합)
  - lint 실행 로직 공통 유틸 추출

### Epic 5. 빌드 확장

- [x] Feature 5.1 브라우저 호환성 파이프라인
  - browserSupport 옵션 — browserslist 기반 타겟 브라우저 설정 (최종 빌드 .js의 library 코드 포함 전체 변환, 기본값: 없음/최신 브라우저)
  - postCss 옵션 — PostCSS 플러그인 적용 (인라인 스타일 + .scss 파일 모두, angular 라이브러리 내부 .js내 인라인 스타일, .scss도 포함, 기본값: 없음)
  - polyfills.ts 파일 기반 폴리필 주입 (기본값: 없음)
  - splitting 옵션 — 코드 분할 여부 (기본값: true)

- [x] Feature 5.2 PWA 지원
  - vite-plugin-pwa (Workbox) 기반 PWA manifest + service worker 생성
  - 기본 활성화 (pwa: false로 비활성화)
  - sharp 기반 아이콘 자동 생성 (public/icon.png → 192x192, 512x512)
  - dev 모드에서 service worker 비활성화
  - manifest/workbox 커스터마이징 (sd.config.ts pwa 필드)

### Epic 6. 네이티브 앱

- [x] Feature 6.1 Capacitor 빌드
  - 프로젝트 초기화 및 Android 빌드
  - 앱 아이콘/서명 처리
  - 로컬 워크스페이스 플러그인의 독립 프로젝트 내 의존성 해석

- [x] Feature 6.2 Electron 빌드
  - 데스크톱 앱 프로젝트 초기화
  - 메인 프로세스 번들링 및 패키징

- [x] Feature 6.3 네이티브 빌드 통합 및 디바이스 실행
  - 프로덕션/개발 빌드에 네이티브 경로 추가
  - 개발 중 디바이스 실행

## 참조 자료

### Epic 4 리팩토링 분석

#### Engine 복붙 현황

TscEngine, NgtscEngine, ServerEsbuildEngine 3개 엔진의 코드가 90%+ 동일:
- `startWatch()` ~80줄: 이벤트 핸들링(buildStart, build, error), ResultCollector/RebuildManager 연동, Promise 래핑 — 3개 엔진 거의 동일. 차이점은 worker 경로와 worker에 전달하는 config 형태 뿐
- `stop()` ~20줄: watch 모드 stopWatch + terminate — 3개 엔진 완전 동일
- `run()` 결과 매핑: EngineResult 변환 — TscEngine/NgtscEngine 동일, ServerEsbuildEngine만 env/configs/externals 추가 전달
- ViteEngine은 worker 이벤트 구조가 다르므로(serverReady, port 등) 통합 대상 아님

#### Orchestrator 중복 현황

BuildOrchestrator.initialize()와 DevWatchOrchestrator.initialize() 모두:
1. sd.config.ts 로드 (`loadSdConfig`)
2. 타겟 검증 (`validateTargets`)
3. 패키지 분류 (target별 분류)
4. 엔진 생성 (`createBuildEngine`)

를 각각 별도 구현. 분류 로직은 BuildOrchestrator의 `classifyPackages()`와 DevWatchOrchestrator의 `_classifyWatchPackages()`/`_classifyDevPackages()`로 3벌.

#### typecheck tests/ 별도 경로 현황

`typecheck.ts:188-262`에 tests/ 디렉토리 전용 typecheck가 tsc 직접 실행으로 구현되어 있음. DevWatchOrchestrator에서는 이미 `mergeTestsPackagesIntoConfig()`로 tests/ 패키지를 config에 합쳐서 BuildEngine 경로로 처리하고 있으므로, typecheck에서도 동일하게 통합 가능.

#### lint 실행 경로 이중화 현황

lint worker 생성 + 실행 + 결과 수집 코드가 두 곳에 존재:
- `BuildOrchestrator.ts:379-387` — build 시 lint + build 병렬 실행
- `check.ts:122-141` — check --type lint 시 lint 실행
공통 유틸로 추출하면 양쪽에서 호출만 하면 됨. 동작 변경 없는 순수 리팩토링.

### 이전 WBS

- 이전 WBS 경로: `.achive/.tasks/260325193418_sd-cli-migration/wbs.md` (폐기)
- Feature 1.1, 1.7, 2.1은 이전 WBS에서 완료된 작업을 계승
- 이전 WBS의 Feature 1.2~1.7은 아키텍처 재설계로 인해 폐기, 이 WBS의 Feature 1.2~1.6으로 대체

### v14 sd-cli 현재 상태

- 동작 중인 명령어 8개: lint, typecheck, check, watch, dev, build, publish, replace-deps
- 소스 코드 7,679줄 (43파일), 테스트 6,388줄 (29파일)
- Client target은 모든 명령어에서 제외 처리됨 (classifyPackages에서 client skip)
- sd.config.ts에 Client target 패키지 없음 (18개 패키지 중 0개)
- `SdClientPackageConfig` 타입 정의만 존재

### 아키텍처 재설계 결정사항

#### 핵심 원칙

1. **typecheck는 항상 실행된다** — emit 여부와 무관하게 diagnostics 항상 수집
2. **출력은 tsconfig 옵션으로 제어** — `noEmit`, `declaration`, `emitDeclarationOnly`
3. **BuildEngine 추상화가 스레딩 모델을 숨긴다** — Orchestrator는 내부 구현을 모름
4. **dev와 watch를 분리 유지한다** — dev(server+client, library 제외)는 소비자 앱용, watch(전체)는 library monorepo용

#### BuildEngine 인터페이스

```typescript
interface BuildEngine {
  run(output: { js: boolean; dts: boolean }): Promise<BuildResult>
  startWatch(output: { js: boolean; dts: boolean }): Promise<void>
  stop(): Promise<void>
}
// typecheck(diagnostics)는 항상 포함 — 옵션이 아님
```

#### Engine 구현 매핑

| Engine | 대상 | 내부 구조 | emit | typecheck |
|--------|------|----------|------|-----------|
| TscEngine | 비-Angular Library | tsc 단일 스레드 | tsc(.js + .d.ts) | tsc |
| ServerEsbuildEngine | Server | esbuild 스레드 ‖ tsc 스레드 (병렬) | esbuild(.js 번들) | tsc |
| NgtscEngine | Angular Library | NgtscProgram 단일 스레드 | NgtscProgram | NgtscProgram (analyzeAsync) |
| ViteEngine | Client | Vite + AngularFacade (컴파일 플러그인) | Vite/Rollup | Angular 컴파일러 (createAngularCompilation) |

#### 명령어 통합

| 기존 | 통합 후 |
|------|--------|
| dev | dev — server + client (library 제외) |
| watch | watch — 전체 패키지 (library monorepo용) |
| typecheck + lint + test + check | check {targets} --type {types} |
| build | build (변경 없음) |
| publish | publish (변경 없음) |
| replace-deps | replace-deps (변경 없음) |

#### 패키지별 tsconfig.json 도입

- 현재: 루트 tsconfig.json만 존재, `getCompilerOptionsForPackage()`가 sd.config.ts의 target 기반으로 환경(node/browser) 추측하여 컴파일러 옵션 조작
- 변경: 각 패키지가 자체 tsconfig.json을 보유, sd-cli는 패키지 tsconfig를 읽고 필요한 옵션(`outDir`, `noEmit` 등)만 오버라이드
- 효과: IDE 타입 체크 정확성 향상, sd-cli 환경 추측 로직 제거, neutral 이중 typecheck 문제 해소 가능성

#### 제거 대상

| 컴포넌트 | 이유 |
|----------|------|
| dts.worker | 역할이 각 Engine 내부로 흡수 |
| DtsBuilder | BuildEngine으로 대체 |
| DevOrchestrator + WatchOrchestrator 분리 | 단일 Orchestrator + BuildEngine 기반으로 재구성 |
| typecheck 명령어 | check --type typecheck로 통합 |
| lint 명령어 | check --type lint로 통합 |
| Builder 패턴 (LibraryBuilder/DtsBuilder) | BuildEngine으로 대체 |

#### Angular 빌드 제약

- `NgtscProgram.analyzeAsync()`는 emit의 필수 전제조건 — emit과 typecheck 분리 불가
- `@angular/build`의 exports 필드가 내부 경로(`./src/tools/...`)를 차단 — `createAngularCompilerHost` 접근 불가, `AngularLibraryHostExtensions` 인터페이스로 대체 (Feature 2.1에서 구현 완료)
- `buildApplicationInternal`은 번들된 application 출력 전용 — library 빌드(per-file unbundled)에 부적합
- ~~**Client에서 `buildApplicationInternal` 사용:**~~ **폐기.** browserslist/PostCSS/polyfills/splitting 제어가 불가하여, Vite 직접 제어 + Angular 컴파일 플러그인 방식으로 전환 (Feature 3.1 재작업)

### v14 monorepo 패키지 현황

- 총 18개 패키지
- Library (14개): node(5), browser(5), neutral(4)
- Server (1개): service-server
- Scripts (1개): sd-claude
- Client (0개): 타입 정의만 존재, 실제 패키지 없음

### v14 sd-cli 모듈 크기

| 영역 | 파일 | 라인 |
|------|------|------|
| Workers | server.worker(734), dts.worker(389), library.worker(316), server-runtime.worker(172), lint.worker(16) | 1,627 |
| Orchestrators | DevOrchestrator(455), BuildOrchestrator(390), WatchOrchestrator(277) | 1,122 |
| Builders | BaseBuilder(218), LibraryBuilder(110), DtsBuilder(92), types(60) | 480 |
| Commands | publish(838), typecheck(368), lint(226), check(176), 기타 4개 | 1,722 |
| Utils | 17개 파일 | 1,832 |
| Angular | angular-build.ts(157) | 157 |
| Entry | sd-cli-entry(335), sd-cli(101), sd-config.types(296) | 732 |

### 원본 소스

- v13 sd-cli 경로: `D:\workspaces-13\simplysm\packages\sd-cli`
- v12 Angular Library 빌드 참조: `D:\workspaces-12\simplysm\packages\sd-cli\src\ts-compiler\SdTsCompiler.ts`
- v14 _back Client 빌드 참조: `D:\workspaces-14\_back\simplysm\packages\sd-cli` — Vite 직접 제어 + Angular 컴파일 플러그인 방식의 Client 빌드 구현. Feature 3.1~3.4 및 4.1 구현 시 source of truth로 참조한다
  - `src/angular/angular-facade.ts` — Angular 컴파일 래핑 (createAngularCompilation, JavaScriptTransformer, ComponentStylesheetBundler)
  - `src/angular/vite-angular-plugin.ts` — Angular AOT 컴파일을 수행하는 Vite 플러그인
  - `src/angular/vite-postcss-inline-plugin.ts` — 라이브러리 JS의 인라인 CSS에 PostCSS 적용
  - `src/utils/vite-config.ts` — Client Vite 설정 팩토리 (browserslist, postCss, polyfills, splitting 포함)
  - `src/workers/client.worker.ts` — Client 빌드/개발 서버 워커
  - `src/sd-config.types.ts` — SdBrowserSupportConfig 타입 정의

### Capacitor 로컬 워크스페이스 플러그인 이슈

- `.capacitor/`는 독립 프로젝트이므로 `workspace:*` 프로토콜을 resolve할 수 없음
- 재현: simplysm.js의 plugins에 로컬 워크스페이스 패키지(예: `"@oscom/capacitor-plugin-pmpos": true`)를 지정하면, `.capacitor/package.json`에 해당 플러그인이 추가되지만 `.capacitor/` 내에서 `pnpm install` 실패
- sd-cli가 `.capacitor/package.json`에 플러그인을 추가할 때, `workspace:*` 프로토콜 대신 로컬 패키지를 정상 resolve할 수 있는 방식으로 처리해야 함

### 미결 사항

- ~~**neutral 패키지 이중 typecheck:**~~ ~~Feature 1.2에서 해소됨.~~ **Feature 1.10에서 이중 typecheck 복원.** Feature 1.2의 "단일 typecheck로 충분" 결정을 번복. neutral 패키지가 node-only/browser-only 환경에서 모두 동작함을 검증해야 하므로, target별 lib/types 동적 조작과 이중 typecheck를 복원한다. 상세: [1.10-typecheck-환경-동적-조작.md](1.10-typecheck-환경-동적-조작.md)

## 제외 사항

- SolidJS 지원 (Angular로 대체)
- JIT 컴파일 (AOT 전용)
- Library 빌드에서 browserslist 직접 적용 (소비자 번들러가 처리)
- init 명령어 (v13에서 복사 후 의도적으로 제거됨)
- emit과 typecheck의 분리 (항상 세트로 실행)
