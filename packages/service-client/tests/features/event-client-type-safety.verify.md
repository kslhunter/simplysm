# 이벤트 API 타입 안전성 — LLM 검증

## 검증 항목

- [x] EventClient.addListener 시그니처가 `<TEventDef extends ServiceEventDef>(eventName: string, info: TEventDef["$info"], cb: ...)` 패턴인지: `event-client.ts:9-12` 확인, 서비스의 `getService<T>(name: string)` 패턴과 동일 구조
- [x] ServiceClient.addListener가 EventClient에 올바르게 위임하는지: `service-client.ts:133-139` 확인, `addListener<TEventDef>(eventName, info, cb)` → `_eventClient.addListener<TEventDef>(eventName, info, cb)`
- [x] 기존 값 기반 API(`addListener(eventDef, info, cb)`)가 컴파일 에러를 발생시키는지: typecheck 통과 확인. 첫 번째 인자가 `string` 타입이므로 `ServiceEventDef` 객체를 전달하면 타입 에러 발생
- [x] 서버측 `emitEvent` 시그니처도 동일 패턴으로 변경되었는지: `service-server.ts:217-222`, `websocket-handler.ts:31-36` 확인
- [x] `SdSharedDataProvider`에서 `typeof SdSharedDataChangeEvent`로 타입 참조하는 패턴이 typecheck 통과하는지: angular 패키지 typecheck 통과 확인
