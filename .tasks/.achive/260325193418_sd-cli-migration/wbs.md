# WBS

## Impact Mapping

- **Goal:** sd-cli v14로 모든 패키지 타입(Library, Server, Client)의 빌드/개발/배포를 단일 CLI로 수행한다
  - **Actor:** monorepo 개발자
    - **Impact:** v13의 Library/Server 빌드/배포 기능을 v14에서 동일하게 수행한다
      - **Deliverable:** v13 sd-cli 전체 복사 및 v14 적응 패키지
    - **Impact:** Angular 21로 클라이언트 앱과 컴포넌트 라이브러리를 빌드/개발한다
      - **Deliverable:** Angular 기반 Client/Library 빌드 파이프라인
    - **Impact:** 일관된 브라우저 호환성을 유지하며 빌드한다
      - **Deliverable:** browserslist 기반 빌드 타겟 및 PostCSS 파이프라인
    - **Impact:** PWA를 통해 오프라인/모바일 사용자 경험을 제공한다
      - **Deliverable:** PWA 빌드 지원
    - **Impact:** 네이티브 플랫폼(Android/Windows)에 앱을 배포하여 실행한다
      - **Deliverable:** Capacitor/Electron 빌드 및 디바이스 실행 통합

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.

### Epic 1. sd-cli v14 기반 구축

- [x] Feature 1.1 빌드 인프라 및 CLI 프레임워크
  - Worker 스레드 관리 인프라
  - 빌드 결과 수집 및 보고
  - 프로세스 시그널 처리
  - CLI 진입점 및 명령어 등록
  - 설정 파일 로딩 및 검증

- [x] Feature 1.2 Library 빌드 파이프라인
  - JavaScript 번들링 (unbundled, 다중 target)
  - 타입 선언 파일 생성
  - 소스 파일 복사

- [x] Feature 1.3 Server 빌드 파이프라인 (범위: server.worker + server-runtime.worker 빌딩 블록)
  - JavaScript 번들링 (bundled, ESM, esbuild)
  - 외부 모듈 처리 (native 모듈 + optional peer deps + 수동 지정)
  - 프로덕션 배포 파일 생성 (package.json, pm2.config.cjs, mise.toml, openssl.cnf)
  - 런타임 설정 파일 생성 (.config.json)
  - 정적 파일 복사 (public/, public-dev/)
  - 서버 프로세스 관리 (포트 자동 할당, 환경변수 주입)
  - Watch 모드 변경 감지/리빌드 (metafile 기반)

- [x] Feature 1.4 코드 검사 파이프라인
  - 코드 스타일 검사
  - 타입 검사
  - 테스트 실행
  - 검사 통합 명령어 (병렬 실행)

- [x] Feature 1.5 Watch 오케스트레이션
  - WatchOrchestrator: 여러 빌더(Library+DTS) 조율 및 초기 빌드 대기
  - replaceDeps 감시
  - watch hook (scripts+watch target)
  - 리빌드 진행률 표시 (RebuildManager 통합)
  - copySrc 감시 (src/→dist/ 파일 자동 복사)

- [x] Feature 1.6 Dev 오케스트레이션
  - Server 빌드 및 런타임 개발 모드
  - 코드 변경 시 서버 자동 재시작
  - 의존성 교체 감시

- [x] Feature 1.7 프로덕션 빌드 오케스트레이션
  - 패키지 분류 및 병렬 빌드 조정
  - 빌드 순서 보장 (정리 → 검사 → 빌드)
  - Client 빌드 코드 제거

- [x] Feature 1.8 배포 파이프라인
  - 여러 배포 방식 지원
  - 버전 관리 및 소스 관리 통합

### Epic 2. Angular 빌드 기반

- [x] Feature 2.1 Angular 빌드 어댑터
  - 빌드 API 래핑 모듈
  - 버전 변경 시 어댑터만 수정하는 격리 구조

- [ ] Feature 2.2 Angular Library 빌드
  - Angular 컴파일러를 통한 데코레이터/템플릿 컴파일
  - 인라인 스타일(SCSS) 번들링 통합
  - angularCompilerOptions 감지 기반 Library 빌드 분기

- [ ] Feature 2.3 Library SCSS 컴파일
  - SCSS → CSS 컴파일 통합
  - Import 경로 해석

### Epic 3. Client 프로덕션 빌드

- [ ] Feature 3.1 Client 빌드 Worker
  - 프로덕션 빌드 Worker 스레드
  - 빌드 결과/에러 이벤트 처리
  - 빌드 산출물 출력

- [ ] Feature 3.2 Client 빌드 명령어 통합
  - build 명령어에 Client 패키지 포함
  - 빌드 오케스트레이터에 Client 빌드 경로 추가
  - Client 타입 검사 통합

- [ ] Feature 3.3 Client 빌드 설정 주입
  - 빌드 시 환경 정보 및 런타임 설정 주입

### Epic 4. Client 개발 서버

- [ ] Feature 4.1 Client 개발 서버 Worker
  - 개발 서버 Worker 스레드
  - HMR 지원
  - 서버 준비 이벤트

- [ ] Feature 4.2 Client Dev 명령어 통합
  - dev 명령어에 Client 패키지 포함
  - Server 프록시 설정
  - Scope 패키지 변경 감지

### Epic 5. 빌드 확장

- [ ] Feature 5.1 브라우저 호환성 파이프라인
  - Library 빌드의 chrome84 하드코딩 제거 (도구 기본값 사용)
  - 빌드 타겟 변환
  - CSS 후처리 파이프라인

- [ ] Feature 5.2 PWA 지원
  - 오프라인/모바일 웹 앱 지원

### Epic 6. 네이티브 앱

- [ ] Feature 6.1 Capacitor 프로젝트 초기화
  - 프로젝트 초기화 및 플랫폼 추가
  - 빌드 도구 검증
  - 앱 아이콘 생성
  - 설정 파일 생성

- [ ] Feature 6.2 Capacitor Android 빌드
  - 모바일 앱 빌드 (debug/release)
  - 앱 서명 처리
  - Android 플랫폼 설정 (manifest, gradle)

- [ ] Feature 6.3 Electron 빌드
  - 데스크톱 앱 프로젝트 초기화
  - 메인 프로세스 번들링
  - 실행파일 빌드 및 패키징
  - 네이티브 모듈 리빌드

- [ ] Feature 6.4 네이티브 빌드 통합
  - 프로덕션 빌드에 네이티브 빌드 경로 추가
  - 개발 모드에 네이티브 프로젝트 초기화 추가

- [ ] Feature 6.5 Device 실행 명령어
  - 개발 중 디바이스 실행
  - 개발 서버 URL 연결

## 참조 자료

### 원본 소스

- v13 sd-cli 경로: `D:\workspaces-13\simplysm\packages\sd-cli`
- v13 전체 코드를 복사 후 v14 의존성/버전에 맞게 적응, Client 빌드 코드는 Angular로 교체

### v14 sd-cli 현재 상태

- 동작 중인 명령어 8개: lint, typecheck, check, watch, dev, build, publish, replace-deps
- Client target은 모든 명령어에서 제외 처리됨 (`classifyPackages()`에서 client skip, DevOrchestrator에서 server만 처리)
- `angular-build.ts` 어댑터 구현 완료 (134줄): `buildApplicationInternal`, `serveWithVite`, `IndexHtmlGenerator`, `createAngularBuilderContext` 등
- `SdClientPackageConfig` 타입 정의 존재: target, server, env, publish, capacitor, electron, configs, exclude 필드
- sd.config.ts에 Client target 패키지 없음

### v14 sd-cli 모듈 크기

| 영역 | 파일 | 라인 |
|------|------|------|
| Workers | server.worker (734), dts.worker (453), library.worker (316), server-runtime.worker (172), lint.worker (16) | 1,691 |
| Orchestrators | DevOrchestrator (455), BuildOrchestrator (390), WatchOrchestrator (277) | 1,122 |
| Builders | BaseBuilder (218), LibraryBuilder (110), DtsBuilder (92), types (60) | 480 |
| Angular | angular-build.ts | 134 |

### v13 sd-cli Client 관련 모듈 크기

| 파일 | 라인 | 용도 |
|------|------|------|
| capacitor.ts | 932 | Capacitor 전체 (초기화+빌드+디바이스) |
| DevOrchestrator.ts client 부분 | 520 | Client dev 서버 관리 |
| vite-config.ts | 391 | Vite 설정 생성 (SolidJS 기반 → Angular로 교체) |
| electron.ts | 363 | Electron 전체 (초기화+빌드+실행) |
| client.worker.ts | 251 | Vite build/dev 워커 |
| device.ts | 141 | 디바이스 실행 명령어 |
| copy-public.ts | 127 | public/public-dev 파일 복사 |
| tailwind-config-deps.ts | 99 | Tailwind 의존성 추적 |

### v13 sd-cli 구조

- 진입: `sd-cli.ts` → `sd-cli-entry.ts` (yargs)
- 명령어 10개: build, dev, watch, lint, typecheck, check, publish, init, device, replace-deps
- 구조: commands/ → orchestrators/ → builders/ → workers/ (Worker 스레드)
- Worker: client.worker (Vite+SolidJS), server.worker (esbuild), server-runtime.worker, library.worker (esbuild), dts.worker (tsc), lint.worker
- 인프라: WorkerManager, ResultCollector, SignalHandler
- 네이티브: capacitor/ (Android APK/AAB, 932줄), electron/ (Windows exe, 363줄)

### Angular 21 마이그레이션 상세

- Angular 21 최신 패턴 적용: Signals, standalone components, zoneless change detection
- AOT 전용, JIT 미지원
- `@angular/build/private` API 사용 — SemVer 미보장이므로 별도 어댑터 모듈로 래핑하여 Angular 버전 변경 시 어댑터만 수정
- Angular HMR: `@angular/build` HMR API 활용, Facade 확장으로 experimental component HMR 지원 (컴포넌트 상태 유지)
- 어댑터 노출 API: `buildApplicationInternal`, `serveWithVite`, `normalizeDevServerOptions`, `IndexHtmlGenerator`, `checkPort`, `emitFilesToDisk`, `ResultKind`, `ApplicationBuilderOptions`, `DevServerBuilderOptions`, `createAngularBuilderContext`

### Angular Library 빌드 분석

- 현재 library.worker.ts는 plain esbuild만 사용 — Angular 데코레이터/템플릿 transform 없음
- Angular 데코레이터(@Component 등)는 Angular 컴파일러(ngtsc)로 컴파일해야 런타임이 인식함 (plain esbuild/tsc 출력은 불가)
- npm 배포하되 본인 프로젝트 전용이므로 APF/ng-packagr/partial compilation 불필요, full compilation으로 충분
- v12 `SdTsCompiler`가 `NgtscProgram`(`@angular/compiler-cli` 정식 export)으로 Angular library를 빌드한 선례 있음
- v12 참조 경로: `D:\workspaces-12\simplysm\packages\sd-cli\src\ts-compiler\SdTsCompiler.ts`
- v12에서 해킹이 필요했던 것은 `NgtscProgram`이 아니라 `AngularCompilerHost`, `replaceBootstrap` 등 `@angular/build/src/tools/...` 내부 경로 import
- `buildApplicationInternal`은 번들된 application 출력 전용이므로 library 빌드(per-file unbundled 출력)에 부적합
- `angularCompilerOptions` 존재 여부로 Angular library 감지 (v12 패턴: `Boolean(tsconfig.angularCompilerOptions)`)
- monorepo 내부에서는 tsconfig paths(`"@simplysm/*": ["packages/*/src/index.ts"]`)로 소스 직접 참조 → Client 빌드 시 `buildApplicationInternal`이 Angular 컴파일 수행
- dist 소비하는 외부 프로젝트를 위해 library dist에 Angular 컴파일된 코드 필요

### 브라우저 호환성 아키텍처

- Library `bundle:false`는 dependency 코드를 변환하지 않으므로 browserslist 적용이 무의미 → 소비자 번들러(Vite)가 최종 target으로 변환
- Library에서 SCSS → CSS만 수행, PostCSS는 Client 빌드에서 적용 (소비자 앱 SCSS + 라이브러리 CSS + Angular inline styles 모두)
- Angular 컴포넌트 라이브러리도 Library 패키지이며 SCSS를 포함
- Vite `css.postcss` 설정에 `sd.config.ts`의 `postCss.plugins`를 전달 (dev/build 동일)
- `browserslist-to-esbuild` 패키지로 dev/build 모두 일관된 target 적용: `SdClientPackageConfig.browserslist` → esbuild target 배열로 변환

### v13 Client 빌드 흐름

- Build: BuildOrchestrator → client.worker.build() → Vite build → (Capacitor build) → (Electron build)
- Dev: DevOrchestrator → client.worker.startWatch() → Vite dev server → serverReady → Server proxy 설정 → (Capacitor init)
- Client server 연결: `server: string` (서버 패키지명, proxy) vs `server: number` (고정 포트, standalone)
- Capacitor: outDir=`.capacitor/www`, base=`./` (상대경로)
- Electron: dev URL 환경변수 전달, 메인 프로세스 esbuild 번들링

### v14 monorepo 패키지 현황

- 총 17개 패키지 (sd-claude 제외)
- `angular` 패키지: `target: "browser"`, Angular v21.0.0
- Capacitor 플러그인 4개: broadcast, file-system, auto-update, usb-storage (모두 `target: "browser"`)
- 빌드 완료 패키지: core-browser, core-common, core-node, storage (4/17)

### Client 빌드 설정 상세

- `env`: `Record<string, string>` — 빌드 시 `process.env`로 치환
- `configs`: `Record<string, unknown>` — dist/.config.json에 기록, 런타임에 로드
- `server`: `string | number` — string이면 서버 패키지명(proxy 연결), number이면 Vite 고정 포트
- `exclude`: `string[]` — Vite optimizeDeps에서 제외할 패키지
- `capacitor`: appId, appName, SDK 버전, 서명 정보, 빌드 타입(debug/release)
- `electron`: appId, portable/NSIS, 네이티브 모듈 재빌드 목록

## 제외 사항

- SolidJS 지원 (Angular로 대체)
- JIT 컴파일 (AOT 전용)
- Library 빌드에서 browserslist 직접 적용 (소비자 번들러가 처리)
- init 명령어 (v13에서 복사 후 의도적으로 제거됨)
