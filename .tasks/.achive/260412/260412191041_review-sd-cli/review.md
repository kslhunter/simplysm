# sd-cli 코드 리뷰

## 리뷰 범위

`packages/sd-cli/src/` 전체 (98개 TypeScript 파일)

## 발견된 이슈

---

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/engines/BaseEngine.ts:185-187
title: startWatch 실패 시 에러 정보 없이 silent resolve
description: |
  _callStartWatch().catch(() => { resolveInitialBuild(); }) 패턴에서,
  워커 RPC 호출이 실패해도 에러를 로깅하거나 ResultCollector에 보고하지 않고
  resolveInitialBuild()만 호출한다. 호출자(Orchestrator)는 startWatch()가
  성공한 것으로 인식하며, 실패 원인을 추적할 수 없다.
  setupWatchEvents의 "error" 이벤트는 워커 내부에서 emit하는 에러만 처리하므로,
  RPC 호출 자체의 실패(직렬화 오류, 워커 크래시 등)는 커버되지 않는다.
suggestion: |
  catch 블록에서 에러를 로깅하고 ResultCollector에 보고한 후 resolveInitialBuild()를 호출한다:
  this._callStartWatch(output).catch((err) => {
    logger.error(`[${this._pkg.name}] startWatch 실패:`, errNs.message(err));
    this._resultCollector?.add({ name: this._pkg.name, target: this._getTarget(), type: "build", status: "error", message: errNs.message(err) });
    resolveInitialBuild();
  });
```

---

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/engines/EsbuildClientEngine.ts:135-138
title: 초기 빌드 실패 시 에러 미전파
description: |
  startWatch()에서 worker.startWatch()의 결과가 success=false여도
  에러를 로깅만 하고 예외를 throw하지 않는다.
  호출자(DevOrchestrator)는 await engine.startWatch()가 정상 완료된 것으로 인식한다.
  setupWatchEvents를 통해 ResultCollector에는 보고되지만,
  startWatch() 반환 채널로는 실패 정보가 전달되지 않아 DESIGN-001과 동일한 패턴의 문제이다.
suggestion: |
  BaseEngine.startWatch()와 동일하게, 실패 시 ResultCollector 보고는
  setupWatchEvents에서 이미 처리하므로 일관성 유지. 단, 에러 로깅 시
  logger.error 대신 결과를 반환하거나, 두 엔진의 실패 처리 패턴을 통일한다.
```

---

```
id: DESIGN-003
severity: Medium
category: 설계
location: packages/sd-cli/src/dev-server/hmr-service.ts:94-96
title: HMR 변경 감지가 파일 크기(bytes)만 비교
description: |
  collectOutputs()에서 esbuild metafile의 output.bytes(파일 크기)만 저장하고,
  dispatchHmrMessage()에서 이전/현재 크기를 비교하여 변경 여부를 판단한다.
  파일 내용이 변경되었지만 크기가 동일한 경우(예: "red" → "blu" 같은 동일 길이 문자열 교체)
  HMR이 트리거되지 않아 개발자가 변경을 확인할 수 없다.
suggestion: |
  esbuild의 output.hash 필드를 사용하여 내용 기반 비교로 전환한다.
  또는 content hash를 직접 계산하여 비교한다.
```

---

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/sd-cli/src/orchestrators/TypecheckOrchestrator.ts:265-266
title: ts.DiagnosticCategory 매직 넘버 사용
description: |
  buildDiags.filter((d) => d.category === 1)과 d.category === 0으로
  에러/경고를 필터링한다. 동일 코드베이스의 tsc-build.ts:189-192와
  typecheck-non-package.ts:84-87에서는 ts.DiagnosticCategory.Error,
  ts.DiagnosticCategory.Warning enum을 사용한다.
  값 자체는 정확하지만(Error=1, Warning=0), 매직 넘버는
  가독성과 유지보수성을 저하시키며 코드베이스 내 일관성을 해친다.
suggestion: |
  ts.DiagnosticCategory.Error, ts.DiagnosticCategory.Warning enum을 사용한다.
  단, 이 파일에서는 deserializeDiagnostic()으로 역직렬화한 plain object를 다루므로,
  ts import가 필요하다면 import type { DiagnosticCategory } from "typescript"를 추가한다.
```

---

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:180-182
title: 배열 정리 패턴 불일치
description: |
  shutdown() 내에서 세 배열의 정리 방식이 다르다:
  - this._copySrcWatchers = []       (재할당)
  - this._distDeleteWatchers = []    (재할당)
  - this._watchHookWatchers.length = 0  (길이 리셋)
  동일한 목적(배열 비우기)에 대해 두 가지 다른 패턴을 사용한다.
suggestion: |
  셋 모두 동일한 패턴으로 통일한다. 외부 참조가 없으므로
  = [] 재할당이 적절하다.
```

---

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/sd-cli/src/engines/engine-factory.ts:27
title: resolvedReplaceDeps 파라미터가 dead code
description: |
  createBuildEngine() 함수의 options에 resolvedReplaceDeps 파라미터가 정의되어 있지만,
  함수 내부에서 어떤 엔진에도 전달하지 않는다.
  EsbuildClientEngine 생성 시(38-45행)에는 명시적으로 제외되어 있고,
  Server/Tsc/Ngtsc 엔진 생성 시에는 ...options spread로 전달되지만
  해당 엔진들의 constructor 타입에 포함되지 않아 무시된다.
  호출자(DevOrchestrator)가 이 값을 전달하지만 아무 효과가 없다.
suggestion: |
  파라미터를 제거하고 호출자의 전달 코드도 정리한다.
```

---

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/sd-cli/src/commands/publish/storage-publisher.ts:141
title: SSH 연결 error 이벤트에서 conn.end() 미호출
description: |
  testSshKeyAuth() 함수에서 conn.on("error")에서 resolve(false)만 호출하고
  conn.end()를 호출하지 않는다. ssh2 라이브러리가 error 이벤트 시
  내부적으로 소켓을 정리하지만, 명시적으로 conn.end()를 호출하는 것이
  best practice이며, conn.on("ready") 핸들러(137행)와의 일관성도 맞지 않는다
  (ready에서는 conn.end()를 호출함).
suggestion: |
  conn.on("error", () => { conn.end(); resolve(false); });
```

---

```
id: LOGIC-001
severity: Low
category: 로직
location: packages/sd-cli/src/electron/electron.ts:169
title: esbuild context dispose가 fire-and-forget
description: |
  cleanup 함수 내에서 void ctx.dispose()로 esbuild context를 정리하지만,
  await 없이 resolve()를 즉시 호출한다. dispose()가 완료되기 전에
  프로세스가 종료될 수 있어 esbuild의 임시 파일이나 리소스가 남을 수 있다.
  단, shutdown 시점이므로 실제 영향은 제한적이다.
suggestion: |
  await ctx.dispose() 후 resolve()를 호출한다:
  const cleanup = async () => { ... await ctx.dispose(); resolve(); };
```

---

## 거짓양성 필터링 결과

분석 과정에서 다음 후보 이슈들은 코드 검증 후 거짓양성으로 판단하여 제외했다:

1. **TypecheckOrchestrator DiagnosticCategory 값 역순** — ts.DiagnosticCategory.Error=1, Warning=0이므로 코드의 숫자 값(1, 0)은 정확함. 매직 넘버 사용의 일관성 문제(CONSIST-001)로 재분류
2. **concurrency.ts 경쟁 조건** — JavaScript는 싱글 스레드이므로 `index++`는 이벤트 루프 내에서 원자적. `await` 이전에 동기적으로 증가하므로 중복 실행 불가
3. **ServerRuntimeManager fire-and-forget** — 서버 프로세스는 지속 실행되므로 await하면 안 됨. `.catch()` 핸들러가 에러를 ResultCollector에 보고하는 의도적 설계
4. **DevOrchestrator 타이머 중복 설정** — 표준 디바운스 패턴. 연속 빌드 완료 시 마지막 것만 처리하는 의도적 설계
5. **BaseEngine Worker non-null assertion** — `_createWorker()` 직후 동기적으로 접근하므로 안전
6. **ngtsc-build.worker.ts pipeline race condition** — `pipeline` 변수는 onChange 클로저에 캡처된 로컬 참조이며, `_watchPipeline`이 undefined가 되어도 로컬 참조는 유효
7. **dev-http-server SPA fallback for API** — API 요청은 별도 서버 포트로 라우팅되므로 dev-http-server의 SPA fallback은 클라이언트 앱 전용
8. **Worker cleanup에서 watchLintRunner 미정리** — Worker 종료 시 모든 메모리가 해제되므로 명시적 정리 불필요

## 요약

| Severity | 개수 |
|----------|------|
| Critical | 0    |
| Medium   | 3    |
| Low      | 5    |
| **합계** | **8** |
