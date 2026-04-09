# WBS: sd-cli 테스트 전체 리팩토링

## 프로젝트 개요

- **배경:** `pnpm test sd-cli` 실행 시 `packages/angular/dist`가 삭제되는 문제를 계기로 sd-cli 테스트 전체를 점검한 결과, 격리 실패·혼재·중복·명칭 불일치 등 구조적 문제가 광범위하게 존재함을 확인. 부분 수정이 아닌 82개 전체 재작성이 필요.
- **환경:** pnpm 모노레포. vitest 기반. sd-cli 패키지 82개 테스트 파일 (24,449줄).
- **전제조건:** 기존 `tests/angular/fixtures/basic-app/` 독립 fixture 패턴이 이미 존재.
- **기술적 제약:** Angular AOT 컴파일 테스트는 실제 컴파일러 호출이 필요하므로 완전 모킹이 불가한 경우 있음. 기존 basic-app fixture의 node_modules는 gitignored 상태이며 수동 복사로 관리됨.
- **참조 자료:**
  - `packages/sd-cli/CLAUDE.md` — sd-cli 아키텍처 및 테스트 구조 이해
  - `packages/sd-cli/tests/angular/fixtures/packages/basic-app/` — 기존 fixture 패턴 참조
  - `.tasks/260409114555_sd-cli-test-isolation/wbs.md` — 폐기된 이전 WBS (격리만 다루어 범위 부족)

## Impact Mapping

- **Goal:** sd-cli 테스트가 격리·일관·무중복 상태로, 실행 시 외부 부수효과 0건 + 실패 시 원인 즉시 파악 가능
  - **Actor:** 개발자
    - **Impact:** 테스트 실행 후 워크스페이스 상태가 변하지 않아 작업 흐름이 중단되지 않음
      - **Deliverable:** 외부 패키지 참조 제거 및 테스트 격리 완성
    - **Impact:** 테스트 실패 시 단위/통합 분리로 원인 범위를 즉시 좁힘
      - **Deliverable:** 혼재 파일의 단위/통합 분리 및 일관된 테스트 패턴 수립
    - **Impact:** 새 기능 테스트 작성 시 일관된 패턴을 참조하여 빠르게 작성
      - **Deliverable:** 중복 커버리지 통합, 명칭 정리, 82개 전체 패턴 통일

## Feature Breakdown

### Epic 1. Angular 빌드 테스트 정비

#### [x] Feature 1.1 Angular 빌드 파이프라인·컴파일러 테스트

**의존성:** 없음

**범위:**

- `angular/angular-build-pipeline.spec.ts` (154줄, integration): fixture 사용 — `.acc.spec.ts`와 중복 해소
- `angular/angular-build-pipeline.acc.spec.ts` (188줄, integration): fixture 사용 — `.spec.ts`와 중복 해소
- `angular/angular-compiler-hmr.spec.ts` (152줄, integration): fixture 사용
- `utils/angular-build.spec.ts` (114줄, unit): ~~packages/angular 직접 참조~~ → 코드 확인 결과 sd-cli/src만 참조하여 격리 양호. 패턴 통일만
- `utils/angular-compiler.spec.ts` (1515줄, mixed): 단위+통합 혼재 분리
- `utils/ngtsc-build-core.spec.ts` (231줄, integration): packages/angular 직접 참조 → 격리
- `utils/ngtsc-build-core-write-emit.spec.ts` (648줄, integration): 임시 파일시스템 사용
- `utils/ngtsc-scss-config.spec.ts` (26줄, unit): packages/angular 설정 검증 → sd-cli에서 삭제 + angular 패키지 이관 이슈 생성 (D2)
- `utils/scss-compiler.spec.ts` (131줄, integration): packages/angular 직접 참조 → 격리
- `workers/ngtsc-build-worker.spec.ts` (200줄, integration): packages/angular 직접 참조 + dist 삭제 → 격리. describe가 "ngtsc-build-core" AOT 컴파일을 테스트하므로 대상 불일치도 존재
- `workers/ngtsc-build-lint.spec.ts` (171줄, unit): 이미 격리 — 패턴 통일만

**경계:**

- Vite Angular 플러그인 테스트는 Feature 1.2에서 다룸
- engines/ngtsc-engine.spec.ts는 Feature 2.2에서 다룸

**근거:**

- 코드 확인: `ngtsc-build-core.spec.ts:9-10`에서 packages/angular 직접 참조, `beforeAll/afterAll`에서 dist 삭제
- 코드 확인: `angular-build-pipeline.spec.ts`와 `.acc.spec.ts`가 동일 AngularBuildPipeline을 basic-app fixture로 테스트 (80% 유사)
- 코드 확인: `angular-compiler.spec.ts` 1515줄에 vi.mock + 실제 파일시스템 혼재
- 코드 확인: `ngtsc-build-worker.spec.ts:9-10`에서 packages/angular 직접 참조 + AOT 컴파일 + dist 삭제. describe명이 "ngtsc-build-core" → 대상 불일치 확인
- ~~코드 확인: `angular-build.spec.ts`가 packages/angular 직접 참조~~ → 정정: sd-cli/src, sd-cli/package.json만 참조
- 총 11개 파일, ~3530줄

**Feature 1.1 설계 결정 요약:**
- D1: ngtsc-build-core 격리 → basic-lib fixture 신규 생성
- D2: ngtsc-scss-config.spec.ts → sd-cli에서 삭제 + angular 패키지 이관 이슈
- D3: angular-compiler.spec.ts → 3파일 분할 (cache + init/diagnostics + emit/update)

#### [x] Feature 1.2 Vite Angular 플러그인 테스트

**의존성:** Feature 1.1 (fixture 패턴 공유)

**범위:**

- `angular/vite-angular-plugin.spec.ts` (304줄, unit)
- `angular/vite-angular-plugin-api.acc.spec.ts` (148줄, mixed)
- `angular/vite-angular-plugin-hmr.spec.ts` (337줄, mixed)
- `angular/vite-angular-plugin-hmr-fallback.spec.ts` (350줄, mixed)
- `angular/vite-angular-plugin-legacy-watch.spec.ts` (138줄, mixed)
- `angular/vite-angular-plugin-scss-hmr.spec.ts` (112줄, mixed)
- `angular/vite-angular-plugin-vitest.acc.spec.ts` (118줄, unit)
- `angular/vite-angular-plugin-vitest-integration.acc.spec.ts` (83줄, integration)
- `angular/vite-postcss-inline-plugin.spec.ts` (60줄, unit)
- `angular/client-transform-stylesheet.spec.ts` (196줄, mixed): 임시 디렉토리 사용
- `angular/hmr-candidates.spec.ts` (158줄, unit)
- `angular/linker-disk-cache.spec.ts` (171줄, unit)
- `angular/scss-disk-cache.spec.ts` (162줄, mixed): 임시 디렉토리 사용

**경계:**

- sdAngularPlugin 본체 기능만. 빌드 파이프라인·컴파일러는 Feature 1.1
- `vite-angular-plugin` 3개 파일(spec, api.acc, vitest.acc) 간 중복 해소 포함

**근거:**

- 코드 확인: vite-angular-plugin 관련 3개 파일이 동일 플러그인(sdAngularPlugin)의 buildStart, transform, handleHotUpdate 훅을 중복 테스트
- 코드 확인: mixed 6개 파일이 vi.mock + fixtures 혼재. 단, loadSdConfig mock은 필수 (fixture에 sd.config.ts 없음, sd-testing.md 원칙 부합)
- 코드 확인: client-transform-stylesheet.spec.ts에 scss-compiler async 테스트가 혼재 (모듈 불일치)
- 총 13개 파일, ~2337줄 + scss-compiler.spec.ts 수정 (범위 밖, D2로 허용)

**Feature 1.2 설계 결정 요약:**
- D1: vitest.acc + vitest-integration → 단일 파일 통합 (vite-angular-plugin-vitest.spec.ts)
- D2: client-transform-stylesheet의 scss-compiler async 테스트 → scss-compiler.spec.ts에 편입 (범위 밖 수정)

### Epic 2. 빌드 실행 테스트 정비

#### [x] Feature 2.1 빌드 워커 테스트

**의존성:** 없음

**범위:**

- `workers/client-worker.spec.ts` (907줄, unit): 대형 파일 — 구조 정비
- `workers/library-build-worker.spec.ts` (384줄, unit)
- `workers/library-build-lint.spec.ts` (121줄, unit): 명칭 검토 ("lint"가 워커의 lint 기능인지 명확화)
- `workers/server-build-worker.spec.ts` (787줄, unit): 대형 파일 — 구조 정비
- `workers/server-build-lint.spec.ts` (160줄, unit): 명칭 검토
- `workers/server-runtime-worker.spec.ts` (333줄, unit)

**경계:**

- ngtsc 빌드 워커 테스트(ngtsc-build-worker, ngtsc-build-lint)는 Feature 1.1에서 다룸
- 워커를 호출하는 엔진 테스트는 Feature 2.2에서 다룸

**근거:**

- 코드 확인: `*-lint.spec.ts` 3개 파일은 각 빌드 워커의 lint 기능을 테스트하지만, 파일명이 독립 lint 테스트처럼 보임
- 코드 확인: client-worker.spec.ts(907줄), server-build-worker.spec.ts(787줄) 대형 파일 — 분할 또는 정비 필요
- 총 6개 파일, ~2692줄

**Feature 2.1 설계 결정 요약:**
- D1: `*-lint.spec.ts` 명칭 → 현행 유지 (Feature 1.1 패턴 일관성)
- D2: `client-worker.spec.ts` → Legacy 분리 (`client-worker-legacy.spec.ts` 신규 생성)
- D3: `server-build-worker.spec.ts` → 내부 정리 (`describe("production artifacts")` 하위 그룹)
- 추가 발견: 4개 파일에서 `@simplysm/core-common` 모킹이 실제 로직 복제 (sd-testing 위반) → 전체 제거
- 추가 발견: `library-build-worker.spec.ts`만 `vi.resetModules()` 패턴 → top-level await로 통일

#### [x] Feature 2.2 빌드 엔진 테스트

**의존성:** 없음

**범위:**

- `engines/base-engine.spec.ts` (329줄, unit)
- `engines/engine-lint-integration.spec.ts` (181줄, ~~mixed~~ unit): 파일명에 "integration"이지만 실제 전부 vi.mock 기반 unit → base-engine.spec.ts에 편입 (D1)
- `engines/engine-selection.spec.ts` (250줄, unit + architectural): ~~packages/angular 참조 존재 확인 필요~~ → 확인 완료: packages/angular 직접 참조 없음 (sd-cli/src 내부만 읽음). 어댑터 격리 테스트 분리 (D2)
- `engines/ngtsc-engine.spec.ts` (257줄, unit)
- `engines/server-esbuild-engine.spec.ts` (242줄, unit)
- `engines/tsc-engine.spec.ts` (203줄, unit)
- `engines/vite-engine.spec.ts` (678줄, unit): 대형 파일 — 내부 describe 그룹화 (D4)

**경계:**

- 엔진이 내부적으로 사용하는 워커 테스트는 Feature 2.1에서 다룸
- NgtscEngine 소스 로직의 Angular 컴파일 부분은 Feature 1.1에서 다룸

**근거:**

- ~~코드 확인: engine-lint-integration.spec.ts가 vi.mock + 실제 로직 혼재~~ → 정정: 전부 vi.mock 기반 unit. 파일명만 "integration"
- ~~코드 확인: engine-selection.spec.ts에서 packages/angular 참조 여부 확인 필요~~ → 해소: sd-cli/src 내부 파일만 fs.readFileSync로 읽음 (architectural 테스트)
- 코드 확인: base-engine ↔ 개별 엔진(tsc, ngtsc, server-esbuild) 간 stop(), ResultCollector, RebuildManager 보고 중복 발견
- 총 7개 파일, ~2140줄

**Feature 2.2 설계 결정 요약:**
- D1: engine-lint-integration.spec.ts → base-engine.spec.ts에 편입 (lint는 BaseEngine 공유 동작)
- D2: 어댑터 격리 테스트 → engine-adapter-isolation.spec.ts 신규 분리 (unit ↔ architectural 분리)
- D3: BaseEngine 공유 동작 → base-engine에 통합 + 개별 엔진에서 중복 제거
- D4: vite-engine.spec.ts → 내부 describe 하위 그룹화 (Feature 2.1 D3 패턴)
- 추가 발견: afterEach(vi.restoreAllMocks) 2/7 파일에서만 사용 → 전체 제거 통일
- 추가 발견: createMockPkg 시그니처 불일치 → overrides: Partial<T> = {} 패턴 통일

### Epic 3. 오케스트레이션·커맨드 테스트 정비

#### [ ] Feature 3.1 오케스트레이터 테스트

**의존성:** 없음

**범위:**

- `orchestrators/build-orchestrator.spec.ts` (1031줄, unit): 55개 vi.mock — 과잉 모킹 검토, 구조 정비
- `orchestrators/dev-watch-orchestrator.spec.ts` (1585줄, unit): 56개 vi.mock — 과잉 모킹 검토, 분할 또는 정비
- `orchestrators/typecheck-orchestrator.spec.ts` (180줄, unit)

**경계:**

- 오케스트레이터가 호출하는 엔진/워커 테스트는 Epic 2에서 다룸
- check/build/dev 등 CLI 커맨드에서 오케스트레이터 호출하는 부분은 Feature 3.2에서 다룸

**근거:**

- 코드 확인: dev-watch-orchestrator.spec.ts(1585줄, 56개 mock)와 build-orchestrator.spec.ts(1031줄, 55개 mock)가 sd-cli 테스트 중 최대 규모
- 총 3개 파일, ~2796줄

#### [x] Feature 3.2 CLI 커맨드 테스트

**의존성:** 없음

**범위:**

- `commands/check.spec.ts` (431줄, unit)
- `commands/device.spec.ts` (252줄, unit)
- `commands/lint.spec.ts` (82줄, unit)
- `commands/publish.spec.ts` (1227줄, unit): 대형 파일 — 구조 정비
- `commands/typecheck.spec.ts` (842줄, unit): 대형 파일 — 구조 정비
- `sd-cli-entry.spec.ts` (87줄, unit)

**경계:**

- 커맨드가 호출하는 오케스트레이터 테스트는 Feature 3.1에서 다룸
- build, dev, watch 커맨드 테스트 파일은 현재 미존재 — 이번 리팩토링에서 신규 생성 대상 아님

**근거:**

- 코드 확인: 커맨드 테스트는 대부분 unit 유형으로 양호하나 publish.spec.ts(1227줄), typecheck.spec.ts(842줄) 대형
- 코드 확인: check.spec.ts, publish.spec.ts에서 `@simplysm/core-common` 과잉 모킹 (Feature 2.1과 동일 패턴)
- 코드 확인: device.spec.ts만 vi.hoisted 패턴 미사용 (5/6 파일 불일치)
- 코드 확인: sd-cli-entry.spec.ts에서 process.exit/console 직접 재할당 (vi.spyOn 미사용)
- 코드 확인: `commands/typecheck.ts`는 `TypecheckOrchestrator` re-export (10줄). `typecheck-orchestrator.spec.ts`와 중복 없음 확인
- 코드 확인: lint.spec.ts(82줄)는 이미 양호 — 변경 불필요
- 총 6개 파일, ~2921줄

**Feature 3.2 설계 결정 요약:**
- D1: publish.spec.ts → 내부 정비 (이미 양호한 5 Slice 구조 유지, 모킹 제거 + region 정리)
- D2: typecheck.spec.ts → 내부 정비 (단일 함수 테스트, describe 그룹화로 region 전환)
- 추가 발견: check.spec.ts, publish.spec.ts에서 `@simplysm/core-common` 과잉 모킹 → 전체 제거
- 추가 발견: device.spec.ts vi.hoisted 패턴 통일 필요
- 추가 발견: sd-cli-entry.spec.ts process.exit/console monkey-patching → vi.spyOn 전환

### Epic 4. 유틸리티·기타 테스트 정비

#### [x] Feature 4.1 유틸리티 함수 테스트

**의존성:** 없음

**범위:**

- `utils/concurrency.spec.ts` (65줄, unit)
- `utils/copy-src.spec.ts` (150줄, unit)
- `utils/diagnostic-utils.spec.ts` (72줄, unit)
- `utils/engine-stop.spec.ts` (56줄, unit)
- `utils/esbuild-config.spec.ts` (213줄, unit)
- `utils/external-modules.spec.ts` (230줄, unit)
- `utils/generate-pwa-icons.spec.ts` (98줄, unit)
- `utils/lint-core.spec.ts` (188줄, unit)
- `utils/lint-utils.spec.ts` (87줄, unit)
- `utils/lint-with-program.spec.ts` (409줄, unit)
- `utils/orchestrator-utils.spec.ts` (112줄, unit)
- `utils/output-path-rewriter.spec.ts` (233줄, unit)
- `utils/output-utils.spec.ts` (134줄, unit)
- `utils/package-utils.spec.ts` (305줄, unit)
- `utils/rebuild-manager.spec.ts` (46줄, unit)
- `utils/replace-deps.spec.ts` (69줄, unit)
- `utils/sd-config.spec.ts` (81줄, unit)
- `utils/tsc-build.spec.ts` (522줄, unit)
- `utils/tsconfig-angular.spec.ts` (9줄, unit)
- `utils/typecheck-env.spec.ts` (175줄, unit)
- `utils/typecheck-non-package.spec.ts` (120줄, unit)
- `utils/vite-config.spec.ts` (782줄, unit)
- `utils/vite-pwa-plugin.acc.spec.ts` (143줄, integration)
- `utils/vite-pwa-plugin.spec.ts` (350줄, unit): `.acc.spec.ts`와 중복 여부 검토
- `utils/vite-scope-watch-plugin.spec.ts` (180줄, unit)
- `utils/worker-events.spec.ts` (155줄, unit)
- `utils/worker-utils.spec.ts` (112줄, unit)
- `infra/result-collector.spec.ts` (57줄, unit)
- `infra/signal-handler.spec.ts` (21줄, unit)

**경계:**

- Angular 관련 유틸리티(angular-build, angular-compiler, ngtsc-*, scss-compiler)는 Feature 1.1에서 다룸
- 16개 양호 파일은 패턴 확인 수준. 13개 파일에 실질 리팩토링 필요

**근거:**

- 코드 확인: vite-pwa-plugin.spec.ts(19 tests) ↔ .acc.spec.ts(5 tests) 부분 중복 확인 — 중복 2개, .acc 고유 3개(icon)
- 코드 확인: 7개 파일에서 `@simplysm/core-node` pathx 순수 함수(posix, isChildPath, norm)의 로직 복제 모킹 발견
- 코드 확인: 대형 파일 3개(vite-config 782줄, tsc-build 522줄, lint-with-program 409줄)는 describe 재구조화 필요
- 총 29개 파일, ~5173줄

**Feature 4.1 설계 결정 요약:**
- D1: vite-pwa-plugin 통합 → `.spec.ts` 기준 + `.acc.spec.ts` 고유 icon 3개 추가 → `.acc.spec.ts` 삭제
- D2: core-node 모킹 → `importOriginal`로 순수 함수 복원 + I/O만 오버라이드 (utils 영역에 신규 패턴 도입)
- D3: 대형 파일 → 내부 describe 재구조화 (분할 안 함, Feature 2.1 D3 패턴)
- D4: 양호 16개 파일 → vi.mock 사용 파일만 import 패턴 확인, 나머지 현행 유지

#### [x] Feature 4.2 Capacitor·Electron 테스트

**의존성:** 없음

**범위:**

- `capacitor/capacitor-android.spec.ts` (219줄, unit)
- `capacitor/capacitor-build.spec.ts` (497줄, unit): ~~mixed~~ 순수 unit 확인 — pathx mock 제거 + 패턴 통일
- `capacitor/capacitor-icon.spec.ts` (270줄, unit)
- `capacitor/capacitor-init.spec.ts` (778줄, unit): ~~mixed~~ 순수 unit 확인 — pathx mock 제거 + 내부 정리
- `capacitor/capacitor-run.spec.ts` (260줄, unit): ~~mixed~~ 순수 unit 확인 — pathx mock 제거 + 패턴 통일
- `capacitor/capacitor-workspace.spec.ts` (202줄, unit)
- `electron/electron.spec.ts` (633줄, unit)

**경계:**

- Capacitor/Electron의 빌드 엔진 호출 부분은 Epic 2에서 다룸
- device 커맨드 테스트는 Feature 3.2에서 다룸

**근거:**

- ~~코드 확인: capacitor-build, capacitor-init, capacitor-run이 vi.mock + 실제 로직 혼재~~ → 정정: 3개 파일 모두 순수 unit 테스트 (모든 I/O가 vi.mock으로 대체, 실제 파일시스템/프로세스 접근 0건)
- 코드 확인: 7개 파일 모두에서 pathx mock이 실제 구현(core-node/src/utils/path.ts:27-39)과 동일한 로직을 복제 (sd-testing.md 위반)
- 총 7개 파일, ~2859줄

**Feature 4.2 설계 결정 요약:**
- D1: capacitor-init.spec.ts(779줄) → 내부 정리만 (Feature 2.1 server-build-worker 패턴. 모든 테스트 동일 성격)
- D2: Capacitor mock 중복(~70줄×6파일) → 현행 유지 (각 파일 독립. Feature 2.1 일관성)
- 추가 발견: WBS "mixed" 분류 부정확 — 3개 파일 모두 순수 unit. "혼재 분리" 불필요, pathx mock 제거가 실질 작업

## 제외 사항

- **신규 테스트 작성**: 현재 테스트가 없는 커맨드(build, dev, watch)에 대한 신규 테스트 작성은 제외. 사유: 범위 초과, 기존 82개 리팩토링이 선행되어야 함.
- **vitest 설정 변경**: `vitest.config.ts`의 프로젝트 분리 구조는 적절하므로 변경 불필요. 사유: 현재 구조가 node/browser/angular 올바르게 분리.
- **basic-app fixture의 node_modules 자동화**: gitignored node_modules의 설치 자동화는 제외. 사유: 리팩토링 범위 초과, 별도 개선 과제.
- **소스 코드 변경**: 테스트 대상 소스(src/) 수정은 제외. 테스트 코드만 리팩토링. 사유: 목표가 테스트 구조 개선이지 기능 변경이 아님.
- **ngtsc-scss-config 테스트 angular 패키지 이관**: Feature 1.1에서 삭제된 `ngtsc-scss-config.spec.ts`(angular 패키지의 `scss.d.ts` ambient 선언, `package.json` sideEffects 검증)는 `packages/angular/tests/`에 재작성 필요. sd-cli 리팩토링 범위 밖.
