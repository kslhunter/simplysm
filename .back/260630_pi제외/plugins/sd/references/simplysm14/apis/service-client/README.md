# @simplysm/service-client

WebSocket 기반 서비스 클라이언트. 서비스 RPC, 인증, 파일 업/다운로드, 진행률 이벤트, 서버 푸시 이벤트, 원격 ORM 실행의 클라이언트 진입점을 제공한다.

## 사용 트리거 인덱스

- **ServiceClient / createServiceClient** — 서비스 서버 연결, 인증, 상태·진행률 이벤트, 공통 통신 진입점이 필요할 때. 사용법: [client-service.md](../../manuals/client-service.md)
- **ServiceConnectionOptions** — 접속 host/port/ssl 과 재연결 횟수를 정할 때.
- **getService / ServiceProxy** — 서버 서비스 메서드를 타입 있는 Promise RPC 프록시로 호출할 때. 사용법: [client-service.md](../../manuals/client-service.md)
- **이벤트 구독·발행** — `defineEvent` 기반 이벤트를 구독·발행하거나 재연결 후 재구독 동작을 확인할 때. 자세히: [events.md](./events.md). 사용법: [event.md](../../manuals/event.md)
- **파일 업/다운로드** — 인증 토큰으로 `/upload` 에 파일을 보내거나 서버 상대경로를 바이트로 받을 때.
- **ServiceProgress / ServiceProgressState** — `send` 단건 콜백 또는 `ServiceClient` 이벤트로 요청·응답·서버 진행 상태를 받을 때.
- **브라우저/Node 호환 타입·Worker 헬퍼** — DOM 타입 없이 파일·Blob·Worker 타입을 쓰거나 Worker 지원 여부를 분기할 때.
- **ORM 원격 실행** — 클라이언트에서 `DbContext` 콜백을 서버 ORM 서비스로 실행할 때. 자세히: [orm.md](./orm.md). 사용법: [client-orm.md](../../manuals/client-orm.md), [orm.md](../../manuals/orm.md)
- **저수준 전송 계층** — 소켓, 하트비트, 요청 uuid 매칭, 프로토콜 Worker 오프로딩을 직접 확인할 때. 자세히: [transport.md](./transport.md)

## ServiceClient / createServiceClient

```ts
function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient;
class ServiceClient extends EventEmitter<ServiceClientEvents>;
```

- `name: string` — 클라이언트 이름. WebSocket 생성 시 `clientName` 쿼리, 파일 업로드 시 `x-sd-client-name` 헤더로 전달된다.
- `options: ServiceConnectionOptions` — 접속 대상과 재연결 정책. 생성자에서 WebSocket URL과 HTTP `hostUrl` 계산에 사용된다.
- `connected: boolean` — 내부 소켓의 OPEN 여부. `addListener` 는 false 일 때 `"서버에 연결되지 않았습니다."` 를 throw 한다.
- `hostUrl: string` — `ssl` 이 true 면 `https://host:port`, 아니면 `http://host:port`. 파일 클라이언트의 기준 URL이다.
- `connect(): Promise<void>` — 내부 소켓 연결을 시작한다.
- `close(): Promise<void>` — 내부 소켓을 닫고 프로토콜 래퍼를 `dispose()` 한다.
- `send(serviceName: string, methodName: string, params: unknown[], progress?: ServiceProgress): Promise<unknown>` — `${serviceName}.${methodName}` 메시지를 전송한다. 전역 진행률 이벤트를 emit 한 뒤 전달받은 `progress` 콜백도 호출한다.
- `auth(token: string): Promise<void>` — `{ name: "auth", body: token }` 메시지를 보내고 성공하면 토큰을 보관한다. 보관 토큰은 재연결 시 재인증과 파일 업로드 Authorization 헤더에 사용된다.
- `getService<TService>(serviceName: string): ServiceProxy<TService>` — 서버 서비스 프록시를 만든다. 자세한 타입 변환은 아래 `ServiceProxy` 참조.
- `getEvent`, `addListener`, `removeListener`, `emitEvent` — 이벤트 API. 자세히: [events.md](./events.md)
- `uploadFile`, `downloadFileBuffer` — 파일 API. 아래 `파일 업/다운로드` 참조.

`ServiceClient` 상태·진행률 이벤트:

- `"request-progress": ServiceProgressState` — `send` 의 요청 진행 상태를 emit 한다.
- `"response-progress": ServiceProgressState` — `send` 의 응답 진행 상태를 emit 한다.
- `"server-progress": ServiceProgressState` — 서버 `progress` 메시지의 진행 상태를 emit 한다.
- `"state": "connected"|"closed"|"reconnecting"` — 내부 소켓 상태. `"connected"` 에서는 보관 토큰 재인증과 이벤트 재구독을 시도한다.
  - `"connected"` — 연결 또는 재연결 성공.
  - `"closed"` — 수동 종료 또는 재연결 포기.
  - `"reconnecting"` — 재연결 시도 중.

## ServiceConnectionOptions

```ts
interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

- `port: number` — 접속 포트. WebSocket URL과 HTTP `hostUrl` 에 들어간다.
- `host: string` — 접속 호스트. WebSocket URL과 HTTP `hostUrl` 에 들어간다.
- `ssl?: boolean` — 프로토콜 선택값. true 면 `wss`/`https`, false·미지정이면 `ws`/`http` 를 사용한다.
- `maxReconnectCount?: number` — 소켓 생성에 전달되는 최대 재연결 횟수. `ServiceClient` 미지정값은 10, 0은 재연결 비활성화.

## getService / ServiceProxy

```ts
getService<TService>(serviceName: string): ServiceProxy<TService>;
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

- `TService` — 서비스 메서드 타입. 함수 멤버만 RPC 함수로 매핑되고 함수가 아닌 멤버는 `never` 가 된다.
- `serviceName: string` — 전송 메시지 이름의 서비스 부분. 프록시 메서드 접근 시 `${serviceName}.${methodName}` 으로 전송된다.
- `K in keyof TService` — 원본 서비스의 각 멤버 이름. `Proxy.get` 에서 문자열 메서드명으로 변환된다.
- `P` — 원본 메서드의 인자 튜플. RPC 전송 시 `params: unknown[]` 로 전달된다.
- `R` — 원본 메서드 반환 타입. 프록시에서는 `Promise<Awaited<R>>` 로 감싼다.

## 파일 업/다운로드

```ts
interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(files: File[] | FileCollection | { name: string; data: BlobInput }[], authToken: string): Promise<ServiceUploadResult[]>;
}
function createFileClient(hostUrl: string, clientName: string): FileClient;
ServiceClient.uploadFile(files: File[] | FileCollection | { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>;
ServiceClient.downloadFileBuffer(relPath: string): Promise<Bytes>;
```

- `hostUrl: string` — `download` 의 기준 URL, `upload` 의 `${hostUrl}/upload` 기준값.
- `clientName: string` — 업로드 요청의 `x-sd-client-name` 헤더 값.
- `relPath: string` — `download` 가 `path.join(hostUrl, relPath)` 로 합치는 상대 경로. `fetch` 응답이 `ok` 가 아니면 `다운로드 실패: ...` 에러를 throw 한다.
- `files: File[] | FileCollection | { name: string; data: BlobInput }[]` — 업로드 대상. 배열이 아니면 `Array.from(files)` 로 변환한다.
- `name: string` — 커스텀 업로드 객체의 파일명. `FormData.append("files", blob, name)` 의 filename 으로 전달된다.
- `data: BlobInput` — 커스텀 업로드 객체의 본문. `Blob` 이 아니면 `new Blob([data])` 로 감싼다.
- `authToken: string` — 업로드 요청의 `Authorization: Bearer ${authToken}` 헤더 값.
- `uploadFile` — 보관된 인증 토큰이 없으면 `auth()` 호출을 요구하는 에러를 throw 하고, 있으면 내부 `FileClient.upload` 를 호출한다.

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

- `request?: (s) => void` — 요청 인코딩 결과 청크가 2개 이상일 때 `completedSize: 0` 상태로 호출된다.
- `response?: (s) => void` — 프로토콜 decode 결과가 `progress` 일 때 호출되고, 분할 응답 완료 시 `completedSize === totalSize` 로 한 번 더 호출된다.
- `server?: (s) => void` — 서버 메시지 이름이 `"progress"` 일 때 본문의 `totalSize`·`completedSize` 로 호출된다.
- `uuid: string` — 요청 식별자. `send` 가 생성하고 진행 상태에 포함한다.
- `totalSize: number` — 전체 크기.
- `completedSize: number` — 완료 크기.

## 브라우저/Node 호환 타입·Worker 헬퍼

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

- `BlobInput` — DOM `BlobPart` 대체 타입. 커스텀 파일 업로드의 `data` 타입으로 쓰인다.
- `FileCollection.length: number` — 파일 개수.
- `FileCollection.item(index): File | null` — 인덱스의 파일 또는 없음.
- `FileCollection[index]: File` — 인덱스 접근 파일.
- `FileCollection[Symbol.iterator]()` — `Array.from(files)` 변환에 필요한 반복자.
- `BrowserWorker.onmessage` — Worker 성공/실패 응답 수신 핸들러 자리.
- `BrowserWorker.onerror` — Worker 초기화·실행 오류 핸들러 자리.
- `BrowserWorker.postMessage(message, transfer?)` — Worker 작업 요청 전송. `transfer` 는 전송 가능한 객체 배열 자리.
- `BrowserWorker.terminate()` — Worker 종료 메서드 자리.
- `isBrowserWorkerSupported()` — `"Worker" in globalThis` 결과.
- `isNodeWorkerSupported()` — `globalThis.process?.versions?.node != null` 결과.
- `isWorkerSupported()` — 브라우저 Worker 또는 Node worker_threads 지원 중 하나라도 가능하면 true.
