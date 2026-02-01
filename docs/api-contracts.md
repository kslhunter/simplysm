# API 계약

> 생성일: 2026-02-01
> 버전: 13.0.0-beta.0

## 서비스 서버 (@simplysm/service-server)

### HTTP API 라우트

| 메서드 | 경로 | 핸들러 | 설명 |
|--------|------|--------|------|
| ALL | `/api/:service/:method` | `HttpRequestHandler` | RPC 스타일 서비스 호출 |
| ALL | `/upload` | `UploadHandler` | 파일 업로드 |
| GET | `/*` | `StaticFileHandler` | 정적 파일 제공 |

### WebSocket 엔드포인트

| 경로 | 버전 | 설명 |
|------|------|------|
| `/` | v2 | WebSocket 연결 (clientId, clientName 필수) |
| `/ws` | v2 | WebSocket 연결 (별칭) |
| `/` | v1 | 레거시 auto-update 지원 |

### 인증

- **방식**: JWT (JSON Web Token)
- **라이브러리**: jose ^6.1.3
- **토큰 위치**: `Authorization` 헤더 또는 WebSocket 쿼리 파라미터
- **데코레이터**: `@Auth()` - 인증 필수 메서드 표시

### Transport 계층

| 모듈 | 파일 | 설명 |
|------|------|------|
| `WebsocketHandler` | `transport/socket/websocket-handler.ts` | WebSocket 연결 관리 |
| `ServiceSocket` | `transport/socket/service-socket.ts` | 개별 소켓 세션 |
| `HttpRequestHandler` | `transport/http/http-request-handler.ts` | HTTP RPC 처리 |
| `UploadHandler` | `transport/http/upload-handler.ts` | 멀티파트 업로드 |
| `StaticFileHandler` | `transport/http/static-file-handler.ts` | 정적 파일 서빙 |

### 서비스 구조

```typescript
// 서비스 정의
@Service()
class MyService extends ServiceBase {
  @Transactional() // 트랜잭션 래핑
  async myMethod(param: string): Promise<Result> {
    // 비즈니스 로직
  }
}

// 클라이언트에서 호출
const client = new ServiceClient("wss://example.com");
const result = await client.sendAsync(MyService, "myMethod", "param");
```

### 내장 서비스

| 서비스 | 파일 | 설명 |
|--------|------|------|
| `OrmService` | `services/orm-service.ts` | ORM 쿼리 실행 |
| `CryptoService` | `services/crypto-service.ts` | 암호화 유틸리티 |
| `SmtpService` | `services/smtp-service.ts` | 이메일 발송 (nodemailer) |
| `AutoUpdateService` | `services/auto-update-service.ts` | 앱 자동 업데이트 |

### 서버 설정

```typescript
import { ServiceServer } from "@simplysm/service-server";

const server = new ServiceServer({
  port: 3000,
  rootPath: __dirname,
  cors: true,
  helmet: true,
});

// 서비스 등록
server.registerService(MyService);

// 서버 시작
await server.listenAsync();
```

## ORM (@simplysm/orm-common, @simplysm/orm-node)

### 테이블 정의

```typescript
import { Table, DbContext, queryable } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
    createdAt: c.datetime().default("CURRENT_TIMESTAMP"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));
```

### 지원 데이터베이스

| 데이터베이스 | 드라이버 | QueryBuilder | ExprRenderer |
|-------------|----------|--------------|--------------|
| MySQL | mysql2 ^3.16.0 | `MysqlQueryBuilder` | `MysqlExprRenderer` |
| PostgreSQL | pg ^8.16.3 | `PostgresqlQueryBuilder` | `PostgresqlExprRenderer` |
| MSSQL | tedious ^19.2.0 | `MssqlQueryBuilder` | `MssqlExprRenderer` |

### DbContext 정의

```typescript
class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
}
```

### ORM 초기화

```typescript
import { SdOrm } from "@simplysm/orm-node";

const orm = new SdOrm(MyDb, {
  dialect: "mysql", // "mysql" | "postgresql" | "mssql"
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});
```

### 쿼리 API

```typescript
// 트랜잭션 내에서 실행
await orm.connectAsync(async (db) => {
  // SELECT
  const users = await db.user()
    .where((u) => u.status.eq("active"))
    .orderBy((u) => u.name)
    .resultAsync();

  // SELECT with relations
  const usersWithPosts = await db.user()
    .include((u) => u.posts)
    .resultAsync();

  // INSERT
  await db.user().insertAsync({
    name: "홍길동",
    email: "hong@example.com",
  });

  // UPDATE
  await db.user()
    .where((u) => u.id.eq(1))
    .updateAsync({ status: "inactive" });

  // DELETE
  await db.user()
    .where((u) => u.id.eq(1))
    .deleteAsync();

  // UPSERT
  await db.user().upsertAsync({
    id: 1,
    name: "홍길동",
    email: "hong@example.com",
  });
});
```

### 표현식 (Expression) API

```typescript
import { expr } from "@simplysm/orm-common";

// 조건 표현식
const result = await db.user()
  .where((u) => expr.and(
    u.status.eq("active"),
    u.createdAt.gte(new Date("2024-01-01"))
  ))
  .resultAsync();

// 집계 함수
const stats = await db.user()
  .select((u) => ({
    totalCount: expr.count(),
    avgAge: expr.avg(u.age),
    maxCreatedAt: expr.max(u.createdAt),
  }))
  .singleAsync();
```

### 트랜잭션 격리 수준

```typescript
type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

await orm.connectAsync(async (db) => {
  // 작업 수행
}, { isolationLevel: "REPEATABLE_READ" });
```

## 서비스 클라이언트 (@simplysm/service-client)

### WebSocket 연결

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient("wss://example.com", {
  clientId: "unique-id",
  clientName: "my-app",
});

await client.connectAsync();

// RPC 호출
const result = await client.sendAsync(MyService, "myMethod", param1, param2);

// 이벤트 구독
client.on(MyEventListener, (data) => {
  console.log("Event received:", data);
});

// 연결 종료
await client.disconnectAsync();
```

### 프로토콜

- **메시지 분할**: 3MB 초과 시 300KB 청크로 분할
- **직렬화**: JSON (커스텀 타입 지원: DateTime, DateOnly, Time, Uuid)
- **압축**: 대용량 메시지 자동 압축

## Storage (@simplysm/storage)

### FTP/SFTP 클라이언트

```typescript
import { StorageFactory } from "@simplysm/storage";

// FTP 연결
const ftpClient = StorageFactory.create({
  type: "ftp",
  host: "ftp.example.com",
  port: 21,
  username: "user",
  password: "pass",
});

// SFTP 연결
const sftpClient = StorageFactory.create({
  type: "sftp",
  host: "sftp.example.com",
  port: 22,
  username: "user",
  privateKey: fs.readFileSync("~/.ssh/id_rsa"),
});

// 파일 작업
await ftpClient.uploadAsync("/remote/path", localBuffer);
const data = await ftpClient.downloadAsync("/remote/path");
const files = await ftpClient.listAsync("/remote/dir");
await ftpClient.deleteAsync("/remote/file");
await ftpClient.mkdirAsync("/remote/new-dir");
```

## CLI (@simplysm/cli)

### 명령어

```bash
# 타입체크
sd-cli typecheck [packages...]

# 린트
sd-cli lint [packages...] [--fix]

# Watch 모드 (개발)
sd-cli watch [packages...]

# 프로덕션 빌드
sd-cli build [packages...]

# NPM 배포
sd-cli publish [packages...] [--no-build]
```

### sd.config.ts 설정

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "my-lib": { target: "neutral" },
    "my-server": { target: "node" },
    "my-app": { target: "client", server: 3000 },
  },
});

export default config;
```

---

*이 문서는 document-project 워크플로우에 의해 자동 생성되었습니다.*
