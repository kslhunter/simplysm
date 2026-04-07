# 코드 리뷰: sd-cli dev 명령

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli/src/` — dev 명령 파이프라인 (orchestrator, engines, workers, utils) |
| 분석 일시 | 2026-04-07 |
| 분석 파일 수 | 18개 |
| 발견 이슈 | 7건 (Critical: 0, Medium: 4, Low: 3) |

---

## Medium

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/workers/server-build.worker.ts:434-443
title: esbuild 컨텍스트 생성 실패 시 disposed 컨텍스트 참조
description: |
  파일 추가/삭제 시 esbuild 컨텍스트를 재생성하는 로직에서, 새 컨텍스트 생성이
  실패하면 esbuildContext가 이전(disposed된) 컨텍스트를 계속 참조한다.
  
  흐름:
  1. oldContext = esbuildContext (이전 값 X)
  2. esbuildContext = await createEsbuildWatchContext(...) → 예외 발생 → 할당 안 됨
  3. esbuildContext는 여전히 X
  4. finally에서 oldContext(= X).dispose() 호출
  5. 이후 esbuildContext(= X, disposed 상태)가 남음
  
  결과: 이후 단순 파일 변경(add/remove가 아닌)마다 esbuildContext.rebuild()가
  실패하여 반복 에러 발생. 파일 추가/삭제가 발생해야 자가 복구된다.
suggestion: |
  try 블록 안에서 새 컨텍스트를 임시 변수에 먼저 할당하고,
  성공 시에만 esbuildContext를 갱신한다. 실패 시 esbuildContext = undefined로 설정하여
  이후 rebuildAll에서 esbuild를 건너뛰도록 한다.
  ```typescript
  const oldContext = esbuildContext;
  esbuildContext = undefined; // 실패 시 안전한 상태
  try {
    if (info.output.js) {
      esbuildContext = await createEsbuildWatchContext(info, newEntryPoints, newExternal);
    }
  } finally {
    if (oldContext != null) {
      await oldContext.dispose();
    }
  }
  ```
```

### DESIGN-001

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:239-277
title: shutdown()에서 타이머 미정리
description: |
  _printServersTimer와 _serverRestartTimer가 shutdown()에서 clearTimeout되지 않는다.
  
  문제 시나리오: 서버 리빌드 직후 Ctrl+C를 누르면
  1. _onDevBatchComplete에서 _serverRestartTimer(100ms) 등록
  2. shutdown() 호출 → 모든 엔진/워커 종료
  3. 100ms 후 타이머 콜백 실행 → _restartServers() 호출
  4. 이미 종료된 상태에서 새 Worker 생성 시도 → 예기치 않은 동작
suggestion: |
  shutdown() 상단에 타이머 정리 추가:
  ```typescript
  if (this._printServersTimer != null) {
    clearTimeout(this._printServersTimer);
    this._printServersTimer = undefined;
  }
  if (this._serverRestartTimer != null) {
    clearTimeout(this._serverRestartTimer);
    this._serverRestartTimer = undefined;
  }
  ```
```

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:92-216
title: initialize() 실패 시 replaceDepWatcher 미해제
description: |
  initialize()에서 watchReplaceDeps() 이후(line 121) _hasPackages = true(line 153) 이전에
  예외가 발생하면, shutdown()이 _hasPackages 체크(line 242)로 조기 반환하여
  _replaceDepWatcher.dispose()가 호출되지 않는다.
  
  영향을 받는 구간(line 122~152): getVersion, filterPackagesByTargets,
  classifyDevPackages, 엔진 생성 루프 등에서 예외 가능.
suggestion: |
  shutdown()에서 _replaceDepWatcher 해제를 _hasPackages 체크 밖으로 이동하거나,
  initialize()에 try-catch를 추가하여 실패 시 _replaceDepWatcher를 직접 해제한다.
  ```typescript
  async shutdown(): Promise<void> {
    // replaceDepWatcher는 항상 정리 (initialize 부분 실패 대응)
    this._replaceDepWatcher?.dispose();
    
    if (!this._hasPackages) return;
    // ... 기존 로직 ...
  }
  ```
```

### CONSIST-001

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/sd-cli/src/engines/ViteEngine.ts:113 / packages/sd-cli/src/engines/BaseEngine.ts:131
title: RebuildManager workerKey 네이밍 패턴 불일치
description: |
  BaseEngine과 ViteEngine이 RebuildManager에 등록하는 키 형식이 다르다:
  - BaseEngine: "${name}:build" (예: "my-server:build")
  - ViteEngine: "vite:${name}" (예: "vite:my-client")
  
  DevWatchOrchestrator._onDevBatchComplete(line 459)에서
  서버 빌드 키를 `${p.name}:build` 패턴으로 매칭하는데,
  이 로직이 ViteEngine의 키 형식에 암묵적으로 의존한다.
  두 엔진의 키 형식이 다르기 때문에 기능상 문제는 없으나,
  키 형식 변경 시 다른 쪽의 매칭 로직이 깨질 수 있는 암묵적 결합이다.
suggestion: |
  workerKey를 통일된 형식으로 변경한다 (예: "${name}:build").
  서버 리빌드 감지는 키 형식이 아닌 명시적 타입 정보로 판별한다.
  예: RebuildManager.registerBuild에 metadata(target 등)를 추가하고,
  batchComplete 이벤트에서 metadata 기반으로 필터링.
```

---

## Low

### DESIGN-003

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/sd-cli/src/engines/ViteEngine.ts:100-192 / packages/sd-cli/src/engines/BaseEngine.ts:123-208
title: ViteEngine과 BaseEngine 간 이벤트 핸들링 코드 중복
description: |
  ViteEngine.startWatch()와 BaseEngine.startWatch() 모두 동일한 패턴으로
  buildStart/build/error 이벤트를 처리한다:
  - buildStart → rebuildManager.registerBuild()
  - build → resultCollector.add(buildResult) + lint 결과 처리 + resolver 호출
  - error → resultCollector.add(errorResult) + resolver 호출
  
  ViteEngine이 BaseEngine을 상속하지 않는 것은 serverReady/scopeRebuild 등
  생명주기 차이 때문에 정당하나, 위 3개 이벤트의 처리 로직은 거의 동일하다.
suggestion: |
  공통 이벤트 핸들링 로직을 유틸 함수로 추출하여 양쪽에서 호출한다.
  (참고: worker-events.ts에 registerWorkerEventHandlers가 이미 존재하나,
  ResultCollector가 아닌 raw Map을 사용하는 구 패턴이므로 별도 정리 필요)
```

### DESIGN-004

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/sd-cli/src/infra/ResultCollector.ts:42
title: ResultCollector.toMap()이 내부 Map 참조를 직접 반환
description: |
  toMap()이 내부 _results Map의 참조를 직접 반환한다.
  외부 코드(printErrors, printServers, _onDevBatchComplete 등)가
  Map을 순회만 하고 있어 현재는 문제없으나,
  실수로 delete/set을 호출하면 내부 상태가 오염된다.
suggestion: |
  ReadonlyMap을 반환 타입으로 지정하여 컴파일 타임에 변경을 방지한다:
  ```typescript
  toMap(): ReadonlyMap<string, BuildResult> {
    return this._results;
  }
  ```
```

### PERF-001

```
id: PERF-001
severity: Low
category: 성능
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:398-413
title: 독립 클라이언트 감지 시 serverClientsMap 반복 순회
description: |
  _startDevMode에서 독립 클라이언트를 찾기 위해 각 클라이언트마다
  serverClientsMap.values()를 순회하여 includes() 확인한다.
  동일한 패턴이 line 440-443에서도 반복된다.
  패키지 수가 적으면 영향 없으나, O(clients × servers × connectedClients) 복잡도.
suggestion: |
  서버에 연결된 클라이언트 Set을 한 번만 구성하고 재사용한다:
  ```typescript
  const serverConnectedClients = new Set(
    [...this._serverClientsMap.values()].flat()
  );
  // 이후 serverConnectedClients.has(name)으로 O(1) 조회
  ```
```
