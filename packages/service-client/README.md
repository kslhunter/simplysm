# @simplysm/service-client

WebSocket 기반 RPC 서비스 클라이언트. 자동 재연결, 이벤트 구독, 파일 업로드/다운로드, ORM 연동을 지원한다.

## 설치

```bash
npm install @simplysm/service-client
```

**의존성:** `@simplysm/core-common`, `@simplysm/orm-common`, `@simplysm/service-common`

## 주요 사용법

### 클라이언트 생성 및 연결

```typescript
import { createServiceClient } from "@simplysm/service-client";

const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10, // 0이면 재연결 비활성화
});

await client.connect();
// ... 사용 ...
await client.close();
```

`ServiceClient` 클래스를 직접 사용할 수도 있다.

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});
```

### 서비스 호출 (RPC)

```typescript
// 타입 안전한 서비스 프록시
const userService = client.getService<UserService>("User");
const users = await userService.findAll();
const user = await userService.findById(1);

// 직접 호출
const result = await client.send("User", "findById", [1]);

// 진행률 콜백과 함께 호출
const result = await client.send("User", "exportData", [], {
  request: (state) => {
    // state.completedSize / state.totalSize 로 진행률 계산
  },
  response: (state) => {
    // state.completedSize / state.totalSize 로 진행률 계산
  },
});
```

### 인증

```typescript
await client.auth(jwtToken);
```

재연결 시 인증 토큰이 자동으로 재전송된다.

### 이벤트 구독

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderCreated = defineEvent<{ shopId: string }, { orderId: string; amount: number }>(
  "order-created"
);

// 이벤트 구독 (info로 필터 조건 전달)
const key = await client.addListener(
  OrderCreated,
  { shopId: "shop-1" },
  async (data) => {
    // data: { orderId: string; amount: number }
  }
);

// 이벤트 구독 해제
await client.removeListener(key);

// 이벤트 발행 (서버를 통해 다른 클라이언트에 전달)
await client.emitEvent(
  OrderCreated,
  (info) => info.shopId === "shop-1",
  { orderId: "order-123", amount: 50000 }
);
```

재연결 시 이벤트 리스너가 서버에 자동으로 재등록된다.

### 파일 업로드/다운로드

파일 업로드는 `auth()`로 인증한 후에만 사용할 수 있다.

```typescript
// 업로드 (인증 필수)
await client.auth(jwtToken);
const results = await client.uploadFile(fileInput.files);
// results: ServiceUploadResult[] (path, filename, size)

// { name, data } 객체 배열도 지원
await client.uploadFile([
  { name: "report.xlsx", data: uint8ArrayData },
]);

// 다운로드 (Uint8Array 반환)
const buffer = await client.downloadFileBuffer("uploads/report.xlsx");
```

### 진행률 추적

```typescript
// 이벤트 기반 (모든 요청/응답에 대해)
client.on("request-progress", ({ uuid, totalSize, completedSize }) => {
  // 요청 전송 진행률
});

client.on("response-progress", ({ uuid, totalSize, completedSize }) => {
  // 응답 수신 진행률
});

// 연결 상태 변경
client.on("state", (state) => {
  // "connected" | "closed" | "reconnecting"
});

// 서버 HMR 리로드 알림
client.on("reload", (changedFiles) => {
  // changedFiles: Set<string>
  location.reload();
});
```

### ORM 클라이언트 연동

서버의 ORM 서비스를 통해 클라이언트에서 DbContext를 사용한다.

```typescript
import { createOrmClientConnector } from "@simplysm/service-client";

const ormConnector = createOrmClientConnector(client);

// 트랜잭션 포함 연결
const result = await ormConnector.connect(
  {
    dbContextDef: MyDb,
    connOpt: { configName: "main" },
    // 선택적: DB/스키마 오버라이드
    // dbContextOpt: { database: "mydb", schema: "dbo" },
  },
  async (db) => {
    return await db.user().execute();
  }
);

// 트랜잭션 없이 연결
const result = await ormConnector.connectWithoutTransaction(
  { dbContextDef: MyDb, connOpt: { configName: "main" } },
  async (db) => {
    return await db.user().execute();
  }
);
```

## API 레퍼런스

### `createServiceClient(name, options)`

`ServiceClient` 인스턴스를 생성하는 팩토리 함수.

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `name` | `string` | 클라이언트 식별 이름 |
| `options` | `ServiceConnectionOptions` | 연결 설정 |

### `ServiceClient`

`EventEmitter<ServiceClientEvents>`를 확장한 메인 클라이언트 클래스.

**속성:**

| 이름 | 타입 | 설명 |
|------|------|------|
| `name` | `string` | 클라이언트 이름 (읽기 전용) |
| `options` | `ServiceConnectionOptions` | 연결 설정 (읽기 전용) |
| `connected` | `boolean` | 현재 연결 상태 |
| `hostUrl` | `string` | `http(s)://host:port` 형식 URL |

**메서드:**

| 메서드 | 반환 | 설명 |
|--------|------|------|
| `connect()` | `Promise<void>` | 서버에 연결 |
| `close()` | `Promise<void>` | 연결 종료 |
| `auth(token)` | `Promise<void>` | JWT 토큰으로 인증 |
| `send(serviceName, methodName, params, progress?)` | `Promise<unknown>` | RPC 호출 |
| `getService<T>(serviceName)` | `ServiceProxy<T>` | 타입 안전 서비스 프록시 생성 |
| `addListener(eventDef, info, cb)` | `Promise<string>` | 이벤트 구독 (키 반환) |
| `removeListener(key)` | `Promise<void>` | 이벤트 구독 해제 |
| `emitEvent(eventDef, infoSelector, data)` | `Promise<void>` | 이벤트 발행 |
| `uploadFile(files)` | `Promise<ServiceUploadResult[]>` | 파일 업로드 (인증 필수) |
| `downloadFileBuffer(relPath)` | `Promise<Bytes>` | 파일 다운로드 |

**이벤트:**

| 이벤트 | 데이터 타입 | 설명 |
|--------|-----------|------|
| `request-progress` | `ServiceProgressState` | 요청 전송 진행률 |
| `response-progress` | `ServiceProgressState` | 응답 수신 진행률 |
| `state` | `"connected" \| "closed" \| "reconnecting"` | 연결 상태 변경 |
| `reload` | `Set<string>` | 서버 HMR 리로드 알림 |

### `ServiceProxy<TService>`

서비스의 모든 메서드 반환 타입을 `Promise`로 감싸는 유틸리티 타입.

```typescript
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

### `ServiceConnectionOptions`

```typescript
interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;               // HTTPS/WSS 사용 (기본: false)
  maxReconnectCount?: number;  // 최대 재연결 시도 (기본: 10, 0=비활성화)
}
```

### `ServiceProgress` / `ServiceProgressState`

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}

interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

### `createOrmClientConnector(serviceClient)`

`OrmClientConnector` 인스턴스를 생성한다.

**`OrmClientConnector` 메서드:**

| 메서드 | 설명 |
|--------|------|
| `connect(config, callback)` | 트랜잭션 포함 DB 연결. 외래 키 제약 위반 시 친화적 에러 메시지 제공 |
| `connectWithoutTransaction(config, callback)` | 트랜잭션 없이 DB 연결 |

### `OrmConnectOptions<TDef>`

```typescript
interface OrmConnectOptions<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

### 하위 모듈

다음 인터페이스와 팩토리 함수도 export되며, 커스텀 구성이 필요할 때 사용한다.

| Export | 설명 |
|--------|------|
| `createSocketProvider(url, clientName, maxReconnectCount)` | WebSocket 연결 관리 (하트비트, 재연결) |
| `SocketProvider` | 소켓 프로바이더 인터페이스 |
| `createServiceTransport(socket, protocol)` | 요청/응답 매칭 및 메시지 라우팅 |
| `ServiceTransport` | 트랜스포트 인터페이스 |
| `createClientProtocolWrapper(protocol)` | Worker 기반 인코딩/디코딩 래퍼 |
| `ClientProtocolWrapper` | 프로토콜 래퍼 인터페이스 |
| `createEventClient(transport)` | 이벤트 구독/발행 관리 |
| `EventClient` | 이벤트 클라이언트 인터페이스 |
| `createFileClient(hostUrl, clientName)` | HTTP 기반 파일 업로드/다운로드 |
| `FileClient` | 파일 클라이언트 인터페이스 |
| `OrmClientDbContextExecutor` | `DbContextExecutor` 구현체 (RPC 경유) |

## 내부 동작

- **하트비트:** 5초 간격 ping 전송, 30초 타임아웃 시 연결 끊김 감지 후 자동 재연결
- **재연결:** 3초 간격 재시도, 재연결 성공 시 인증 토큰 재전송 및 이벤트 자동 재구독
- **대용량 메시지:** Web Worker에서 인코딩/디코딩 (30KB 이상 또는 Uint8Array 포함 시)
- **프로토콜:** 3MB 초과 시 300KB 청크 자동 분할, 진행률 이벤트 발생
- **소켓 종료 시:** 모든 대기 중인 요청이 자동으로 reject되어 메모리 누수 방지
