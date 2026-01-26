# @simplysm/service-common

서비스 클라이언트와 서버 간 통신 프로토콜 및 서비스 타입 정의를 제공한다.

## 설치

```bash
pnpm add @simplysm/service-common
```

## 주요 기능

### ServiceProtocol

메시지 인코딩/디코딩을 처리한다. 3MB 초과 메시지는 자동으로 300KB 단위로 분할된다.

```typescript
import { ServiceProtocol } from "@simplysm/service-common";
import { Uuid } from "@simplysm/core-common";

const protocol = new ServiceProtocol();

// 인코딩
const uuid = Uuid.new().toString();
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "TestService.echo",
  body: ["Hello"],
});

// 디코딩
for (const chunk of chunks) {
  const result = protocol.decode(chunk);
  if (result.type === "complete") {
    console.log(result.message); // { name: "TestService.echo", body: ["Hello"] }
  } else {
    console.log(`진행률: ${result.completedSize}/${result.totalSize}`);
  }
}

// 정리
protocol.dispose();
```

### 메시지 타입

| 타입 | 방향 | 설명 |
|------|------|------|
| `ServiceRequestMessage` | 클라 -> 서버 | 서비스 메서드 호출 |
| `ServiceResponseMessage` | 서버 -> 클라 | 메서드 응답 |
| `ServiceErrorMessage` | 서버 -> 클라 | 에러 발생 알림 |
| `ServiceProgressMessage` | 서버 -> 클라 | 분할 메시지 수신 진행률 |
| `ServiceAuthMessage` | 클라 -> 서버 | 인증 토큰 전송 |
| `ServiceReloadMessage` | 서버 -> 클라 | 클라이언트 리로드 명령 |

### 서비스 타입 정의

#### OrmService

```typescript
import type { OrmService, DbConnOptions } from "@simplysm/service-common";

// 데이터베이스 연결 및 쿼리 실행
interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;
  connect(opt: Record<string, unknown>): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  bulkInsert(connId: number, tableName: string, columnDefs: ColumnMeta[], records: Record<string, unknown>[]): Promise<void>;
}
```

#### CryptoService

```typescript
import type { CryptoService } from "@simplysm/service-common";

// SHA256 해시 및 AES 암호화
interface CryptoService {
  encrypt(data: string | Bytes): Promise<string>;
  encryptAes(data: Bytes): Promise<string>;
  decryptAes(encText: string): Promise<Bytes>;
}
```

#### SmtpService

```typescript
import type { SmtpService, SmtpSendOption } from "@simplysm/service-common";

// 이메일 전송
interface SmtpService {
  send(options: SmtpSendOption): Promise<string>;
  sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string>;
}
```

#### AutoUpdateService

```typescript
import type { AutoUpdateService } from "@simplysm/service-common";

// 자동 업데이트 버전 조회
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

### 이벤트 리스너

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// 커스텀 이벤트 정의
export class DataChangeEvent extends ServiceEventListener<
  { tableName: string },
  string[]
> {
  readonly eventName = "DataChangeEvent";
}
```

## 프로토콜 상수

```typescript
import { PROTOCOL_CONFIG } from "@simplysm/service-common";

PROTOCOL_CONFIG.MAX_TOTAL_SIZE;     // 100MB - 최대 메시지 크기
PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE; // 3MB - 청킹 임계값
PROTOCOL_CONFIG.CHUNK_SIZE;         // 300KB - 청크 크기
PROTOCOL_CONFIG.GC_INTERVAL;        // 10초 - GC 주기
PROTOCOL_CONFIG.EXPIRE_TIME;        // 60초 - 미완성 메시지 만료
```

## 라이선스

Apache-2.0
