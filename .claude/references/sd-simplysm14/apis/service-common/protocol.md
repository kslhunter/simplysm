# @simplysm/service-common — protocol

서버·클라이언트 간 서비스 메시지의 바이너리 인코딩/디코딩과 청크 재조립을 담당하는 프로토콜(V2). 헤더 28바이트(UUID 16 + TotalSize 8 + Index 4) + JSON 본문 구조이며, 3MB 초과 시 300KB 청크로 자동 분할, 단일 메시지 최대 100MB.

## createServiceProtocol / ServiceProtocol

`createServiceProtocol(): ServiceProtocol` — stateful 청크 누적기(`LazyGcMap`)를 내장한 프로토콜 인스턴스 생성. 누적기는 GC 타이머를 가지므로 사용 종료 시 `dispose()` 필수.

`ServiceProtocol` 메서드:

- `encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number }` — 메시지를 `[name, body]` JSON→바이트로 직렬화 후 28바이트 헤더 부착. `SPLIT_MESSAGE_SIZE`(3MB) 이하면 단일 청크, 초과면 `CHUNK_SIZE`(300KB) 단위로 분할해 여러 청크. `MAX_TOTAL_SIZE`(100MB) 초과 시 `ArgumentError` throw. `uuid`=메시지 묶음 식별자(재조립 키).
- `accumulate(bytes: Bytes): ServiceAccumulateResult` — 수신 청크 1개를 uuid별 누적기에 모음(stateful, 재조립 전용). 같은 index 중복 패킷은 무시. JSON 파싱은 하지 않음. 미완성이면 `progress`, 전 청크 도착 시 raw 바이트 담은 `complete` 반환. 헤더 미만(<28B)·크기 초과·무결성 위반(completedSize > totalSize) 시 `ArgumentError` throw.
- `parseMessage(resultBytes: Bytes): ServiceMessage` — 재조립된 raw 바이트를 메시지 객체로 파싱(stateless). 누적 상태에 비의존이라 worker 등 다른 실행 컨텍스트에 위임 가능. 파싱 실패 시 `ArgumentError` throw.
- `decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>` — `accumulate` 후 완료 시 `parseMessage` 까지 수행하는 통합 동작. 가장 일반적인 수신 처리 경로.
- `dispose(): void` — 내부 누적기 GC 타이머 해제·메모리 반환. 인스턴스 폐기 전 반드시 호출.

```ts
const proto = createServiceProtocol();
try {
  const { chunks } = proto.encode(uuid, { name: "auth", body: token });
  for (const c of chunks) send(c);
  const r = proto.decode(recvBytes);
  if (r.type === "complete") handle(r.message);
} finally { proto.dispose(); }
```

`ServiceMessageDecodeResult<TMessage>` (유니언, `type` 판별):
- `{ type: "complete"; uuid; message: TMessage }` — 전 청크 수신, 메시지 재조립·파싱 완료.
- `{ type: "progress"; uuid; totalSize; completedSize }` — 일부 청크만 도착. 진행률 표시용.

`ServiceAccumulateResult` (유니언, `type` 판별):
- `{ type: "complete"; uuid; resultBytes: Bytes }` — 재조립 완료, 파싱 전 raw 바이트.
- `{ type: "progress"; uuid; totalSize; completedSize }` — 진행 중.

주의:
- `dispose()` 누락 시 GC 타이머가 남아 메모리/타이머 누수.
- `EXPIRE_TIME`(60초) 내 모든 청크가 도착하지 않으면 미완성 누적분이 GC 로 폐기됨.
- `parseMessage` 입력은 반드시 `accumulate`/`decode` 의 `complete` 가 준 raw 바이트여야 함.

## PROTOCOL_CONFIG

`as const` 상수. 인코딩 분할·크기 제한·GC 동작 기준값.

- `MAX_TOTAL_SIZE: 100MB` — 단일 메시지 허용 최대 크기. 초과 시 `encode`/`accumulate` throw.
- `SPLIT_MESSAGE_SIZE: 3MB` — 이 값 초과 시 청킹 시작(이하면 단일 청크).
- `CHUNK_SIZE: 300KB` — 분할 청크 1개의 본문 크기.
- `GC_INTERVAL: 10초` — 미완성 누적기 정리 주기.
- `EXPIRE_TIME: 60초` — 미완성 메시지 만료 시간(이후 GC 대상).

## 메시지 타입

방향별 유니언과 개별 메시지 인터페이스. `name` literal 로 판별하는 discriminated union.

분류 유니언:
- `ServiceMessage` — 전체 메시지 집합.
- `ServiceClientMessage` — 클라이언트→서버: request/auth/evt:add/evt:remove/evt:gets/evt:emit.
- `ServiceServerMessage` — 서버→클라이언트: response/error/evt:on.
- `ServiceServerRawMessage` — `ServiceServerMessage` + progress(청크 수신 진행 알림 포함).

개별 메시지(`name` literal → 용도):
- `ServiceProgressMessage` `"progress"` — 서버가 청크 수신 진행 알림. `body: { totalSize, completedSize }`(바이트).
- `ServiceErrorMessage` `"error"` — 서버 에러 알림. `body: { name, message, code, stack?, detail?, cause? }`.
- `ServiceAuthMessage` `"auth"` — 클라이언트 인증. `body: string`(토큰).
- `ServiceRequestMessage` `` `${string}.${string}` `` — 클라이언트 서비스 메서드 호출(`service.method`). `body: unknown[]`(매개변수 배열).
- `ServiceResponseMessage` `"response"` — 서버 응답. `body?: unknown`(결과, 없을 수 있어 optional).
- `ServiceAddEventListenerMessage` `"evt:add"` — 리스너 등록. `body: { key, name, info }` — `key`=리스너 키(uuid, 제거에 필요), `name`=이벤트 이름, `info`=발생 시 필터링용 정보.
- `ServiceRemoveEventListenerMessage` `"evt:remove"` — 리스너 제거. `body: { key }`(리스너 키).
- `ServiceGetEventListenerInfosMessage` `"evt:gets"` — 특정 이벤트 리스너 info 목록 요청. `body: { name }`(이벤트 이름).
- `ServiceEmitEventMessage` `"evt:emit"` — 클라이언트가 이벤트 발생 요청. `body: { keys, data }` — `keys`=대상 리스너 키 목록, `data`=데이터.
- `ServiceEventMessage` `"evt:on"` — 서버가 구독자에게 이벤트 전달. `body: { keys, data }`(리스너 키 목록·데이터).

주의: `name` literal 로 분기해야 타입 좁히기가 동작. body 의 `unknown`/`unknown[]` 은 호출부에서 서비스 시그니처에 맞춰 캐스팅.
