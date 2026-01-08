# service-client 개발 가이드

> SimplySM 프레임워크의 서비스 클라이언트 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-service-client`(구버전)은 참고 금지.

**이 문서는 Claude Code가 service-client 패키지를 개발/수정할 때 참고하는 가이드입니다.**

## 아키텍처

```
Application (브라우저/Node.js)
    ↓
ServiceClient
    ├── SocketProvider        # WebSocket 연결 관리, 자동 재연결
    ├── ServiceTransport      # 요청/응답 상관, 메시지 시퀀싱
    ├── EventClient           # 이벤트 리스너 관리
    └── FileClient            # HTTP 파일 업/다운로드
    ↓
service-common (ServiceProtocol)
    ↓
WebSocket (서버)
```

**핵심**: WebSocket 기반 서비스 클라이언트. Binary Protocol V2로 서버와 통신.

## 의존성

```
service-client
    ├── service-common (프로토콜, 타입, ServiceEventListener)
    ├── core-common (Uuid, Wait, LazyGcMap, TransferableConvert)
    ├── orm-common (타입만: DbContext, IDbContextExecutor 등)
    └── pino (로깅)
```

## 모듈 구조

```
src/
├── types/
│   ├── connection-config.ts     # IServiceConnectionConfig
│   └── progress.types.ts        # IServiceProgress, IServiceProgressState
├── transport/
│   ├── socket-provider.ts       # WebSocket 연결 관리
│   └── service-transport.ts     # 요청/응답 관리
├── protocol/
│   └── client-protocol-wrapper.ts  # 프로토콜 워커 분기
├── features/
│   ├── event-client.ts          # 이벤트 리스너 관리
│   ├── file-client.ts           # 파일 업/다운로드
│   └── orm/
│       ├── orm-connect-config.ts           # IOrmConnectConfig
│       ├── orm-client-connector.ts         # OrmClientConnector
│       └── orm-client-db-context-executor.ts  # OrmClientDbContextExecutor
├── workers/
│   └── client-protocol.worker.ts
├── service-client.ts            # 메인 클라이언트 클래스
└── index.ts
```

## 주요 컴포넌트

### ServiceClient

메인 클라이언트 클래스. WebSocket 기반 서비스 호출.

```typescript
const client = new ServiceClient("my-app", {
  host: "localhost",
  port: 3000,
  ssl: false,
  maxReconnectCount: 10,
});

await client.connectAsync();
await client.authAsync(jwtToken);

// 타입 안전 서비스 호출
const userService = client.getService<UserService>("UserService");
const users = await userService.getUsers({ status: "active" });

await client.closeAsync();
```

### SocketProvider

WebSocket 연결 관리. 자동 재연결, 하트비트 지원.

**상수 (하드코딩)**:
| 상수 | 값 | 설명 |
|------|-----|------|
| `_HEARTBEAT_TIMEOUT` | 30초 | 하트비트 타임아웃 |
| `_HEARTBEAT_INTERVAL` | 5초 | 핑 주기 |
| `_RECONNECT_DELAY` | 3초 | 재연결 대기 |

### ClientProtocolWrapper

프로토콜 인코딩/디코딩을 메인 스레드 또는 Web Worker로 분기.

**상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| `_SIZE_THRESHOLD` | 30KB | 워커 분기 기준 |

**분기 로직**:
- 30KB 이하: 메인 스레드에서 처리
- 30KB 초과: Web Worker로 위임 (Zero-Copy 전송)

### OrmClientConnector

ORM 서비스 연결 헬퍼.

```typescript
const orm = new OrmClientConnector(client);

await orm.connectAsync({
  dbContextType: MyDbContext,
  connOpt: { configName: "main", dialect: "mysql" },
}, async (db) => {
  const users = await db.user.select().resultAsync();
  return users;
});
```

## Logger 사용

pino 라이브러리 직접 사용.

```typescript
import pino from "pino";

const logger = pino({ name: "service-client:SocketProvider" });

logger.debug("서버 연결됨");
logger.warn({ reconnectCount }, "재연결 시도");
logger.error({ err }, "연결 실패");
```

## 브라우저 환경 고려사항

| 항목 | 설명 |
|------|------|
| `EventEmitter` | esbuild 폴리필 (`events`) |
| `Buffer` | esbuild 폴리필 (`buffer`) |
| `pino` | 브라우저 지원 (pino-browser) |
| `WebSocket` | 네이티브 API 사용 |
| Web Worker | `import.meta.resolve` 패턴 |

## sd-service-client과의 차이

### 제거됨

없음 (기능 유지)

### 변경됨

| 항목 | 레거시 | 신규 |
|------|--------|------|
| 네이밍 | `SdServiceClient` | `ServiceClient` |
| 네이밍 | `SdSocketProvider` | `SocketProvider` |
| 네이밍 | `SdServiceTransport` | `ServiceTransport` |
| 네이밍 | `SdServiceEventClient` | `EventClient` |
| 네이밍 | `SdServiceFileClient` | `FileClient` |
| Import | `@simplysm/sd-*` | `@simplysm/*` |
| 로깅 | `console.log/warn/error` | `pino` |
| 타입 | `any` | `unknown` |
| ORM 서비스 | `"SdOrmService"` | `"OrmService"` |

### 서버 서비스명 변경

| 레거시 | 신규 |
|--------|------|
| `SdOrmService` | `OrmService` |
| `SdCryptoService` | `CryptoService` |
| `SdSmtpClientService` | `SmtpService` |
| `SdAutoUpdateService` | `AutoUpdateService` |

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

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-client/tsconfig.json 2>&1 | grep "^packages/service-client/"

# ESLint
npx eslint "packages/service-client/**/*.ts"

# 테스트
npx vitest run packages/service-client
```
