# @simplysm/service-common

클라이언트-서버 통신을 위한 공유 프로토콜, 타입, 이벤트 정의.

## 설치

```bash
npm install @simplysm/service-common
```

**의존성:** `@simplysm/core-common`, `@simplysm/orm-common`

## 주요 기능

### 바이너리 프로토콜

28바이트 헤더 + JSON 바디 구조. 3MB 초과 시 300KB 청크로 자동 분할. 최대 메시지 크기 100MB.

#### 프로토콜 설정값 (`PROTOCOL_CONFIG`)

```typescript
import { PROTOCOL_CONFIG } from "@simplysm/service-common";

PROTOCOL_CONFIG.MAX_TOTAL_SIZE;    // 100MB - 최대 메시지 크기
PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE; // 3MB - 청크 분할 기준
PROTOCOL_CONFIG.CHUNK_SIZE;         // 300KB - 청크 크기
PROTOCOL_CONFIG.GC_INTERVAL;        // 10초 - 미완성 청크 GC 주기
PROTOCOL_CONFIG.EXPIRE_TIME;        // 60초 - 미완성 메시지 만료 시간
```

#### 프로토콜 생성 및 사용

```typescript
import { createServiceProtocol } from "@simplysm/service-common";
import type { ServiceProtocol, ServiceMessageDecodeResult } from "@simplysm/service-common";

const protocol: ServiceProtocol = createServiceProtocol();

// 인코딩: 메시지를 바이너리 청크 배열로 변환
const { chunks, totalSize } = protocol.encode(uuid, message);
// chunks: Bytes[]  - 전송할 바이너리 청크 배열
// totalSize: number - 전체 메시지 크기

// 디코딩: 수신된 바이너리를 메시지로 복원 (청크 자동 재조립)
const result: ServiceMessageDecodeResult<ServiceMessage> = protocol.decode(bytes);

if (result.type === "complete") {
  // 모든 청크 수신 완료
  result.uuid;    // string - 메시지 UUID
  result.message;  // ServiceMessage - 복원된 메시지
} else {
  // result.type === "progress" - 청크 수신 중
  result.uuid;          // string
  result.totalSize;     // number - 전체 크기
  result.completedSize; // number - 수신 완료된 크기
}

// 사용 완료 후 반드시 dispose 호출 (내부 GC 타이머 해제)
protocol.dispose();
```

#### 헤더 구조 (28바이트, Big Endian)

| 오프셋 | 크기 | 필드 |
|--------|------|------|
| 0 | 16 | UUID (binary) |
| 16 | 8 | TotalSize (uint64) |
| 24 | 4 | Index (uint32) |

### 이벤트 정의

타입 안전한 클라이언트-서버 이벤트 시스템.

```typescript
import { defineEvent } from "@simplysm/service-common";
import type { ServiceEventDef } from "@simplysm/service-common";

// 이벤트 정의 (TInfo: 구독 조건 타입, TData: 이벤트 데이터 타입)
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// 서버에서 이벤트 발행
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// 클라이언트에서 이벤트 구독
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  // data.status는 string으로 타입 추론됨
});
```

#### `ServiceEventDef<TInfo, TData>`

```typescript
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;   // 타입 추출 전용 (런타임 미사용)
  readonly $data: TData;   // 타입 추출 전용 (런타임 미사용)
}
```

#### `defineEvent<TInfo, TData>(eventName: string): ServiceEventDef<TInfo, TData>`

이벤트 이름과 타입 파라미터로 타입 안전한 이벤트 정의 객체를 생성한다.

### 메시지 타입

모든 메시지는 `ServiceMessage` 유니온 타입에 포함된다.

#### 방향별 메시지 그룹

```typescript
// 서버 → 클라이언트 메시지
type ServiceServerMessage =
  | ServiceReloadMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceEventMessage;

// 서버 → 클라이언트 (progress 포함)
type ServiceServerRawMessage = ServiceProgressMessage | ServiceServerMessage;

// 클라이언트 → 서버 메시지
type ServiceClientMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage;
```

#### 전체 메시지 타입 목록

| 타입 | name 필드 | 방향 | 설명 |
|------|-----------|------|------|
| `ServiceRequestMessage` | `` `${service}.${method}` `` | C->S | RPC 호출. body: `unknown[]` (파라미터 배열) |
| `ServiceResponseMessage` | `"response"` | S->C | RPC 응답. body?: `unknown` (결과값, 선택) |
| `ServiceErrorMessage` | `"error"` | S->C | 에러. body: `{ name, message, code, stack?, detail?, cause? }` |
| `ServiceAuthMessage` | `"auth"` | C->S | 인증. body: `string` (Bearer 토큰) |
| `ServiceProgressMessage` | `"progress"` | 양방향 | 청크 진행률. body: `{ totalSize, completedSize }` |
| `ServiceReloadMessage` | `"reload"` | S->C | 리로드 알림. body: `{ clientName, changedFileSet }` |
| `ServiceAddEventListenerMessage` | `"evt:add"` | C->S | 이벤트 리스너 등록. body: `{ key, name, info }` |
| `ServiceRemoveEventListenerMessage` | `"evt:remove"` | C->S | 이벤트 리스너 해제. body: `{ key }` |
| `ServiceGetEventListenerInfosMessage` | `"evt:gets"` | C->S | 이벤트 리스너 목록 조회. body: `{ name }` |
| `ServiceEmitEventMessage` | `"evt:emit"` | C->S | 이벤트 발행. body: `{ keys, data }` |
| `ServiceEventMessage` | `"evt:on"` | S->C | 이벤트 브로드캐스트. body: `{ keys, data }` |

### 서비스 인터페이스

#### ORM 서비스 (`OrmService`)

DB 연결, 트랜잭션, 쿼리 실행을 제공한다. MySQL, MSSQL, PostgreSQL 지원.

```typescript
import type { OrmService, DbConnOptions } from "@simplysm/service-common";

interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;

  connect(opt: Record<string, unknown>): Promise<number>;
  close(connId: number): Promise<void>;

  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;

  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;

  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

##### `DbConnOptions`

```typescript
type DbConnOptions = {
  configName?: string;
  config?: Record<string, unknown>;
};
```

#### 자동 업데이트 서비스 (`AutoUpdateService`)

```typescript
import type { AutoUpdateService } from "@simplysm/service-common";

interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

`platform`: `"win32"`, `"darwin"`, `"linux"` 등.

#### SMTP 클라이언트 서비스 타입

```typescript
import type {
  SmtpClientSendOption,
  SmtpClientSendByDefaultOption,
  SmtpClientSendAttachment,
  SmtpClientDefaultOptions,
} from "@simplysm/service-common";

// 직접 SMTP 설정 포함하여 메일 전송
interface SmtpClientSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}

// 기본 SMTP 설정 사용 시 (from/host/user/pass 등 생략)
interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}

// 기본 SMTP 서버 설정
interface SmtpClientDefaultOptions {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}

// 첨부파일
interface SmtpClientSendAttachment {
  filename: string;
  content?: string | Uint8Array;
  path?: any;
  contentType?: string;
}
```

### 파일 업로드 결과

```typescript
import type { ServiceUploadResult } from "@simplysm/service-common";

interface ServiceUploadResult {
  path: string;       // 서버 저장 경로
  filename: string;   // 원본 파일명
  size: number;       // 파일 크기 (bytes)
}
```

## 디렉토리 구조

```
src/
  index.ts                                  # 엔트리포인트 (모든 export 재수출)
  define-event.ts                           # defineEvent(), ServiceEventDef
  types.ts                                  # ServiceUploadResult
  protocol/
    protocol.types.ts                       # PROTOCOL_CONFIG, 메시지 타입 정의
    create-service-protocol.ts              # createServiceProtocol(), ServiceProtocol
  service-types/
    orm-service.types.ts                    # OrmService, DbConnOptions
    auto-update-service.types.ts            # AutoUpdateService
    smtp-client-service.types.ts            # SmtpClientSend*, SmtpClientDefault*
```
