# @simplysm/service-client

WebSocket 기반 서비스 서버 클라이언트로, 서비스 호출, 실시간 이벤트 구독/발행, 파일 업로드/다운로드, ORM 원격 실행을 지원한다.

## Installation

```bash
npm install @simplysm/service-client
```

## API Overview

### Core Client

| API | Type | Description |
|-----|------|-------------|
| `ServiceClient` | class | WebSocket 서비스 클라이언트 최상위 파사드 (연결, RPC, 이벤트, 파일, ORM 통합) |
| `createServiceClient()` | function | ServiceClient 인스턴스 생성 팩토리 함수 |
| `ServiceProxy<T>` | type | 서비스 메서드 반환 타입을 Promise로 래핑하는 타입 변환기 |

→ See [docs/main.md](./docs/main.md) for details.

### Transport Layer

| API | Type | Description |
|-----|------|-------------|
| `SocketProvider` | interface | WebSocket 래퍼 인터페이스 (connect, close, send, on, off, heartbeat) |
| `createSocketProvider()` | function | SocketProvider 팩토리. 재연결 및 하트비트 관리 |
| `SocketProviderEvents` | interface | SocketProvider 이벤트 맵 (message, state) |
| `ServiceTransport` | interface | 요청-응답 매핑, progress 중계, 이벤트 디스패치 |
| `createServiceTransport()` | function | ServiceTransport 팩토리. SocketProvider와 ClientProtocolWrapper 조합 |
| `ServiceTransportEvents` | interface | ServiceTransport 이벤트 맵 (event) |

→ See [docs/transport.md](./docs/transport.md) for details.

### Protocol & Encoding

| API | Type | Description |
|-----|------|-------------|
| `ClientProtocolWrapper` | interface | 메시지 인코딩/디코딩 (30KB 이상 시 Web Worker 오프로드) |
| `createClientProtocolWrapper()` | function | ClientProtocolWrapper 팩토리. ServiceProtocol 래핑 |

→ See [docs/protocol.md](./docs/protocol.md) for details.

### Event Management

| API | Type | Description |
|-----|------|-------------|
| `EventClient` | interface | 서버 이벤트 구독/발행 관리 (재연결 시 자동 재구독) |
| `createEventClient()` | function | EventClient 팩토리. ServiceTransport 사용 |
| `ClientEventProxy<T>` | interface | 특정 이벤트에 대한 프록시 인터페이스 |

→ See [docs/features.md](./docs/features.md) for details.

### File Operations

| API | Type | Description |
|-----|------|-------------|
| `FileClient` | interface | 파일 업로드(POST)/다운로드(GET) 인터페이스 |
| `createFileClient()` | function | FileClient 팩토리. hostUrl과 clientName으로 생성 |

### ORM Remote Execution

| API | Type | Description |
|-----|------|-------------|
| `OrmClientConnector` | interface | DbContext 원격 트랜잭션 연결 헬퍼 |
| `createOrmClientConnector()` | function | OrmClientConnector 팩토리. ServiceClient 사용 |
| `OrmConnectOptions<T>` | interface | ORM 연결 설정 (DbClass, connOpt, dbContextOpt) |
| `OrmClientDbContextExecutor` | class | DbContextExecutor 구현체 (서버로 원격 호출) |

### Types & Utilities

| API | Type | Description |
|-----|------|-------------|
| `ServiceConnectionOptions` | interface | 서버 연결 옵션 (host, port, ssl, maxReconnectCount) |
| `ServiceProgress` | interface | progress 콜백 인터페이스 (request, response, server) |
| `ServiceProgressState` | interface | progress 상태 (uuid, totalSize, completedSize) |
| `BlobInput` | type | Blob \| Uint8Array \| ArrayBuffer \| string (Blob 생성자 허용 타입) |
| `FileCollection` | interface | FileList 호환 컬렉션 인터페이스 |
| `isWorkerSupported()` | function | Web Worker 지원 여부 확인 |

→ See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### Basic Service Connection & RPC

```typescript
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,  // 자동 재연결 (0으로 비활성화)
});

await client.connect();
await client.auth("jwt-token");

// 타입 안전한 서비스 프록시
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getAll();

await client.close();
```

### Event Subscription

```typescript
// 이벤트 리스너 등록 (selector로 필터링)
const listenerId = await client.addListener(
  "user:created",
  { userId: 123 },  // info selector (서버와 공유되는 필터 정보)
  async (data) => {
    console.log("새 사용자:", data.name);
  },
);

// 이벤트 발행 (특정 selector에 매칭하는 리스너에만 전송)
await client.emitEvent(
  "user:created",
  (info) => info.userId === 123,
  { name: "Alice", email: "alice@example.com" },
);

// 리스너 제거
await client.removeListener(listenerId);
```

### File Upload & Download

```typescript
// 파일 업로드 (인증 필수)
const files = [
  new File(["content"], "file.txt", { type: "text/plain" }),
];
const results = await client.uploadFile(files);
console.log("업로드 결과:", results);

// 파일 다운로드
const buffer = await client.downloadFileBuffer("/uploaded/file.txt");
console.log("다운로드 바이트:", buffer.length);
```

### ORM Remote Execution

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const connector = createOrmClientConnector(client);

const result = await connector.connect(
  {
    DbClass: MyDbContext,
    connOpt: { configName: "main", username: "user", password: "pass" },
  },
  async (db) => {
    return db.users.select().execute();
  },
);

console.log("조회 결과:", result);
```

### Progress Tracking

```typescript
const progress = {
  request: (state) => {
    console.log(`요청 전송: ${state.completedSize}/${state.totalSize} bytes`);
  },
  response: (state) => {
    console.log(`응답 수신: ${state.completedSize}/${state.totalSize} bytes`);
  },
  server: (state) => {
    console.log(`서버 처리: ${state.completedSize}/${state.totalSize}`);
  },
};

await client.send("Service", "method", [arg1, arg2], progress);
```

### Connection State & Events

```typescript
// 연결 상태 모니터링
client.on("state", (state) => {
  console.log("연결 상태:", state); // "connected" | "closed" | "reconnecting"
});

client.on("request-progress", (state) => {
  console.log(`요청 진행: ${state.completedSize}/${state.totalSize}`);
});

// 연결 확인
if (client.connected) {
  console.log("서버에 연결됨");
}
```
