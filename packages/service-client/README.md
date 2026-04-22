# @simplysm/service-client

WebSocket 기반 서비스 서버 클라이언트로, 서비스 호출, 실시간 이벤트 구독/발행, 파일 업로드/다운로드, ORM 원격 실행을 지원한다.

## Installation

```bash
npm install @simplysm/service-client
```

## API Overview

### Main

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceClient`](./docs/main/service-client.md) | class | WebSocket 서비스 클라이언트 최상위 파사드 (연결, RPC, 이벤트, 파일, ORM 통합) |
| [`ServiceProxy<T>`](./docs/main/service-client.md) | type | 서비스 메서드 반환 타입을 Promise로 래핑하는 타입 변환기 |
| [`createServiceClient()`](./docs/main/service-client.md) | function | ServiceClient 인스턴스 생성 팩토리 함수 |

### Transport

| Entry | Kind | Description |
|-------|------|-------------|
| [`SocketProvider`](./docs/transport/socket-provider.md) | interface | WebSocket 래퍼 (connect, close, send, on, off, 하트비트·재연결 관리) |
| [`SocketProviderEvents`](./docs/transport/socket-provider.md) | interface | SocketProvider 이벤트 맵 (message, state) |
| [`createSocketProvider()`](./docs/transport/socket-provider.md) | function | SocketProvider 팩토리 |
| [`ServiceTransport`](./docs/transport/service-transport.md) | interface | 요청-응답 매핑, progress 중계, 이벤트 디스패치 |
| [`ServiceTransportEvents`](./docs/transport/service-transport.md) | interface | ServiceTransport 이벤트 맵 (event) |
| [`createServiceTransport()`](./docs/transport/service-transport.md) | function | ServiceTransport 팩토리 |

### Protocol

| Entry | Kind | Description |
|-------|------|-------------|
| [`ClientProtocolWrapper`](./docs/protocol/client-protocol-wrapper.md) | interface | 메시지 인코딩/디코딩 (30KB 이상 시 Web Worker 오프로드) |
| [`createClientProtocolWrapper()`](./docs/protocol/client-protocol-wrapper.md) | function | ClientProtocolWrapper 팩토리 |

### Features

| Entry | Kind | Description |
|-------|------|-------------|
| [`EventClient`](./docs/features/event-client.md) | interface | 서버 이벤트 구독/발행 관리 (재연결 시 자동 재구독) |
| [`ClientEventProxy<T>`](./docs/features/event-client.md) | interface | 특정 이벤트에 대한 프록시 인터페이스 |
| [`createEventClient()`](./docs/features/event-client.md) | function | EventClient 팩토리 |
| [`FileClient`](./docs/features/file-client.md) | interface | 파일 업로드(POST)/다운로드(GET) |
| [`createFileClient()`](./docs/features/file-client.md) | function | FileClient 팩토리 |
| [`OrmClientConnector`](./docs/features/orm-client-connector.md) | interface | DbContext 원격 트랜잭션 연결 헬퍼 |
| [`OrmConnectOptions<T>`](./docs/features/orm-client-connector.md) | interface | ORM 연결 설정 (DbClass, connOpt, dbContextOpt) |
| [`createOrmClientConnector()`](./docs/features/orm-client-connector.md) | function | OrmClientConnector 팩토리 |
| [`OrmClientDbContextExecutor`](./docs/features/orm-client-db-context-executor.md) | class | DbContextExecutor 구현체 (서버로 원격 호출) |

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceConnectionOptions`](./docs/types/service-connection-options.md) | interface | 서버 연결 옵션 (host, port, ssl, maxReconnectCount) |
| [`ServiceProgress`](./docs/types/service-progress.md) | interface | progress 콜백 인터페이스 (request, response, server) |
| [`ServiceProgressState`](./docs/types/service-progress.md) | interface | progress 상태 (uuid, totalSize, completedSize) |
| [`BlobInput`](./docs/types/blob-input.md) | type | `Blob \| Uint8Array \| ArrayBuffer \| string` (Blob 생성자 허용 타입) |
| [`FileCollection`](./docs/types/file-collection.md) | interface | FileList 호환 컬렉션 인터페이스 |
| [`BrowserWorker`](./docs/types/browser-worker.md) | interface | Web Worker 최소 인터페이스 (cross-env 타입 호환용) |
| [`isBrowserWorkerSupported()`](./docs/types/browser-worker.md) | function | DOM Worker API 지원 여부 확인 |
| [`isNodeWorkerSupported()`](./docs/types/browser-worker.md) | function | Node.js worker_threads 지원 여부 확인 |
| [`isWorkerSupported()`](./docs/types/browser-worker.md) | function | Worker 오프로딩 지원 여부 확인 |

## Usage Examples

### 기본 연결 및 서비스 호출

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,
});

await client.connect();
await client.auth("jwt-token");

// 타입 안전한 서비스 프록시
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getAll();

await client.close();
```

### 이벤트 구독

```typescript
// 이벤트 프록시 방식 (권장)
const chatEvt = client.getEvent<typeof ChatEvent>("Chat");
const key = await chatEvt.addListener({ roomId: "room-1" }, async (data) => {
  console.log("메시지:", data.message);
});
await chatEvt.removeListener(key);

// 발행
await chatEvt.emit((info) => info.roomId === "room-1", { message: "hello" });
```

### ORM 원격 실행

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const connector = createOrmClientConnector(client);
const result = await connector.connect(
  { DbClass: MyDbContext, connOpt: { configName: "main" } },
  async (db) => db.users.select().execute(),
);
```
