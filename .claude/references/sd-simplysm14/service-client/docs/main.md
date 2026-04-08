# Main

## `ServiceClient`

WebSocket 기반 서비스 클라이언트의 최상위 파사드 클래스. `SocketProvider`, `ClientProtocolWrapper`, `ServiceTransport`, `EventClient`, `FileClient`를 내부적으로 조합한다.

```typescript
export class ServiceClient extends EventEmitter<ServiceClientEvents> {
  constructor(
    public readonly name: string,
    public readonly options: ServiceConnectionOptions,
  );
  get connected(): boolean;
  get hostUrl(): string;
  getService<TService>(serviceName: string): ServiceProxy<TService>;
  async connect(): Promise<void>;
  async close(): Promise<void>;
  async send(
    serviceName: string,
    methodName: string,
    params: unknown[],
    progress?: ServiceProgress,
  ): Promise<unknown>;
  async auth(token: string): Promise<void>;
  async addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  async removeListener(key: string): Promise<void>;
  async emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  async uploadFile(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
  ): Promise<ServiceUploadResult[]>;
  async downloadFileBuffer(relPath: string): Promise<Bytes>;
}
```

`ServiceClient`가 발생시키는 이벤트 (`EventEmitter<ServiceClientEvents>`):

| Event | Data Type | Description |
|-------|-----------|-------------|
| `request-progress` | `ServiceProgressState` | 요청 전송 progress |
| `response-progress` | `ServiceProgressState` | 응답 수신 progress |
| `server-progress` | `ServiceProgressState` | 서버 내부 처리 progress |
| `state` | `"connected" \| "closed" \| "reconnecting"` | 연결 상태 변경 |

생성자 파라미터:

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | 클라이언트 식별자 (WebSocket URL 파라미터 및 HTTP 헤더로 전달됨) |
| `options` | `ServiceConnectionOptions` | 연결 옵션 (host, port, ssl, maxReconnectCount) |

주요 메서드:

| Method | Description |
|--------|-------------|
| `connect()` | WebSocket 연결 시작 |
| `close()` | WebSocket 연결 종료 및 protocol dispose |
| `auth(token)` | 서버에 인증 토큰 전송. 재연결 시 자동 재인증됨 |
| `getService<TService>(serviceName)` | 타입 안전한 서비스 프록시 반환 |
| `send(serviceName, methodName, params, progress?)` | 서비스 메서드 원격 호출 |
| `addListener(eventDef, info, cb)` | 서버 이벤트 구독. 연결 상태여야 함 |
| `removeListener(key)` | 서버 이벤트 구독 해제 |
| `emitEvent(eventDef, infoSelector, data)` | 서버 이벤트 발행 |
| `uploadFile(files)` | 파일 업로드. `auth()` 호출 후 사용해야 함 |
| `downloadFileBuffer(relPath)` | 파일 다운로드 (`Uint8Array` 반환) |

접근자:

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | 현재 WebSocket 연결 상태 |
| `hostUrl` | `string` | HTTP 기본 URL (`http(s)://host:port`) |

## `ServiceProxy`

`TService`의 모든 메서드 반환 타입을 `Promise`로 래핑하는 유틸리티 타입. `ServiceClient.getService<TService>()`의 반환 타입으로 사용된다.

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

사용 예:

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

// 이벤트 구독
const key = await client.addListener(chatEvent, { roomId: "room-1" }, async (data) => {
  // data.message
});

// 파일 업로드
const results = await client.uploadFile([{ name: "file.txt", data: "hello" }]);

// 파일 다운로드
const bytes = await client.downloadFileBuffer("/files/report.pdf");

await client.close();
```
