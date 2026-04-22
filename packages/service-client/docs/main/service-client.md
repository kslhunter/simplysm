# ServiceClient

WebSocket 기반 서비스 클라이언트의 최상위 파사드 클래스. [`SocketProvider`](../transport/socket-provider.md), [`ClientProtocolWrapper`](../protocol/client-protocol-wrapper.md), [`ServiceTransport`](../transport/service-transport.md), [`EventClient`](../features/event-client.md), [`FileClient`](../features/file-client.md)를 내부적으로 조합한다.

```typescript
export class ServiceClient extends EventEmitter<ServiceClientEvents> {
  constructor(
    public readonly name: string,
    public readonly options: ServiceConnectionOptions,
  );
  get connected(): boolean;
  get hostUrl(): string;
  getService<TService>(serviceName: string): ServiceProxy<TService>;
  getEvent<TEventDef extends ServiceEventDef>(eventName: string): ClientEventProxy<TEventDef>;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(
    serviceName: string,
    methodName: string,
    params: unknown[],
    progress?: ServiceProgress,
  ): Promise<unknown>;
  auth(token: string): Promise<void>;
  addListener<TEventDef extends ServiceEventDef>(
    eventName: string,
    info: TEventDef["$info"],
    cb: (data: TEventDef["$data"]) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emitEvent<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
  uploadFile(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
  ): Promise<ServiceUploadResult[]>;
  downloadFileBuffer(relPath: string): Promise<Bytes>;
}
```

## Constructor Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | 클라이언트 식별자 (WebSocket URL 파라미터 및 HTTP 헤더로 전달됨) |
| `options` | [`ServiceConnectionOptions`](../types/service-connection-options.md) | 연결 옵션 |

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `name` | property | `string` | 클라이언트 식별자 (읽기 전용) |
| `options` | property | `ServiceConnectionOptions` | 연결 옵션 (읽기 전용) |
| `connected` | getter | `boolean` | 현재 WebSocket 연결 상태 |
| `hostUrl` | getter | `string` | HTTP 기본 URL (`http(s)://host:port`) |
| `connect()` | method | `Promise<void>` | WebSocket 연결 시작 |
| `close()` | method | `Promise<void>` | WebSocket 연결 종료 및 protocol dispose |
| `auth(token)` | method | `Promise<void>` | 서버에 인증 토큰 전송. 재연결 시 자동 재인증됨 |
| `getService<TService>(serviceName)` | method | `ServiceProxy<TService>` | 타입 안전한 서비스 프록시 반환 |
| `getEvent<TEventDef>(eventName)` | method | `ClientEventProxy<TEventDef>` | 타입 안전한 이벤트 프록시 반환 |
| `send(serviceName, methodName, params, progress?)` | method | `Promise<unknown>` | 서비스 메서드 원격 호출 |
| `addListener(eventName, info, cb)` | method | `Promise<string>` | 서버 이벤트 구독. 연결 상태여야 함 |
| `removeListener(key)` | method | `Promise<void>` | 서버 이벤트 구독 해제 |
| `emitEvent(eventName, infoSelector, data)` | method | `Promise<void>` | 서버 이벤트 발행 |
| `uploadFile(files)` | method | `Promise<ServiceUploadResult[]>` | 파일 업로드. `auth()` 호출 후 사용해야 함 |
| `downloadFileBuffer(relPath)` | method | `Promise<Bytes>` | 파일 다운로드 (`Uint8Array` 반환) |

## Events (EventEmitter)

`ServiceClient`는 `EventEmitter<ServiceClientEvents>`를 상속한다. `.on()`/`.off()`로 이벤트를 구독한다.

| Event | Data Type | Description |
|-------|-----------|-------------|
| `request-progress` | `ServiceProgressState` | 요청 전송 progress |
| `response-progress` | `ServiceProgressState` | 응답 수신 progress |
| `server-progress` | `ServiceProgressState` | 서버 내부 처리 progress |
| `state` | `"connected" \| "closed" \| "reconnecting"` | 연결 상태 변경 |

## Related Types

### `ServiceProxy`

`TService`의 모든 메서드 반환 타입을 `Promise`로 래핑하는 유틸리티 타입. `getService<TService>()`의 반환 타입으로 사용된다.

```typescript
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

함수가 아닌 속성(`never`)은 타입에서 제외된다.

## `createServiceClient`

`ServiceClient` 팩토리 함수. `new ServiceClient(name, options)`와 동일하다.

```typescript
export function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | 클라이언트 식별자 |
| `options` | `ServiceConnectionOptions` | 연결 옵션 |

## Usage

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,
});

await client.connect();
await client.auth("my-auth-token");

// 타입 안전한 서비스 호출
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getList();

// 이벤트 프록시 (권장)
const chatEvt = client.getEvent<typeof ChatEvent>("Chat");
const key = await chatEvt.addListener({ roomId: "room-1" }, async (data) => {
  console.log("메시지:", data.message);
});
await chatEvt.removeListener(key);

// 연결 상태 모니터링
client.on("state", (state) => {
  console.log("상태:", state); // "connected" | "closed" | "reconnecting"
});

// 파일 업로드
const results = await client.uploadFile([{ name: "file.txt", data: "hello" }]);

// 파일 다운로드
const bytes = await client.downloadFileBuffer("/files/report.pdf");

await client.close();
```
