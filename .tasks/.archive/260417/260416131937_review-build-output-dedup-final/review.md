# 코드 리뷰: build-output-dedup-final

## CONSIST-001 [Low] 초기 빌드 에러 join 구분자가 후속 빌드와 불일치

- **위치:** `packages/sd-cli/src/engines/EsbuildClientEngine.ts:134`

EsbuildClientEngine의 초기 빌드 실패 시 에러 메시지를 `"; "`로 join하지만, engine-watch-events.ts(후속 빌드 경로)에서는 `"\n"`으로 join한다.

- `EsbuildClientEngine.ts:134`: `result.errors?.join("; ")` — 초기 빌드
- `engine-watch-events.ts:70`: `info.errors?.join("\n")` — 후속 빌드

`printDiagnostics`의 `formatBuildMessages`는 `message.split("\n")`으로 각 줄을 `→` 접두어 행으로 변환한다. `"\n"` join이면 에러마다 별도 행으로 표시되고, `"; "` join이면 모든 에러가 한 행에 합쳐진다. 동일 패키지의 초기/후속 빌드에서 에러 표시 형식이 달라진다.

**개선 방향:** `EsbuildClientEngine.ts:134`의 join 구분자를 `"\n"`으로 통일

---

## LOGIC-001 [Low] client.worker catch 경로에서 초기 빌드 에러가 이중 보고됨

- **위치:** `packages/sd-cli/src/workers/client.worker.ts:317-323`

client.worker.ts의 onEnd catch 블록은 초기 빌드 중 예외 발생 시:
1. `sender.send("error", { message })` → setupWatchEvents error handler → `ResultCollector.add()`
2. `initialBuildResolve?.({ success: false, errors: [message] })` → EsbuildClientEngine.startWatch → `ResultCollector.add()`

동일 키(`name:build`)에 두 번 쓰므로 Map 덮어쓰기로 최종 상태는 정확하지만, 비동기 타이밍에 따라 어느 쪽이 최종 상태가 될지 비결정적이다. 현재는 두 결과의 내용이 동일하여 실질적 문제는 없지만, 향후 한쪽만 수정될 경우 불일치 가능성이 있다.

**개선 방향:** catch 블록에서 `sender.send("error")`를 초기 빌드가 아닌 경우에만 전송(`if (!isInitialBuild) sender.send(...)`) — 초기 빌드는 `initialBuildResolve` 경로만 사용

---

## LOGIC-002 [Low] client.worker catch 경로에서 esbuild warnings 유실

- **위치:** `packages/sd-cli/src/workers/client.worker.ts:322`

onEnd 콜백의 try 블록 내에서 esbuild 빌드가 성공(warnings 포함)했으나 후처리(index.html 기록, HMR 등)에서 예외가 발생한 경우, catch 블록의 `initialBuildResolve`는 `errors: [message]`만 전달하고 `result.warnings`는 포함하지 않는다.

정상 경로(line 302-316)에서는 `result.warnings`를 포함하여 전달하므로, catch 경로에서만 warnings가 유실된다. esbuild 빌드 자체는 성공했지만 후처리 실패로 에러 보고될 때 동시에 발생한 경고를 놓치게 된다.

매우 제한적인 에지케이스이지만 정상 경로와의 일관성이 깨진다.

**개선 방향:** catch 블록에서 `result`가 접근 가능한 경우 `warnings` 필드를 포함하여 resolve

---

## DESIGN-001 [Low] setupWatchEvents의 isInitialBuild 상태가 EsbuildClientEngine에서 사실상 미사용

- **위치:** `packages/sd-cli/src/engines/EsbuildClientEngine.ts:104-111`

EsbuildClientEngine은 `setupWatchEvents`의 `waitForInitialBuild`/`resolveInitialBuild`를 사용하지 않는다(line 111 주석). client.worker는 초기 빌드에 "build" 이벤트를 발행하지 않으므로(`client.worker.ts:288: if (!isInitialBuild)`), setupWatchEvents 내부의 `isInitialBuild` 플래그는 첫 번째 **후속** 빌드가 올 때까지 `true`로 남는다.

첫 후속 빌드 시 `initialBuildResolve?.()` 호출이 발생하지만 아무도 대기하지 않아 무해하다. 그러나 setupWatchEvents의 의미론과 실제 동작 사이에 괴리가 있어, 코드 읽기 시 혼동을 줄 수 있다.

**개선 방향:** EsbuildClientEngine에서 setupWatchEvents 호출 직후 `resolveInitialBuild()`를 명시적으로 호출하여 상태를 정리하거나, 주석으로 의도를 더 명확히 기술

---

## DESIGN-002 [Medium] engine-watch-events의 warnings 경로에 대한 테스트 부재

- **위치:** `packages/sd-cli/tests/utils/engine-watch-events.acc.spec.ts`

Feature 1.1 요구명세에 "worker가 warnings 포함 build 이벤트를 전송" / "worker가 warnings 없는 build 이벤트를 전송" 시나리오가 정의되어 있으나, `engine-watch-events.acc.spec.ts`에는 warnings를 검증하는 테스트가 하나도 없다.

현재 테스트는 errors 저장(`build 실패 시 에러 메시지가 포함된다`)과 success 저장만 검증하며, warnings 필드가 `BuildResult`에 올바르게 저장되는지 검증하지 않는다. 이는 engine-watch-events.ts:71-73의 warnings join 로직이 테스트되지 않음을 의미한다.

**개선 방향:** 다음 시나리오에 대한 테스트 추가:
- build 이벤트 `{ success: true, warnings: ["warn1"] }` → `result.warnings === "warn1"` 확인
- build 이벤트 `{ success: true }` (warnings 없음) → `result.warnings === undefined` 확인
- build 이벤트 `{ success: false, errors: [...], warnings: ["warn1"] }` → 에러와 경고 모두 저장 확인

---

## DESIGN-003 [Medium] EsbuildClientEngine 초기 빌드 warnings 전달에 대한 테스트 부재

- **위치:** `packages/sd-cli/tests/engines/esbuild-client-engine.spec.ts`

Feature 2.1 요구명세에 "초기 빌드 성공 + warnings → ResultCollector에 저장", "초기 빌드 실패 + warnings → ResultCollector에 에러와 경고 모두 저장", "초기 빌드 성공 + warnings 없음 → ResultCollector 저장 안 함" 시나리오가 정의되어 있으나, 해당 테스트 파일에는 `startWatch()`의 warnings 관련 테스트가 없다.

현재 `startWatch()` 테스트는 실패 시 reject하지 않는 것(line 274)과 성공 시 에러 로깅이 없는 것(line 289)만 검증한다. `run()`에 대해서는 warnings 테스트(line 130-150)가 존재하여 불균형하다.

`EsbuildClientEngine.ts:129-151`의 초기 빌드 warnings → ResultCollector 저장 로직은 Feature 2.1의 핵심 구현이지만 테스트로 보호되지 않는다.

**개선 방향:** 다음 시나리오에 대한 테스트 추가:
- `startWatch` 결과 `{ success: true, warnings: ["w1"] }` → ResultCollector에 status "success", warnings "w1" 저장 확인
- `startWatch` 결과 `{ success: false, errors: ["e1"], warnings: ["w1"] }` → ResultCollector에 status "error", message + warnings 모두 저장 확인
- `startWatch` 결과 `{ success: true }` (warnings 없음) → ResultCollector에 추가 저장 없음 확인
