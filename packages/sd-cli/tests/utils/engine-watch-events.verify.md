# setupWatchEvents + BaseEngine/EsbuildClientEngine 적용 — LLM 검증

## 검증 항목

### Slice 1: BaseEngine 적용

- BaseEngine lint 결과 보고 유지: `BaseEngine.ts:148-157` — build 이벤트에서 `event.lint`가 있으면 lint BuildResult를 ResultCollector에 추가. 기존 로직 그대로 유지됨.
- BaseEngine 경고 로깅 유지: `BaseEngine.ts:144-146` — `event.build.warnings`가 있으면 `logger.warn` 호출. 기존 로직 그대로 유지됨.
- setupWatchEvents가 index.ts의 public export에 포함되지 않음: 내부 유틸리티이므로 패키지 외부 API 불변. `engines/index.ts`의 export 목록에 engine-watch-events 없음 확인.
- resolveInitialBuild가 _callStartWatch catch에서 호출됨: `BaseEngine.ts:162-164` — `this._callStartWatch(output).catch(() => { resolveInitialBuild(); })`. 기존의 `isInitialBuild` 가드와 동등한 동작.

### Slice 2: EsbuildClientEngine 적용

- EsbuildClientEngine이 waitForInitialBuild() 미사용: `EsbuildClientEngine.ts:103-111` — setupWatchEvents 호출 후 반환값 사용 안 함. 111행에 "waitForInitialBuild 미사용" 주석 확인.
- serverReady 이벤트 처리 유지: `EsbuildClientEngine.ts:97-101` — serverReady 핸들러가 setupWatchEvents 전에 등록됨. `this.port = event.port` 로직 그대로.
- error 로깅 유지: `EsbuildClientEngine.ts:113-117` — setupWatchEvents 이후 별도 error 핸들러에서 `logger.error` 호출. 기존 동작 보존.
- worker.startWatch() await 패턴 유지: `EsbuildClientEngine.ts:119-130` — 기존과 동일하게 `await this._worker!.startWatch(...)` 로 완료 감지.
