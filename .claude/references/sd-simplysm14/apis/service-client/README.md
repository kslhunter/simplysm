# @simplysm/service-client

`@simplysm/service-server` 와 WebSocket 으로 통신하는 클라이언트. RPC 호출·이벤트 구독·파일 업/다운로드·원격 ORM 실행을 단일 `ServiceClient` 에서 제공한다 (Node/브라우저 공용).

## 사용 트리거 인덱스

- **createServiceClient / ServiceConnectionOptions** — 서버 접속용 `ServiceClient` 를 만들고 `connect()`/`close()` 로 연결을 열고 닫을 때.
- **getService / send / ServiceProxy** — 서버에 등록된 서비스의 메서드를 타입 안전 RPC 로 호출할 때 (Proxy 기반 메서드 호출 또는 저수준 `send`).
- **auth** — 서버 인증 토큰을 등록하고 재연결 시 자동 재인증되도록 토큰을 내부에 보관할 때.
- **getEvent / addListener / removeListener / emitEvent** — 서버 push 이벤트를 구독·해지하거나, 다른 클라이언트에게 이벤트를 발행할 때.
- **uploadFile / downloadFileBuffer** — 서버에 multipart 파일을 올리거나 정적 경로에서 바이트(`Uint8Array`)로 받을 때.
- **createOrmClientConnector / OrmConnectOptions** — 서버 측 `"Orm"` 서비스를 통해 `DbContext` 트랜잭션을 원격 실행할 때.
- **ServiceClient 이벤트 (`state` / `request-progress` / `response-progress` / `server-progress`)** — 연결 상태 변화와 전송/응답/서버 진행률을 인스턴스 레벨에서 구독할 때.
- **BlobInput / FileCollection / isWorkerSupported 외** — Node/브라우저 양쪽 환경에서 동일한 코드를 쓰기 위해 DOM 의존 타입을 대체하거나 Worker 지원 여부를 미리 확인할 때.

## 연결/생성

```ts
createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient
interface ServiceConnectionOptions { port: number; host: string; ssl?: boolean; maxReconnectCount?: number; }
client.connect(): Promise<void>
client.close(): Promise<void>     // protocol wrapper 의 worker 자원도 dispose
client.connected: boolean
client.hostUrl: string            // `${ssl?https:http}://host:port`
```

- WebSocket URL 은 `${ws|wss}://host:port/ws?ver=2&clientId=<uuid>&clientName=<name>` 으로 접속한다.
- `maxReconnectCount` 기본 10, `0` 이면 재연결 비활성.
- 5s 마다 ping, 30s 무응답 시 강제 재연결. 재연결 성공 시 인증 토큰(`auth()`)과 이벤트 리스너(`addListener`)가 자동 복구된다.

## RPC 호출

```ts
client.getService<TService>(serviceName): ServiceProxy<TService>
client.send(serviceName, methodName, params, progress?): Promise<unknown>
type ServiceProxy<T> = { [K in keyof T]: T[K] extends (...a:infer P)=>infer R ? (...a:P)=>Promise<Awaited<R>> : never }
interface ServiceProgress { request?(s); response?(s); server?(s); }
interface ServiceProgressState { uuid: string; totalSize: number; completedSize: number; }
```

- `getService` 는 Proxy 라 임의 메서드명 호출 가능. 타입은 `TService` 로만 보장된다.
- 와이어 메시지 이름은 `"<serviceName>.<methodName>"`.
- 인코딩/디코딩의 Worker 오프로딩 임계값:
  - **인코드**: body 가 `Uint8Array`, 30KB 초과 문자열, 길이 100 초과 배열, 또는 첫 요소가 `Uint8Array` 인 배열일 때 Worker 사용.
  - **디코드**: 수신 바이트가 30KB 초과일 때 Worker 사용.
  - Worker 미지원 환경(또는 초기화 실패)에선 메인 스레드 fallback.

## 인증

```ts
client.auth(token: string): Promise<void>
```

- 서버에 `auth` 메시지를 보내고 토큰을 내부 저장. 재연결 시 자동으로 같은 토큰으로 재인증.
- `uploadFile` 은 인증 토큰이 없으면 에러를 던진다.

## 이벤트 (서버 push)

```ts
client.getEvent<TEventDef>(eventName): ClientEventProxy<TEventDef>
client.addListener<TEventDef>(eventName, info, cb): Promise<string>   // key 반환
client.removeListener(key): Promise<void>
client.emitEvent<TEventDef>(eventName, infoSelector, data): Promise<void>
interface ClientEventProxy<T> { addListener(info, cb): Promise<string>; removeListener(key): Promise<void>; emit(infoSelector, data): Promise<void>; }
```

- `addListener` 는 연결 상태에서만 호출 가능 (`!connected` 시 throw). 로컬 맵에도 보관해 재연결 시 자동 재구독.
- `emitEvent` 는 서버에 `evt:gets` 로 후보를 받아 `infoSelector` 통과분에만 `evt:emit` 호출. 대상이 0건이면 emit 생략.
- 핸들러 내부 에러는 로깅만 되고 다른 핸들러 호출은 계속 진행.

## 파일 업/다운로드

```ts
client.uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>
client.downloadFileBuffer(relPath: string): Promise<Uint8Array>
type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string
interface FileCollection { length; item(i); [i]; [Symbol.iterator]() }  // 브라우저 FileList 호환
```

- 업로드: `POST {hostUrl}/upload` (multipart). 헤더 `x-sd-client-name`, `Authorization: Bearer <token>`. 인증 필수.
- 다운로드: `GET {hostUrl}/{relPath}` 의 응답 본문을 `Uint8Array` 로 반환. `relPath` 가 `/` 로 시작하지 않으면 자동으로 붙임.
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

- 서버의 `"Orm"` 서비스에 RPC 를 걸어 `getInfo` → `connect` → `executeDefs`/`executeParametrized`/`bulkInsert` 등을 실행.
- `dbContextOpt` 생략 시 서버가 알려준 `database`/`schema` 사용. 최종 `database` 가 빈 값이면 에러.
- 외래키 참조 위반 에러(`a parent row: a foreign key constraint` / `conflicted with the REFERENCE`)는 "경고! 연관된 작업으로 인해 작업이 거부되었습니다..." 사용자 메시지로 변환되어 throw (원본은 `cause`).

## 상태/진행률 이벤트

```ts
client.on("state", (s: "connected" | "closed" | "reconnecting") => ...)
client.on("request-progress",  (s: ServiceProgressState) => ...)  // 클라이언트 → 서버 전송 청크 진행
client.on("response-progress", (s: ServiceProgressState) => ...)  // 서버 → 클라이언트 응답 청크 진행
client.on("server-progress",   (s: ServiceProgressState) => ...)  // 서버가 명시적으로 보내는 진행률
```

- `request-progress` 는 인코드 결과 chunk 가 2개 이상일 때만 초기 0% 가 발행됨. 단일 청크는 progress 없음.
- `response-progress` 는 분할 수신 중에는 서버 progress 메시지로, 응답 완료 시 100% 보정값으로 발행됨.
- `send` 호출 시 전달한 `progress?: ServiceProgress` 콜백은 인스턴스 이벤트와 함께 호출된다.

## 환경 호환 유틸

```ts
import { BlobInput, FileCollection, BrowserWorker,
         isBrowserWorkerSupported, isNodeWorkerSupported, isWorkerSupported }
  from "@simplysm/service-client";
```

- `BrowserWorker` — DOM `Worker` 의 구조적 호환 인터페이스. Node 환경 typecheck 통과용.
- `isBrowserWorkerSupported()` / `isNodeWorkerSupported()` / `isWorkerSupported()` — 현재 런타임에서 Worker 오프로딩이 가능한지 사전 확인.
- 보통 직접 호출할 필요 없음. `ServiceClient` 가 내부에서 분기하므로, 환경별 분기 로직을 사용자 코드에서 직접 짤 때만 사용.
