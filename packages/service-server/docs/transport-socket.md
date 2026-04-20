# Transport - Socket

## `WebSocketHandler`

다중 WebSocket 연결을 관리하고, 메시지를 서비스로 라우팅하며, 이벤트 브로드캐스팅을 처리하는 인터페이스.

```typescript
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  emit<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `addSocket(socket, clientId, clientName, connReq)` | 새 WebSocket 연결을 추가한다. 동일 `clientId`의 이전 연결이 있으면 해제한다 |
| `closeAll()` | 모든 활성 연결을 닫는다 |
| `emit(eventName, infoSelector, data)` | `eventName`에 해당하는 이벤트 리스너 중 `infoSelector`에 매칭되는 클라이언트에 이벤트를 브로드캐스트한다. 제네릭 `TEventDef`로 타입 안전성 보장 |

메시지 라우팅 (`processRequest` 내부):

| `message.name` | 처리 |
|-----------------|------|
| `"SvcName.methodName"` (`.` 포함) | `runMethod`로 서비스 메서드 실행 |
| `"evt:add"` | 이벤트 리스너 등록 (`key`, `name`, `info`) |
| `"evt:remove"` | 이벤트 리스너 제거 (`key`) |
| `"evt:gets"` | 전체 소켓의 특정 이벤트 리스너 조회 |
| `"evt:emit"` | 지정된 키 대상 이벤트 발송 |
| `"auth"` | JWT 토큰 검증 후 소켓에 `authTokenPayload` 저장 |

## `createWebSocketHandler`

`WebSocketHandler` 인스턴스를 생성한다.

```typescript
function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `runMethod` | `(def: { serviceName, methodName, params, socket? }) => Promise<unknown>` | 서비스 메서드 실행 콜백 |
| `jwtSecret` | `string \| undefined` | JWT 시크릿. `undefined`이면 `auth` 메시지 처리 시 에러를 던진다 |

## `ServiceSocket`

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

| Member | Type | Description |
|--------|------|-------------|
| `connectedAtDateTime` | `DateTime` | 연결 시점의 DateTime 객체 |
| `clientName` | `string` | 클라이언트 앱 이름 |
| `connReq` | `FastifyRequest` | 연결 시점의 Fastify 요청 객체 |
| `authTokenPayload` | `AuthTokenPayload` (optional) | WebSocket `auth` 메시지로 검증된 토큰 페이로드 |

| Method | Description |
|--------|-------------|
| `close()` | WebSocket 연결을 종료한다 (`socket.terminate()`) |
| `send(uuid, msg)` | 메시지를 프로토콜 인코딩하여 전송한다. 전송된 바이트 수를 반환한다. 소켓이 닫혀있으면 0을 반환한다 |
| `addListener(key, eventName, info)` | key/name/info로 이벤트 리스너를 등록한다 |
| `removeListener(key)` | key로 이벤트 리스너를 제거한다 |
| `getEventListeners(eventName)` | 특정 이벤트 이름에 해당하는 모든 리스너의 `{ key, info }` 배열을 반환한다 |
| `filterEventTargetKeys(targetKeys)` | 이 소켓의 리스너에 존재하는 대상 키만 필터링하여 반환한다 |
| `on(event, handler)` | `"error"`, `"close"`, `"message"` 이벤트 핸들러를 등록한다 |

ping/pong: 5초 간격으로 ping을 전송하고, 클라이언트의 `0x01` 바이트(ping) 수신 시 `0x02` 바이트(pong)를 응답한다. pong 미수신 시 연결을 종료한다.

프로토콜 메시지 처리: `createServerProtocolWrapper`를 사용하여 메시지를 인코딩/디코딩한다. 수신 메시지의 디코딩 결과가 `"progress"` 타입이면 진행률 메시지를 클라이언트에 전송한다.

## `createServiceSocket`

`ServiceSocket` 인스턴스를 생성한다.

```typescript
function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` | 기저 WebSocket 인스턴스 (`ws` 라이브러리) |
| `clientId` | `string` | 클라이언트 고유 식별자 |
| `clientName` | `string` | 클라이언트 앱 이름 |
| `connReq` | `FastifyRequest` | 연결 시점의 Fastify 요청 객체 |
