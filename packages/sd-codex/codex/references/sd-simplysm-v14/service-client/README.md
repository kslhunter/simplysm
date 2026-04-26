# @simplysm/service-client

> WebSocket 기반 서비스 서버 클라이언트. `@simplysm/service-server`(Fastify)에 연결하여 RPC 호출, 실시간 이벤트 구독/발행, 파일 업로드/다운로드, ORM 원격 실행을 수행한다. 브라우저와 Node.js 양쪽에서 동작하며, `ws` 패키지를 선택적 peer dependency로 사용한다.

## Installation

```bash
npm install @simplysm/service-client
```

Node.js 환경에서 사용 시:

```bash
npm install ws
```

## 하려는 작업 → 읽을 파일

### 서버 연결·통신

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 서버에 WebSocket으로 연결하고 RPC 호출할 때 | [ServiceClient](./main/service-client.md) |
| 연결 옵션(호스트, 포트, SSL, 재연결 횟수)을 구성할 때 | [ServiceConnectionOptions](./types/service-connection-options.md) |
| 요청/응답/서버 처리 진행률을 모니터링할 때 | [ServiceProgress](./types/service-progress.md) |

### 실시간 이벤트

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 서버 이벤트를 구독하거나 다른 클라이언트에 이벤트를 발행할 때 | [EventClient](./features/event-client.md) |

### 파일 전송

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 서버에 파일을 업로드하거나 다운로드할 때 | [FileClient](./features/file-client.md) |
| 업로드 데이터 타입(Blob, Uint8Array, string 등)을 지정할 때 | [BlobInput](./types/blob-input.md) |
| DOM FileList 호환 타입이 필요할 때 | [FileCollection](./types/file-collection.md) |

### ORM 원격 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 클라이언트에서 DbContext 트랜잭션을 원격 실행할 때 | [OrmClientConnector](./features/orm-client-connector.md) |
| DbContextExecutor 원격 구현체를 수동 제어할 때 | [OrmClientDbContextExecutor](./features/orm-client-db-context-executor.md) |

### 내부 전송 계층 (고급)

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| WebSocket 연결/재연결/하트비트를 직접 제어할 때 | [SocketProvider](./transport/socket-provider.md) |
| 요청-응답 매핑과 progress 중계를 직접 제어할 때 | [ServiceTransport](./transport/service-transport.md) |
| 메시지 인코딩/디코딩 또는 Worker 오프로드를 제어할 때 | [ClientProtocolWrapper](./protocol/client-protocol-wrapper.md) |
| Worker 인터페이스의 cross-env 타입 호환이 필요할 때 | [BrowserWorker](./types/browser-worker.md) |

## 이 패키지를 쓰지 말아야 할 때

- 서버 측 로직 구현 → [`@simplysm/service-server`](../service-server/README.md)
- 서버-클라이언트 공유 프로토콜/타입 정의 → [`@simplysm/service-common`](../service-common/README.md)
- ORM 스키마 정의나 쿼리빌더 → [`@simplysm/orm-common`](../orm-common/README.md)

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
