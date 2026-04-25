# `SocketProvider`

> **읽어야 하는 상황**: WebSocket 연결/재연결/하트비트를 직접 제어하는 커스텀 전송 계층을 구현할 때. 일반적으로 `ServiceClient`가 내부적으로 생성·관리한다.

## When to use

- ✅ WebSocket 연결/재연결/하트비트를 직접 제어하는 커스텀 전송 계층을 구현할 때
- ❌ 일반적으로 `ServiceClient`가 내부적으로 생성·관리한다. 직접 생성은 `ServiceClient` 없이 독립 WebSocket 통신이 필요한 경우에만 사용한다.

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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `clientName` | property | `string` | 클라이언트 식별자 (읽기 전용) |
| `connected` | getter | `boolean` | 현재 연결 상태 |
| `on(type, listener)` | method | `void` | 이벤트 리스너 등록 |
| `off(type, listener)` | method | `void` | 이벤트 리스너 제거 |
| `connect()` | method | `Promise<void>` | WebSocket 연결 시작 |
| `close()` | method | `Promise<void>` | WebSocket 연결 종료 |
| `send(data)` | method | `Promise<void>` | 바이너리 데이터 전송. 연결 복구 대기 후 전송 |

## Related Types

### `SocketProviderEvents`

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
| `clientName` | `string` | 클라이언트 식별자 (URL 파라미터 `clientName`으로 전달됨) |
| `maxReconnectCount` | `number` | 최대 재연결 횟수. `0`이면 재연결 안 함 |

내부 동작:
- 하트비트: 5초마다 ping 전송, 30초 응답 없으면 재연결 시도
- 재연결: 연결 끊김 시 3초 간격으로 `maxReconnectCount`회 재시도
- Node.js 환경에서 `globalThis.WebSocket`이 없으면 `ws` 패키지로 폴리필
- ping/pong은 1바이트 패킷(ping: `0x01`, pong: `0x02`)으로 처리

## Usage

```typescript
import { createSocketProvider } from "@simplysm/service-client";

const socket = createSocketProvider("ws://localhost:3000/ws", "my-app", 10);

socket.on("state", (state) => {
  console.log("소켓 상태:", state); // "connected" | "closed" | "reconnecting"
});

socket.on("message", (bytes) => {
  console.log("메시지 수신:", bytes.length, "bytes");
});

await socket.connect();
await socket.send(new Uint8Array([1, 2, 3]));
await socket.close();
```
