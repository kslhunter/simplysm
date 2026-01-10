# @simplysm/service-server

> SIMPLYSM 프레임워크의 서비스 서버 패키지

[![npm version](https://img.shields.io/npm/v/@simplysm/service-server.svg)](https://www.npmjs.com/package/@simplysm/service-server)
[![license](https://img.shields.io/npm/l/@simplysm/service-server.svg)](https://github.com/kslhunter/simplysm/blob/master/LICENSE)

Fastify 기반 HTTP/WebSocket 서버 라이브러리입니다. Binary Protocol V2로 클라이언트와 통신하며, REST API, 파일 업로드, 정적 파일 서빙을 지원합니다.

## 설치

```bash
npm install @simplysm/service-server
# or
yarn add @simplysm/service-server
```

## 주요 기능

### 🚀 ServiceServer

Fastify 기반 HTTP/WebSocket 서버. 보안 헤더, CORS, 미들웨어를 지원합니다.

```typescript
import { ServiceServer, ServiceBase, OrmService, CryptoService } from "@simplysm/service-server";

const server = new ServiceServer<MyAuthInfo>({
  rootPath: "./dist",
  port: 3000,
  ssl: {
    pfxBuffer: await fs.readFile("cert.pfx"),
    passphrase: "password",
  },
  auth: { jwtSecret: "your-secret-key" },
  services: [MyService, OrmService, CryptoService],
  middlewares: [myMiddleware],
});

await server.listenAsync();
```

#### 서버 옵션

```typescript
interface IServiceServerOptions {
  rootPath: string;                    // 루트 경로
  port: number;                        // 포트
  ssl?: {                              // HTTPS 설정
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };
  auth?: { jwtSecret: string };        // JWT 시크릿
  pathProxy?: Record<string, string>;  // 경로 프록시
  portProxy?: Record<string, number>;  // 포트 프록시
  services: Type<ServiceBase>[];       // 서비스 목록
  middlewares?: Middleware[];          // 미들웨어
}
```

#### 이벤트

```typescript
server.on("ready", () => {
  console.log("서버 시작됨");
});

server.on("close", () => {
  console.log("서버 종료됨");
});
```

### 🔧 ServiceBase

모든 서비스의 기본 클래스. 인증 정보와 클라이언트 정보에 접근할 수 있습니다.

```typescript
import { ServiceBase } from "@simplysm/service-server";

class MyService extends ServiceBase<MyAuthInfo> {
  // 인증 정보 접근
  get authInfo(): MyAuthInfo | undefined {
    return this.socket?.authTokenPayload?.data ?? this.http?.authTokenPayload?.data;
  }

  // 클라이언트 정보
  get clientName(): string | undefined {
    return this.socket?.clientName ?? this.http?.clientName;
  }

  // 설정 파일 접근
  async getDbConfig() {
    return await this.getConfigAsync<IDbConfig>("database");
  }

  // 서비스 메소드
  async getUsers(): Promise<User[]> {
    return [...];
  }
}
```

### 🔐 @Authorize 데코레이터

WeakMap 기반 인증 메타데이터. reflect-metadata 없이 동작합니다.

```typescript
import { Authorize, ServiceBase } from "@simplysm/service-server";

// 클래스 레벨 인증
@Authorize(["admin"])
class AdminService extends ServiceBase {
  // 메소드 레벨 인증
  @Authorize(["admin", "manager"])
  async deleteUser(id: string): Promise<void> {
    // admin 또는 manager 권한 필요
  }

  // 클래스 인증만 적용
  async getUsers(): Promise<User[]> {
    // admin 권한 필요
  }
}
```

### 🔑 JWT 인증

JWT 토큰 생성 및 검증을 지원합니다.

```typescript
// 토큰 생성
const token = await server.generateAuthTokenAsync({
  data: { userId: "123", roles: ["admin"] },
  exp: Math.floor(Date.now() / 1000) + 3600, // 1시간
});

// 토큰 검증
const payload = await server.verifyAuthTokenAsync(token);
console.log(payload.data); // { userId: "123", roles: ["admin"] }
```

### 📨 이벤트 브로드캐스트

연결된 클라이언트들에게 이벤트를 전송합니다.

```typescript
import type { ServiceEventListener } from "@simplysm/service-common";

class UserChangedEvent extends ServiceEventListener<
  { userId: string },
  { name: string }
> {
  readonly eventName = "UserChangedEvent";
}

// 특정 조건의 클라이언트에게 이벤트 전송
await server.emitEvent(
  UserChangedEvent,
  (info) => info.userId === "123",
  { name: "새 이름" }
);

// 클라이언트 리로드 명령
await server.broadcastReloadAsync("my-app", new Set(["src/main.ts"]));
```

### 🛠️ 빌트인 서비스

#### OrmService

DB 연결 서비스. WebSocket 전용입니다.

```typescript
import { OrmService } from "@simplysm/service-server";

const server = new ServiceServer({
  services: [OrmService],
  // ...
});
```

**주의**: HTTP 요청 시 에러가 발생합니다. ORM 서비스는 WebSocket 연결에서만 사용 가능합니다.

#### CryptoService

암호화 서비스. 해시, 암호화/복호화를 지원합니다.

```typescript
import { CryptoService } from "@simplysm/service-server";
```

#### SmtpService

이메일 전송 서비스.

```typescript
import { SmtpService } from "@simplysm/service-server";
```

#### AutoUpdateService

자동 업데이트 서비스. 클라이언트 버전 확인 및 업데이트 파일 제공.

```typescript
import { AutoUpdateService } from "@simplysm/service-server";
```

### 🌐 HTTP 라우팅

#### REST API

`/api/:service/:method` 경로로 서비스 메소드를 호출합니다.

```bash
# POST /api/UserService/getUsers
curl -X POST http://localhost:3000/api/UserService/getUsers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '["active"]'
```

#### 파일 업로드

`/upload` 경로로 파일을 업로드합니다.

```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf"
```

#### 정적 파일

`www/` 디렉토리의 파일을 서빙합니다.

### 📦 프록시

#### 경로 프록시

```typescript
const server = new ServiceServer({
  pathProxy: {
    "client-a": "/custom/path/to/client-a",
    "client-b": "/another/path",
  },
});
```

#### 포트 프록시

```typescript
const server = new ServiceServer({
  portProxy: {
    "dev": 4200,  // /dev/* -> http://127.0.0.1:4200/*
  },
});
```

### 🔄 Graceful Shutdown

SIGINT, SIGTERM 시그널을 감지하여 안전하게 종료합니다.

```typescript
// 10초 타임아웃 후 강제 종료
process.on("SIGTERM", async () => {
  await server.closeAsync();
});
```

### 📜 V1 레거시 지원

V1 클라이언트는 `auto-update`만 지원합니다. 다른 요청은 업그레이드를 유도합니다.

## 프로젝트 구조

```
packages/service-server/
├── src/
│   ├── auth/
│   │   ├── auth.decorators.ts       # @Authorize 데코레이터
│   │   ├── auth-token-payload.ts    # IAuthTokenPayload 타입
│   │   └── jwt-manager.ts           # JWT 토큰 관리
│   ├── core/
│   │   ├── service-base.ts          # ServiceBase 추상 클래스
│   │   └── service-executor.ts      # 서비스 메소드 실행기
│   ├── transport/
│   │   ├── socket/
│   │   │   ├── websocket-handler.ts # V2 WebSocket 핸들러
│   │   │   └── service-socket.ts    # WebSocket 래퍼
│   │   └── http/
│   │       ├── http-request-handler.ts
│   │       ├── upload-handler.ts
│   │       └── static-file-handler.ts
│   ├── protocol/
│   │   ├── protocol-wrapper.ts      # 프로토콜 워커 분기
│   │   └── protocol.worker-types.ts
│   ├── services/
│   │   ├── orm-service.ts           # DB 서비스
│   │   ├── crypto-service.ts        # 암호화 서비스
│   │   ├── smtp-service.ts          # 이메일 서비스
│   │   └── auto-update-service.ts   # 자동 업데이트 서비스
│   ├── utils/
│   │   └── config-manager.ts        # 설정 캐싱
│   ├── legacy/
│   │   └── v1-auto-update-handler.ts
│   ├── workers/
│   │   └── service-protocol.worker.ts
│   ├── types/
│   │   └── server-options.ts
│   ├── service-server.ts            # 메인 서버 클래스
│   └── index.ts
├── package.json
└── tsconfig.json
```

## 의존성

| 패키지 | 용도 |
|--------|------|
| `@simplysm/service-common` | 프로토콜, 타입 |
| `@simplysm/core-common` | Uuid, JsonConvert, LazyGcMap, DateTime |
| `@simplysm/core-node` | FsUtils, SdFsWatcher, SdWorker |
| `@simplysm/orm-common` | 타입만 |
| `@simplysm/orm-node` | DbConnFactory |
| `fastify` | HTTP 서버 |
| `@fastify/websocket` | WebSocket 지원 |
| `pino` | 로깅 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-server/tsconfig.json

# ESLint
npx eslint "packages/service-server/**/*.ts"

# 테스트
npx vitest run packages/service-server
```

## 라이선스

MIT © 김석래

## 관련 패키지

- `@simplysm/core-common` - 공통 유틸리티
- `@simplysm/core-node` - Node.js 유틸리티
- `@simplysm/service-common` - 서비스 프로토콜 및 타입
- `@simplysm/service-client` - 서비스 클라이언트
- `@simplysm/orm-node` - ORM 데이터베이스 연결
