# 내장 서비스 상세 API

## OrmService

서비스 이름: `"Orm"`. 인증 필수 (`auth` 래핑). WebSocket 전용 -- HTTP로는 사용 불가.

소켓별로 DB 커넥션을 `WeakMap<ServiceSocket, Map<number, DbConn>>`으로 관리한다. 소켓 `close` 이벤트 시 해당 소켓의 모든 커넥션을 자동 정리한다.

### 메서드

```typescript
// DB 정보 조회 (연결 없이)
async getInfo(opt: DbConnOptions & { configName: string }): Promise<{
  dialect: Dialect;        // "mysql" | "postgresql" | "mssql" (mssql-azure는 mssql로 반환)
  database?: string;
  schema?: string;
}>

// DB 연결 생성 (connId 반환)
async connect(opt: DbConnOptions & { configName: string }): Promise<number>

// DB 연결 종료
async close(connId: number): Promise<void>

// 트랜잭션 제어
async beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>
async commitTransaction(connId: number): Promise<void>
async rollbackTransaction(connId: number): Promise<void>

// 파라미터화된 쿼리 실행
async executeParametrized(
  connId: number,
  query: string,
  params?: unknown[],
): Promise<unknown[][]>

// QueryDef 기반 쿼리 실행 (쿼리 빌더 사용)
async executeDefs(
  connId: number,
  defs: QueryDef[],
  options?: (ResultMeta | undefined)[],
): Promise<unknown[][]>

// 벌크 인서트
async bulkInsert(
  connId: number,
  tableName: string,
  columnDefs: Record<string, ColumnMeta>,
  records: Record<string, unknown>[],
): Promise<void>
```

### DbConnOptions

`@simplysm/service-common`에서 가져온다.

```typescript
type DbConnOptions = {
  configName?: string;
  config?: Record<string, unknown>;  // .config.json 설정 오버라이드
};
```

### 설정 예시

`.config.json`:

```json
{
  "orm": {
    "main": {
      "dialect": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "password",
      "database": "mydb"
    },
    "secondary": {
      "dialect": "postgresql",
      "host": "pg-host",
      "port": 5432,
      "username": "admin",
      "password": "password",
      "database": "mydb",
      "schema": "public"
    }
  }
}
```

### 타입 내보내기

```typescript
import type { OrmServiceType } from "@simplysm/service-server";
// 클라이언트에서 타입 공유: client.getService<OrmServiceType>("Orm")
```

---

## AutoUpdateService

서비스 이름: `"AutoUpdate"`. 인증 불필요. `clientPath/{platform}/updates/` 디렉토리에서 semver 기준 최신 버전 파일을 탐색한다.

### 메서드

```typescript
async getLastVersion(platform: string): Promise<{
  version: string;       // 최신 버전 문자열 (예: "1.2.3")
  downloadPath: string;  // 다운로드 경로 (예: "/my-app/android/updates/1.2.3.apk")
} | undefined>
```

### 지원 플랫폼

| platform | 파일 확장자 | 디렉토리 경로 |
|----------|------------|---------------|
| `"android"` | `.apk` | `www/{clientName}/android/updates/` |
| 기타 | `.exe` | `www/{clientName}/{platform}/updates/` |

파일명은 버전 번호여야 한다 (예: `1.2.3.apk`, `2.0.0.exe`). `semver.maxSatisfying`으로 최신 버전을 결정한다.

### V1 레거시 호환

V1 프로토콜 클라이언트(WebSocket `ver` 쿼리 파라미터 없음)도 `SdAutoUpdateService.getLastVersion` 명령으로 자동 업데이트를 요청할 수 있다. V1 클라이언트의 다른 요청은 `UPGRADE_REQUIRED` 에러를 반환한다.

### 타입 내보내기

```typescript
import type { AutoUpdateServiceType } from "@simplysm/service-server";
```

---

## SmtpClientService

서비스 이름: `"SmtpClient"`. 인증 불필요. nodemailer 기반 이메일 전송.

### 메서드

```typescript
// 직접 SMTP 설정으로 전송
async send(options: SmtpClientSendOption): Promise<string>
// 반환값: messageId

// .config.json의 smtp 설정으로 전송
async sendByConfig(configName: string, options: SmtpClientSendByDefaultOption): Promise<string>
// 반환값: messageId
```

### SmtpClientSendOption

`@simplysm/service-common`에서 가져온다.

```typescript
interface SmtpClientSendOption {
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
  attachments?: SmtpClientSendAttachment[];
}
```

### SmtpClientSendByDefaultOption

```typescript
interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}
```

### SmtpClientSendAttachment

```typescript
interface SmtpClientSendAttachment {
  filename: string;
  content?: string | Uint8Array;
  path?: any;
  contentType?: string;
}
```

### 설정 예시

`.config.json`:

```json
{
  "smtp": {
    "default": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "user": "noreply@example.com",
      "pass": "password",
      "senderName": "My App",
      "senderEmail": "noreply@example.com"
    }
  }
}
```

`senderEmail`이 없으면 `user`가 발신자 이메일로 사용된다.

### 사용 예시

```typescript
// 서버에서 직접 사용
const ctx = createServiceContext(server);
const methods = SmtpClientService.factory(ctx);

// 직접 설정
await methods.send({
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  pass: "pass",
  from: '"My App" <noreply@example.com>',
  to: "recipient@example.com",
  subject: "테스트",
  html: "<p>Hello</p>",
});

// .config.json 기반
await methods.sendByConfig("default", {
  to: "recipient@example.com",
  subject: "테스트",
  html: "<p>Hello</p>",
});
```

### 타입 내보내기

```typescript
import type { SmtpClientServiceType } from "@simplysm/service-server";
```
