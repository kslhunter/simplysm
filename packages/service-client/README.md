# @simplysm/service-client

Simplysm 프레임워크의 서비스 클라이언트 패키지이다. `@simplysm/service-server`와의 WebSocket 통신, 원격 서비스 호출(RPC), 이벤트 구독, 파일 업로드/다운로드, ORM 원격 접근 기능을 제공한다.

브라우저와 Node.js 환경 모두에서 동작하며, 대용량 메시지의 자동 분할/병합, 하트비트 기반 연결 감시, 자동 재연결 등의 기능을 내장하고 있다.

## 설치

```bash
npm install @simplysm/service-client
# 또는
pnpm add @simplysm/service-client
```

### 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티 (EventEmitter, Uuid 등) |
| `@simplysm/orm-common` | ORM 쿼리 빌더, 스키마 정의 |
| `@simplysm/service-common` | 서비스 프로토콜, 타입 정의 |

## 주요 모듈

### 핵심 클래스

| 클래스 | 설명 |
|--------|------|
| `ServiceClient` | 메인 서비스 클라이언트. 연결 관리, RPC 호출, 이벤트, 파일, 인증을 통합 제공한다. |
| `ServiceTransport` | 메시지 전송 계층. 요청/응답 매칭, 진행률 추적, 프로토콜 인코딩/디코딩을 담당한다. |
| `SocketProvider` | WebSocket 연결 관리. 하트비트, 자동 재연결, 연결 상태 이벤트를 처리한다. |
| `ClientProtocolWrapper` | 프로토콜 래퍼. 데이터 크기에 따라 메인 스레드/Web Worker를 자동 선택하여 인코딩/디코딩한다. |

### 기능 클래스

| 클래스 | 설명 |
|--------|------|
| `EventClient` | 서버 이벤트 구독/발행. 재연결 시 리스너 자동 복구를 지원한다. |
| `FileClient` | HTTP 기반 파일 업로드/다운로드를 처리한다. |
| `OrmClientConnector` | ORM 원격 접속 커넥터. 트랜잭션/비트랜잭션 연결을 지원한다. |
| `OrmClientDbContextExecutor` | ORM DbContext 원격 실행기. 서버의 `OrmService`를 RPC로 호출한다. |

### 타입/인터페이스

| 타입 | 설명 |
|------|------|
| `ServiceConnectionConfig` | 서버 연결 설정 (host, port, ssl, maxReconnectCount) |
| `ServiceProgress` | 요청/응답 진행률 콜백 |
| `ServiceProgressState` | 진행률 상태 (uuid, totalSize, completedSize) |
| `OrmConnectConfig<T>` | ORM 연결 설정 (DbContext 타입, 연결 옵션, DB/스키마 오버라이드) |
| `RemoteService<T>` | 서비스 인터페이스의 모든 메서드 반환형을 `Promise`로 감싸는 유틸리티 타입 |

## 사용법

### 기본 연결 및 서비스 호출

```typescript
import { ServiceClient } from "@simplysm/service-client";

// 클라이언트 생성
const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 8080,
  ssl: false,
  maxReconnectCount: 10, // 최대 재연결 시도 횟수 (기본값: 10, 0이면 재연결 안 함)
});

// 서버 연결
await client.connect();

// 연결 상태 확인
console.log(client.connected); // true
console.log(client.hostUrl);   // "http://localhost:8080"

// 직접 RPC 호출
const result = await client.send("MyService", "getUsers", [{ page: 1 }]);

// 연결 종료
await client.close();
```

### 타입 안전한 서비스 호출 (getService)

`getService<T>()`는 `Proxy`를 사용하여 서비스 인터페이스에 대한 타입 안전한 원격 호출을 제공한다.

```typescript
// 서비스 인터페이스 정의 (service-common에서 공유)
interface UserService {
  getUsers(filter: { page: number }): Promise<User[]>;
  createUser(data: CreateUserDto): Promise<number>;
  deleteUser(id: number): Promise<void>;
}

// 타입 안전한 프록시 생성
const userService = client.getService<UserService>("UserService");

// 메서드 호출 시 파라미터/반환 타입이 자동으로 추론됨
const users = await userService.getUsers({ page: 1 }); // users: User[]
const newId = await userService.createUser({ name: "test" }); // newId: number
```

`RemoteService<T>` 타입은 원본 인터페이스의 모든 메서드 반환형을 `Promise`로 감싸준다. 이미 `Promise`를 반환하는 메서드는 이중 래핑되지 않는다.

### 인증

```typescript
// 서버 연결 후 인증 토큰 전송
await client.connect();
await client.auth("jwt-token-here");

// 재연결 시 자동으로 재인증됨
```

`auth()` 호출 후 저장된 토큰은 WebSocket 재연결 시 자동으로 서버에 재전송된다.

### 연결 상태 감시

`ServiceClient`는 `EventEmitter`를 상속하며, 다음 이벤트를 지원한다.

| 이벤트 | 타입 | 설명 |
|--------|------|------|
| `state` | `"connected" \| "closed" \| "reconnecting"` | 연결 상태 변경 |
| `request-progress` | `ServiceProgressState` | 요청 전송 진행률 |
| `response-progress` | `ServiceProgressState` | 응답 수신 진행률 |
| `reload` | `Set<string>` | 서버에서 파일 변경 알림 (개발 모드 HMR) |

```typescript
// 연결 상태 변경 감시
client.on("state", (state) => {
  if (state === "connected") {
    console.log("서버 연결됨");
  } else if (state === "reconnecting") {
    console.log("재연결 시도 중...");
  } else if (state === "closed") {
    console.log("연결 종료됨");
  }
});

// 요청/응답 진행률 감시 (대용량 메시지)
client.on("request-progress", (state) => {
  const percent = Math.round((state.completedSize / state.totalSize) * 100);
  console.log(`전송 중: ${percent}%`);
});

client.on("response-progress", (state) => {
  const percent = Math.round((state.completedSize / state.totalSize) * 100);
  console.log(`수신 중: ${percent}%`);
});
```

### 개별 요청 진행률 추적

`send()` 메서드의 `progress` 파라미터로 개별 요청의 진행률을 추적할 수 있다.

```typescript
const result = await client.send("DataService", "getLargeData", [query], {
  request: (state) => {
    console.log(`요청 전송: ${state.completedSize}/${state.totalSize} bytes`);
  },
  response: (state) => {
    console.log(`응답 수신: ${state.completedSize}/${state.totalSize} bytes`);
  },
});
```

### 이벤트 구독 (서버 -> 클라이언트)

서버에서 발생하는 이벤트를 구독하고, 재연결 시 자동으로 리스너가 복구된다.

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// 이벤트 리스너 타입 정의 (서버/클라이언트 공유)
class SharedDataChangeEvent extends ServiceEventListener<
  { name: string; filter: unknown },
  (string | number)[] | undefined
> {
  readonly eventName = "SharedDataChangeEvent";
}

// 이벤트 구독
const listenerKey = await client.addEventListener(
  SharedDataChangeEvent,
  { name: "users", filter: null },
  async (data) => {
    console.log("데이터 변경됨:", data);
  },
);

// 이벤트 구독 해제
await client.removeEventListener(listenerKey);
```

### 이벤트 발행 (클라이언트 -> 서버 -> 다른 클라이언트)

```typescript
// 특정 조건을 만족하는 리스너들에게 이벤트 발행
await client.emitToServer(
  SharedDataChangeEvent,
  (info) => info.name === "users", // 대상 필터
  [1, 2, 3],                       // 전송할 데이터
);
```

서버가 등록된 리스너 목록에서 `infoSelector` 조건에 맞는 리스너를 찾아 이벤트를 전달한다.

### 파일 업로드

파일 업로드는 HTTP POST 요청으로 처리되며, 인증 토큰이 필요하다.

```typescript
// 인증 필수
await client.auth("jwt-token");

// 브라우저 File 객체로 업로드
const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
const results = await client.uploadFile(fileInput.files!);

// 커스텀 데이터로 업로드
const results = await client.uploadFile([
  { name: "data.json", data: JSON.stringify({ key: "value" }) },
  { name: "image.png", data: imageBlob },
]);

// 업로드 결과
for (const result of results) {
  console.log(result.path);     // 서버 저장 경로
  console.log(result.filename); // 원본 파일명
  console.log(result.size);     // 파일 크기 (bytes)
}
```

### 파일 다운로드

```typescript
// 서버의 상대 경로로 파일 다운로드
const buffer = await client.downloadFileBuffer("/uploads/2024/file.pdf");
// buffer: Uint8Array
```

### ORM 원격 접속

서버의 ORM 서비스를 통해 데이터베이스에 접근한다. 트랜잭션이 자동으로 관리된다.

```typescript
import { OrmClientConnector } from "@simplysm/service-client";
import type { OrmConnectConfig } from "@simplysm/service-client";
import { DbContext } from "@simplysm/orm-common";

const connector = new OrmClientConnector(client);

// 트랜잭션 포함 연결 (오류 시 자동 롤백)
await connector.connect(
  {
    dbContextType: MyDbContext,
    connOpt: { configName: "default" },
    dbContextOpt: { database: "mydb", schema: "dbo" }, // 선택사항
  },
  async (db) => {
    const users = await db.from(User).resultAsync();
    await db.from(User).insert({ name: "test" });
    // 콜백 정상 완료 시 자동 커밋
  },
);

// 트랜잭션 없이 연결 (읽기 전용 작업에 적합)
await connector.connectWithoutTransaction(
  {
    dbContextType: MyDbContext,
    connOpt: { configName: "default" },
  },
  async (db) => {
    const users = await db.from(User).resultAsync();
    return users;
  },
);
```

## 상세 API

### ServiceConnectionConfig

서버 연결 설정 인터페이스이다.

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `host` | `string` | 예 | 서버 호스트 주소 |
| `port` | `number` | 예 | 서버 포트 번호 |
| `ssl` | `boolean` | 아니오 | SSL 사용 여부. `true`이면 `wss://` / `https://` 사용 |
| `maxReconnectCount` | `number` | 아니오 | 최대 재연결 시도 횟수 (기본값: 10). 0이면 재연결하지 않음 |

### ServiceClient

| 메서드/속성 | 반환 타입 | 설명 |
|-------------|----------|------|
| `constructor(name, options)` | - | 클라이언트 인스턴스 생성. `name`은 클라이언트 식별자 |
| `connected` | `boolean` | WebSocket 연결 상태 |
| `hostUrl` | `string` | HTTP URL (예: `http://localhost:8080`) |
| `connect()` | `Promise<void>` | 서버에 WebSocket 연결 |
| `close()` | `Promise<void>` | 연결 종료 (Graceful Shutdown) |
| `send(serviceName, methodName, params, progress?)` | `Promise<unknown>` | 서비스 메서드를 원격 호출 |
| `getService<T>(serviceName)` | `RemoteService<T>` | 타입 안전한 서비스 프록시 생성 |
| `auth(token)` | `Promise<void>` | 인증 토큰 전송 (재연결 시 자동 재인증) |
| `addEventListener(eventType, info, cb)` | `Promise<string>` | 이벤트 리스너 등록. 리스너 key 반환 |
| `removeEventListener(key)` | `Promise<void>` | 이벤트 리스너 해제 |
| `emitToServer(eventType, infoSelector, data)` | `Promise<void>` | 서버를 통해 다른 클라이언트에 이벤트 발행 |
| `uploadFile(files)` | `Promise<ServiceUploadResult[]>` | 파일 업로드 (인증 필수) |
| `downloadFileBuffer(relPath)` | `Promise<Uint8Array>` | 파일 다운로드 |

### ServiceProgress / ServiceProgressState

대용량 메시지 전송 시 진행률을 추적하기 위한 인터페이스이다.

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;   // 요청 전송 진행률
  response?: (s: ServiceProgressState) => void;  // 응답 수신 진행률
}

interface ServiceProgressState {
  uuid: string;          // 요청 고유 식별자
  totalSize: number;     // 전체 크기 (bytes)
  completedSize: number; // 완료된 크기 (bytes)
}
```

### OrmConnectConfig\<T\>

ORM 원격 연결 설정 인터페이스이다.

| 속성 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `dbContextType` | `Type<T>` | 예 | DbContext 클래스 |
| `connOpt` | `DbConnOptions & { configName: string }` | 예 | DB 연결 옵션 (서버 측 설정 이름 포함) |
| `dbContextOpt` | `{ database: string; schema: string }` | 아니오 | 데이터베이스/스키마 오버라이드 |

### SocketProvider

WebSocket 연결의 저수준 관리를 담당한다. 일반적으로 직접 사용하지 않고 `ServiceClient`를 통해 간접 사용한다.

| 상수 | 값 | 설명 |
|------|-----|------|
| Heartbeat Timeout | 30초 | 이 시간 동안 메시지가 없으면 연결 끊김으로 간주 |
| Heartbeat Interval | 5초 | Ping 전송 간격 |
| Reconnect Delay | 3초 | 재연결 시도 간격 |

### ClientProtocolWrapper

메시지 인코딩/디코딩을 담당한다. 브라우저 환경에서 30KB를 초과하는 데이터는 자동으로 Web Worker에서 처리하여 메인 스레드 블로킹을 방지한다.

| 임계값 | 조건 |
|--------|------|
| 30KB 이하 | 메인 스레드에서 직접 처리 |
| 30KB 초과 | Web Worker로 위임 (브라우저 환경만 해당) |

Worker 위임 조건 (인코딩 시):
- `Uint8Array` 데이터
- 30KB를 초과하는 문자열
- 100개를 초과하는 배열 또는 `Uint8Array`를 포함하는 배열

## 아키텍처

```
ServiceClient (통합 진입점)
  |
  +-- SocketProvider (WebSocket 연결 관리)
  |     +-- 하트비트 (Ping/Pong)
  |     +-- 자동 재연결
  |
  +-- ServiceTransport (메시지 전송/수신)
  |     +-- ClientProtocolWrapper (인코딩/디코딩)
  |     |     +-- ServiceProtocol (메인 스레드)
  |     |     +-- Web Worker (대용량 데이터)
  |     +-- 요청/응답 매칭 (UUID 기반)
  |     +-- 진행률 추적
  |
  +-- EventClient (이벤트 구독/발행)
  |     +-- 리스너 관리 (등록/해제)
  |     +-- 재연결 시 자동 복구
  |
  +-- FileClient (HTTP 파일 전송)
        +-- 업로드 (FormData, POST)
        +-- 다운로드 (GET)
```

## 주의사항

- **인증 필수**: `uploadFile()`을 호출하기 전에 반드시 `auth()`로 인증해야 한다. 미인증 시 에러가 발생한다.
- **연결 상태 확인**: `addEventListener()`는 서버와 연결된 상태에서만 호출할 수 있다. 미연결 시 에러가 발생한다.
- **자동 재연결**: 연결이 끊기면 `maxReconnectCount`까지 3초 간격으로 자동 재연결을 시도한다. 재연결 성공 시 인증 토큰과 이벤트 리스너가 자동으로 복구된다.
- **대용량 메시지**: `@simplysm/service-common`의 `ServiceProtocol`에 의해 대용량 메시지는 자동으로 분할/병합된다. 진행률은 `ServiceProgress` 콜백 또는 `ServiceClient`의 이벤트로 추적할 수 있다.
- **Web Worker**: 브라우저 환경에서 30KB를 초과하는 데이터의 인코딩/디코딩은 자동으로 Web Worker에서 처리된다. Node.js 환경에서는 항상 메인 스레드에서 처리된다.
- **Foreign Key 에러 변환**: ORM 연결에서 외래 키 제약 조건 위반 에러가 발생하면, 사용자 친화적인 메시지로 자동 변환된다.

## 라이선스

Apache-2.0
