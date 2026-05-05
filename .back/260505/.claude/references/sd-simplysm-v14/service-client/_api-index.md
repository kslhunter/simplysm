# API Index — @simplysm/service-client

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Main

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServiceClient` | class | [service-client.md](./main/service-client.md) | 서버에 연결하여 RPC, 이벤트, 파일, ORM 기능을 통합 사용할 때 |
| `ServiceProxy<T>` | type | [service-client.md](./main/service-client.md) | `getService<T>()`의 반환 타입으로, 서비스 메서드를 Promise로 래핑할 때 |
| `createServiceClient()` | function | [service-client.md](./main/service-client.md) | `new ServiceClient()` 대신 팩토리 함수로 인스턴스를 생성할 때 |

## Transport

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SocketProvider` | interface | [socket-provider.md](./transport/socket-provider.md) | WebSocket 연결/재연결/하트비트를 직접 제어할 때 |
| `SocketProviderEvents` | interface | [socket-provider.md](./transport/socket-provider.md) | SocketProvider 이벤트 타입 맵이 필요할 때 |
| `createSocketProvider()` | function | [socket-provider.md](./transport/socket-provider.md) | SocketProvider 인스턴스를 생성할 때 |
| `ServiceTransport` | interface | [service-transport.md](./transport/service-transport.md) | 요청-응답 매핑과 progress 중계를 직접 제어할 때 |
| `ServiceTransportEvents` | interface | [service-transport.md](./transport/service-transport.md) | ServiceTransport 이벤트 타입 맵이 필요할 때 |
| `createServiceTransport()` | function | [service-transport.md](./transport/service-transport.md) | ServiceTransport 인스턴스를 생성할 때 |

## Protocol

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ClientProtocolWrapper` | interface | [client-protocol-wrapper.md](./protocol/client-protocol-wrapper.md) | 메시지 인코딩/디코딩을 직접 제어할 때 |
| `createClientProtocolWrapper()` | function | [client-protocol-wrapper.md](./protocol/client-protocol-wrapper.md) | ClientProtocolWrapper 인스턴스를 생성할 때 |

## Features

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `EventClient` | interface | [event-client.md](./features/event-client.md) | 서버 이벤트를 구독/발행할 때 |
| `ClientEventProxy<T>` | interface | [event-client.md](./features/event-client.md) | `getEvent()`가 반환하는 이벤트 프록시 타입이 필요할 때 |
| `createEventClient()` | function | [event-client.md](./features/event-client.md) | EventClient 인스턴스를 생성할 때 |
| `FileClient` | interface | [file-client.md](./features/file-client.md) | 파일 업로드/다운로드를 직접 제어할 때 |
| `createFileClient()` | function | [file-client.md](./features/file-client.md) | FileClient 인스턴스를 생성할 때 |
| `OrmClientConnector` | interface | [orm-client-connector.md](./features/orm-client-connector.md) | DbContext 트랜잭션을 원격 실행할 때 |
| `OrmConnectOptions<T>` | interface | [orm-client-connector.md](./features/orm-client-connector.md) | ORM 원격 연결 옵션을 구성할 때 |
| `createOrmClientConnector()` | function | [orm-client-connector.md](./features/orm-client-connector.md) | OrmClientConnector 인스턴스를 생성할 때 |
| `OrmClientDbContextExecutor` | class | [orm-client-db-context-executor.md](./features/orm-client-db-context-executor.md) | DbContextExecutor 원격 구현체가 필요할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServiceConnectionOptions` | interface | [service-connection-options.md](./types/service-connection-options.md) | 서버 연결 옵션을 구성할 때 |
| `ServiceProgress` | interface | [service-progress.md](./types/service-progress.md) | 요청/응답/서버 progress 콜백을 정의할 때 |
| `ServiceProgressState` | interface | [service-progress.md](./types/service-progress.md) | progress 콜백 데이터 타입이 필요할 때 |
| `BlobInput` | type | [blob-input.md](./types/blob-input.md) | 파일 업로드 데이터 타입을 지정할 때 |
| `FileCollection` | interface | [file-collection.md](./types/file-collection.md) | DOM FileList 호환 타입이 필요할 때 |
| `BrowserWorker` | interface | [browser-worker.md](./types/browser-worker.md) | Worker cross-env 타입 호환이 필요할 때 |
| `isBrowserWorkerSupported()` | function | [browser-worker.md](./types/browser-worker.md) | DOM Worker API 지원 여부를 확인할 때 |
| `isNodeWorkerSupported()` | function | [browser-worker.md](./types/browser-worker.md) | Node.js worker_threads 지원 여부를 확인할 때 |
| `isWorkerSupported()` | function | [browser-worker.md](./types/browser-worker.md) | Worker 오프로딩 지원 여부를 확인할 때 |
