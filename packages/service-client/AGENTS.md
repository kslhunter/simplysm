# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/service-client/README.md`를 참조한다.

## Package Overview

`@simplysm/service-client`는 `@simplysm/service-server`에 WebSocket/HTTP로 연결하는 클라이언트 패키지이다. RPC 호출, 이벤트 구독/발행, 파일 업로드/다운로드, ORM 원격 실행을 `ServiceClient` 중심으로 묶는다.

- 패키지 경로: `packages/service-client`
- 공개 진입점: `src/index.ts`
- 소스 파일 수: 12개 (`src/**/*.ts`, `src/**/*.d.ts`)
- 선택적 런타임 peer dependency: Node.js WebSocket 폴리필용 `ws`

## Architecture

```text
src/
  index.ts                         # 공개 export 진입점
  service-client.ts                # 통합 클라이언트 facade
  features/
    event-client.ts                # 서버 이벤트 구독/발행 클라이언트
    file-client.ts                 # HTTP 파일 업로드/다운로드 클라이언트
    orm/
      orm-client-connector.ts      # DbContext 원격 실행 helper
      orm-client-db-context-executor.ts
      orm-connect-options.ts
  protocol/
    client-protocol-wrapper.ts     # service-common protocol + Worker 오프로드 래퍼
  transport/
    socket-provider.ts             # WebSocket 연결, 하트비트, 재연결
    service-transport.ts           # 요청/응답 uuid 매핑, progress 중계
  types/
    browser-compat.ts              # DOM 타입 없이도 쓰는 브라우저 호환 타입
    connection-options.ts
    node-worker-compat.d.ts
    progress.types.ts
  workers/
    client-protocol.worker.ts      # protocol encode/decode Worker
```

의존 방향은 `ServiceClient` → `features`/`transport`/`protocol` → `types`이다. `features/orm`은 `@simplysm/orm-common`의 `DbContextExecutor` 계약을 서비스 RPC 위에 구현한다.

## Key Patterns

### ServiceClient는 facade로만 확장한다

`ServiceClient`는 소켓, 전송, 프로토콜, 이벤트, 파일 클라이언트를 조립하는 facade이다. 새 기능을 추가할 때는 독립 모듈을 먼저 만들고 `ServiceClient`에는 얇은 위임 메서드만 둔다.

```typescript
this._socket = createSocketProvider(wsUrl, this.name, this.options.maxReconnectCount ?? 10);
this._protocolWrapper = createClientProtocolWrapper(protocol);
this._transport = createServiceTransport(this._socket, this._protocolWrapper);
this._eventClient = createEventClient(this._transport);
this._fileClient = createFileClient(this.hostUrl, this.name);
```

### RPC 호출은 Proxy로 서비스 타입을 Promise화한다

`getService<TService>()`는 서비스 이름과 메서드명을 문자열 메시지로 변환한다. 서비스 인터페이스의 속성은 지원하지 않고, 메서드만 `Promise<Awaited<R>>`로 래핑한다.

```typescript
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

### 이벤트 리스너는 재연결 복구를 위해 로컬 Map에 보관한다

`createEventClient()`는 서버에 `evt:add`를 보내기 전에 UUID key를 만들고, 등록 후 로컬 `listenerMap`에 보관한다. `ServiceClient`는 소켓이 다시 `connected`가 되면 재인증 후 `resubscribeAll()`을 호출한다.

```typescript
listenerMap.set(key, {
  eventName,
  info,
  cb,
});
```

이벤트 구독 API를 바꿀 때는 `tests/features/event-client.spec.ts`의 `getEvent()` 프록시와 `addListener()`/`emit()` 메시지 계약을 함께 확인한다.

### 전송 계층은 요청 전송 전에 pending request를 등록한다

`createServiceTransport()`는 응답 유실을 막기 위해 `socket.send()`보다 먼저 `pendingRequests`에 resolver를 등록한다. 소켓이 `closed` 또는 `reconnecting` 상태가 되면 모든 대기 요청을 reject하고 progress 상태도 정리한다.

```typescript
const responsePromise = new Promise((resolve, reject) => {
  pendingRequests.set(uuid, { resolve, reject, progress });
});
```

### Worker 생성 패턴은 번들러 인식 대상이다

`client-protocol-wrapper.ts`의 브라우저 Worker 생성은 `new Worker(new URL(..., import.meta.url), { type: "module" })` 형태를 유지한다. sd-cli의 Worker 번들링 플러그인이 이 AST 패턴을 인식한다.

```typescript
const w: BrowserWorker = new Worker(
  new URL("../workers/client-protocol.worker.js", import.meta.url),
  { type: "module" },
);
```

Node.js Worker는 `import.meta.resolve("../workers/client-protocol.worker.js")` 경로를 사용한다. Worker 관련 타입 보강은 `types/node-worker-compat.d.ts`에 둔다.

### Node.js WebSocket 폴리필은 socket-provider 모듈 초기화에서 수행한다

`socket-provider.ts`는 `globalThis.WebSocket`이 없을 때만 `ws`를 동적 import해 전역에 할당한다. 이 패키지에서 `import()`가 필요한 예외 케이스이며, `ws`는 optional peer dependency이다.

```typescript
if (typeof globalThis.WebSocket === "undefined") {
  const { WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket as never;
}
```

### 파일 업로드는 auth 토큰을 ServiceClient에 저장한 뒤 사용한다

`ServiceClient.auth()`는 서버에 `auth` 메시지를 보내고 `_authToken`을 저장한다. `uploadFile()`은 저장된 토큰이 없으면 즉시 예외를 던지고, `FileClient.upload()`는 `Authorization: Bearer {token}`과 `x-sd-client-name` 헤더를 전송한다.

### ORM connector는 DbContext lifecycle을 감싼다

`createOrmClientConnector()`는 서버에서 DB 정보를 조회한 뒤 `DbClass`를 생성한다. `connect()`는 `db.connect()`를 사용하고 FK 제약 위반 메시지를 사용자 친화적 에러로 변환한다. 트랜잭션이 필요 없으면 `connectWithoutTransaction()`을 사용한다.

## Testing

테스트는 `packages/service-client/tests` 아래에 둔다.

```text
tests/
  features/
    event-client.spec.ts
    event-client-type-safety.verify.md
  protocol/
    postmessage-compat.spec.ts
  types/
    browser-compat.spec.ts
```

- 이벤트 계약 변경 시 `tests/features/event-client.spec.ts`를 우선 확인한다.
- 브라우저/Node Worker 호환 타입 변경 시 `tests/protocol`과 `tests/types`를 확인한다.
- 타입 안전성 설명이나 기대 컴파일 동작이 바뀌면 `*.verify.md`를 함께 갱신한다.

## Package-Specific Compiler Notes

이 패키지는 루트 설정을 확장하면서 DOM/WebWorker 타입을 함께 사용한다.

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "WebWorker"],
    "outDir": "./dist",
    "typeRoots": ["./node_modules/@types"]
  }
}
```

DOM 타입을 직접 쓸 수 없는 환경까지 고려해야 하는 공개 타입은 `types/browser-compat.ts` 또는 `types/node-worker-compat.d.ts`에 구조적 호환 타입으로 둔다.
