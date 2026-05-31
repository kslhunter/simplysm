# 이벤트 API 타입 안전성 — LLM 검증

## 검증 항목

- EventClient.addListener 시그니처가 `<TEventDef extends ServiceEventDef>(eventDef: TEventDef, info: TEventDef["$info"], cb: ...)` 패턴인지: `event-client.ts` 확인. 이벤트 정의 객체를 첫 인자로 받아 이름·타입을 추론
- 내부에서 이벤트 이름을 `eventDef.eventName` 으로 꺼내 `evt:add`/`evt:gets` 메시지에 넣는지: `event-client.ts` addListener/emit 확인
- ServiceClient.addListener가 EventClient에 올바르게 위임하는지: `service-client.ts` 확인, `addListener(eventDef, info, cb)` → `_eventClient.addListener(eventDef, info, cb)`
- 서버측 `emitEvent`/`getEvent` 도 동일하게 `eventDef` 를 받아 `eventDef.eventName` 으로 내부 핸들러에 전달하는지: `service-server.ts` 확인
- 이름·타입이 정의 객체 단일 소스에서 파생되어, 호출부에서 이름 문자열·`<typeof X>` 제네릭을 중복 지정할 필요가 없는지: 호출부 typecheck 통과 확인
- `SdSharedDataProvider`에서 `client.getEvent(SdSharedDataChangeEvent)` 로 정의 객체를 직접 전달하는 패턴이 typecheck 통과하는지: angular 패키지 typecheck 통과 확인
