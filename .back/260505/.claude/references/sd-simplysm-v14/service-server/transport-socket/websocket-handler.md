# `WebSocketHandler`

> **읽어야 하는 상황**: WebSocket 메시지 라우팅, 이벤트 브로드캐스트, 인증 메시지 처리 동작을 이해할 때. `ServiceServer`가 내부적으로 사용한다.

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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `addSocket(socket, clientId, clientName, connReq)` | method | `void` | 새 WebSocket 연결을 추가한다. 동일 `clientId`의 이전 연결이 있으면 해제한다 |
| `closeAll()` | method | `void` | 모든 활성 연결을 닫는다 |
| `emit(eventName, infoSelector, data)` | method | `Promise<void>` | `infoSelector`에 매칭되는 클라이언트에 이벤트를 브로드캐스트한다 |

메시지 라우팅 (`processRequest` 내부):

| `message.name` | 처리 |
|-----------------|------|
| `"SvcName.methodName"` (`.` 포함) | `runMethod`로 서비스 메서드 실행 |
| `"evt:add"` | 이벤트 리스너 등록 (`key`, `name`, `info`) |
| `"evt:remove"` | 이벤트 리스너 제거 (`key`) |
| `"evt:gets"` | 전체 소켓의 특정 이벤트 리스너 조회 |
| `"evt:emit"` | 지정된 키 대상 이벤트 발송 |
| `"auth"` | JWT 토큰 검증 후 소켓에 `authTokenPayload` 저장 |

## Related Types

### `createWebSocketHandler`

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

| Param | Type | Description |
|-------|------|-------------|
| `runMethod` | `(def: { serviceName, methodName, params, socket? }) => Promise<unknown>` | 서비스 메서드 실행 콜백 |
| `jwtSecret` | `string \| undefined` | JWT 시크릿. `undefined`이면 `auth` 메시지 처리 시 에러를 던진다 |
