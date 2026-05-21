# @simplysm/service-client

`@simplysm/service-server` 와 WebSocket(`/ws`) 으로 통신하는 클라이언트. RPC 호출·서버 push 이벤트 구독·파일 업/다운로드·원격 ORM 트랜잭션 실행을 단일 `ServiceClient` 에서 제공한다 (Node/브라우저 공용).

## 사용 트리거 인덱스

- **createServiceClient / ServiceClient / ServiceConnectionOptions** — 서버 접속 클라이언트를 생성하고 `connect()` / `close()` 로 연결 수명을 관리할 때.
- **getService / send / ServiceProxy** — 서버 등록 서비스의 메서드를 타입 안전 RPC 로 호출할 때 (Proxy 호출 또는 저수준 `send`).
- **auth** — 서버 인증 토큰을 등록하고 재연결 시 자동 재인증 + 파일 업로드 인증을 활성화할 때.
- **getEvent / addListener / removeListener / emitEvent / ClientEventProxy** — 서버 push 이벤트를 구독·해지하거나 다른 클라이언트에게 발행할 때.
- **uploadFile / downloadFileBuffer** — 서버에 multipart 파일을 올리거나 정적 경로에서 바이트(`Uint8Array`)로 받을 때.
- **createOrmClientConnector / OrmClientConnector / OrmConnectOptions** — 서버 `"Orm"` 서비스를 통해 `DbContext` 트랜잭션을 원격 실행할 때.
- **OrmClientDbContextExecutor** — `DbContext` 를 직접 구성해야 할 때만. 보통 `OrmClientConnector` 가 내부에서 사용함.
- **ServiceClient 인스턴스 이벤트 (`state` / `request-progress` / `response-progress` / `server-progress`)** — 연결 상태 변화와 전송/응답/서버 진행률을 인스턴스 레벨에서 구독할 때.
- **BlobInput / FileCollection / BrowserWorker / isBrowserWorkerSupported / isNodeWorkerSupported / isWorkerSupported** — Node/브라우저 공용 코드에서 DOM 의존 타입을 대체하거나 Worker 오프로딩 가용성을 확인할 때.

## 연결 / 생성

```ts
createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient
interface ServiceConnectionOptions { port: number; host: string; ssl?: boolean; maxReconnectCount?: number; }
client.connect(): Promise<void>
client.close(): Promise<void>   // protocol wrapper 의 worker·resolver 자원도 dispose
client.connected: boolean
client.hostUrl: string          // `${ssl?https:http}://host:port`
```

- WebSocket URL: `${ws|wss}://host:port/ws?ver=2&clientId=<uuid>&clientName=<name>`.
- `maxReconnectCount` 기본 10. `0` 이면 재연결 비활성.
- 5s 마다 ping(`0x01`), 30s 무응답 시 강제 재연결. 재연결 성공 시 인증 토큰과 이벤트 리스너가 자동 복구된다.
- Node 환경에서 글로벌 `WebSocket` 이 없으면 `ws` 패키지로 polyfill (모듈 로드 시 1회).

## RPC 호출

```ts
client.getService<TService>(serviceName: string): ServiceProxy<TService>
client.send(serviceName, methodName, params: unknown[], progress?: ServiceProgress): Promise<unknown>
type ServiceProxy<T> = { [K in keyof T]: T[K] extends (...a: infer P) => infer R ? (...a: P) => Promise<Awaited<R>> : never }
interface ServiceProgress { request?(s: ServiceProgressState): void; response?(s): void; server?(s): void }
interface ServiceProgressState { uuid: string; totalSize: number; completedSize: number }
```

- `getService` 는 Proxy. 임의 메서드명 호출 가능하며 타입 보장은 `TService` 로만.
- 와이어 메시지 이름은 `"<serviceName>.<methodName>"`.
- 인코드/디코드의 Worker 오프로딩 임계값:
  - **인코드**: body 가 `Uint8Array`, 30KB 초과 문자열, 길이 100 초과 배열, 또는 첫 원소가 `Uint8Array` 인 배열일 때 Worker.
  - **디코드**: 수신 바이트 30KB 초과 시 Worker.
  - Worker 미지원/초기화 실패 환경은 메인 스레드 fallback.
- 소켓 끊김·재연결 시 대기 중인 모든 요청은 `"요청 취소됨: 소켓 연결이 끊어졌습니다"` 로 reject.

## 인증

```ts
client.auth(token: string): Promise<void>
```

- 서버에 `auth` 메시지를 보내고 토큰을 내부 저장. 재연결 시 동일 토큰으로 자동 재인증.
- `uploadFile` 은 토큰이 없으면 즉시 throw.

## 이벤트 (서버 push)

```ts
client.getEvent<TEventDef>(eventName: string): ClientEventProxy<TEventDef>
client.addListener<TEventDef>(eventName, info: TEventDef["$info"], cb): Promise<string>   // listener key
client.removeListener(key: string): Promise<void>
client.emitEvent<TEventDef>(eventName, infoSelector: (info) => boolean, data): Promise<void>
interface ClientEventProxy<T> { addListener(info, cb): Promise<string>; removeListener(key): Promise<void>; emit(infoSelector, data): Promise<void> }
```

- `addListener` 는 `connected` 상태에서만 호출 가능 (그 외 throw). 로컬 맵에 보관해 재연결 시 자동 재구독.
- `emitEvent` 는 서버에 `evt:gets` 로 후보 목록을 받아 `infoSelector` 통과분에만 `evt:emit` 호출. 대상 0건이면 emit 생략.
- 핸들러 내부 에러는 로깅만, 다른 핸들러 호출은 계속.
- `removeListener` 는 서버 전송 실패를 무시함 (서버가 연결 끊김 시 자동 정리하므로).

## 파일 업/다운로드

```ts
client.uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>
client.downloadFileBuffer(relPath: string): Promise<Uint8Array>
type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string
interface FileCollection { readonly length; item(i); [i]; [Symbol.iterator]() }  // 브라우저 FileList 와 구조적 호환
```

- 업로드: `POST {hostUrl}/upload` (multipart). 헤더 `x-sd-client-name`, `Authorization: Bearer <token>`. 인증 필수.
- 다운로드: `GET {hostUrl}/{relPath}` 응답 본문을 `Uint8Array` 로 반환. `relPath` 가 `/` 로 시작하지 않으면 자동 prepend.
- 브라우저 전용 `File`/`FileList` 대신 `BlobInput`/`FileCollection` 으로 Node 환경도 지원.

## ORM 클라이언트

```ts
createOrmClientConnector(client: ServiceClient): OrmClientConnector
interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: { database: string; schema: string };   // 지정 시 둘 다 필수
}
connector.connect(config, async db => ...)               // 트랜잭션 래핑
connector.connectWithoutTransaction(config, async db => ...)
```

- 서버 `"Orm"` 서비스에 RPC 를 걸어 `getInfo` → `connect` → `executeDefs` / `executeParametrized` / `bulkInsert` / `begin·commit·rollbackTransaction` / `close` 를 위임.
- `dbContextOpt` 생략 시 서버가 알려준 `database` / `schema` 사용. 최종 `database` 가 빈 값이면 throw.
- 외래키 참조 위반 메시지(`a parent row: a foreign key constraint` / `conflicted with the REFERENCE`)는 "경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요." 로 변환되어 throw (원본은 `cause`).
- `OrmClientDbContextExecutor` 는 `DbContextExecutor` 구현체. 보통 connector 가 내부 생성하며 직접 인스턴스화는 커스텀 `DbContext` 구성 시에만.

## 인스턴스 이벤트 (상태/진행률)

```ts
client.on("state", (s: "connected" | "closed" | "reconnecting") => ...)
client.on("request-progress",  (s: ServiceProgressState) => ...)  // 클라 → 서버 전송 청크 진행
client.on("response-progress", (s: ServiceProgressState) => ...)  // 서버 → 클라 응답 청크 진행
client.on("server-progress",   (s: ServiceProgressState) => ...)  // 서버가 명시적으로 보내는 진행률
```

- `request-progress` 는 인코드 결과 chunk 가 2개 이상일 때만 0% 초기값 발행. 단일 청크면 발행 없음.
- `response-progress` 는 분할 수신 중에는 서버 progress 메시지, 응답 완료 시 100% 보정값으로 발행.
- `send` 호출에 전달한 `progress` 콜백은 인스턴스 이벤트와 함께 호출됨.

## 환경 호환 유틸

```ts
import { BlobInput, FileCollection, BrowserWorker,
         isBrowserWorkerSupported, isNodeWorkerSupported, isWorkerSupported }
  from "@simplysm/service-client";
```

- `BrowserWorker` — DOM `Worker` 의 최소 구조 호환 인터페이스. Node 환경 typecheck 통과용.
- `isBrowserWorkerSupported()` — `"Worker" in globalThis`.
- `isNodeWorkerSupported()` — `process.versions.node` 존재 여부.
- `isWorkerSupported()` — 위 둘 중 하나.
- 보통 직접 호출할 필요 없음 (`ServiceClient` 내부에서 분기). 환경 분기 로직을 사용자 코드에서 직접 짤 때만 사용.
