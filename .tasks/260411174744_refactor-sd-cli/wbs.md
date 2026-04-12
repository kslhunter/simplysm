# WBS: sd-cli 패키지 리팩토링

## 프로젝트 개요

- **배경:** sd-cli 패키지(71개 파일, ~13,700줄)에서 God Module, 보일러플레이트 중복, 관심사 혼재 등 7건의 구조적·설계적 이슈가 리팩토링 분석을 통해 도출됨
- **환경:** pnpm 모노레포 내 `packages/sd-cli/` 패키지. TypeScript ESM 프로젝트. Node.js Worker Thread 기반 빌드 시스템
- **전제조건:** 기존 기능의 동작 변경 없이 내부 구조만 개선 (리팩토링). 기존 테스트(`tests/sd-cli-server`, `tests/sd-cli-client`)가 통과해야 함
- **기술적 제약:** TypeScript 5.9, ESM only, `import type` 필수, Prettier/ESLint 규칙 준수
- **참조 자료:**
  - `.tasks/260411174744_refactor-sd-cli/refactor.md` — 리팩토링 분석 리포트 (이슈 상세 및 개선 방향)

## Impact Mapping

- **Goal:** sd-cli 패키지의 유지보수 비용 절감 — 코드 변경 시 파급 범위를 명확히 파악하고 독립적으로 수정 가능하게 함
  - **Actor:** sd-cli 유지보수 개발자
    - **Impact:** 워커 수정 시 관련 파일만 변경하고, 다른 워커에 영향을 주지 않는다
      - **Deliverable:** Worker 계층 공통 유틸리티 추출 및 server-build 모듈 분리
    - **Impact:** Orchestrator 공통 로직 변경 시 한 곳만 수정한다
      - **Deliverable:** Orchestrator 중복 패턴 공통화
    - **Impact:** publish 명령의 특정 페이즈만 독립적으로 수정·테스트한다
      - **Deliverable:** publish 페이즈 분리
    - **Impact:** Capacitor 관련 설정/빌드 로직을 독립적으로 파악·수정한다
      - **Deliverable:** Capacitor 모듈 분리
    - **Impact:** 디렉토리 구조에서 파일의 역할을 즉시 파악한다
      - **Deliverable:** deps/ 디렉토리 구조 정리

## Feature Breakdown

### Epic 1. Worker 계층 리팩토링

#### [x] Feature 1.1 Worker 초기화 보일러플레이트 추출

**의존성:** 없음

**범위:**

- 4개 워커(library-build, ngtsc-build, server-build, client)의 공통 초기화 패턴을 `workers/shared-worker-lifecycle.ts`로 추출
- `setupWorkerConsola()`, logger 생성, `registerCleanupHandlers()`, `createOnceGuard("startWatch")` 패턴 통합
- 4개 워커에서 추출된 유틸리티를 사용하도록 수정
- 기존 동작의 변경 없음 확인

**경계:**

- 각 워커의 고유한 cleanup 로직(fsWatcher 정리 등)은 워커 자체에 유지
- 빌드/감시 로직은 이 Feature에서 변경하지 않음

**근거:**

- STRUCT-001: 4개 워커에서 ~150줄의 동일 보일러플레이트 반복 (refactor.md)

**설계 결정:**

- D1: client.worker.ts는 createOnceGuard를 사용하지 않지만, setupWorkerLifecycle은 항상 guardStartWatch를 반환하고 client는 구조분해 시 생략한다 (시그니처 단순화)
- Feature 문서: [1.1-worker-init-boilerplate-extraction.md](./1.1-worker-init-boilerplate-extraction.md)

#### [x] Feature 1.2 Worker 감시 경로 수집 및 변경 필터링 공통화

**의존성:** Feature 1.1

**범위:**

- `workers/build-watch-paths.ts` 추출 — `collectDeps()` 호출 + glob 패턴 기반 watchPaths 생성 공통 함수
- `workers/build-change-filter.ts` 추출 — `hasFileAddOrRemove` 판단 + `lastSourceFilePaths` 교차 필터링 공통 함수
- library-build, ngtsc-build, server-build 3개 워커에서 추출된 유틸리티를 사용하도록 수정
- 워커별 glob 패턴 차이(`*.ts` vs `*.{ts,scss,css}` vs `*`)는 파라미터로 처리
- server-build의 metafile 기반 필터링은 별도 유지 (공통 함수와 다른 전략)

**경계:**

- client.worker.ts는 Vite가 자체 감시를 수행하므로 이 Feature의 대상이 아님
- server-build의 esbuild metafile 기반 필터링 로직 자체는 변경하지 않음

**근거:**

- STRUCT-002: 3개 워커에서 감시 경로 수집 ~75줄 + 변경 필터링 ~45줄 중복 (refactor.md)

**설계 결정:**

- D1: ngtsc-build의 scss/ 디렉토리는 `extraDirs: Array<{ dir: string; globs: string[] }>` 파라미터로 처리 (scss/의 glob `*.{scss,css}`가 src/의 `*.{ts,scss,css}`와 다름)
- D2: server-build는 감시 경로 수집만 공통 함수 사용, 변경 필터링(metafile)은 기존 유지
- D3: `shouldSkipRebuild`는 `filePaths: Iterable<string>`을 받아 ngtsc의 SCSS 역방향 탐색 결과도 수용
- Feature 문서: [1.2-worker-watch-paths-change-filter.md](./1.2-worker-watch-paths-change-filter.md)

#### [x] Feature 1.3 server-build.worker.ts 모듈 분리

**의존성:** Feature 1.1, Feature 1.2

**범위:**

- `server-esbuild-context.ts` 추출 — esbuild context 생성/관리, metafile 추적
- `server-watch-manager.ts` 추출 — FsWatcher 감시 루프, 변경 필터링, context 재생성 로직
- `server-build.worker.ts`는 위 모듈을 조합하는 경량 워커 셸로 축소
- LOGIC-001 주석(line 415) 리소스 해제 로직의 명확화 (recreateContext 메서드로 캡슐화)

**경계:**

- 다른 워커(library-build, ngtsc-build, client)는 이 Feature에서 변경하지 않음
- esbuild/tsc 설정 자체는 변경하지 않음
- server-artifacts.ts 추출 생략 — 아티팩트 로직이 이미 외부 모듈에 분리됨 (인라인 코드 ~7줄만 남아 추출 가치 없음)

**근거:**

- DESIGN-001: 516줄에 4가지 관심사 혼재, startWatch에 7개 try-catch/4개 상태 머신 (refactor.md)

**설계 결정:**

- D1: server-artifacts.ts 추출 생략 — generateProductionFiles(deps/server-production-files.ts), copyPublicFiles(utils/copy-public.ts)가 이미 분리됨
- D2: esbuild context 모듈은 모듈 스코프 변수 + export 함수 패턴 사용 (기존 워커 유틸리티 패턴과 일치)
- D3: watch manager는 콜백 패턴으로 sender 의존성 제거
- Feature 문서: [1.3-server-build-module-separation.md](./1.3-server-build-module-separation.md)

### Epic 2. Orchestrator 공통 패턴 정리

#### [x] Feature 2.1 Orchestrator 중복 패턴 추출

**의존성:** 없음

**범위:**

- 진단 메시지 집계·포맷팅 로직을 `utils/diagnostic-utils.ts`에 공통 함수로 추출 (BuildOrchestrator lines 464-494, TypecheckOrchestrator lines 341-367)
- 환경변수 설정(`getVersion() → baseEnv`)을 BaseOrchestrator로 올림 (dev 여부만 파라미터화)
- BaseOrchestrator `_initializeMode` 시그니처에서 `options: string[]` 파라미터 제거, BuildOrchestrator가 자체적으로 처리하도록 변경
- Build, Typecheck, Watch, Dev 4개 Orchestrator에서 추출된 공통 함수를 사용하도록 수정

**경계:**

- 작업 생성 → 동시성 제어 패턴의 추상화는 오버엔지니어링 리스크로 이 Feature에서 다루지 않음
- 에러 로깅 패턴 통합은 범위 밖

**근거:**

- DESIGN-003: 4개 Orchestrator에서 환경변수·진단·시그니처 중복 (refactor.md)

**설계 결정:**

- D1: BuildOrchestrator는 독립 클래스이므로 자체 getVersion() 유지
- D2: WatchOrchestrator는 baseEnv 미사용이지만 BaseOrchestrator에서 항상 설정 (초기화 통일)
- Feature 문서: [2.1-orchestrator-duplicate-pattern-extraction.md](./2.1-orchestrator-duplicate-pattern-extraction.md)

### Epic 3. Publish 명령 구조화

#### [x] Feature 3.1 publish/index.ts 페이즈 분리

**의존성:** 없음

**범위:**

- `publish/git-phase.ts` 추출 — git 상태 확인, Claude CLI 자동 커밋, 태깅, 푸시
- `publish/deployment-phase.ts` 추출 — 패키지별 npm/local/storage 배포 오케스트레이션
- `publish/post-publish-phase.ts` 추출 — postPublish 스크립트 실행
- `runPublish()`는 검증 + 버전 관리 + 페이즈 순차 호출하는 경량 오케스트레이터로 축소
- 기존 `version-upgrade.ts`, `npm-publisher.ts`, `local-publisher.ts`, `storage-publisher.ts`, `env-utils.ts`와의 관계 정리

**경계:**

- 검증 로직과 버전 관리는 runPublish()에 남김 (분리 대비 복잡도 증가가 크지 않음)
- 배포 백엔드(npm-publisher, storage-publisher 등) 자체는 변경하지 않음

**근거:**

- DESIGN-002: 455줄에 5개 이상의 독립 페이즈가 밀결합 (refactor.md)

**설계 결정:**

- D1: 사전 검증(미커밋 감지+자동 커밋)을 git-phase.ts에 포함 — ensureCleanWorkingTree() + commitTagAndPush() 두 함수로 분리하여 호출 시점은 기존과 동일 유지
- Feature 문서: [3.1-publish-phase-split.md](./3.1-publish-phase-split.md)

### Epic 4. Capacitor 모듈 분리

#### [x] Feature 4.1 capacitor.ts 관심사 분리

**의존성:** 없음

**범위:**

- `capacitor-npm-config.ts` 추출 — package.json 생성, pnpm workspace 관리 (`_initCap`, `_setupNpmConf` 로직)
- `capacitor-config-writer.ts` 추출 — capacitor.config.ts 템플릿 생성, 정규식 기반 URL 업데이트 (`_writeCapConf`, `_updateServerUrl` 로직)
- `Capacitor` 클래스는 경량 파사드로 유지하며 위 모듈을 조합
- 기존 `capacitor-android.ts`, `capacitor-build.ts`, `capacitor-icon.ts`와의 관계 정리

**경계:**

- `capacitor-android.ts`(Android SDK/Java 감지)는 이미 분리되어 있으므로 변경하지 않음
- `capacitor-build.ts`(Gradle 빌드)도 이미 분리되어 있으므로 변경하지 않음
- 잠금 파일 관리 로직은 Capacitor 클래스에 유지 (다른 메서드에서 공통 사용)

**근거:**

- DESIGN-004: 618줄에 라이프사이클·npm 설정·파일 생성·빌드 등 모든 기능 집중 (refactor.md)

**설계 결정:**

- D1: 추출 함수는 기존 패턴(capacitor-android.ts 등)과 일치하도록 개별 파라미터 스타일 사용
- D2: 추출 모듈에서 cpx.spawn 직접 사용 (Capacitor._exec 래퍼에 의존하지 않음)
- D3: _findWorkspaceRoot → capacitor-npm-config.ts 내부, _toPascalCase → capacitor-config-writer.ts 내부
- Feature 문서: [4.1-capacitor-separation-of-concerns.md](./4.1-capacitor-separation-of-concerns.md)

### Epic 5. 디렉토리 구조 정리

#### [x] Feature 5.1 deps/ 디렉토리 관심사 분리

**의존성:** Feature 1.3 (server-build.worker.ts가 server-production-files.ts를 import하므로, 모듈 분리 후 import 경로 변경 필요)

**범위:**

- `deps/replace-deps/` 서브디렉토리 생성 — `replace-deps.ts`, `replace-deps-resolve.ts`, `collect-deps.ts` 이동
- `deps/server-externals/` 서브디렉토리 생성 — `server-production-files.ts` 이동
- 모든 소비자의 import 경로 업데이트 (BaseOrchestrator, sd-cli.ts, server-build.worker.ts 등)
- 패키지 루트 `index.ts`의 re-export 경로 업데이트 (해당되는 경우)

**경계:**

- 파일 내용 자체는 변경하지 않음 (순수 이동 + import 경로 수정만)

**근거:**

- ARCH-001: 개발 시점 의존성 관리와 빌드 시점 산출물 생성이 같은 디렉토리에 혼재 (refactor.md)

**설계 결정:**

- D1: collect-deps.ts는 "개발 시점 의존성 관리" 그룹으로 replace-deps/ 서브디렉토리에 배치
- D2: 이동 파일 내부 상대 import 3건(collect-deps 1건, server-production-files 2건)도 디렉토리 깊이 변경분만 수정
- D3: sd-cli.ts의 동적 import(`./deps/replace-deps.js`)도 소비자에 포함 (WBS 소비자 목록에 미언급이었으나 코드에서 발견)
- D4: 패키지 루트 index.ts에 deps/ re-export 없음 확인 — 수정 불필요
- Feature 문서: [5.1-deps-directory-separation-of-concerns.md](./5.1-deps-directory-separation-of-concerns.md)

## 제외 사항

- **CLI 진입점 구조화 (sd-cli-entry.ts):** 328줄로 7개 명령을 등록하는 수준은 허용 범위 — Goal에 대한 영향이 미미하여 제외
- **EsbuildClientEngine의 BaseEngine 미상속:** 구조적 차이(serverReady 이벤트, port 관리)가 독립 구현을 정당화하므로 제외
- **check.ts CheckOrchestrator 추출:** 231줄로 단일 명령 핸들러 수준이며, 별도 Orchestrator 추출의 이점이 적어 제외
- **tsconfig.ts 유틸리티 클래스화:** 128줄의 독립 유틸리티 함수들은 현재 구조로 충분하여 제외
- **작업 생성 → 동시성 제어 패턴 추상화:** 오버엔지니어링 리스크가 있어 제외
