# `ServiceClient`

> **읽어야 하는 상황**: 서버에 WebSocket으로 연결하여 RPC 호출, 이벤트 구독, 파일 전송, ORM 원격 실행을 수행할 때. 이벤트 구독만 필요하면 [`EventClient`](../features/event-client.md), ORM 원격 실행만 필요하면 [`OrmClientConnector`](../features/orm-client-connector.md) 참조.

## When to use

- ✅ `@simplysm/service-server`에 WebSocket으로 연결하여 RPC 호출, 이벤트, 파일, ORM 기능을 사용할 때
- ✅ 재연결/하트비트가 자동 관리되는 WebSocket 클라이언트가 필요할 때
- ❌ 서버 측 로직 구현 → `@simplysm/service-server`
- ❌ 단순 HTTP REST 호출만 필요한 경우 → `fetch` API 직접 사용

## Signature

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

### 최소 예제

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

await client.connect();
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getList();
await client.close();
```

### 전형 예제

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "api.example.com",
  port: 443,
  ssl: true,
  maxReconnectCount: 5, // 재연결 5회 시도 후 포기
});

// 연결 상태 모니터링
client.on("state", (state) => {
  if (state === "reconnecting") {
    // 재연결 시도 중 UI 피드백
  }
});

await client.connect();
await client.auth("jwt-token"); // 재연결 시 자동 재인증됨

// 타입 안전한 서비스 호출
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getList();

// 이벤트 구독 (getEvent 프록시 방식 권장)
const chatEvt = client.getEvent<typeof ChatEvent>("Chat");
const key = await chatEvt.addListener({ roomId: "room-1" }, async (data) => {
  // 재연결 시 자동 재구독됨
});
await chatEvt.removeListener(key);

// 파일 업로드 (auth() 호출 후에만 가능)
const results = await client.uploadFile([{ name: "file.txt", data: "hello" }]);

// 파일 다운로드
const bytes = await client.downloadFileBuffer("/files/report.pdf");

await client.close();
```

## 🚫 Anti-patterns

### auth() 없이 파일 업로드

```typescript
// ❌ auth() 호출 전에 uploadFile() 호출
await client.connect();
await client.uploadFile([...]); // Error: "인증 토큰이 없습니다..."

// ✅ auth() 후 uploadFile() 호출
await client.connect();
await client.auth("token");
await client.uploadFile([...]);
```

**근거**: `uploadFile()`은 내부적으로 `Authorization: Bearer {token}` 헤더를 사용하므로 인증 토큰이 필수이다.

### 연결 안 됨 상태에서 addListener()

```typescript
// ❌ connect() 전에 addListener()
const key = await client.addListener(...); // Error: "서버에 연결되지 않았습니다."

// ✅ connect() 후 addListener() 또는 getEvent() 프록시 사용
await client.connect();
const key = await client.addListener(...);
```

**근거**: `addListener()`는 서버에 이벤트 등록 요청을 전송하므로 연결 상태여야 한다.
