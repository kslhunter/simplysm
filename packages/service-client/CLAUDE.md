# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/service-client` - WebSocket 기반 서비스 서버 클라이언트. 서비스 호출, 실시간 이벤트, 파일 업로드/다운로드, ORM 원격 실행을 지원한다. 14개 TypeScript 소스 파일.

## Architecture

```
src/
├── service-client.ts          ← 진입점 클래스 (ServiceClient) — connect/close/send/auth/이벤트/파일
├── transport/
│   ├── socket-provider.ts     ← WebSocket 래퍼 (재연결·하트비트 관리)
│   └── service-transport.ts   ← 요청-응답 매핑, progress 중계, 이벤트 메시지 디스패치
├── protocol/
│   └── client-protocol-wrapper.ts ← 인코딩/디코딩 (30KB 이상이면 Web Worker로 오프로드)
├── workers/
│   └── client-protocol.worker.ts  ← Web Worker 내부 진입점 (encode/decode)
├── features/
│   ├── event-client.ts            ← 서버 이벤트 구독/발행 (재연결 시 자동 재구독)
│   ├── file-client.ts             ← 파일 업로드(POST /upload) / 다운로드(GET)
│   └── orm/
│       ├── orm-client-connector.ts         ← DbContext 트랜잭션 연결 헬퍼
│       ├── orm-client-db-context-executor.ts ← DbContextExecutor 구현체 (원격 호출)
│       └── orm-connect-options.ts          ← ORM 연결 옵션 타입
└── types/
    ├── browser-compat.ts   ← DOM 전용 타입 대체 (BlobInput, FileCollection, WorkerLike)
    ├── connection-options.ts ← ServiceConnectionOptions
    └── progress.types.ts    ← ServiceProgress, ServiceProgressState
```

### 계층 관계

`ServiceClient`가 최상위 파사드 역할을 하며, 내부적으로 네 개의 하위 모듈을 조합한다.

```
ServiceClient
  ├── SocketProvider          (WebSocket 연결·재연결·하트비트)
  ├── ClientProtocolWrapper   (encode/decode, Worker 오프로드)
  ├── ServiceTransport        (요청-응답 Map, progress 이벤트)
  ├── EventClient             (이벤트 구독 Map, 재구독)
  └── FileClient              (HTTP fetch 업로드/다운로드)
```

## Key Patterns

### 팩토리 함수 패턴

클래스보다 팩토리 함수(`create*`)를 선호한다. 반환 타입은 인터페이스로 정의한다.

```typescript
export interface SocketProvider {
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
  // ...
}

export function createSocketProvider(url: string, clientName: string, maxReconnectCount: number): SocketProvider {
  // 클로저로 상태 관리
  let ws: WebSocket | undefined;
  // ...
  return { connect, close, send, /* ... */ };
}
```

`OrmClientDbContextExecutor`는 예외적으로 클래스를 사용한다(`DbContextExecutor` 인터페이스 구현 필요).

### EventEmitter 사용 패턴

이벤트 타입 맵을 인터페이스로 선언하고 `EventEmitter<T>`에 바인딩한다.

```typescript
interface MyEvents {
  "state": "connected" | "closed" | "reconnecting";
  "message": Bytes;
}
const emitter = new EventEmitter<MyEvents>();
emitter.emit("state", "connected");
```

### ServiceProxy 타입 패턴

`getService<TService>()`는 `Proxy`를 사용하여 서비스 메서드를 원격 호출로 변환한다. 반환 타입은 `ServiceProxy<TService>`로 모든 메서드 반환 타입을 `Promise<Awaited<R>>`로 래핑한다.

```typescript
// 사용 예
const ormSvc = client.getService<OrmService>("Orm");
const info = await ormSvc.getInfo(connOpt); // 실제로는 client.send() 호출
```

### Worker 오프로드 조건

`ClientProtocolWrapper`는 임계값(30KB)을 기준으로 Web Worker 사용 여부를 결정한다. Worker가 지원되지 않는 환경(Node.js)에서는 메인 스레드에서 처리한다.

```typescript
// Worker 지원 여부는 globalThis.Worker 존재로 판별
function isWorkerSupported(): boolean {
  return "Worker" in globalThis;
}
```

### Node.js 환경 WebSocket 폴리필

`socket-provider.ts` 모듈 최상단에서 Node.js 환경을 감지하여 `ws` 패키지로 `globalThis.WebSocket`을 채운다.

```typescript
if (typeof globalThis.WebSocket === "undefined") {
  const { WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket as never;
}
```

### ORM 원격 연결

`createOrmClientConnector(serviceClient)`를 사용하면 `DbContext` 서브클래스 기반 ORM 트랜잭션을 원격 서버에서 실행할 수 있다.

```typescript
const connector = createOrmClientConnector(serviceClient);

const result = await connector.connect(
  { DbClass: MyDbContext, connOpt: { configName: "main", /* ... */ } },
  async (db) => {
    return db.myTable.select(...);
  },
);
```

## Compiler Options (패키지 고유)

루트 `tsconfig.json`을 확장하며 아래 옵션만 추가된다.

| 옵션 | 값 | 이유 |
|------|----|------|
| `lib` | `["ESNext", "DOM", "WebWorker"]` | 브라우저 DOM API + Web Worker API 타입 모두 필요 |
| `typeRoots` | `["./node_modules/@types"]` | `ws` 패키지 타입(`@types/ws`) 로컬 해석 |

`DOM`과 `WebWorker` lib를 함께 사용하므로, DOM 전용 타입과 WorkerGlobalScope 타입이 충돌할 수 있다. `browser-compat.ts`의 추상 타입(`WorkerLike`, `FileCollection`, `BlobInput`)으로 이를 우회한다.

## Testing

패키지 내부에 단위 테스트 디렉토리는 없다. 통합 테스트는 모노레포 루트의 `tests/service/`에 위치하며, `ServiceClient`의 서버 연결·RPC 호출을 검증한다.
