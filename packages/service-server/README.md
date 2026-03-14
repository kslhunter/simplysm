# @simplysm/service-server

Fastify 기반 서비스 서버. WebSocket RPC, HTTP API, JWT 인증, 이벤트 브로드캐스트, 파일 업로드, 정적 파일 서빙을 제공한다.

## 설치

```bash
npm install @simplysm/service-server
```

**주요 의존성:** `fastify`, `@fastify/cors`, `@fastify/websocket`, `@fastify/static`, `@fastify/multipart`, `@fastify/helmet`, `jose`, `nodemailer`, `ws`

**내부 의존성:** `@simplysm/core-common`, `@simplysm/core-node`, `@simplysm/orm-common`, `@simplysm/orm-node`, `@simplysm/service-common`

## 서버 생성 및 실행

```typescript
import { createServiceServer, defineService, auth } from "@simplysm/service-server";

const server = createServiceServer({
  rootPath: "/app",
  port: 3000,
  ssl: { pfxBytes, passphrase: "cert-pass" },  // 선택
  auth: { jwtSecret: "my-secret" },             // 선택
  services: [UserService, OrmService],
});

await server.listen();
// ... 종료 시
await server.close();
```

### ServiceServerOptions

```typescript
interface ServiceServerOptions {
  rootPath: string;           // 루트 경로 (www/, .config.json 기준)
  port: number;               // 리스닝 포트
  ssl?: {                     // HTTPS 설정 (선택)
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {                    // JWT 인증 설정 (선택)
    jwtSecret: string;
  };
  services: ServiceDefinition[];  // 등록할 서비스 목록
}
```

## 서비스 정의

`defineService`로 서비스를 정의하고, `auth`로 인증을 요구한다.

```typescript
import { defineService, auth } from "@simplysm/service-server";
import type { ServiceContext, ServiceMethods } from "@simplysm/service-server";

// 기본 서비스 (인증 불필요)
const UserService = defineService("User", (ctx: ServiceContext) => ({
  async findAll() {
    return [{ id: 1, name: "Alice" }];
  },
  async findById(id: number) {
    return { id, name: "Alice" };
  },
}));

// 서비스 전체에 인증 필수
const AdminService = defineService("Admin", auth((ctx) => ({
  async getStats() {
    const authInfo = ctx.authInfo; // 인증 정보 접근
    return { users: 100 };
  },
})));

// 서비스 전체에 역할 기반 인증
const SecureService = defineService("Secure", auth(["admin", "manager"], (ctx) => ({
  async deleteUser(id: number) { /* ... */ },
})));

// 메서드 단위 인증 (서비스 레벨은 공개, 특정 메서드만 인증)
const MixedService = defineService("Mixed", (ctx) => ({
  async publicMethod() { /* 누구나 호출 가능 */ },
  adminOnly: auth(["admin"], async () => { /* admin만 호출 가능 */ }),
}));

// 클라이언트 타입 공유용
export type UserServiceType = ServiceMethods<typeof UserService>;
```

### auth 래퍼

`auth` 함수는 서비스 팩토리 또는 개별 메서드에 적용할 수 있다.

```typescript
// 서비스 레벨: 모든 메서드에 로그인 필수
auth((ctx) => ({ ... }))

// 서비스 레벨: 특정 역할 필수
auth(["admin"], (ctx) => ({ ... }))

// 메서드 레벨: 해당 메서드만 로그인 필수
auth(() => result)

// 메서드 레벨: 해당 메서드만 특정 역할 필수
auth(["admin"], () => result)
```

인증 검사 우선순위: 메서드 레벨 > 서비스 레벨. 메서드에 `auth`가 있으면 서비스 레벨 설정을 무시한다.

## ServiceContext

서비스 메서드에 주입되는 컨텍스트 객체.

```typescript
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;      // 서버 인스턴스
  socket?: ServiceSocket;               // WebSocket 연결 (소켓 호출 시)
  http?: {                              // HTTP 요청 (HTTP 호출 시)
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };

  get authInfo(): TAuthInfo | undefined;     // 인증 데이터 (socket 또는 http에서 추출)
  get clientName(): string | undefined;      // 클라이언트 이름
  get clientPath(): string | undefined;      // rootPath/www/{clientName} 경로
  getConfig<T>(section: string): Promise<T>; // .config.json에서 설정 읽기
}
```

`getConfig`는 `rootPath/.config.json`을 기본으로 읽고, `clientPath/.config.json`이 있으면 머지한다.

## JWT 인증

`jose` 라이브러리 기반. HS256 알고리즘, 토큰 유효기간 12시간.

```typescript
// 토큰 발행
const token = await server.signAuthToken({
  roles: ["admin"],
  data: { userId: 1, name: "Alice" },
});

// 토큰 검증
const payload = await server.verifyAuthToken(token);
// { roles: ["admin"], data: { userId: 1, name: "Alice" } }
```

### AuthTokenPayload

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];    // 역할 목록 (권한 검사용)
  data: TAuthInfo;    // 사용자 정의 인증 데이터
}
```

### JWT 유틸리티 함수

서버 인스턴스 없이 직접 사용할 수 있는 저수준 함수.

```typescript
import { signJwt, verifyJwt, decodeJwt } from "@simplysm/service-server";

const token = await signJwt("secret", { roles: ["user"], data: { id: 1 } });
const payload = await verifyJwt("secret", token);   // 검증 + 디코드 (만료 시 에러)
const decoded = decodeJwt(token);                    // 검증 없이 디코드
```

## 이벤트 브로드캐스트

WebSocket으로 연결된 클라이언트에게 이벤트를 전송한다.

```typescript
import { defineEvent } from "@simplysm/service-common";

const OrderCreated = defineEvent<{ shopId: string }, { orderId: string; amount: number }>(
  "order-created"
);

// 조건에 맞는 구독자에게 이벤트 전송
await server.emitEvent(
  OrderCreated,
  (info) => info.shopId === "shop-1",
  { orderId: "order-123", amount: 50000 }
);

// 클라이언트 리로드 알림 (개발 모드용)
await server.broadcastReload("my-app", new Set(["file1.ts", "file2.ts"]));
```

## HTTP API

자동으로 등록되는 HTTP 엔드포인트:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/:service/:method?json=...` | 서비스 호출 (params: JSON 인코딩 배열) |
| POST | `/api/:service/:method` | 서비스 호출 (params: body 배열) |
| POST | `/upload` | 파일 업로드 (multipart, 인증 필수) |
| GET | `/...` | 정적 파일 서빙 (`rootPath/www/`) |

### HTTP 헤더

- `x-sd-client-name` (필수): 클라이언트 이름
- `Authorization: Bearer <token>` (선택): JWT 인증 토큰

### 파일 업로드

인증 필수. multipart/form-data로 전송. 파일은 `rootPath/www/uploads/`에 UUID 이름으로 저장된다.

```typescript
// 응답 타입
interface ServiceUploadResult {
  path: string;       // "uploads/{uuid}.ext"
  filename: string;   // 원본 파일명
  size: number;       // 바이트 크기
}
```

## 내장 서비스

상세 API는 [docs/builtin-services.md](docs/builtin-services.md) 참조.

### OrmService

인증 필수. WebSocket 전용. 소켓별 DB 커넥션 풀을 관리한다. 소켓 종료 시 자동 정리.

```typescript
import { OrmService } from "@simplysm/service-server";

const server = createServiceServer({
  services: [OrmService],
  // ...
});
```

`.config.json`에 DB 설정 필요:

```json
{
  "orm": {
    "main": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "password"
    }
  }
}
```

### AutoUpdateService

`clientPath/{platform}/updates/` 디렉토리에서 최신 버전을 탐색한다. `.apk`(Android), `.exe`(Windows) 지원. V1 레거시 클라이언트 호환.

```typescript
import { AutoUpdateService } from "@simplysm/service-server";
```

### SmtpClientService

nodemailer 기반 이메일 전송 서비스. 직접 설정 또는 `.config.json` 기반 전송을 지원한다.

```typescript
import { SmtpClientService } from "@simplysm/service-server";
```

## 설정 파일

`rootPath/.config.json`에서 설정을 읽는다. LRU 캐시(1시간 만료, 10분 GC 주기)와 파일 감시로 자동 리로드된다.

```typescript
const dbConfig = await ctx.getConfig<DbConfig>("orm.main");
```

클라이언트별 설정이 있으면 (`rootPath/www/{clientName}/.config.json`) 루트 설정에 머지된다.

## 서버 이벤트

```typescript
server.on("ready", () => { /* 서버 시작 완료 */ });
server.on("close", () => { /* 서버 종료 완료 */ });
```

## Graceful Shutdown

SIGINT/SIGTERM 시그널 수신 시 자동으로 graceful shutdown을 수행한다. 10초 타임아웃 후 강제 종료.

## 상세 API 레퍼런스

- [내장 서비스 상세](docs/builtin-services.md) -- OrmService, AutoUpdateService, SmtpClientService 메서드 시그니처
- [전송 계층 및 프로토콜](docs/transport-protocol.md) -- WebSocket 핸들러, ServiceSocket, 프로토콜 래퍼
