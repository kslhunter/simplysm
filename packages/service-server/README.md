# @simplysm/service-server

심플리즘 서비스의 서버 모듈이다. Fastify 기반의 HTTP/WebSocket 서버를 제공한다.

## 설치

```bash
npm install @simplysm/service-server
# or
pnpm add @simplysm/service-server
```

## 주요 기능

### ServiceServer

메인 서버 클래스이다.

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 8080,
  rootPath: "/api",
});

// 서비스 등록
server.addService(MyService);

// 서버 시작
await server.listenAsync();

// 서버 종료
await server.closeAsync();
```

### 서비스 정의

서비스 클래스를 정의하여 클라이언트에서 호출할 수 있다.

```typescript
import { ServiceBase, Auth } from "@simplysm/service-server";

class MyService extends ServiceBase {
  async helloAsync(name: string): Promise<string> {
    return `Hello, ${name}!`;
  }

  @Auth() // 인증 필요
  async protectedMethodAsync(): Promise<string> {
    return "Secret data";
  }
}
```

### 인증 (JWT)

JWT 기반 인증을 지원한다.

```typescript
import { JwtManager, AuthTokenPayload } from "@simplysm/service-server";

// JWT 매니저 설정
const jwtManager = new JwtManager({
  secret: "your-secret-key",
  expiresIn: "1h",
});

// 토큰 생성
const token = await jwtManager.signAsync({ userId: 1, role: "admin" });

// 토큰 검증
const payload = await jwtManager.verifyAsync(token);
```

### 내장 서비스

#### OrmService

데이터베이스 쿼리를 실행한다.

```typescript
import { OrmService } from "@simplysm/service-server";

server.addService(OrmService, {
  dialect: "mysql",
  host: "localhost",
  database: "mydb",
  user: "root",
  password: "password",
});
```

#### CryptoService

암호화/복호화 기능을 제공한다.

```typescript
import { CryptoService } from "@simplysm/service-server";

server.addService(CryptoService, {
  algorithm: "aes-256-gcm",
  secretKey: "your-32-byte-secret-key",
});
```

#### SmtpService

이메일 발송 기능을 제공한다.

```typescript
import { SmtpService } from "@simplysm/service-server";

server.addService(SmtpService, {
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: "user@example.com",
    pass: "password",
  },
});
```

#### AutoUpdateService

앱 자동 업데이트 기능을 제공한다.

```typescript
import { AutoUpdateService } from "@simplysm/service-server";

server.addService(AutoUpdateService, {
  updateDir: "/path/to/updates",
});
```

### HTTP 핸들러

#### 정적 파일 제공

```typescript
import { StaticFileHandler } from "@simplysm/service-server";

server.addHandler(new StaticFileHandler({
  root: "/path/to/static",
  prefix: "/static",
}));
```

#### 파일 업로드

```typescript
import { UploadHandler } from "@simplysm/service-server";

server.addHandler(new UploadHandler({
  uploadDir: "/path/to/uploads",
  maxFileSize: 10 * 1024 * 1024, // 10MB
}));
```

## 서버 옵션

```typescript
interface ServerOptions {
  port: number;
  host?: string;
  rootPath?: string;
  ssl?: {
    key: string;
    cert: string;
  };
  cors?: boolean | CorsOptions;
  helmet?: boolean | HelmetOptions;
}
```

## 클래스 구조

| 클래스 | 설명 |
|-------|------|
| `ServiceServer` | 메인 서버 클래스 |
| `ServiceBase` | 서비스 기본 클래스 |
| `ServiceExecutor` | 서비스 실행기 |
| `JwtManager` | JWT 관리자 |
| `WebsocketHandler` | WebSocket 핸들러 |
| `HttpRequestHandler` | HTTP 요청 핸들러 |
| `StaticFileHandler` | 정적 파일 핸들러 |
| `UploadHandler` | 업로드 핸들러 |
| `ProtocolWrapper` | 프로토콜 래퍼 |
| `ConfigManager` | 설정 관리자 |

## 라이선스

Apache-2.0
