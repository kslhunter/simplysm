# @simplysm/service-client

WebSocket 기반 서비스 클라이언트. 서비스 RPC 호출, 인증, 요청, 응답, 서버 진행률 추적, 파일 업로드, 다운로드, 원격 ORM 실행의 클라이언트 진입점을 제공함.

## 사용 트리거 인덱스

- **ServiceClient / createServiceClient** — 서비스 서버 연결, 인증, 상태/진행률 추적, RPC 호출이 필요할 때. 사용법: [client-service.md](../../manuals/client-service.md)
- **이벤트 구독, 발행** — `defineEvent` 기반 이벤트를 서버, 클라이언트 간에 구독, 해제, 발행할 때. 자세히: [events.md](./events.md). 사용법: [event.md](../../manuals/event.md)
- **파일 업로드, 다운로드** — 인증 토큰으로 파일을 업로드하거나 서버 상대경로의 파일을 바이트로 다운로드할 때.
- **ORM 원격 실행** — 클라이언트에서 `DbContext` 콜백을 서버 `Orm` 서비스로 실행할 때. 자세히: [orm.md](./orm.md). 사용법: [client-orm.md](../../manuals/client-orm.md)
- **저수준 전송, 프로토콜** — 소켓 연결, 하트비트, 요청 매칭, 프로토콜 Worker 오프로딩을 직접 다룰 때. 자세히: [transport.md](./transport.md)
- **호환성 타입, Worker 헬퍼** — Node, 브라우저 양쪽 환경에서 파일, Blob, Worker 타입을 쓰거나 Worker 지원 여부로 분기할 때.

## ServiceClient / createServiceClient

```ts
function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient;
class ServiceClient extends EventEmitter<ServiceClientEvents>;
```

- `name: string` — 클라이언트 식별자. WebSocket 쿼리 `clientName`, 파일 업로드 헤더 `x-sd-client-name` 으로 전달됨.
- `options: ServiceConnectionOptions` — 접속 설정(host, port, ssl, maxReconnectCount). 생성자에서 WebSocket URL(`/ws`)과 HTTP `hostUrl` 계산에 사용됨.
- `name: string` (readonly) — 생성자의 name 인자 보존.
- `options: ServiceConnectionOptions` (readonly) — 생성자의 options 인자 보존.
- `connected: boolean` (getter) — 내부 소켓의 WebSocket.OPEN 여부. `addListener` 호출 시 false 면 `"서버에 연결되지 않았습니다."` throw.
- `hostUrl: string` (getter) — `options.ssl` 이 true 면 `https://host:port`, 아니면 `http://host:port`. 파일 업로드/다운로드의 기준 URL.

**메서드**:

- `connect(): Promise<void>` — 내부 소켓 연결 시작. 실패 시 예외 throw.
- `close(): Promise<void>` — 내부 소켓 닫기 및 프로토콜 래퍼 dispose. 수동 종료로 표시되어 자동 재연결 차단.
- `send(serviceName, methodName, params, progress?): Promise<unknown>` — `${serviceName}.${methodName}` 메시지를 body `params` 배열로 전송.
  진행 단계마다 전역 이벤트 emit 및 `progress` 콜백 호출. 응답 또는 에러 반환.
  - `serviceName: string` — 서비스 이름.
  - `methodName: string` — 메서드 이름.
  - `params: unknown[]` — 메서드 인자 배열.
  - `progress?: ServiceProgress` — 선택적 진행률 콜백.
- `auth(token: string): Promise<void>` — `{ name: "auth", body: token }` 메시지 전송. 성공 시 토큰 보관.
  재연결 시 자동 재인증 및 파일 업로드 Authorization 헤더에 사용.
- `getService<TService>(serviceName: string): ServiceProxy<TService>` — 서비스 RPC 프록시 생성. 아래 "getService / ServiceProxy" 참조.
- `getEvent<TEventDef>(eventDef: TEventDef): ClientEventProxy<TEventDef>` — 이벤트 정의에 대한 프록시 생성. [events.md](./events.md) 참조.
- `addListener<TEventDef>(eventDef, info, cb): Promise<string>` — 이벤트 리스너 등록. [events.md](./events.md) 참조.
- `removeListener(key): Promise<void>` — 리스너 제거. [events.md](./events.md) 참조.
- `emitEvent<TEventDef>(eventDef, infoSelector, data): Promise<void>` — 이벤트 발행. [events.md](./events.md) 참조.
- `uploadFile(files): Promise<ServiceUploadResult[]>` — 파일 업로드. 토큰 미보관 시 `auth()` 호출 요구 에러 throw.
- `downloadFileBuffer(relPath): Promise<Bytes>` — 파일 다운로드(바이트).

**emit 이벤트** (`.on(type, listener)` 로 구독):

- `"request-progress": ServiceProgressState` — 요청 인코딩 진행. 청크 2개 이상일 때만 발생.
- `"response-progress": ServiceProgressState` — 응답 수신 진행. 분할 응답 진행 중, 완료 시점.
- `"server-progress": ServiceProgressState` — 서버 `progress` 메시지. 서버가 보낸 진행률 반영.
- `"state": "connected" | "closed" | "reconnecting"` — 소켓 상태 변화.
  - `"connected"` — 최초 연결 또는 재연결 성공. 이 시점에서 보관 토큰 재인증 및 이벤트 재구독 시도.
  - `"closed"` — 수동 종료(`close()`) 또는 재연결 한도 초과.
  - `"reconnecting"` — 각 재연결 시도 시작. 최대 `maxReconnectCount` 회.

## ServiceConnectionOptions

```ts
interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

- `port: number` — 접속 포트. WebSocket과 HTTP 기준 URL에 사용.
- `host: string` — 접속 호스트명 또는 IP. WebSocket과 HTTP 기준 URL에 사용.
- `ssl?: boolean` — 프로토콜 선택. true 면 `wss`/`https`, 미지정, false 면 `ws`/`http`. 기본값: false.
- `maxReconnectCount?: number` — 최대 자동 재연결 횟수. `ServiceClient` 미지정 시 기본값 10.
  - 0 이면 재연결 비활성화(연결 끊김 시 즉시 포기).

## getService / ServiceProxy

```ts
getService<TService>(serviceName: string): ServiceProxy<TService>;
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

타입 안전 RPC 프록시. 원본 서비스 인터페이스의 각 함수 멤버를 비동기 프록시로 변환.

- `serviceName: string` — 서비스 이름. 프록시 메서드 호출 시 `${serviceName}.${methodName}` 으로 전송.
- `TService` — 서버 서비스 타입. 함수 멤버만 RPC 함수로 매핑. 비함수 멤버는 `never` 가 되어 호출 불가.
- `K in keyof TService` — 원본 서비스 멤버명. 프록시 `get` trap 에서 문자열 메서드명으로 변환되어 `send(serviceName, methodName, params)` 호출.
- `P` — 원본 메서드 인자 튜플. RPC 전송 시 배열 본문으로 전달.
- `R` — 원본 메서드 반환 타입. 프록시 결과는 항상 `Promise<Awaited<R>>` 로 감싸짐(async로 수렴).

**구현**: 빈 객체 `{}` 에 대한 JavaScript `Proxy`. 어떤 속성 접근도 해당 메서드명의 비동기 함수를 반환하고, 호출 시 `send` 를 경유.

## 파일 업로드, 다운로드

```ts
interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>;
downloadFileBuffer(relPath: string): Promise<Bytes>;
```

내부 `FileClient` 기반 파일 전송. `ServiceClient.uploadFile` 은 보관 토큰 자동 사용.

- `download(relPath)` — URL `path.join(hostUrl, relPath)` 를 `fetch` 후 `Uint8Array` 반환. 응답 `ok` 가 아니면 `다운로드 실패: <status> <statusText>` throw.
  - `relPath: string` — 서버 상대 경로.
- `upload(files, authToken)` — `files` 를 `FormData` 의 `"files"` 필드로 `POST /upload` 전송. 응답 JSON을 `ServiceUploadResult[]` 로 반환.
  응답 `ok` 가 아니면 `업로드 실패: <statusText>` throw.
  - `files: File[] | FileCollection | { name; data }[]` — 업로드 대상. 배열 아니면 `Array.from(files)` 변환.
    항목에 `data` 필드 있으면 커스텀 객체 `{ name, data }`, 없으면 브라우저 `File` 로 취급.
  - `name: string` — 커스텀 객체의 파일명. `FormData.append("files", blob, name)` 의 filename 인자.
  - `data: BlobInput` — 커스텀 객체의 본문. `Blob` 아니면 `new Blob([data])` 로 감쌈.
  - `authToken: string` — 요청 `Authorization: Bearer <authToken>` 헤더.
- `uploadFile(files)` — 보관 토큰 미존재 시 `auth()` 호출 요구 에러 throw. 토큰 존재 시 내부 `FileClient.upload` 호출.

## ServiceProgress / ServiceProgressState

```ts
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
  server?: (s: ServiceProgressState) => void;
}
interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

`send` 단건 진행 추적 콜백 및 전역 이벤트 payload.

- `request?: (s) => void` — 요청 인코딩 청크 2개 이상 시 `completedSize: 0` 상태로 한 번 호출.
- `response?: (s) => void` — 프로토콜 `decode` 결과가 `progress` 일 때 진행 상태로 호출. 분할 응답 최종 수신 시 `completedSize === totalSize`(100%) 로 한 번 더 호출.
- `server?: (s) => void` — 서버 메시지 이름이 `"progress"` 일 때 본문의 `totalSize`, `completedSize` 로 호출.
- `uuid: string` — 요청 식별자. 각 `send` 마다 고유 UUID 생성 포함.
- `totalSize: number` — 진행 대상 전체 크기(바이트).
- `completedSize: number` — 현재까지 완료 크기(바이트).

## 호환성 타입, Worker 헬퍼

DOM 전용 타입(`FileList`, `BlobPart`)을 대체해 Node, 브라우저 양쪽에서 typecheck 통과. Worker 지원 분기용 헬퍼.

```ts
type BlobInput = Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string;

interface FileCollection {
  readonly length: number;
  item(index: number): File | null;
  [index: number]: File;
  [Symbol.iterator](): IterableIterator<File>;
}

interface BrowserWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage(message: unknown, transfer?: unknown[]): void;
  terminate(): void;
}

function isBrowserWorkerSupported(): boolean;
function isNodeWorkerSupported(): boolean;
function isWorkerSupported(): boolean;
```

- `BlobInput` — `Blob | Uint8Array<ArrayBuffer> | ArrayBuffer | string`. 커스텀 파일 객체 `data` 필드 타입.
- `FileCollection.length: number` — 컬렉션 파일 개수.
- `FileCollection.item(index): File | null` — 인덱스 조회. 범위 벗어나면 null.
- `FileCollection[index]: File` — 인덱스 접근(음수, 범위 밖 동작은 환경 정의).
- `FileCollection[Symbol.iterator]()` — `Array.from(files)` 변환용 반복자.
- `BrowserWorker.onmessage` — Worker 메시지, 성공 응답 핸들러(초기 null).
- `BrowserWorker.onerror` — Worker 초기화, 실행 에러 핸들러(초기 null).
- `BrowserWorker.postMessage(message, transfer?)` — Worker 에 작업 요청. `transfer` 는 ownership 이전할 객체 배열(예: `ArrayBuffer`).
- `BrowserWorker.terminate()` — Worker 종료.
- `isBrowserWorkerSupported()` — 결과값: `"Worker" in globalThis`. 브라우저 DOM Worker 가용 여부.
- `isNodeWorkerSupported()` — 결과값: `globalThis.process?.versions?.node != null`. Node `worker_threads` 가용 여부.
- `isWorkerSupported()` — 결과값: `isBrowserWorkerSupported() || isNodeWorkerSupported()`. 어느 한쪽이라도 가용하면 true.
