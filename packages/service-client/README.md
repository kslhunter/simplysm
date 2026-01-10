# @simplysm/service-client

> SIMPLYSM 프레임워크의 서비스 클라이언트 패키지

[![npm version](https://img.shields.io/npm/v/@simplysm/service-client.svg)](https://www.npmjs.com/package/@simplysm/service-client)
[![license](https://img.shields.io/npm/l/@simplysm/service-client.svg)](https://github.com/kslhunter/simplysm/blob/master/LICENSE)

WebSocket 기반 서비스 클라이언트 라이브러리입니다. Binary Protocol V2로 서버와 통신하며, 브라우저와 Node.js 환경 모두에서 사용할 수 있습니다.

## 설치

```bash
npm install @simplysm/service-client
# or
yarn add @simplysm/service-client
```

## 주요 기능

### 🚀 ServiceClient

WebSocket 기반 서비스 클라이언트. 자동 재연결, 이벤트 리스너 복구, 파일 업/다운로드를 지원합니다.

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,
});

// 연결
await client.connectAsync();

// 인증
await client.authAsync(jwtToken);

// 타입 안전 서비스 호출
const userService = client.getService<UserService>("UserService");
const users = await userService.getUsers({ status: "active" });

// 종료
await client.closeAsync();
```

#### 연결 옵션

```typescript
interface IServiceConnectionConfig {
  host: string;              // 서버 호스트
  port: number;              // 서버 포트
  ssl?: boolean;             // HTTPS/WSS 사용 여부
  maxReconnectCount?: number; // 최대 재연결 시도 (0: 재연결 안 함)
}
```

#### 이벤트

```typescript
client.on("state", (state) => {
  console.log(state); // "connected" | "closed" | "reconnecting"
});

client.on("request-progress", (state) => {
  console.log(`전송: ${state.completedSize}/${state.totalSize}`);
});

client.on("response-progress", (state) => {
  console.log(`수신: ${state.completedSize}/${state.totalSize}`);
});

client.on("reload", (changedFileSet) => {
  console.log("서버 리로드 요청:", changedFileSet);
});
```

### 🔌 SocketProvider

WebSocket 연결 관리. 자동 재연결과 하트비트를 지원합니다.

**상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| HEARTBEAT_TIMEOUT | 30초 | 하트비트 타임아웃 |
| HEARTBEAT_INTERVAL | 5초 | 핑 전송 주기 |
| RECONNECT_DELAY | 3초 | 재연결 대기 시간 |

### 📨 이벤트 리스너

서버-클라이언트 간 실시간 이벤트 통신을 지원합니다.

```typescript
import type { ServiceEventListener } from "@simplysm/service-common";

// 이벤트 정의 (service-common에서 상속)
class UserChangedEvent extends ServiceEventListener<
  { userId: string },    // 필터 정보
  { name: string }       // 이벤트 데이터
> {
  readonly eventName = "UserChangedEvent";
}

// 이벤트 리스너 등록
const listenerKey = await client.addEventListenerAsync(
  UserChangedEvent,
  { userId: "123" },
  async (data) => {
    console.log("사용자 변경:", data.name);
  }
);

// 이벤트 발생
await client.emitAsync(
  UserChangedEvent,
  (info) => info.userId === "123",
  { name: "새 이름" }
);

// 리스너 제거
await client.removeEventListenerAsync(listenerKey);
```

### 📁 파일 업/다운로드

HTTP 기반 파일 전송을 지원합니다.

```typescript
// 파일 업로드 (인증 필요)
await client.authAsync(token);
const result = await client.uploadFileAsync([file1, file2]);
// result: { uploadPath: string, name: string, size: number }[]

// 파일 다운로드
const buffer = await client.downloadFileBufferAsync("uploads/file.pdf");
```

### 🗄️ ORM 클라이언트

서버의 ORM 서비스를 통해 데이터베이스에 접근합니다.

```typescript
import { OrmClientConnector } from "@simplysm/service-client";

const orm = new OrmClientConnector(client);

// 트랜잭션 사용
const result = await orm.connectAsync(
  {
    dbContextType: MyDbContext,
    connOpt: { configName: "main", dialect: "mysql" },
  },
  async (db) => {
    const users = await db.user.select().resultAsync();
    await db.user.insert([{ name: "새 사용자" }]).executeAsync();
    return users;
  }
);

// 트랜잭션 없이 사용
await orm.connectWithoutTransactionAsync(config, async (db) => {
  return await db.user.select().resultAsync();
});
```

### 🔄 프로토콜 워커

대용량 메시지(30KB 초과)는 Web Worker에서 인코딩/디코딩하여 메인 스레드 블로킹을 방지합니다.

| 상수 | 값 | 설명 |
|------|-----|------|
| SIZE_THRESHOLD | 30KB | 워커 분기 기준 |

## 서버 타입 공유 패턴

클라이언트에서 서버 서비스 타입을 사용하려면:

```typescript
// client/package.json
{
  "dependencies": {
    "@myapp/server": "workspace:*"  // export type만 있으므로 번들 무영향
  }
}

// client 코드
import type { MyService } from "@myapp/server";

const svc = client.getService<MyService>("MyService");
const result = await svc.getData(); // 타입 추론됨
```

## 프로젝트 구조

```
packages/service-client/
├── src/
│   ├── types/
│   │   ├── connection-config.ts     # IServiceConnectionConfig
│   │   └── progress.types.ts        # IServiceProgress, IServiceProgressState
│   ├── transport/
│   │   ├── socket-provider.ts       # WebSocket 연결 관리
│   │   └── service-transport.ts     # 요청/응답 관리
│   ├── protocol/
│   │   └── client-protocol-wrapper.ts  # 프로토콜 워커 분기
│   ├── features/
│   │   ├── event-client.ts          # 이벤트 리스너 관리
│   │   ├── file-client.ts           # 파일 업/다운로드
│   │   └── orm/
│   │       ├── orm-connect-config.ts
│   │       ├── orm-client-connector.ts
│   │       └── orm-client-db-context-executor.ts
│   ├── workers/
│   │   └── client-protocol.worker.ts
│   ├── service-client.ts            # 메인 클라이언트 클래스
│   └── index.ts
├── package.json
└── tsconfig.json
```

## 의존성

| 패키지 | 용도 |
|--------|------|
| `@simplysm/service-common` | 프로토콜, 타입, ServiceEventListener |
| `@simplysm/core-common` | Uuid, Wait, LazyGcMap, TransferableConvert |
| `@simplysm/orm-common` | DbContext, IDbContextExecutor 등 타입만 |
| `pino` | 로깅 |

## 브라우저 환경

| 항목 | 설명 |
|------|------|
| `EventEmitter` | esbuild 폴리필 (`events`) |
| `Buffer` | esbuild 폴리필 (`buffer`) |
| `pino` | 브라우저 지원 (pino-browser) |
| `WebSocket` | 네이티브 API 사용 |
| Web Worker | `import.meta.resolve` 패턴 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-client/tsconfig.json

# ESLint
npx eslint "packages/service-client/**/*.ts"

# 테스트
npx vitest run packages/service-client
```

## 라이선스

MIT © 김석래

## 관련 패키지

- `@simplysm/core-common` - 공통 유틸리티
- `@simplysm/service-common` - 서비스 프로토콜 및 타입
- `@simplysm/service-server` - 서비스 서버
- `@simplysm/orm-common` - ORM 쿼리 빌더
