# @simplysm/service-client

WebSocket 기반 서비스 서버 클라이언트. 서비스 호출, 실시간 이벤트, 파일 업로드/다운로드, ORM 원격 실행을 지원한다.

## Installation

```bash
npm install @simplysm/service-client
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `BlobInput` | type | Blob constructor가 허용하는 데이터 타입 (DOM BlobPart 대체) |
| `FileCollection` | interface | File 컬렉션 인터페이스 (DOM FileList 대체) |
| `WorkerLike` | interface | Web Worker 인터페이스 (DOM Worker 대체) |
| `isWorkerSupported` | function | Web Worker API 지원 여부 확인 |
| `createBrowserWorker` | function | Web Worker 생성 (미지원 환경이면 undefined 반환) |
| `ServiceConnectionOptions` | interface | 서비스 연결 옵션 (host, port, ssl, maxReconnectCount) |
| `ServiceProgress` | interface | 요청/응답/서버 progress 콜백 컨테이너 |
| `ServiceProgressState` | interface | progress 상태 (uuid, totalSize, completedSize) |

→ See [docs/types.md](./docs/types.md) for details.

### Transport

| API | Type | Description |
|-----|------|-------------|
| `SocketProviderEvents` | interface | SocketProvider 이벤트 타입 맵 (message, state) |
| `SocketProvider` | interface | WebSocket 래퍼 인터페이스 (연결, 재연결, 하트비트) |
| `createSocketProvider` | function | SocketProvider 팩토리. URL, clientName, maxReconnectCount로 생성 |
| `ServiceTransportEvents` | interface | ServiceTransport 이벤트 타입 맵 (event) |
| `ServiceTransport` | interface | 요청-응답 매핑, progress 중계, 이벤트 디스패치 인터페이스 |
| `createServiceTransport` | function | ServiceTransport 팩토리. SocketProvider와 ClientProtocolWrapper 조합 |

→ See [docs/transport.md](./docs/transport.md) for details.

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `ClientProtocolWrapper` | interface | 인코딩/디코딩 인터페이스 (30KB 이상이면 Web Worker로 오프로드) |
| `createClientProtocolWrapper` | function | ClientProtocolWrapper 팩토리. ServiceProtocol을 래핑 |

→ See [docs/protocol.md](./docs/protocol.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `ClientEventProxy` | interface | `getEvent()`가 반환하는 이벤트 프록시 (이벤트 이름+타입 캡처) |
| `EventClient` | interface | 서버 이벤트 구독/발행 인터페이스 (재연결 시 자동 재구독) |
| `createEventClient` | function | EventClient 팩토리. ServiceTransport를 사용 |
| `FileClient` | interface | 파일 업로드(POST)/다운로드(GET) 인터페이스 |
| `createFileClient` | function | FileClient 팩토리. hostUrl과 clientName으로 생성 |
| `OrmConnectOptions` | interface | ORM 연결 옵션 (DbClass, connOpt, dbContextOpt) |
| `OrmClientConnector` | interface | DbContext 트랜잭션 연결 헬퍼 인터페이스 |
| `createOrmClientConnector` | function | OrmClientConnector 팩토리. ServiceClient를 사용 |
| `OrmClientDbContextExecutor` | class | DbContextExecutor 구현체 (서버로 원격 호출) |

→ See [docs/features.md](./docs/features.md) for details.

### Main

| API | Type | Description |
|-----|------|-------------|
| `ServiceClient` | class | 최상위 파사드 클래스. WebSocket 연결, 서비스 호출, 이벤트, 파일, ORM 통합 |
| `ServiceProxy` | type | 서비스 메서드 반환 타입을 Promise로 래핑하는 유틸리티 타입 |
| `createServiceClient` | function | ServiceClient 팩토리 함수 |

→ See [docs/main.md](./docs/main.md) for details.

## Usage Examples

### 서비스 연결 및 RPC 호출

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
});

await client.connect();
await client.auth("my-auth-token");

// 타입 안전한 서비스 프록시
const userSvc = client.getService<UserService>("User");
const users = await userSvc.getList();

await client.close();
```

### 이벤트 구독

```typescript
import { defineEvent } from "@simplysm/service-common";

// 서버에서 이벤트 정의 + 타입 export
export const ChatEvent = defineEvent<{ roomId: string }, { message: string }>("Chat");

// 클라이언트에서 import type으로 타입만 가져옴
// import type { ChatEvent } from "@server-package";

// 이벤트 프록시 방식 (권장 — getService()와 동일한 패턴)
const chatEvt = client.getEvent<typeof ChatEvent>("Chat");
const key = await chatEvt.addListener({ roomId: "room-1" }, async (data) => {
  // data.message는 string으로 타입 추론
});
await chatEvt.removeListener(key);

// 직접 호출 방식 (하위 호환)
const key2 = await client.addListener<typeof ChatEvent>("Chat", { roomId: "room-1" }, async (data) => {
  // data.message는 string으로 타입 추론
});
await client.removeListener(key2);
```

### ORM 원격 연결

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const connector = createOrmClientConnector(client);

const result = await connector.connect(
  { DbClass: MyDbContext, connOpt: { configName: "main" } },
  async (db) => {
    return db.myTable.select((item) => ({ id: item.id, name: item.name }));
  },
);
```
