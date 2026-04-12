# sd-cli 리팩토링 분석 리포트

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/` (71개 TypeScript 소스 파일) |
| 분석 일시 | 2026-04-11 13:09 |
| 총 파일 수 | 71 |
| 발견 이슈 | 9건 (Critical: 2, Medium: 5, Low: 2) |

---

## Critical

### DESIGN-001: DevWatchOrchestrator 책임 과다 (God Class 경계)

- **severity**: Critical
- **category**: 설계
- **location**: `src/orchestrators/DevWatchOrchestrator.ts`
- **title**: watch/dev 두 모드의 상태와 로직이 단일 클래스에 혼재

**description**:
DevWatchOrchestrator는 595줄, 25개 이상의 필드, 10개 이상의 메서드를 가진다. watch 모드와 dev 모드가 하나의 클래스에 공존하며, 각 모드가 사용하는 상태가 다르다:

- watch 전용: `_libraryEngines`, `_watchHookPackages`, `_copySrcWatchers`, `_distDeleteWatchers`
- dev 전용: `_serverEngines`, `_clientEngines`, `_serverRuntimeWorkers`, `_printServersTimer`, `_serverRestartTimer`

이로 인해 한 모드를 수정할 때 다른 모드의 상태와 충돌 가능성을 항상 고려해야 하며, 새 기능 추가 시 파급 범위가 넓다. 서버 런타임 관리(`_startServerRuntime`, `_restartServers`)도 오케스트레이터 내부에 포함되어 있어 책임이 5가지 이상이다.

**suggestion**:
watch/dev 오케스트레이터를 분리하고, 서버 런타임 관리를 별도 클래스로 추출한다:

```
DevWatchOrchestrator (현재 595줄) →
  WatchOrchestrator (~250줄): 라이브러리 watch + copySrc 감시 + watch hook
  DevOrchestrator (~250줄): 서버/클라이언트 엔진 + 배치 완료 처리
  ServerRuntimeManager (~100줄): 서버 런타임 워커 시작/재시작/종료
```

공통 초기화 로직(sd.config 로드, replaceDeps)은 공유 유틸 또는 기반 클래스로 추출한다.

---

### STRUCT-001: publish.ts 단일 파일 비대화 (850줄)

- **severity**: Critical
- **category**: 구조
- **location**: `src/commands/publish.ts`
- **title**: 버전 관리, Git 조작, 배포 실행이 하나의 파일에 집중

**description**:
`publish.ts`는 850줄로 sd-cli 전체에서 가장 큰 파일이다. 다음 책임들이 하나의 파일에 혼재한다:

1. 버전 관리 (semver bump, 대화형 선택)
2. Git 조작 (commit, tag, push)
3. npm 배포
4. SFTP/FTP 배포 (SSH 공개키 등록 포함)
5. 로컬 디렉토리 배포
6. 의존성 레벨별 순차 처리

한 배포 방식을 수정할 때 다른 배포 로직에 영향을 줄 수 있으며, 테스트 작성이 어렵다.

**suggestion**:
배포 전략별로 파일을 분할한다:

```
commands/publish/
  publish.ts         (진입점 + 버전/Git 오케스트레이션, ~200줄)
  npm-publisher.ts   (npm publish 로직)
  storage-publisher.ts (FTP/SFTP/FTPS 배포 + SSH 키 등록)
  local-publisher.ts (로컬 디렉토리 복사)
```

---

## Medium

### STRUCT-002: replace-deps.ts 단일 파일 비대화 (410줄)

- **severity**: Medium
- **category**: 구조
- **location**: `src/utils/replace-deps.ts`
- **title**: 4가지 독립 기능이 하나의 파일에 집중

**description**:
`replace-deps.ts`(410줄)는 다음 4가지 기능을 포함한다:

1. `resolveReplaceDepEntries` - 패턴 매칭으로 교체 대상 결정
2. `resolveAllReplaceDepEntries` - 전체 워크스페이스 해석 (85줄 단일 함수)
3. `setupReplaceDeps` - 초기 심링크 설정
4. `watchReplaceDeps` - 파일 변경 감시

이 중 해석/설정/감시는 독립적으로 테스트 가능하며, 하나의 기능 수정 시 나머지에 대한 영향도 파악이 어렵다.

**suggestion**:
기능 단위로 분리한다. 최소한 `resolveReplaceDepEntries`(해석 로직)와 `setupReplaceDeps`+`watchReplaceDeps`(실행 로직)를 분리하면 테스트성이 개선된다.

---

### STRUCT-003: package-utils.ts 이중 책임 (397줄)

- **severity**: Medium
- **category**: 구조
- **location**: `src/utils/package-utils.ts`
- **title**: 패키지 분류와 의존성 수집이 하나의 파일에 혼재

**description**:
`package-utils.ts`(397줄)는 두 가지 독립 책임을 가진다:

1. 패키지 분류 (~270줄): `classifyWatchPackages`, `classifyDevPackages`, `filterPackagesByTargets`
2. 의존성 수집 (~127줄): `collectDeps`, `resolveWorkspaceDeps`

분류와 의존성 수집은 서로 다른 소비자(오케스트레이터 vs 엔진)가 사용하며, 변경 이유도 다르다.

**suggestion**:
패키지 분류(`package-classifier.ts`)와 의존성 수집(`dependency-collector.ts`)로 분리한다.

---

### DESIGN-002: Orchestrator start() 메서드 과대

- **severity**: Medium
- **category**: 설계
- **location**: `src/orchestrators/BuildOrchestrator.ts:start()`, `src/orchestrators/TypecheckOrchestrator.ts:start()`
- **title**: start() 메서드가 245줄/175줄로 내부 분해 부족

**description**:
`BuildOrchestrator.start()`는 245줄, `TypecheckOrchestrator.start()`는 175줄이다. 두 메서드 모두 빌드 태스크 생성, 실행, 결과 집계, 포맷 출력까지 한 메서드에서 수행한다. 특히 `BuildOrchestrator.start()`의 빌드 태스크 생성 로직은 ~170줄로, 패키지 유형별(build/server/client) 처리가 순차적으로 나열되어 있다.

메서드가 길어 로직 흐름 파악이 어렵고, 특정 단계만 수정할 때 전체 메서드를 이해해야 한다.

**suggestion**:
내부 private 메서드로 단계별 분해한다:

```typescript
// BuildOrchestrator
private _createBuildTasks(): BuildTask[]
private _executeBuildTasks(tasks: BuildTask[]): Promise<EngineResult[]>
private _aggregateAndPrintResults(results: EngineResult[]): boolean

// TypecheckOrchestrator
private _executePackageTypecheck(): Promise<EngineResult[]>
private _aggregateResults(results: EngineResult[]): { errors: number; warnings: number }
```

---

### DESIGN-003: BaseEngine과 EsbuildClientEngine 간 이벤트 처리 중복

- **severity**: Medium
- **category**: 설계
- **location**: `src/engines/BaseEngine.ts:startWatch()`, `src/engines/EsbuildClientEngine.ts:startWatch()`
- **title**: build/error 이벤트 처리 로직이 ~30줄 중복

**description**:
`BaseEngine.startWatch()`(~100줄)과 `EsbuildClientEngine.startWatch()`(~75줄)에서 build/error 이벤트 처리 패턴이 유사하다:

- `buildStart` → `rebuildManager.registerBuild()` 호출
- `build` → `resultCollector.add()` + `resolver()` + 초기 빌드 완료 처리
- `error` → `resultCollector.add()` + `resolver()` + 초기 빌드 완료 처리

`EsbuildClientEngine`은 `serverReady` 이벤트와 `port` 관리 때문에 `BaseEngine`을 상속하지 않는 것은 타당하나, 공통 이벤트 처리 로직의 중복은 유지보수 시 한쪽만 수정하는 실수를 유발할 수 있다.

**suggestion**:
이벤트 처리 헬퍼 함수를 추출한다:

```typescript
// utils/engine-event-handlers.ts
function setupCommonBuildEvents(
  worker: WorkerProxy,
  resultCollector: ResultCollector,
  rebuildManager: RebuildManager,
  engineInfo: { name: string; target: string },
): { waitForInitialBuild: () => Promise<void> }
```

두 엔진 모두 이 헬퍼를 사용하되, `EsbuildClientEngine`은 `serverReady` 이벤트만 추가로 처리한다.

---

### DESIGN-004: Capacitor 클래스 비대화 (796줄)

- **severity**: Medium
- **category**: 설계
- **location**: `src/capacitor/capacitor.ts`
- **title**: 초기화, 실행, 빌드, 아이콘 생성이 단일 클래스에 집중

**description**:
`Capacitor` 클래스(796줄)는 프로젝트 초기화(package.json 설정, cap init, 플랫폼 추가), 아이콘 생성(Sharp), 개발 실행(adb reverse), 프로덕션 빌드(Gradle, 서명 설정) 등 다수의 책임을 가진다. 현재 Android만 지원하지만, iOS 지원 추가 시 클래스가 더 비대해질 수 있다.

**suggestion**:
빌드/서명 관련 로직을 별도로 추출한다:

```
capacitor/
  capacitor.ts              (초기화 + 실행 오케스트레이션, ~400줄)
  capacitor-android.ts      (기존 Android 설정)
  capacitor-build.ts (new)  (Gradle 빌드 + 서명 + 출력 복사, ~200줄)
  capacitor-icon.ts (new)   (Sharp 아이콘 생성, ~100줄)
```

---

## Low

### ARCH-001: TypecheckOrchestrator의 client→browser 변환

- **severity**: Low
- **category**: 아키텍처
- **location**: `src/orchestrators/TypecheckOrchestrator.ts`
- **title**: 엔진 팩토리 책임에 해당하는 target 변환이 오케스트레이터에 존재

**description**:
`TypecheckOrchestrator`에서 타입체크 시 `target: "client"`를 `target: "browser"`로 변환하여 `createBuildEngine()`에 전달한다. 이는 `EsbuildClientEngine` 대신 `NgtscEngine`으로 라우팅하기 위한 것인데, 이 변환 로직은 엔진 선택의 책임이므로 엔진 팩토리(`engines/index.ts`)에 있는 것이 자연스럽다.

현재는 오케스트레이터가 엔진 선택 로직의 일부를 알아야 하므로, 팩토리 내부 변경 시 오케스트레이터도 함께 수정해야 할 수 있다.

**suggestion**:
`createBuildEngine()`에 `typecheckOnly` 옵션을 추가하여 팩토리 내부에서 client→browser 변환을 처리한다. 또는 `createTypecheckEngine()` 팩토리 함수를 별도로 제공한다.

---

### STRUCT-004: infra 디렉토리 네이밍 vs 실제 범위 불일치

- **severity**: Low
- **category**: 구조
- **location**: `src/infra/`
- **title**: "infra"라는 광범위한 이름에 2개 파일(87줄)만 존재

**description**:
`infra/` 디렉토리에는 `ResultCollector.ts`(45줄)와 `SignalHandler.ts`(42줄) 2개 파일만 있다. "infra"는 일반적으로 파일 I/O, 캐싱, Worker 통신 등 광범위한 인프라를 의미하지만, 실제로는 오케스트레이터 지원 유틸리티 2개뿐이다. 다른 인프라 성격의 코드(Worker 유틸, 캐시 관리 등)는 `utils/`에 분산되어 있어 디렉토리명이 실제 범위를 정확히 반영하지 못한다.

**suggestion**:
현재 규모에서는 큰 문제가 아니나, 향후 확장 시 `infra/`에 추가할 코드의 기준이 모호해질 수 있다. 디렉토리명을 `orchestration/`이나 `runtime/`으로 변경하거나, 현재 상태를 유지하되 코드가 추가될 때 기준을 명확히 한다.

---

## 분석 요약

### 강점

- **명확한 계층 분리**: Command → Orchestrator → Engine → Worker 단방향 의존
- **순환 참조 없음**: 전체 모듈 간 순환 의존성 미발견
- **BuildEngine 인터페이스**: 5개 엔진을 통일된 계약으로 추상화
- **BaseEngine 템플릿 메서드**: 3개 엔진의 공통 생명주기를 효과적으로 추출
- **Worker Thread 격리**: CPU 집약적 빌드를 메인 프로세스에서 분리

### 이슈 분포

| Severity | 건수 | 카테고리 |
|----------|------|----------|
| Critical | 2 | 설계 1, 구조 1 |
| Medium | 5 | 설계 3, 구조 2 |
| Low | 2 | 아키텍처 1, 구조 1 |
| **합계** | **9** | |
