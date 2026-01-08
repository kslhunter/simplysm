# service-server 개발 가이드

> SimplySM 프레임워크의 서비스 서버 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-service-server`(구버전)은 참고 금지.

**이 문서는 Claude Code가 service-server 패키지를 개발/수정할 때 참고하는 가이드입니다.**

## 아키텍처

```
Application
    ↓
ServiceServer (Fastify + WebSocket)
    ├── WebSocketHandler (V2 프로토콜)
    ├── HttpRequestHandler (REST API)
    ├── StaticFileHandler (정적 파일)
    └── UploadHandler (파일 업로드)
    ↓
ServiceExecutor (서비스 메소드 호출)
    ↓
ServiceBase (서비스 기본 클래스)
    ↓
OrmService / CryptoService / SmtpService / AutoUpdateService
```

**핵심**: Fastify 기반 HTTP/WebSocket 서버. Binary Protocol V2로 클라이언트와 통신.

## 의존성

```
service-server
    ├── service-common (프로토콜, 타입)
    ├── core-common (Uuid, JsonConvert, LazyGcMap, DateTime)
    ├── core-node (FsUtils, SdFsWatcher, SdWorker)
    ├── orm-common (타입만)
    ├── orm-node (DbConnFactory)
    └── pino (로깅)
```

## 모듈 구조

```
src/
├── auth/
│   ├── auth.decorators.ts       # @Authorize 데코레이터 (WeakMap 패턴)
│   ├── auth-token-payload.ts    # IAuthTokenPayload 타입
│   └── jwt-manager.ts           # JWT 토큰 관리
├── core/
│   ├── service-base.ts          # ServiceBase 추상 클래스
│   └── service-executor.ts      # 서비스 메소드 실행기
├── transport/
│   ├── socket/
│   │   ├── websocket-handler.ts # V2 WebSocket 핸들러
│   │   └── service-socket.ts    # WebSocket 래퍼
│   └── http/
│       ├── http-request-handler.ts
│       ├── upload-handler.ts
│       └── static-file-handler.ts
├── protocol/
│   ├── protocol-wrapper.ts      # 프로토콜 워커 분기
│   └── protocol.worker-types.ts
├── services/
│   ├── orm-service.ts           # DB 서비스 (WebSocket 전용)
│   ├── crypto-service.ts        # 암호화 서비스
│   ├── smtp-service.ts          # 이메일 서비스
│   └── auto-update-service.ts   # 자동 업데이트 서비스
├── utils/
│   └── config-manager.ts        # 설정 캐싱
├── legacy/
│   └── v1-auto-update-handler.ts # V1 호환 (auto-update만)
├── workers/
│   └── service-protocol.worker.ts
├── types/
│   └── server-options.ts
├── service-server.ts            # 메인 서버 클래스
└── index.ts
```

## 주요 컴포넌트

### ServiceServer

Fastify 기반 HTTP/WebSocket 서버.

```typescript
const server = new ServiceServer<MyAuthInfo>({
  rootPath: "./www",
  port: 3000,
  ssl: { pfxBuffer: Buffer.from(...), passphrase: "..." },
  auth: { jwtSecret: "secret" },
  services: [MyService, OrmService, CryptoService],
  middlewares: [...],
});

await server.listenAsync();
```

### ServiceBase

모든 서비스의 기본 클래스.

```typescript
class MyService extends ServiceBase<MyAuthInfo> {
  // 인증 정보 접근
  get authInfo(): MyAuthInfo | undefined {
    return this.socket?.authTokenPayload?.data ?? this.http?.authTokenPayload?.data;
  }

  // 클라이언트 정보
  get clientName(): string | undefined {
    return this.socket?.clientName ?? this.http?.clientName;
  }

  // 서비스 메소드
  async getData(): Promise<Data[]> {
    return [...];
  }
}
```

### @Authorize 데코레이터

WeakMap 기반 인증 메타데이터 (reflect-metadata 미사용).

```typescript
// 클래스 레벨
@Authorize(["admin"])
class AdminService extends ServiceBase {
  // 메소드 레벨
  @Authorize(["admin", "manager"])
  async deleteUser(id: string): Promise<void> { ... }
}
```

### OrmService

DB 연결 서비스 (WebSocket 전용).

```typescript
class OrmService extends ServiceBase {
  // HTTP 요청 시 에러 발생
  get sock(): ServiceSocket {
    const socket = this.socket;
    if (!socket) {
      throw new Error("WebSocket 연결이 필요합니다. HTTP로는 ORM 서비스를 사용할 수 없습니다.");
    }
    return socket;
  }
}
```

## Logger 사용

pino 라이브러리 직접 사용.

```typescript
import pino from "pino";

const logger = pino({ name: "service-server:WebSocketHandler" });

logger.debug("클라이언트 연결됨");
logger.warn({ clientId }, "연결 종료");
logger.error({ err }, "에러 발생");
```

## V1 레거시 지원

V1 클라이언트는 `auto-update`만 지원. 다른 요청은 업그레이드 유도.

```typescript
// V1 요청 처리 (legacy/v1-auto-update-handler.ts)
if (msg.command === "SdAutoUpdateService.getLastVersion") {
  // 처리
} else {
  // "앱 업데이트가 필요합니다." 에러 반환
}
```

## sd-service-server과의 차이

### 제거됨

| 항목 | 이유 |
|------|------|
| `reflect-metadata` | WeakMap 패턴으로 대체 |
| `SdLogger` | pino 직접 사용 |
| V1 핸들러 클래스 | 미들웨어로 축소 (auto-update만) |
| `SdWebSocketHandlerV1` | 제거 |
| `SdServiceSocketV1` | 제거 |

### 변경됨

| 항목 | 레거시 | 신규 |
|------|--------|------|
| 네이밍 | `SdServiceServer` | `ServiceServer` |
| 네이밍 | `SdServiceBase` | `ServiceBase` |
| 네이밍 | `SdServiceExecutor` | `ServiceExecutor` |
| Import | `@simplysm/sd-*` | `@simplysm/*` |
| 타입 | `any` | `unknown` |

### 추가됨

| 항목 | 설명 |
|------|------|
| `getAuthPermissions()` | WeakMap에서 인증 권한 조회 |
| OrmService HTTP 제한 | WebSocket 전용 강제 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-server/tsconfig.json 2>&1 | grep "^packages/service-server/"

# ESLint
npx eslint "packages/service-server/**/*.ts"

# 테스트
npx vitest run packages/service-server
```
