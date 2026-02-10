# @simplysm/service-server

Fastify 기반의 HTTP/WebSocket 서버 패키지이다. RPC 스타일의 서비스 호출, JWT 인증, 파일 업로드, 정적 파일 제공, 실시간 이벤트 등 풀스택 애플리케이션에 필요한 서버 기능을 제공한다.

`@simplysm/service-client`와 함께 사용하여 클라이언트-서버 간 WebSocket/HTTP 통신을 구성할 수 있다.

## 설치

```bash
npm install @simplysm/service-server
# or
pnpm add @simplysm/service-server
```

## 주요 모듈

### 핵심 클래스

| 모듈 | 경로 | 설명 |
|------|------|------|
| `ServiceServer` | `service-server.ts` | 메인 서버 클래스. Fastify 인스턴스를 생성하고 라우트/플러그인을 구성한다 |
| `ServiceBase` | `core/service-base.ts` | 서비스 기본 추상 클래스. 모든 커스텀 서비스가 상속해야 한다 |
| `ServiceExecutor` | `core/service-executor.ts` | 서비스 메서드 탐색, 인증 검사, 실행을 담당하는 내부 실행기 |

### 인증

| 모듈 | 경로 | 설명 |
|------|------|------|
| `JwtManager` | `auth/jwt-manager.ts` | jose 라이브러리 기반 JWT 토큰 생성/검증/디코딩 (HS256, 12시간 만료) |
| `Authorize` | `auth/auth.decorators.ts` | Stage 3 데코레이터. 클래스 또는 메서드 레벨에 인증 권한을 설정한다 |
| `AuthTokenPayload` | `auth/auth-token-payload.ts` | JWT 페이로드 인터페이스 (`roles`, `data` 포함) |

### 전송 계층 - WebSocket

| 모듈 | 경로 | 설명 |
|------|------|------|
| `WebSocketHandler` | `transport/socket/websocket-handler.ts` | WebSocket 연결 관리, 메시지 라우팅, 이벤트 분배를 담당 |
| `ServiceSocket` | `transport/socket/service-socket.ts` | 개별 WebSocket 연결을 래핑. ping/pong, 프로토콜 인코딩/디코딩, 이벤트 리스너 관리 |

### 전송 계층 - HTTP

| 모듈 | 경로 | 설명 |
|------|------|------|
| `HttpRequestHandler` | `transport/http/http-request-handler.ts` | `/api/:service/:method` 라우트에서 서비스 메서드를 HTTP로 호출 |
| `UploadHandler` | `transport/http/upload-handler.ts` | `/upload` 라우트에서 multipart 파일 업로드 처리 (인증 필수) |
| `StaticFileHandler` | `transport/http/static-file-handler.ts` | 정적 파일 제공. Path Traversal 방지 및 숨김 파일 차단 |

### 프로토콜

| 모듈 | 경로 | 설명 |
|------|------|------|
| `ProtocolWrapper` | `protocol/protocol-wrapper.ts` | 메시지 인코딩/디코딩 래퍼. 30KB 초과 메시지는 워커 스레드에서 처리 |

### 내장 서비스

| 모듈 | 경로 | 설명 |
|------|------|------|
| `OrmService` | `services/orm-service.ts` | DB 연결/트랜잭션/쿼리 실행 (WebSocket 전용, 인증 필수) |
| `CryptoService` | `services/crypto-service.ts` | SHA256 해시 및 AES-256-CBC 암호화/복호화 |
| `SmtpService` | `services/smtp-service.ts` | nodemailer 기반 이메일 전송 |
| `AutoUpdateService` | `services/auto-update-service.ts` | 앱 자동 업데이트 (최신 버전 조회 및 다운로드 경로 제공) |

### 유틸리티

| 모듈 | 경로 | 설명 |
|------|------|------|
| `ConfigManager` | `utils/config-manager.ts` | JSON 설정 파일 로드/캐싱/실시간 감시 (LazyGcMap 기반 자동 만료) |

### 레거시

| 모듈 | 경로 | 설명 |
|------|------|------|
| `handleV1Connection` | `legacy/v1-auto-update-handler.ts` | V1 프로토콜 클라이언트 호환 처리 (auto-update만 지원) |

## 사용법

### 기본 서버 구성

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [MyService],
});

// 서버 시작
await server.listen();

// 이벤트 수신
server.on("ready", () => {
  console.log("서버 준비 완료");
});

server.on("close", () => {
  console.log("서버 종료됨");
});

// 서버 종료
await server.close();
```

### 서버 옵션 (`ServiceServerOptions`)

```typescript
interface ServiceServerOptions {
  /** 서버 루트 경로 (정적 파일, 설정 파일의 기준 디렉토리) */
  rootPath: string;
  /** 리슨 포트 */
  port: number;
  /** SSL/TLS 설정 (HTTPS 활성화) */
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  /** JWT 인증 설정 */
  auth?: {
    jwtSecret: string;
  };
  /** 등록할 서비스 클래스 목록 */
  services: Type<ServiceBase>[];
}
```

`rootPath` 하위에 다음 구조를 기대한다:

```
rootPath/
  .config.json        # 루트 설정 파일
  www/                # 정적 파일 루트
    uploads/          # 업로드 파일 저장 디렉토리
    {clientName}/     # 클라이언트별 디렉토리
      .config.json    # 클라이언트별 설정 파일
      index.html
```

### SSL/HTTPS 서버

```typescript
import { fsReadFile } from "@simplysm/core-node";

const pfxBytes = await fsReadFile("/path/to/cert.pfx");

const server = new ServiceServer({
  port: 443,
  rootPath: "/app/data",
  ssl: {
    pfxBytes,
    passphrase: "certificate-password",
  },
  auth: { jwtSecret: "my-secret-key" },
  services: [],
});

await server.listen();
```

### 커스텀 서비스 정의

`ServiceBase`를 상속하여 서비스를 정의한다. 서비스 메서드는 클라이언트에서 RPC 방식으로 호출된다.

```typescript
import { ServiceBase } from "@simplysm/service-server";

class MyService extends ServiceBase {
  async hello(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }

  async getServerTime(): Promise<Date> {
    return new Date();
  }
}
```

서비스 내부에서 접근 가능한 컨텍스트:

| 속성 | 타입 | 설명 |
|------|------|------|
| `this.server` | `ServiceServer` | 서버 인스턴스 참조 |
| `this.socket` | `ServiceSocket \| undefined` | WebSocket 연결 (HTTP 호출 시 `undefined`) |
| `this.http` | `{ clientName, authTokenPayload? }` | HTTP 요청 컨텍스트 |
| `this.authInfo` | `TAuthInfo \| undefined` | 인증된 사용자 정보 |
| `this.clientName` | `string \| undefined` | 클라이언트 앱 이름 |
| `this.clientPath` | `string \| undefined` | 클라이언트별 디렉토리 경로 |

### 설정 파일 참조

`ServiceBase.getConfig()`로 `.config.json` 파일의 섹션을 읽을 수 있다. 루트 설정과 클라이언트별 설정이 자동으로 병합된다.

```typescript
class MyService extends ServiceBase {
  async getDbHost(): Promise<string> {
    // rootPath/.config.json 또는 clientPath/.config.json에서
    // "mySection" 키의 값을 읽는다
    const config = await this.getConfig<{ host: string }>("mySection");
    return config.host;
  }
}
```

`.config.json` 예시:

```json
{
  "mySection": {
    "host": "localhost"
  },
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "mydb",
      "user": "root",
      "password": "password"
    }
  }
}
```

`ConfigManager`는 설정 파일을 캐싱하고, 파일 변경 시 자동으로 캐시를 갱신한다 (LazyGcMap 기반, 1시간 후 자동 만료).

### 인증 (`Authorize` 데코레이터)

Stage 3 데코레이터를 사용하여 서비스 또는 메서드에 인증 요구사항을 설정한다. `ServiceServerOptions.auth`가 설정된 경우에만 동작한다.

```typescript
import { ServiceBase, Authorize } from "@simplysm/service-server";

// 클래스 레벨: 모든 메서드에 로그인 필수
@Authorize()
class UserService extends ServiceBase<{ userId: number; role: string }> {
  // 로그인만 필요 (클래스 레벨 상속)
  async getProfile(): Promise<unknown> {
    const userId = this.authInfo?.userId;
    // ...
  }

  // 메서드 레벨: 특정 역할(role) 필요 (클래스 레벨 오버라이드)
  @Authorize(["admin"])
  async deleteUser(targetId: number): Promise<void> {
    // admin 역할이 있는 사용자만 호출 가능
  }
}

// 인증 불필요 (데코레이터 없음)
class PublicService extends ServiceBase {
  async healthCheck(): Promise<string> {
    return "OK";
  }
}
```

데코레이터 동작 방식:

| 적용 대상 | `@Authorize()` | `@Authorize(["admin"])` |
|-----------|----------------|-------------------------|
| 클래스 | 모든 메서드에 로그인 필수 | 모든 메서드에 admin 역할 필수 |
| 메서드 | 해당 메서드에 로그인 필수 | 해당 메서드에 admin 역할 필수 |
| 없음 | 인증 불필요 (Public) | - |

메서드 레벨 데코레이터는 클래스 레벨 설정을 오버라이드한다.

### JWT 토큰 관리

`ServiceServer` 인스턴스를 통해 JWT 토큰을 생성하고 검증할 수 있다.

```typescript
// 토큰 생성 (12시간 만료, HS256 알고리즘)
const token = await server.generateAuthToken({
  roles: ["admin", "user"],
  data: { userId: 1, name: "홍길동" },
});

// 토큰 검증
const payload = await server.verifyAuthToken(token);
// payload.roles: ["admin", "user"]
// payload.data: { userId: 1, name: "홍길동" }
```

`AuthTokenPayload` 인터페이스:

```typescript
interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  /** 사용자 역할 목록 (Authorize 데코레이터의 권한 체크에 사용) */
  roles: string[];
  /** 커스텀 인증 정보 (제네릭 타입) */
  data: TAuthInfo;
}
```

### HTTP API 호출

서비스 메서드는 `/api/:service/:method` 경로를 통해 HTTP로도 호출할 수 있다.

**GET 요청:**

```
GET /api/MyService/hello?json=["World"]
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (선택)
```

**POST 요청:**

```
POST /api/MyService/hello
Header: Content-Type: application/json
Header: x-sd-client-name: my-app
Header: Authorization: Bearer <token>  (선택)
Body: ["World"]
```

- `x-sd-client-name` 헤더가 필수이다.
- 파라미터는 배열 형태로 전달한다 (메서드 인자 순서대로).
- GET 요청 시 `json` 쿼리 파라미터에 JSON 직렬화된 배열을 전달한다.

### 파일 업로드

`/upload` 엔드포인트에 multipart 요청으로 파일을 업로드한다. 인증 토큰이 필수이다.

```typescript
// 클라이언트 측 예시
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

// 응답: ServiceUploadResult[]
const results = await response.json();
// [{ path: "uploads/uuid.ext", filename: "원본파일명.ext", size: 12345 }]
```

업로드된 파일은 `rootPath/www/uploads/` 디렉토리에 UUID 기반 파일명으로 저장된다.

### 실시간 이벤트 발행

서버에서 연결된 클라이언트들에게 이벤트를 발행할 수 있다.

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// 이벤트 정의 (service-common에서)
class OrderUpdatedEvent extends ServiceEventListener<
  { orderId: number },
  { status: string }
> {
  readonly eventName = "OrderUpdatedEvent";
}

// 서버에서 이벤트 발행
await server.emitEvent(
  OrderUpdatedEvent,
  (info) => info.orderId === 123,    // 대상 필터
  { status: "completed" },           // 전송할 데이터
);

// 모든 클라이언트에 새로고침 명령 전송
await server.broadcastReload("my-app", new Set(["main.js"]));
```

### 내장 서비스: OrmService

데이터베이스 연결/쿼리/트랜잭션을 WebSocket을 통해 제공한다. `@Authorize()` 데코레이터가 적용되어 로그인이 필수이다.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret" },
  services: [OrmService],
});
```

`.config.json`에 ORM 설정을 정의한다:

```json
{
  "orm": {
    "default": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "database": "mydb",
      "user": "root",
      "password": "password"
    }
  }
}
```

`OrmService`가 제공하는 메서드:

| 메서드 | 설명 |
|--------|------|
| `getInfo(opt)` | DB 연결 정보 조회 (dialect, database, schema) |
| `connect(opt)` | DB 연결 생성. 연결 ID를 반환한다 |
| `close(connId)` | DB 연결 종료 |
| `beginTransaction(connId, isolationLevel?)` | 트랜잭션 시작 |
| `commitTransaction(connId)` | 트랜잭션 커밋 |
| `rollbackTransaction(connId)` | 트랜잭션 롤백 |
| `executeParametrized(connId, query, params?)` | 파라미터 바인딩 쿼리 실행 |
| `executeDefs(connId, defs, options?)` | QueryDef 기반 쿼리 실행 |
| `bulkInsert(connId, tableName, columnDefs, records)` | 대량 INSERT |

WebSocket 연결이 종료되면 해당 소켓에서 열었던 모든 DB 연결이 자동으로 정리된다.

### 내장 서비스: CryptoService

SHA256 해시와 AES-256-CBC 대칭키 암호화/복호화를 제공한다.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [CryptoService],
});
```

`.config.json` 설정:

```json
{
  "crypto": {
    "key": "your-32-byte-secret-key-here!!"
  }
}
```

| 메서드 | 설명 |
|--------|------|
| `encrypt(data)` | SHA256 HMAC 해시 생성 (단방향) |
| `encryptAes(data)` | AES-256-CBC 암호화. `iv:encrypted` 형식의 hex 문자열 반환 |
| `decryptAes(encText)` | AES-256-CBC 복호화. 원본 바이너리 반환 |

### 내장 서비스: SmtpService

nodemailer 기반의 이메일 전송 서비스이다. 직접 SMTP 설정을 전달하거나 서버 설정 파일을 참조할 수 있다.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [SmtpService],
});
```

`.config.json` 설정 (설정 참조 방식 사용 시):

```json
{
  "smtp": {
    "default": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "user": "user@example.com",
      "pass": "password",
      "senderName": "My App",
      "senderEmail": "noreply@example.com"
    }
  }
}
```

| 메서드 | 설명 |
|--------|------|
| `send(options)` | SMTP 설정을 직접 전달하여 이메일 전송 |
| `sendByConfig(configName, options)` | 설정 파일의 SMTP 설정을 참조하여 이메일 전송 |

`send()` 옵션:

```typescript
interface SmtpSendOption {
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
  attachments?: SmtpSendAttachment[];
}
```

### 내장 서비스: AutoUpdateService

클라이언트 앱의 자동 업데이트를 지원한다. 클라이언트 디렉토리에서 플랫폼별 최신 버전 파일을 탐색한다.

```typescript
const server = new ServiceServer({
  port: 8080,
  rootPath: "/app/data",
  services: [AutoUpdateService],
});
```

업데이트 파일 구조:

```
rootPath/www/{clientName}/{platform}/updates/
  1.0.0.exe    (Windows)
  1.0.1.exe
  1.0.0.apk    (Android)
  1.0.1.apk
```

| 메서드 | 설명 |
|--------|------|
| `getLastVersion(platform)` | 해당 플랫폼의 최신 버전 및 다운로드 경로 반환. 업데이트 없으면 `undefined` |

반환값:

```typescript
{
  version: string;       // 예: "1.0.1"
  downloadPath: string;  // 예: "/my-app/android/updates/1.0.1.apk"
}
```

### ConfigManager

JSON 설정 파일의 로드, 캐싱, 실시간 감시를 관리하는 정적 유틸리티 클래스이다. `ServiceBase.getConfig()`가 내부적으로 사용한다.

```typescript
import { ConfigManager } from "@simplysm/service-server";

const config = await ConfigManager.getConfig<MyConfig>("/path/to/.config.json");
```

동작 방식:
- 파일을 최초 로드 시 `LazyGcMap`에 캐싱한다.
- 파일 변경 감시(`FsWatcher`)를 등록하여 변경 시 캐시를 자동 갱신한다.
- 캐시는 1시간 미접근 시 자동 만료되며, 관련 감시도 해제된다.

### ProtocolWrapper

WebSocket 메시지의 인코딩/디코딩을 처리한다. 메시지 크기에 따라 메인 스레드와 워커 스레드를 자동으로 분기한다.

| 조건 | 처리 방식 |
|------|-----------|
| 30KB 이하 | 메인 스레드에서 직접 처리 |
| 30KB 초과 | 워커 스레드에서 처리 (최대 4GB 메모리 할당) |

큰 바이너리 데이터(Uint8Array)가 포함된 메시지도 워커 스레드로 분기된다.

## 서버 라우트 구조

`ServiceServer.listen()` 호출 시 다음 라우트가 자동으로 등록된다:

| 라우트 | 메서드 | 설명 |
|--------|--------|------|
| `/api/:service/:method` | GET, POST | HTTP를 통한 서비스 메서드 호출 |
| `/upload` | POST | Multipart 파일 업로드 (인증 필수) |
| `/` | WebSocket | WebSocket 연결 엔드포인트 |
| `/ws` | WebSocket | WebSocket 연결 엔드포인트 (별칭) |
| `/*` | GET 등 | 정적 파일 제공 (`rootPath/www/` 기준) |

## 보안

- **Helmet**: `@fastify/helmet` 플러그인으로 CSP, HSTS 등 보안 헤더를 자동 설정한다.
- **CORS**: `@fastify/cors` 플러그인으로 CORS를 설정한다.
- **Path Traversal 방지**: 정적 파일 핸들러와 클라이언트 이름 검증에서 `..`, `/`, `\` 문자를 차단한다.
- **숨김 파일 차단**: `.`으로 시작하는 파일은 403 응답을 반환한다.
- **Graceful Shutdown**: `SIGINT`/`SIGTERM` 시그널을 감지하여 열린 WebSocket 연결과 서버를 안전하게 종료한다 (10초 타임아웃).

## 주의사항

- `OrmService`는 WebSocket 연결 전용이다. HTTP 요청으로는 사용할 수 없다.
- 설정 파일(`.config.json`)에 민감한 정보(DB 비밀번호, JWT 시크릿 등)가 포함되므로 정적 파일 핸들러에서 숨김 파일(`.`으로 시작)은 자동으로 차단된다.
- WebSocket 연결 시 쿼리 파라미터 `ver=2`, `clientId`, `clientName`이 필수이다. 이 파라미터가 없으면 V1 레거시 모드로 동작한다.
- SSL 미설정 시 `upgrade-insecure-requests` CSP 지시자가 비활성화된다.

## 라이선스

Apache-2.0
