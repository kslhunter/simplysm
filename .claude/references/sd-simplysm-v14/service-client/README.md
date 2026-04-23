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

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 서버 연결 및 RPC 호출 | [ServiceClient](./main/service-client.md) |
| 실시간 이벤트 구독/발행 | [EventClient](./features/event-client.md) |
| 파일 업로드/다운로드 | [FileClient](./features/file-client.md) |
| ORM 원격 트랜잭션 실행 | [OrmClientConnector](./features/orm-client-connector.md) |
| progress 모니터링 | [ServiceProgress](./types/service-progress.md) |
| 연결 옵션 설정 | [ServiceConnectionOptions](./types/service-connection-options.md) |

## API Overview

### Main

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServiceClient`](./main/service-client.md) | class | 서버에 연결하여 RPC, 이벤트, 파일, ORM 기능을 통합 사용할 때 |
| [`ServiceProxy<T>`](./main/service-client.md) | type | `getService<T>()`의 반환 타입으로, 서비스 메서드를 Promise로 래핑할 때 |
| [`createServiceClient()`](./main/service-client.md) | function | `new ServiceClient()` 대신 팩토리 함수로 인스턴스를 생성할 때 |

### Transport

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`SocketProvider`](./transport/socket-provider.md) | interface | WebSocket 연결/재연결/하트비트를 직접 제어할 때 (일반적으로 `ServiceClient`가 내부 사용) |
| [`ServiceTransport`](./transport/service-transport.md) | interface | 요청-응답 매핑과 progress 중계를 직접 제어할 때 (일반적으로 `ServiceClient`가 내부 사용) |

### Protocol

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ClientProtocolWrapper`](./protocol/client-protocol-wrapper.md) | interface | 메시지 인코딩/디코딩을 직접 제어하거나 Worker 오프로드 동작을 이해할 때 (일반적으로 `ServiceClient`가 내부 사용) |

### Features

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`EventClient`](./features/event-client.md) | interface | 서버 이벤트를 구독/발행할 때 (`ServiceClient.getEvent()` 경유 권장) |
| [`FileClient`](./features/file-client.md) | interface | 파일 업로드/다운로드를 직접 제어할 때 (`ServiceClient.uploadFile()`/`downloadFileBuffer()` 경유 권장) |
| [`OrmClientConnector`](./features/orm-client-connector.md) | interface | `DbContext` 트랜잭션을 원격 서버에서 실행할 때 |
| [`OrmClientDbContextExecutor`](./features/orm-client-db-context-executor.md) | class | `DbContextExecutor` 원격 구현체가 필요할 때 (`OrmClientConnector` 경유 권장) |

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServiceConnectionOptions`](./types/service-connection-options.md) | interface | `ServiceClient` 생성자에 전달할 연결 옵션을 구성할 때 |
| [`ServiceProgress`](./types/service-progress.md) | interface | 요청/응답/서버 처리 progress를 모니터링할 때 |
| [`BlobInput`](./types/blob-input.md) | type | 파일 업로드 시 데이터 타입을 지정할 때 |
| [`FileCollection`](./types/file-collection.md) | interface | DOM `FileList` 호환 타입이 필요할 때 |
| [`BrowserWorker`](./types/browser-worker.md) | interface | Worker 인터페이스의 cross-env 타입 호환이 필요할 때 |

## 이 패키지를 쓰지 말아야 할 때

- 서버 측 로직 구현 → [`@simplysm/service-server`](../service-server/README.md)
- 서버-클라이언트 공유 프로토콜/타입 정의 → [`@simplysm/service-common`](../service-common/README.md)
- ORM 스키마 정의나 쿼리빌더 → [`@simplysm/orm-common`](../orm-common/README.md)
