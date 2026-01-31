# API 계약

> 생성일: 2026-01-31

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
- **라이브러리**: jose
- **토큰 위치**: `Authorization` 헤더 또는 WebSocket 쿼리 파라미터

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
| `SmtpService` | `services/smtp-service.ts` | 이메일 발송 |
| `AutoUpdateService` | `services/auto-update-service.ts` | 앱 자동 업데이트 |

## ORM (@simplysm/orm-common, @simplysm/orm-node)

### 테이블 정의

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));
```

### 지원 데이터베이스

| 데이터베이스 | 드라이버 | 커넥션 클래스 |
|-------------|----------|---------------|
| MySQL | mysql2 | `MysqlDbConn` |
| PostgreSQL | pg | `PostgresqlDbConn` |
| MSSQL | tedious | `MssqlDbConn` |

### 쿼리 API

```typescript
class MyDb extends DbContext {
  readonly user = queryable(this, User);
}

const orm = new SdOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 트랜잭션 내에서 실행
await orm.connectAsync(async (db) => {
  // SELECT
  const users = await db.user()
    .where((u) => u.status.eq("active"))
    .orderBy((u) => u.name)
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
});
```

### 트랜잭션 격리 수준

```typescript
type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
```

## 서비스 클라이언트 (@simplysm/service-client)

### WebSocket 연결

```typescript
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
```

### 프로토콜

- **메시지 분할**: 3MB 초과 시 300KB 청크로 분할
- **직렬화**: JSON (커스텀 타입 지원)
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
await ftpClient.downloadAsync("/remote/path");
await ftpClient.listAsync("/remote/dir");
```
