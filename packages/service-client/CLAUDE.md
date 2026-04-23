# CLAUDE.md

> 이 패키지의 사용법 및 지침은 `.claude/references/sd-simplysm-v14/service-client/README.md`를 참조한다.

## Package Overview

`@simplysm/service-client` — WebSocket 기반 서비스 서버 클라이언트. 서비스 호출, 실시간 이벤트, 파일 업로드/다운로드, ORM 원격 실행을 지원한다. 14개 TypeScript 소스 파일.

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
    ├── browser-compat.ts   ← DOM 전용 타입 대체 (BlobInput, FileCollection, BrowserWorker, isBrowserWorkerSupported, isNodeWorkerSupported, isWorkerSupported)
    ├── connection-options.ts ← ServiceConnectionOptions
    └── progress.types.ts    ← ServiceProgress, ServiceProgressState
```

### 계층 관계

`ServiceClient`가 최상위 파사드 역할을 하며, 내부적으로 다섯 개의 하위 모듈을 조합한다.

```
ServiceClient (facade)
  ├── SocketProvider          (WebSocket 연결·재연결·하트비트)
  ├── ClientProtocolWrapper   (encode/decode, Worker 오프로드)
  ├── ServiceTransport        (요청-응답 Map, progress 이벤트)
  ├── EventClient             (이벤트 구독 Map, 재구독)
  └── FileClient              (HTTP fetch 업로드/다운로드)
```

## Key Patterns

### 팩토리 함수 패턴

클래스보다 팩토리 함수(`create*`)를 선호한다. 반환 타입은 인터페이스로 정의하고, 클로저로 비공개 상태를 관리한다.

```typescript
export interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  off<K extends keyof SocketProviderEvents & string>(type: K, listener: (data: SocketProviderEvents[K]) => void): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}

export function createSocketProvider(url: string, clientName: string, maxReconnectCount: number): SocketProvider {
  let ws: WebSocket | undefined;
  let isManualClose = false;
  let reconnectCount = 0;
  // ... 클로저로 상태 관리
  return { clientName, connect, close, send, on, off };
}
```

예외: `OrmClientDbContextExecutor`는 클래스로 구현되며, `DbContextExecutor` 인터페이스를 직접 구현한다 (인터페이스 호환성 필요).

### EventEmitter 타입 안전성

이벤트 타입 맵을 인터페이스로 선언하고 `EventEmitter<T>`에 제네릭 바인딩하여 타입 안전성을 확보한다.

```typescript
interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}
const emitter = new EventEmitter<SocketProviderEvents>();
emitter.emit("state", "connected");  // 문자열 literal check 됨
```

### ServiceProxy 타입 변환

`getService<TService>()`는 Proxy를 사용하여 서비스 메서드를 원격 호출로 변환한다. 반환 타입은 `ServiceProxy<TService>`로 모든 메서드의 반환 타입을 `Promise<Awaited<R>>`로 래핑한다.

```typescript
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

// 사용
const ormSvc = client.getService<OrmService>("Orm");
const info = await ormSvc.getInfo(connOpt);  // Promise<Awaited<{dialect, database?, schema?}>>
```

### Web Worker 성능 최적화

`ClientProtocolWrapper`는 임계값(30KB) 기반으로 메시지 인코딩/디코딩을 Web Worker로 오프로드한다.

- **Worker 사용 조건**: 메시지 크기 > 30KB, 또는 body가 `Uint8Array` / 큰 배열
- **Worker 미지원 환경**: Node.js 등 `globalThis.Worker`가 없으면 메인 스레드에서 처리
- **메모리 관리**: `LazyGcMap`으로 pending request를 관리하고, 60초 타임아웃 후 자동 정리

```typescript
async function encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }> {
  if (!isWorkerAvailable() || !shouldUseWorkerForEncode(message)) {
    return protocol.encode(uuid, message);  // 메인 스레드
  }
  return runWorker("encode", { uuid, message });  // Worker
}
```

### Zero-Copy 버퍼 전송

Worker와의 통신에서 `Transferable` 객체를 사용하여 메모리 복사를 최소화한다.

```typescript
// decode: 메인 -> Worker로 데이터 전송
const rawResult = await runWorker("decode", bytes, [bytes.buffer]);  // 버퍼 소유권 이동

// Worker 응답: Transferable로 반환
self.postMessage({ id, type: "success", result }, transferList);  // 버퍼 스왑
```

### 재연결 시 자동 복구

소켓이 재연결되면 자동으로 인증(token) 및 이벤트 리스너를 복구한다.

```typescript
this._socket.on("state", async (state) => {
  if (state === "connected") {
    if (this._authToken != null) await this.auth(this._authToken);
    await this._eventClient.resubscribeAll();  // 서버에 listener 재등록
  }
});
```

### ORM 원격 실행

`createOrmClientConnector(serviceClient)`를 사용하면 `DbContext` 서브클래스를 원격 서버에서 트랜잭션 내 실행할 수 있다.

```typescript
const connector = createOrmClientConnector(client);
const result = await connector.connect(
  { DbClass: MyDbContext, connOpt: { configName: "main" } },
  async (db) => db.myTable.select(...),
);
```

각 메서드(`connect`, `connectWithoutTransaction`)는 `DbContextExecutor` 구현체를 주입하고, 외래키 제약 에러를 감지하여 친화적인 메시지로 변환한다.

### Node.js 환경 호환성

`socket-provider.ts` 최상단에서 Node.js 환경을 감지하여 `ws` 패키지로 `globalThis.WebSocket`을 폴리필한다.

```typescript
if (typeof globalThis.WebSocket === "undefined") {
  const { WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket as never;
}
```

### Cross-Environment 타입 호환성

`browser-compat.ts`는 DOM 전용 타입(`FileList`, `BlobPart`, `Worker`, `Transferable`)을 추상 인터페이스로 대체하여 Node.js 환경에서도 타입체크가 통과하도록 한다.

```typescript
// BlobInput: Blob | Uint8Array | ArrayBuffer | string (DOM BlobPart 대체)
// FileCollection: { length, item(index), [index], [Symbol.iterator] } (FileList 대체)
// BrowserWorker: { onmessage, onerror, postMessage, terminate } (DOM Worker 최소 인터페이스)
// isBrowserWorkerSupported(): boolean — "Worker" in globalThis 확인
// isNodeWorkerSupported(): boolean — process.versions.node 존재 확인
// isWorkerSupported(): boolean — isBrowserWorkerSupported() || isNodeWorkerSupported()
```

## Compiler Options (패키지 고유)

루트 `tsconfig.json`을 확장하며 아래 옵션만 추가된다.

| 옵션 | 값 | 이유 |
|------|----|------|
| `lib` | `["ESNext", "DOM", "WebWorker"]` | 브라우저 DOM API + Web Worker API 타입 동시 지원 필수 |
| `typeRoots` | `["./node_modules/@types"]` | `ws` 패키지 타입(`@types/ws`) 명시적 로드 |

DOM과 WebWorker lib를 동시에 포함하면 `Blob`, `File`, `Transferable` 등의 타입이 중복될 수 있다. `browser-compat.ts`의 추상 타입으로 이를 회피한다.

## Testing

**프레임워크**: Vitest

패키지 내부 단위 테스트:
- `tests/protocol/postmessage-compat.spec.ts` — Worker 미지원 환경에서 `ClientProtocolWrapper`의 encode/decode 라운드트립 검증
- `tests/features/event-client.spec.ts` — `EventClient`의 구독/발행 및 서버 이벤트 디스패치 동작 검증 (mock `ServiceTransport` 사용)
- `tests/types/browser-compat.spec.ts` — `BlobInput`, `FileCollection`, `BrowserWorker` 등 cross-env 타입 호환성 검증

통합 테스트는 모노레포 루트의 `tests/service/`에 위치하며 `ServiceClient`의 서버 연결, RPC 호출, 파일 전송을 검증한다.
