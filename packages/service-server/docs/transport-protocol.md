# 전송 계층 및 프로토콜

## WebSocket 전송

### WebSocketHandler

다수의 WebSocket 연결을 관리하고, 메시지를 서비스로 라우팅하며, 이벤트 브로드캐스트를 처리한다.

```typescript
interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest): void;
  closeAll(): void;
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
}

function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

### WebSocket 연결 흐름

1. 클라이언트가 `/` 또는 `/ws`로 WebSocket 연결
2. 쿼리 파라미터로 프로토콜 버전 구분:
   - `ver=2&clientId=...&clientName=...` -- V2 프로토콜 (현재)
   - 쿼리 없음 -- V1 레거시 (AutoUpdate만 지원)
3. V2: `createServiceSocket`으로 소켓 래핑, 메시지 라우팅 시작
4. 같은 `clientId`로 재연결 시 이전 소켓을 종료하고 새 소켓으로 교체

### WebSocket 메시지 프로토콜

V2 클라이언트 메시지 포맷 (`ServiceClientMessage`):

| `name` | `body` | 설명 |
|--------|--------|------|
| `"{Service}.{Method}"` | `unknown[]` (파라미터 배열) | 서비스 메서드 호출 |
| `"auth"` | `string` (JWT 토큰) | 인증 토큰 설정 |
| `"evt:add"` | `{ key, name, info }` | 이벤트 리스너 등록 |
| `"evt:remove"` | `{ key }` | 이벤트 리스너 제거 |
| `"evt:gets"` | `{ name }` | 이벤트 리스너 목록 조회 |
| `"evt:emit"` | `{ keys, data }` | 대상 키에 이벤트 전송 |

V2 서버 응답 (`ServiceServerMessage`):

| `name` | `body` | 설명 |
|--------|--------|------|
| `"response"` | `unknown` (결과) | 성공 응답 |
| `"error"` | `{ name, message, code, stack }` | 에러 응답 |
| `"progress"` | `{ totalSize, completedSize }` | 전송 진행률 |
| `"evt:on"` | `{ keys, data }` | 이벤트 수신 |
| `"reload"` | `{ clientName, changedFileSet }` | 리로드 알림 |

---

### ServiceSocket

단일 WebSocket 연결을 관리하는 인터페이스. 프로토콜 인코딩/디코딩, ping/pong keep-alive(5초 간격), 이벤트 리스너 추적을 담당한다.

```typescript
interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  close(): void;
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;

  // 이벤트 리스너 관리
  addListener(key: string, eventName: string, info: unknown): void;
  removeListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
  filterEventTargetKeys(targetKeys: string[]): string[];

  // 이벤트 핸들러 등록
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}

function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

---

## HTTP 전송

### handleHttpRequest

HTTP API 요청 처리 함수. 서버 내부에서 `/api/:service/:method` 라우트에 등록된다.

```typescript
async function handleHttpRequest<TAuthInfo>(
  req: FastifyRequest,
  reply: FastifyReply,
  jwtSecret: string | undefined,
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    http: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  }) => Promise<unknown>,
): Promise<void>;
```

- GET: `?json=` 쿼리 파라미터에서 파라미터 배열을 JSON 파싱
- POST: request body를 배열로 파싱
- `x-sd-client-name` 헤더 필수
- `Authorization: Bearer <token>` 헤더가 있으면 JWT 검증 후 `authTokenPayload`로 전달

### handleUpload

파일 업로드 처리 함수. `/upload` 라우트에 등록된다. 인증 필수.

```typescript
async function handleUpload(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  jwtSecret: string | undefined,
): Promise<void>;
```

- multipart/form-data 필수
- 파일을 `rootPath/www/uploads/{UUID}.{ext}`로 저장
- 업로드 실패 시 불완전한 파일 자동 삭제
- 응답: `ServiceUploadResult[]`

### handleStaticFile

정적 파일 서빙 함수. 와일드카드 라우트 `/*`에 등록된다.

```typescript
async function handleStaticFile(
  req: FastifyRequest,
  reply: FastifyReply,
  rootPath: string,
  urlPath: string,
): Promise<void>;
```

- `rootPath/www/` 디렉토리 기준
- 디렉토리 접근 시 trailing slash 리다이렉트 + `index.html` 서빙
- `.`으로 시작하는 파일은 403 거부
- path traversal 방지 (보안 가드)

---

## 프로토콜 래퍼

메시지 인코딩/디코딩을 자동으로 워커 스레드에 오프로드한다. 30KB 이상의 메시지 또는 `Uint8Array` 포함 메시지는 워커에서 처리하여 메인 스레드 블로킹을 방지한다.

```typescript
interface ServerProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}

function createServerProtocolWrapper(): ServerProtocolWrapper;
```

### 워커 오프로드 조건

- **인코딩**: 메시지 body가 `Uint8Array`이거나, 배열 내에 `Uint8Array` 요소가 있으면 워커 사용
- **디코딩**: 메시지 크기가 30KB 초과이면 워커 사용
- 워커는 lazy singleton으로 관리 (최대 4GB 메모리 제한)

---

## 설정 관리

### getConfig

`.config.json` 파일을 읽고 캐시하는 함수.

```typescript
async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

- LRU 캐시: 1시간 만료, 10분마다 GC
- 파일 감시(FsWatcher)로 변경 시 자동 리로드
- 파일 삭제 시 캐시에서 제거 및 감시 해제
- 캐시 만료 시 감시도 함께 해제
