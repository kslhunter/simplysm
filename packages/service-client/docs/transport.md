# Transport

## `SocketProviderEvents`

`SocketProvider`에서 발생하는 이벤트 타입 맵.

```typescript
export interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
```

| Event | Type | Description |
|-------|------|-------------|
| `message` | `Bytes` | 서버로부터 바이너리 메시지 수신 |
| `state` | `"connected" \| "closed" \| "reconnecting"` | 연결 상태 변경 |

## `SocketProvider`

WebSocket 연결, 재연결, 하트비트를 관리하는 인터페이스. 팩토리 함수 `createSocketProvider`로 생성한다.

```typescript
export interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  off<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `clientName` | `string` | 클라이언트 식별자 (읽기 전용) |
| `connected` | `boolean` | 현재 연결 상태 (읽기 전용) |
| `on(type, listener)` | `void` | 이벤트 리스너 등록 |
| `off(type, listener)` | `void` | 이벤트 리스너 제거 |
| `connect()` | `Promise<void>` | WebSocket 연결 시작 |
| `close()` | `Promise<void>` | WebSocket 연결 종료 |
| `send(data)` | `Promise<void>` | 바이너리 데이터 전송. 연결 복구 대기 후 전송 |

## `createSocketProvider`

`SocketProvider` 팩토리 함수.

```typescript
export function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | WebSocket 서버 URL (`ws://` 또는 `wss://`) |
| `clientName` | `string` | 클라이언트 식별자 (URL 파라미터로 전달됨) |
| `maxReconnectCount` | `number` | 최대 재연결 횟수. `0`이면 재연결 안 함 |

내부 동작:
- 하트비트: 5초마다 ping 전송, 30초 응답 없으면 재연결 시도
- 재연결: 연결 끊김 시 3초 간격으로 `maxReconnectCount`회 재시도
- Node.js 환경에서 `globalThis.WebSocket`이 없으면 `ws` 패키지로 폴리필

## `ServiceTransportEvents`

`ServiceTransport`에서 발생하는 이벤트 타입 맵.

```typescript
export interface ServiceTransportEvents {
  event: { keys: string[]; data: unknown };
}
```

| Event | Type | Description |
|-------|------|-------------|
| `event` | `{ keys: string[]; data: unknown }` | 서버에서 발행된 이벤트 수신 |

## `ServiceTransport`

요청-응답 매핑, progress 중계, 서버 이벤트 디스패치를 담당하는 인터페이스.

```typescript
export interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  off<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}
```

| Member | Type | Description |
|--------|------|-------------|
| `on(type, listener)` | `void` | 이벤트 리스너 등록 |
| `off(type, listener)` | `void` | 이벤트 리스너 제거 |
| `send(message, progress?)` | `Promise<unknown>` | 서버에 메시지 전송하고 응답 대기 |

## `createServiceTransport`

`ServiceTransport` 팩토리 함수.

```typescript
export function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `SocketProvider` | WebSocket 소켓 제공자 |
| `protocol` | `ClientProtocolWrapper` | 인코딩/디코딩 래퍼 |

내부 동작:
- `uuid` 기반 요청-응답 `Map`으로 비동기 응답을 매핑
- 소켓 `closed`/`reconnecting` 상태 시 대기 중인 모든 요청을 reject
- 분할 메시지의 progress 상태를 추적하여 완료 시 100% 이벤트 전송
