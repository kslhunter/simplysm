# @simplysm/service-client

`@simplysm/service-server` 와 WebSocket 으로 통신하는 클라이언트. RPC 호출·이벤트 구독·파일 업/다운로드·원격 ORM 실행을 단일 `ServiceClient` 에서 제공한다 (Node/브라우저 공용).

## 사용 트리거 인덱스
- **createServiceClient / ServiceConnectionOptions** — 클라이언트 인스턴스 생성·서버 접속/종료할 때.
- **getService / send / ServiceProxy** — 서버 서비스 메서드를 타입 안전 RPC 로 호출할 때.
- **auth** — 서버 인증 토큰을 등록하고 재연결 시 자동 재인증되게 할 때.
- **getEvent / addListener / removeListener / emitEvent** — 서버 사이드 이벤트 구독 또는 다른 클라이언트로 이벤트 발행할 때.
- **uploadFile / downloadFileBuffer** — 서버에 파일을 올리거나 정적 경로에서 바이트로 받을 때.
- **createOrmClientConnector / OrmConnectOptions** — 서버의 ORM 서비스를 통해 DbContext 트랜잭션을 원격 실행할 때.
- **ServiceClient 이벤트 (`state`, `request-progress`, `response-progress`, `server-progress`)** — 연결 상태와 전송/응답/서버 진행률을 구독할 때.

## 연결/생성
```ts
createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient
interface ServiceConnectionOptions { port: number; host: string; ssl?: boolean; maxReconnectCount?: number; }
client.connect(): Promise<void>
client.close(): Promise<void>
client.connected: boolean
client.hostUrl: string  // `${ssl?https:http}://host:port`
```
- WebSocket URL 은 `${ws|wss}://host:port/ws` 로 고정.
- `maxReconnectCount` 기본 10, `0` 이면 재연결 비활성.
- 5s ping / 30s 무응답 시 강제 재연결, 재연결 성공 시 인증 토큰과 이벤트 리스너가 자동 복구됨.

## RPC 호출
```ts
client.getService<TService>(serviceName): ServiceProxy<TService>
client.send(serviceName, methodName, params, progress?): Promise<unknown>
type ServiceProxy<T> = { [K in keyof T]: T[K] extends (...a:infer P)=>infer R ? (...a:P)=>Promise<Awaited<R>> : never }
interface ServiceProgress { request?(s); response?(s); server?(s); }
interface ServiceProgressState { uuid: string; totalSize: number; completedSize: number; }
```
- `getService` 는 Proxy 라 임의 메서드명 호출 가능. 타입은 `TService` 로만 보장됨.
- 메시지 이름은 `"<serviceName>.<methodName>"` 으로 전송.
- 30KB 초과 또는 `Uint8Array`/큰 배열 페이로드는 Worker 에서 인코딩/디코딩.

## 인증
```ts
client.auth(token: string): Promise<void>
```
- 서버에 `auth` 메시지를 보내고 토큰을 내부 저장. 재연결 시 자동으로 같은 토큰으로 재인증.
- `uploadFile` 은 인증 토큰이 없으면 에러를 던짐.

## 이벤트 (서버 push)
```ts
client.getEvent<TEventDef>(eventName): ClientEventProxy<TEventDef>
client.addListener<TEventDef>(eventName, info, cb): Promise<string>   // key 반환
client.removeListener(key): Promise<void>
client.emitEvent<TEventDef>(eventName, infoSelector, data): Promise<void>
interface ClientEventProxy<T> { addListener(info, cb): Promise<string>; removeListener(key): Promise<void>; emit(infoSelector, data): Promise<void>; }
```
- `addListener` 는 연결 상태에서만 가능. 로컬 맵에도 보관해 재연결 시 자동 재구독.
- `emitEvent` 는 서버에 `evt:gets` 로 후보를 받아 `infoSelector` 통과분에만 `evt:emit` 호출.
- 핸들러 내부 에러는 로깅만 되고 다른 핸들러 호출은 계속됨.

## 파일 업/다운로드
```ts
client.uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>
client.downloadFileBuffer(relPath: string): Promise<Uint8Array>
type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string
interface FileCollection { length; item(i); [i]; [Symbol.iterator]() }  // 브라우저 FileList 호환
```
- 업로드: `POST {hostUrl}/upload` (multipart). 헤더 `x-sd-client-name`, `Authorization: Bearer <token>`. 인증 필수.
- 다운로드: `GET {hostUrl}/{relPath}` 의 응답 본문을 `Uint8Array` 로 반환.
- 브라우저 전용 `File`/`FileList` 대신 `BlobInput`/`FileCollection` 으로 Node 환경도 지원.

## ORM 클라이언트
```ts
createOrmClientConnector(client: ServiceClient): OrmClientConnector
interface OrmConnectOptions<T extends DbContext> {
  DbClass: new (executor, { database, schema? }) => T;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: { database: string; schema: string };
}
connector.connect(config, async db => ...)               // 트랜잭션 래핑
connector.connectWithoutTransaction(config, async db => ...)
```
- 서버의 `"Orm"` 서비스에 RPC 를 걸어 `getInfo` → `connect` → `executeDefs` 등을 실행.
- `dbContextOpt` 생략 시 서버가 알려준 `database`/`schema` 사용. 둘 다 비면 에러.
- 외래키 참조 위반 에러(`a parent row: a foreign key constraint` / `conflicted with the REFERENCE`)는 사용자 메시지로 변환되어 throw.

## 상태/진행률 이벤트
```ts
client.on("state", (s: "connected" | "closed" | "reconnecting") => ...)
client.on("request-progress",  (s: ServiceProgressState) => ...)  // 클라이언트 → 서버 전송 청크 진행
client.on("response-progress", (s: ServiceProgressState) => ...)  // 서버 → 클라이언트 응답 청크 진행
client.on("server-progress",   (s: ServiceProgressState) => ...)  // 서버가 명시적으로 보내는 진행률
```
- 단일 청크 메시지에는 progress 가 발행되지 않음(분할 메시지에서만).
- `send` 호출 시 전달한 `progress?: ServiceProgress` 콜백은 인스턴스 이벤트와 별도로 호출됨.
