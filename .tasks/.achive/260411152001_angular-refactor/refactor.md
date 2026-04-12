# sd-cli 리팩토링 분석 리포트

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli` |
| 분석 일시 | 2026-04-11 15:20 |
| 소스 파일 수 | ~71개 (`.ts`) |
| 발견 이슈 | 7건 (Critical: 1, Medium: 4, Low: 2) |

---

## 이슈 목록

### STRUCT-001
```
id: STRUCT-001
severity: Critical
category: 구조
location: src/utils/worker-events.ts
title: worker-events.ts의 registerWorkerEventHandlers가 프로덕션 코드에서 미사용 — engine-watch-events.ts와 기능 중복
description:
  worker-events.ts의 registerWorkerEventHandlers()는 프로덕션 코드(src/)에서 단 한 곳도 import하지 않는다.
  테스트(tests/utils/worker-events.spec.ts)에서만 참조된다.
  동일한 역할(buildStart/build/error 이벤트 구독 + ResultCollector/RebuildManager 연동)을
  engine-watch-events.ts의 setupWatchEvents()가 수행하고 있어 기능이 완전히 중복된다.

  두 파일의 차이점:
  - worker-events.ts: results Map에 직접 저장, BuildResult 생성 + 반환
  - engine-watch-events.ts: ResultCollector.add() 호출, initialBuild Promise 관리

  현재 실제 프로덕션 경로(BaseEngine, EsbuildClientEngine)는 모두 engine-watch-events.ts를 사용한다.
  worker-events.ts는 이전 구현의 잔재(dead code)로, 두 파일의 공존이 이벤트 처리 방식에 대한
  혼란을 유발한다.
suggestion:
  worker-events.ts에서 registerWorkerEventHandlers()와 관련 타입(BaseWorkerInfo, WorkerEventHandlerOptions)을
  삭제하고, 이벤트 데이터 타입(BuildEventData, ErrorEventData, ServerReadyEventData 등)만 남긴다.
  테스트(worker-events.spec.ts)도 삭제하거나 engine-watch-events.spec.ts로 통합한다.
```

### DESIGN-001
```
id: DESIGN-001
severity: Medium
category: 설계
location: src/orchestrators/BuildOrchestrator.ts, src/orchestrators/TypecheckOrchestrator.ts
title: Orchestrator 계층 불일치 — BuildOrchestrator/TypecheckOrchestrator가 BaseOrchestrator를 사용하지 않음
description:
  WatchOrchestrator와 DevOrchestrator는 BaseOrchestrator를 상속하여 공통 초기화
  (sd.config.ts 로드, pathMap 구축, replaceDeps 감시, ResultCollector/SignalHandler/RebuildManager 생성)를
  공유한다. 그러나 BuildOrchestrator와 TypecheckOrchestrator는 독립 클래스로 구현되어 있다.

  이로 인한 문제:
  1. BuildOrchestrator는 loadAndValidateConfig(orchestrator-utils.ts)를 사용하고,
     TypecheckOrchestrator는 loadSdConfig를 직접 호출 — 두 가지 config 로드 경로가 존재
  2. 생명주기 패턴(initialize→start→shutdown)은 동일하나 인터페이스로 강제되지 않아
     호출부(commands/*.ts)에서 각 Orchestrator의 메서드 시그니처가 다름
  3. cwd 결정 방식이 다름: BaseOrchestrator는 생성자에서 process.cwd(),
     BuildOrchestrator도 생성자에서 process.cwd(), TypecheckOrchestrator도 동일하지만
     공통화되지 않음

  다만, BuildOrchestrator와 TypecheckOrchestrator는 일회성 실행이므로
  SignalHandler, ResultCollector, RebuildManager, replaceDeps 감시가 불필요하다.
  BaseOrchestrator의 추상 메서드(_initializeMode, _initializeEngines, _shutdownMode)도
  일회성 Orchestrator에는 과도한 생명주기이다.
  따라서 현재 분리는 의도된 설계일 가능성이 높다.
suggestion:
  완전한 상속 통합보다는, 공통 인터페이스(OrchestratorLifecycle)를 정의하여
  모든 Orchestrator가 동일한 생명주기 계약을 따르도록 한다:
  ```typescript
  interface OrchestratorLifecycle {
    initialize(): Promise<void>;
    start(): Promise<...>;  // 반환 타입은 제네릭 또는 void
    shutdown(): Promise<void>;
  }
  ```
  config 로드 유틸리티도 loadAndValidateConfig() 하나로 통일한다
  (현재 TypecheckOrchestrator만 loadSdConfig를 직접 호출).
```

### DESIGN-002
```
id: DESIGN-002
severity: Medium
category: 설계
location: src/commands/publish/index.ts (638 lines)
title: publish 명령어가 단일 파일에 5개 이상의 독립적 책임을 포함
description:
  runPublish() 함수 하나에 다음 책임이 혼재되어 있다:
  1. sd.config.ts 로드 및 대상 패키지 필터링
  2. 버전 업그레이드 (upgradeVersion): semver bump + package.json/pnpm-lock 업데이트 +
     워크스페이스 내부 의존성 버전 동기화
  3. 빌드 실행 위임 (runBuild 호출)
  4. 패키지별 배포 라우팅 (publishPackage): npm/local/storage 분기
  5. 배포 레벨 계산 (computePublishLevels): 의존성 그래프 기반 배포 순서 결정
  6. postPublish 스크립트 실행
  7. 환경변수 치환 (replaceEnvVariables)

  638 라인이 단일 파일에 있어 변경 시 파급 범위가 넓다.
  특히 upgradeVersion()은 git/npm과 무관한 순수 버전 로직이므로 별도 모듈로 분리 가능하다.
suggestion:
  다음과 같이 분리한다:
  - `publish/version-upgrade.ts`: upgradeVersion(), computePublishLevels()
  - `publish/env-utils.ts`: replaceEnvVariables(), waitWithCountdown()
  - `publish/index.ts`: runPublish() 오케스트레이션만 남김 (~200 LOC 이하)
```

### DESIGN-003
```
id: DESIGN-003
severity: Medium
category: 설계
location: src/orchestrators/BuildOrchestrator.ts:260-432
title: BuildOrchestrator의 _addBuildPackageTasks/_addServerPackageTasks/_addClientPackageTasks 간 코드 중복
description:
  세 메서드(_addBuildPackageTasks, _addServerPackageTasks, _addClientPackageTasks)가 거의 동일한 구조를 반복한다:
  1. for 루프로 패키지 순회
  2. pkgDir 계산
  3. createBuildEngine() 호출
  4. engine.run() 실행
  5. diagnostics 역직렬화
  6. results에 push
  7. engine.stop()

  차이점은 BuildOutput 인자({js, dts, lint}), env 병합 여부, copySrc/네이티브 빌드 후처리뿐이다.
  3개 메서드 합계 ~170 LOC 중 ~100 LOC가 동일 패턴의 반복이다.
suggestion:
  공통 빌드 실행 로직을 private 메서드로 추출한다:
  ```typescript
  private async _runEngineTask(
    name: string, config: SdPackageConfig, output: BuildOutput,
    engineOptions: ..., fileCache: Map<string, string>,
  ): Promise<BuildStepResult>
  ```
  각 _add*Tasks 메서드는 이 공통 메서드를 호출하고, 후처리(copySrc, 네이티브 빌드)만 추가한다.
```

### DESIGN-004
```
id: DESIGN-004
severity: Medium
category: 설계
location: src/utils/angular-compiler.ts (623 lines)
title: AngularCompiler 클래스가 AOT 컴파일 + 증분 재컴파일 + HMR 후보 수집을 단일 클래스에서 담당
description:
  AngularCompiler 클래스는 다음 책임을 가진다:
  1. NgtscProgram 생성 및 관리 (AOT 컴파일)
  2. TypeScript Host 구성 (Angular 확장)
  3. 증분 재컴파일 (update() 메서드)
  4. emit (코드 생성)
  5. HMR 후보 수집 (collectHmrCandidates 호출)
  6. AngularSourceFileCache 관리

  특히 HMR 관련 로직(update 시 modifiedFiles 추적, HMR_MODIFIED_FILE_LIMIT 체크,
  hmrCandidates 반환)이 AOT 컴파일 책임과 밀접하게 결합되어 있다.
  그러나 HMR은 Vite dev server(client.worker.ts → sdAngularPlugin)에서만 사용되고,
  프로덕션 빌드(ngtsc-build.worker.ts)에서는 사용하지 않는다.
suggestion:
  HMR 후보 수집 로직을 AngularCompiler에서 분리하여 sdAngularPlugin 내부 또는
  별도 래퍼(AngularHmrCompiler)로 이동한다. AngularCompiler는 순수 AOT 컴파일만 담당하도록 한다.
  이렇게 하면 ngtsc-build.worker에서 사용하는 AngularCompiler에 HMR 관련 불필요한 코드가 포함되지 않는다.
```

### STRUCT-002
```
id: STRUCT-002
severity: Low
category: 구조
location: src/utils/ (27개 파일)
title: utils/ 디렉토리에 27개 파일이 평면적으로 배치되어 있어 관련 파일 식별이 어려움
description:
  utils/ 디렉토리에 27개 파일이 하위 그룹 없이 평면적으로 존재한다.
  파일명 접두사로 그룹을 유추할 수 있으나(angular-*, esbuild-*, hmr-*, lint-*, typecheck-*,
  replace-deps-*, worker-*, output-*), 실제 디렉토리 구조로 반영되지 않아
  관련 파일을 탐색할 때 인지 부하가 발생한다.

  그러나 현재 배럴 export 금지 규칙이 있어 하위 폴더로 그룹화하면
  import 경로가 길어지는 단점도 있다.
suggestion:
  파일명 접두사가 3개 이상 반복되는 그룹만 선택적으로 하위 디렉토리로 이동한다:
  - `utils/angular/`: angular-compiler.ts, angular-build.ts, angular-build-pipeline.ts
  - `utils/esbuild/`: esbuild-config.ts, esbuild-client-config.ts, esbuild-index-html.ts, esbuild-pwa.ts, esbuild-scss-plugin.ts
  - `utils/lint/`: lint-core.ts, lint-with-program.ts, lint-utils.ts
  단, 프로젝트의 배럴 export 금지 규칙에 따라 index.ts는 만들지 않고
  개별 파일을 직접 import한다.
```

### ARCH-001
```
id: ARCH-001
severity: Low
category: 아키텍처
location: src/orchestrators/BuildOrchestrator.ts, src/orchestrators/TypecheckOrchestrator.ts
title: sd.config.ts 로드 경로가 Orchestrator마다 다르게 구현되어 있음
description:
  config 로드 방식이 3가지 경로로 분산되어 있다:
  1. BaseOrchestrator.initialize(): loadSdConfig() + validateTargets() 직접 호출
  2. BuildOrchestrator.initialize(): loadAndValidateConfig(orchestrator-utils.ts) 호출
  3. TypecheckOrchestrator.initialize(): loadSdConfig() 직접 호출 + validateTargets 미사용
     (대신 extractTargetPackageNames로 자체 필터링)

  이는 config 로드 로직 변경 시 3곳을 모두 확인해야 하는 유지보수 부담을 만든다.
  TypecheckOrchestrator가 validateTargets를 호출하지 않는 것은
  경로 기반 대상(packages/core-common, tests/orm)을 지원하기 위한 의도적 차이이다.
suggestion:
  config 로드를 공통 유틸로 통합하되, TypecheckOrchestrator의 경로 기반 대상 지원은 유지한다.
  loadAndValidateConfig()에 선택적 validation 전략을 추가하거나,
  모든 Orchestrator가 동일한 loadSdConfig() 호출 후 각자의 대상 검증을 수행하도록 한다.
```

---

## 요약

| Severity | 건수 | 주요 이슈 |
|----------|------|-----------|
| Critical | 1 | worker-events.ts 미사용 코드 + engine-watch-events.ts 중복 |
| Medium | 4 | Orchestrator 계층 불일치, publish 파일 비대화, BuildOrchestrator 코드 중복, AngularCompiler 과책임 |
| Low | 2 | utils/ 평면 구조, config 로드 경로 분산 |

**참고**: capacitor.ts(618 LOC)와 server-build.worker.ts(516 LOC)도 대형 파일이지만,
capacitor.ts는 플랫폼 특화 코드로 이미 `capacitor/` 하위에 4개 파일로 분리되어 있고,
server-build.worker.ts는 워커 특성상 단일 진입점에서 빌드 파이프라인을 실행해야 하므로
현재 크기가 구조적 문제를 일으키지는 않는 것으로 판단하여 보고 대상에서 제외했다.
