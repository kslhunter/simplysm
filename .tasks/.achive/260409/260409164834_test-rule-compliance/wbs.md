# WBS: sd-testing.md 규칙 전면 준수

## 프로젝트 개요

- **배경:** 프로젝트 전체 테스트를 sd-testing.md 규칙 기준으로 리뷰한 결과, sd-cli 패키지에서 vi.mock() 남발(~130+건), 로직 복제 mock, 구현 결합 검증 등 다수 위반 발견
- **환경:** pnpm 모노레포, vitest 테스트 프레임워크
- **전제조건:** 기존 테스트가 모두 통과하는 상태에서 시작
- **기술적 제약:** 네트워크/파일시스템/외부프로세스/하드웨어 관련 mock은 유지 필요 (sd-testing.md "물리적으로 돌아갈 수 없는 것만 mock")

## Impact Mapping

- **Goal:** 리팩토링 시 동작이 동일하면 테스트가 깨지지 않는 내성 있는 테스트 스위트 확보
  - **Actor:** 개발자
    - **Impact:** 안심하고 리팩토링할 수 있다
      - **Deliverable:** sd-testing.md 규칙 100% 준수 테스트 코드

## Feature Breakdown

### Epic 1. sd-cli Orchestrator 테스트 정비

#### [x] Feature 1.1 dev-watch-orchestrator 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/orchestrators/dev-watch-orchestrator.spec.ts` (vi.mock 16개 → 10개)
- 로직 복제 mock 제거: `@simplysm/core-common` err.message (원본 동일), `buildPathMapFromConfig` (원본 100% 동일)
- 순수 함수 mock 제거: `filterPackagesByTargets`, `validateTargets` (순수 함수, I/O 없음)
- 순수 클래스 mock → 실제 전환: `ResultCollector` (순수 Map 기반), `RebuildManager` (EventEmitter + 로거만 의존)
- 혼합 모듈 개선: `output-utils` vi.mock → importOriginal + printErrors/printServers 스텁
- `build-env` getVersion vi.mock 유지 (파일 I/O, vi.spyOn 전환 불필요 — ESM 환경에서 반환값 제어 필요)
- 구현 결합 검증 → 동작 결과 검증 전환: createBuildEngine 호출횟수/인자 → mockBuildEngines 배열 결과
- engine mock 조정: options.resultCollector/rebuildManager 활용하여 실제 인프라와 상호작용
- 불필요한 mock 제거 후에도 테스트가 동일 시나리오를 커버하는지 검증

**경계:**

- 네트워크/Worker/child_process/파일시스템 mock은 유지 (물리적 필수)
- Capacitor/Electron mock은 유지 (네이티브 툴체인 필수)
- loadSdConfig, watchReplaceDeps, watchCopySrcFiles, SignalHandler mock은 유지

**근거:**

- 리뷰 결과: 16개 mock 중 6개 제거/개선 가능 (로직 복제 2개, 순수 함수 2개, 순수 클래스 2개)
- `output-utils` printErrors/printServers는 로직 복제가 아닌 vi.fn() 스텁 → importOriginal 개선이 적절
- `getVersion`은 파일 I/O(fs.readFile)이므로 vi.mock 유지가 적절 (vi.spyOn 전환 불필요)
- `ResultCollector`, `RebuildManager` 모두 물리적으로 실행 가능 → 실제 전환 결정

**구현계획:** [1.1-dev-watch-orchestrator-test-cleanup.md](./1.1-dev-watch-orchestrator-test-cleanup.md)

#### [ ] Feature 1.2 build-orchestrator 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/orchestrators/build-orchestrator.spec.ts` (vi.mock 12개)
- 로직 복제 mock 제거: `formatBuildMessages` (원본과 동일 로직), `deserializeDiagnostic` (항등함수)
- vi.mock() → vi.spyOn() 전환: `runLintInWorker`, `copySrcFiles`
- 구현 결합 검증 → 동작 결과 검증: engine.run() 호출 검증 → 빌드 결과물 검증
- `typecheck-orchestrator.spec.ts`도 동일 패턴이면 함께 수정

**경계:**

- Worker/파일시스템/Capacitor/Electron mock은 유지

**근거:**

- 리뷰 결과: formatBuildMessages가 원본과 동일한 포맷팅 로직 복제, deserializeDiagnostic이 항등함수

### Epic 2. sd-cli Worker 테스트 정비

#### [x] Feature 2.1 server-build-worker + server-build-lint 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/workers/server-build-worker.spec.ts` (vi.mock 9개, 33 tests)
- `packages/sd-cli/tests/workers/server-build-lint.spec.ts` (vi.mock 12개, 2 tests)
- ~~vi.mock() → vi.spyOn() 전환~~ → vi.mock 유지 + 구현 결합 검증 제거 (대상 함수가 파일시스템 접근으로 vi.spyOn 불가)
- 혼합 모듈 importOriginal 전환: worker-utils(createOnceGuard 실제 유지), esbuild-config(createServerEsbuildOptions 실제 유지)
- 구현 결합 검증 제거: 14건 테스트 삭제 + 4건 assertion 수정 (33 → 19 tests)
- server-build-lint: LintWithProgramRunner 생성자 인자 검증 제거 → lint 결과 검증

**경계:**

- esbuild, @simplysm/core-node Worker, fs mock은 유지

**근거:**

- 리뷰 결과: 5개 모듈이 호출만 확인하면서 vi.mock으로 전체 교체, 구현 결합 검증 18건+
- 기술 분석: 대상 함수(parseTsconfig, runTscPackageBuild 등)가 파일시스템 접근하여 vi.spyOn 불가 → vi.mock 유지 + 검증 제거로 방향 수정

**Feature 문서:** [2.1-server-build-worker-lint-test.md](./2.1-server-build-worker-lint-test.md)

#### [x] Feature 2.2.1 ngtsc-build-lint 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/workers/ngtsc-build-lint.spec.ts` (vi.mock 9개)
- 로직 복제 mock 제거: `typecheck-serialization` (항등함수 `(d) => d`), `angular-compiler` (빈 Map 반환), `package-utils` (`collectDeps` build에서 미호출)
- `tsconfig`: `vi.mock()` + `importOriginal`로 `parseTsconfig`만 stub (vi.spyOn 대신 — sd-testing.md "혼합 모듈은 importOriginal로 실제 구현을 최대한 살린다")
- 구현 결합 검증 제거: 생성자 인자 검증(L133-134), 메서드 인자 검증(L137-139), 호출 여부 검증(L153) → `result.lint` 값 검증

**경계:**

- Worker (`@simplysm/core-node` createWorker), `angular-build-pipeline`, `ngtsc-build-core`, `worker-utils`, `lint-with-program` mock은 유지

**근거:**

- 리뷰 결과: 4개 mock이 불필요한 로직 복제, 생성자/호출 인자 구현 결합 검증 3건
- SPIDR 분리: 원래 Feature 2.2에서 Path 축으로 파일별 분리
- 설계 결정: tsconfig은 vi.spyOn 대신 importOriginal 사용 (D1), angular-compiler import chain 수용 (D2), package-utils 완전 제거 (D3)

**Feature 문서:** [2.2.1-ngtsc-build-lint-test-cleanup.md](./2.2.1-ngtsc-build-lint-test-cleanup.md)

#### [x] Feature 2.2.2 library-build-lint 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/workers/library-build-lint.spec.ts` (vi.mock 6개)
- vi.mock() → vi.spyOn() 전환: `tsc-build` (runTscPackageBuild)
- 구현 결합 검증 제거: `MockLintWithProgramRunner` 생성자 인자 검증(L83-86), `mockLintFn` 호출 인자 검증(L87-89), `mockLintFn` not.toHaveBeenCalled()(L104) → `result.lint` 결과 검증
- 설계 결정 D1: L104 `not.toHaveBeenCalled()`도 함께 제거 (result.lint === undefined로 이미 검증 완료)

**경계:**

- Worker (`@simplysm/core-node` createWorker), `worker-utils`, `lint-with-program`, `package-utils` mock은 유지

**근거:**

- 리뷰 결과: 생성자/호출 인자 구현 결합 검증 2건, tsc-build vi.mock → vi.spyOn 전환 가능
- SPIDR 분리: 원래 Feature 2.2에서 Path 축으로 파일별 분리

#### [x] Feature 2.2.3 library-build-worker 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/workers/library-build-worker.spec.ts` (vi.mock 5개)
- vi.mock() → vi.spyOn() 전환: `tsc-build` (runTscPackageBuild), `package-utils` (collectDeps)
- 구현 결합 검증 제거: `mockRunTscPackageBuild` 호출 인자 검증 7건(build: L96-98, L106-108, L116-118, L148-150, L160-162 / startWatch: L210-212, L277-279), `mockCollectDeps` 인자 검증 1건(L249) → 결과 검증. 검증 제거 후 의미를 잃는 5개 테스트(env 전달 3개, esbuild 불필요 1개, collectDeps 인자 1개)는 삭제 (D1 결정)

**경계:**

- Worker (`@simplysm/core-node` createWorker/FsWatcher), `worker-utils` mock은 유지

**근거:**

- 리뷰 결과: mock 호출 인자 검증 7건으로 구현 결합 심각, tsc-build/package-utils vi.mock → vi.spyOn 전환 가능
- SPIDR 분리: 원래 Feature 2.2에서 Path 축으로 파일별 분리

#### [x] Feature 2.3 client-worker + client-worker-legacy + server-runtime-worker 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/workers/client-worker.spec.ts` (vi.mock 8개)
- `packages/sd-cli/tests/workers/client-worker-legacy.spec.ts` (vi.mock 8개)
- `packages/sd-cli/tests/workers/server-runtime-worker.spec.ts` (vi.mock 4개)
- 구현 결합 검증 → 동작 결과 검증: mock 호출 여부/인자/횟수 검증 → sender.send 이벤트/반환값/HTTP 응답 검증
- 콜백 캡처 패턴 개선: client-worker는 유지(이미 반환값 기반), client-worker-legacy는 mock.calls 직접 접근 제거 → capturedOnBuild 자동 호출로 전환

**경계:**

- vite, node:fs, Worker, net, @fastify/http-proxy, worker-utils mock은 유지
- server-runtime의 mockRegister(프록시 등록) 검증은 유지 (Fastify mock에서 유일한 방법)

**근거:**

- 리뷰 결과: mock 호출 인자 검증, 콜백 캡처로 구현에 강하게 결합
- 설계 결정: .dev-port 검증→serverReady 이벤트 대체 (D1), legacyModule 분기 mock 호출 제거 (D2), 콜백 패턴 유지·검증만 개선 (D3), mockRegister 유지 (D4), worker-utils mock 유지 (D5)

**Feature 문서:** [2.3-client-server-worker-test-overhaul.md](./2.3-client-server-worker-test-overhaul.md)

### Epic 3. sd-cli Command 테스트 정비

#### [x] Feature 3.1 publish + check + typecheck Command 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/commands/publish.spec.ts` (vi.mock 10개)
- `packages/sd-cli/tests/commands/check.spec.ts` (vi.mock 6개)
- `packages/sd-cli/tests/commands/typecheck.spec.ts` (vi.mock 6개)
- publish: 내부 함수(runBuild) 인자 검증 → 배포 결과(getExecaCalls) 기반 전환. 외부 사이드이펙트 검증은 유지
- check: mock 호출 여부/인자 검증 ~18건 → stdout 섹션 존재/부재 + exitCode 기반 전환
- typecheck: createBuildEngine 호출 횟수/인자, engine.run/stop 검증 ~25건 → result 객체 기반 전환. env-based task creation 블록 삭제

**경계:**

- 네트워크(SSH/SFTP), 빌드, 파일시스템, CompilerHost, Worker mock은 유지
- 프로덕션 코드 구조 변경 없음 (필요한 순수 함수가 이미 추출되어 있음)

**설계 결정:**

- D1: publish — 외부 사이드이펙트(getExecaCalls, fsx.write) 유지, 내부 함수 인자(runBuild targets) 검증만 전환
- D2: check — target resolution 인자 검증 제거. discoverWorkspacePackages가 package-utils.spec.ts에서 이미 단위 테스트됨
- D3: typecheck — 엔진 생성 횟수/인자 검증 제거. toTypecheckEnvs()가 typecheck-env.spec.ts에서 이미 단위 테스트됨

**근거:**

- 리뷰 결과: publish에서 mock.calls 직접 검사 다수, check에서 함수 호출 여부로 라우팅 검증
- 코드 분석: toTypecheckEnvs (tsconfig.ts:72-76), discoverWorkspacePackages (package-utils.ts)가 이미 별도 순수 함수로 추출 및 테스트 완료

**Feature 문서:** [3.1-publish-check-typecheck-command-test.md](./3.1-publish-check-typecheck-command-test.md)

#### [x] Feature 3.2 lint + device + sd-cli-entry Command 테스트 정비

**의존성:** 없음

**범위:**

- `packages/sd-cli/tests/commands/lint.spec.ts` (vi.mock 1개) — 이미 sd-testing.md 준수, 변경 불필요
- `packages/sd-cli/tests/commands/device.spec.ts` (vi.mock 5개) — Capacitor/Electron/loadSdConfig vi.mock → vi.spyOn 전환, node:fs/node:http mock 유지
- `packages/sd-cli/tests/sd-cli-entry.spec.ts` (vi.mock 6개) — ESM 정적 import로 vi.spyOn 불가 → vi.mock 유지, 잘못된 테스트 수정
- sd-cli-entry: "does not include device command" 테스트 삭제 (device IS registered), "includes expected commands" 커맨드 목록 및 검증 수정

**경계:**

- 외부 프로세스(capacitor/electron) mock은 유지
- lint.spec.ts 변경 없음 (이미 준수)
- sd-cli-entry.spec.ts의 vi.mock 6개 유지 (ESM 제약)

**근거:**

- 리뷰 결과: sd-cli-entry가 6개 모듈 전체 mock
- 설계 분석: device.spec.ts 호출 검증은 void 오케스트레이션에서 유일한 동작 확인 방법 → vi.spyOn 유지
- 코드 확인: COMMAND_NAMES에 "device" 포함, lint/typecheck/init은 별도 커맨드 아님

**Feature 문서:** `3.2-lint-device-sd-cli-entry-command-test-cleanup.md`

### Epic 4. sd-cli Utils/Angular/Engine 테스트 정비

#### [x] Feature 4.1 Utils 테스트 정비

**의존성:** 없음

**범위:**

- `vite-config.spec.ts` (8 mocks) — plugin factory 인자 검증 → config.plugins 반환값 검증으로 전환
- `lint-core.spec.ts` (3 mocks), `lint-utils.spec.ts` (1 mock), `lint-with-program.spec.ts` (2 mocks + 1 spy) — LintResult 반환값 검증 전환
- `external-modules.spec.ts` (2 mocks) — fs/module mock 사이드이펙트 검증 유지
- `vite-pwa-plugin.spec.ts` (2 mocks), `vite-scope-watch-plugin.spec.ts` (2 mocks) — 사이드이펙트 검증 유지
- `generate-pwa-icons.spec.ts` (1 mock), `copy-src.spec.ts` (1 mock), `esbuild-config.spec.ts` (1 mock) — void 함수 사이드이펙트 검증 유지
- `ngtsc-build-core.spec.ts` (3 mocks) — 구현 결합 0%, 변경 불필요
- `angular-compiler.spec.ts` (1 mock), `angular-compiler-emit.spec.ts` (1 mock) — constructor spy/호출 횟수 검증 제거
- `angular-source-file-cache.spec.ts` (1 mock) — getSourceFile 호출 검증 → 캐시 결과 검증
- `orchestrator-utils.spec.ts` (2 mocks, 70% 결합) — loadAndValidateConfig 반환값 검증 전환
- `typecheck-non-package.spec.ts` (3 mocks, 65% 결합) — NonPackageTypecheckResult 반환값 검증 전환
- `sd-config.spec.ts` (2 mocks, 10% 결합) — 최소 정비 (1건)

**경계:**

- sharp, eslint, vite, FsWatcher, Worker, fs/module 등 I/O 경계 mock은 모두 유지
- serializeDiagnostic mock 유지 (실제 구현은 항등함수가 아님, D2 결정)
- vi.mock() → vi.spyOn() 전환 대상 거의 없음 (대부분 I/O 경계)

**설계 결정:**

- D1: I/O 경계 mock 인자 검증은 사이드이펙트 검증으로 허용. 호출 횟수 검증은 제거. 반환값 검증 가능 시 반환값 우선.
- D2: serializeDiagnostic mock 유지. 실제 구현은 `ts.flattenDiagnosticMessageText()` 호출하는 변환 함수 (항등함수 아님).

**근거:**

- 코드 분석: 17개 파일 전수 분석 결과, 구현 결합 비율 0%~70% 분포
- 리뷰 결과: vite-config.spec.ts가 mock 인자 검증 남발

**Feature 문서:** `4.1-utils-test-compliance.md`

#### [x] Feature 4.2 Angular Plugin + Engine + Capacitor/Electron 테스트 정비

**의존성:** 없음

**범위:**

- Angular plugin 테스트 7개 (각 0-2 mocks): sd-config mock 6개 + @angular/build/private mock 1개. 12개 중 5개는 이미 clean (mock 0개)
- Engine 테스트 6개 (각 1-2 mocks): Worker.create mock 정비 — build/startWatch 인자 검증 → EngineResult/ResultCollector 결과 검증 전환이 핵심
- Capacitor 테스트 6개 (각 1-6 mocks): core-node(fsx/cpx), node:fs, sharp mock — mock.calls 내용 검증 위주로 이미 양호, 불필요한 단순 호출 검증만 제거
- Electron 테스트 1개 (2 mocks): core-node, esbuild mock — mock.calls 내용 검증 위주로 이미 양호
- Engine 테스트가 가장 큰 변경 (~60건 이상 mock 인자/횟수 검증 제거 + EngineResult 검증 추가)

**경계:**

- Worker.create, sharp, esbuild, cpx.spawn 등 물리적 필수 mock은 유지
- sd-config mock 유지 (D1), fsx mock 유지 (D2)
- Angular Plugin callback(onBuild/onBuildStart) 검증 유지 (동작 검증)
- mock.calls 파일 내용 검증 유지 (mock 유지 시 유일한 결과 검증 수단)

**설계 결정:**

- D1: sd-config mock 유지 — loadSdConfig은 SUT가 아닌 config 제공자, fixture 기반 대비 테스트별 override 유연성 우수
- D2: fsx mock 유지 + 검증 패턴 정비 — cpx.spawn mock과 혼합 구조 회피, mock.calls 내용 검증 유지하면서 불필요한 호출 횟수 검증만 제거

**근거:**

- 코드 분석: Engine 5개 파일에서 Worker.create.toHaveBeenCalledTimes + build.toHaveBeenCalledWith + on.toHaveBeenCalledWith 패턴이 반복
- 코드 확인: Engine run()은 EngineResult를 반환하므로 인자 검증 → 결과 검증 전환 가능 (BaseEngine.ts:111-117, ViteEngine.ts:65-91)
- Capacitor/Electron은 mock.calls 내용 검증이 대부분이라 정비 범위 경미

**Feature 문서:** [4.2-angular-engine-capacitor-electron-test.md](./4.2-angular-engine-capacitor-electron-test.md)

### Epic 5. 기타 패키지 테스트 정비

#### [x] Feature 5.1 core-node cp.acc.spec.ts 수정

**의존성:** 없음

**범위:**

- `packages/core-node/tests/utils/cp.acc.spec.ts` — `.acc.spec.ts`(acceptance test)이면서 `child_process` 전체를 mock하는 모순 수정
- **결정:** mock 전면 제거, 진정한 acceptance test로 전환 (.acc.spec.ts 유지)
  - Windows 테스트: 실제 시스템 인코딩 감지 검증 (알려진 인코딩 목록 포함 확인)
  - Linux/fallback 테스트: process.platform + env 조작으로 유지 (non-win32 경로는 execSync 미호출)
  - CP949 고정 검증은 `cp.spec.ts`의 `codePageToEncoding(949)` 유닛 테스트가 커버

**경계:**

- 다른 core-node 테스트(fs-watcher-recovery, fs-watcher-error)는 이미 양호

**근거:**

- 리뷰 결과: 파일명이 acceptance test인데 핵심 모듈을 전체 mock → 이름과 의도 불일치
- sd-testing.md 원칙 + 동일 디렉토리 `.acc.spec.ts` 컨벤션 (exec, spawn, spawn-sync 모두 mock 없음)

## 제외 사항

- `packages/storage/tests/*` — 네트워크 I/O mock으로 적절, 수정 불필요 (리뷰에서 양호 판정)
- `packages/angular/tests/*` — vi.spyOn() 중심으로 모범적, 수정 불필요 (리뷰에서 모범 판정)
- `packages/core-common/tests/*` — mock 없음, 수정 불필요
- `packages/core-browser/tests/*` — vi.spyOn() 중심으로 모범적, 수정 불필요
- `packages/excel/tests/*` — 양호, 수정 불필요
- `packages/service-server/tests/*` — DB mock 적절, 수정 불필요
- `packages/core-node/tests/utils/fs-watcher-*.spec.ts` — chokidar mock 적절, 수정 불필요
