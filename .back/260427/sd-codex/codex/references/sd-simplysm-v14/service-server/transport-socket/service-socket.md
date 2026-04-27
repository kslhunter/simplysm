# `ServiceSocket`

> **읽어야 하는 상황**: WebSocket 연결 추상화를 참조할 때. `ServiceContext.socket`의 타입이다. 소켓별 상태 관리(이벤트 리스너, 인증 토큰)를 이해할 때.

프로토콜 인코딩/디코딩, ping/pong 연결 유지, 이벤트 리스너 추적이 포함된 단일 WebSocket 연결 인터페이스.

```typescript
interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  close(): void;
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;
  addListener(key: string, eventName: string, info: unknown): void;
  removeListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
  filterEventTargetKeys(targetKeys: string[]): string[];
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connectedAtDateTime` | property | `DateTime` | 연결 시점의 DateTime 객체 |
| `clientName` | property | `string` | 클라이언트 앱 이름 |
| `connReq` | property | `FastifyRequest` | 연결 시점의 Fastify 요청 객체 |
| `authTokenPayload` | property | `AuthTokenPayload` (optional) | WebSocket `auth` 메시지로 검증된 토큰 페이로드 |
| `close()` | method | `void` | WebSocket 연결을 종료한다 (`socket.terminate()`) |
| `send(uuid, msg)` | method | `Promise<number>` | 메시지를 프로토콜 인코딩하여 전송한다. 전송된 바이트 수를 반환한다. 소켓이 닫혀있으면 0을 반환한다 |
| `addListener(key, eventName, info)` | method | `void` | key/name/info로 이벤트 리스너를 등록한다 |
| `removeListener(key)` | method | `void` | key로 이벤트 리스너를 제거한다 |
| `getEventListeners(eventName)` | method | `Array<{ key: string; info: unknown }>` | 특정 이벤트 이름에 해당하는 모든 리스너의 배열을 반환한다 |
| `filterEventTargetKeys(targetKeys)` | method | `string[]` | 이 소켓의 리스너에 존재하는 대상 키만 필터링하여 반환한다 |
| `on(event, handler)` | method | `void` | `"error"`, `"close"`, `"message"` 이벤트 핸들러를 등록한다 |

ping/pong: 5초 간격으로 ping을 전송하고, 클라이언트의 `0x01` 바이트(ping) 수신 시 `0x02` 바이트(pong)를 응답한다. pong 미수신 시 연결을 종료한다.

프로토콜 메시지 처리: `createServerProtocolWrapper`를 사용하여 메시지를 인코딩/디코딩한다. 수신 메시지의 디코딩 결과가 `"progress"` 타입이면 진행률 메시지를 클라이언트에 전송한다.

## Related Types

### `createServiceSocket`

`ServiceSocket` 인스턴스를 생성한다.

```typescript
function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

| Param | Type | Description |
|-------|------|-------------|
| `socket` | `WebSocket` | 기저 WebSocket 인스턴스 (`ws` 라이브러리) |
| `clientId` | `string` | 클라이언트 고유 식별자 |
| `clientName` | `string` | 클라이언트 앱 이름 |
| `connReq` | `FastifyRequest` | 연결 시점의 Fastify 요청 객체 |
