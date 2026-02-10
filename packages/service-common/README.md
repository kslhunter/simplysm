# @simplysm/service-common

서비스 클라이언트(`service-client`)와 서버(`service-server`) 간 공유되는 통신 프로토콜, 메시지 타입, 서비스 인터페이스 정의를 제공하는 패키지이다. 바이너리 프로토콜 기반의 메시지 인코딩/디코딩, 대용량 메시지 자동 분할(chunking), 이벤트 시스템 타입, 그리고 ORM/암호화/SMTP/자동 업데이트 등의 서비스 인터페이스를 포함한다.

## 설치

```bash
pnpm add @simplysm/service-common
```

### 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티 (`Uuid`, `LazyGcMap`, `jsonStringify`, `jsonParse` 등) |
| `@simplysm/orm-common` | ORM 타입 (`Dialect`, `IsolationLevel`, `QueryDef` 등) |

## 주요 모듈

### 모듈 구조

| 모듈 경로 | 설명 |
|-----------|------|
| `protocol/protocol.types` | 프로토콜 상수, 메시지 타입 정의 |
| `protocol/service-protocol` | 메시지 인코딩/디코딩 클래스 |
| `service-types/orm-service.types` | ORM 서비스 인터페이스 및 DB 연결 옵션 |
| `service-types/crypto-service.types` | 암호화 서비스 인터페이스 및 설정 |
| `service-types/smtp-service.types` | SMTP 서비스 인터페이스 및 이메일 옵션 |
| `service-types/auto-update-service.types` | 자동 업데이트 서비스 인터페이스 |
| `types` | `ServiceEventListener`, `ServiceUploadResult` |

---

## ServiceProtocol

메시지를 바이너리로 인코딩/디코딩하는 핵심 클래스이다. 3MB를 초과하는 메시지는 자동으로 300KB 단위의 청크로 분할되며, 수신 측에서는 청크를 자동 조립하여 원본 메시지를 복원한다.

### 바이너리 헤더 구조

각 청크는 28바이트 헤더와 바디로 구성된다 (Big Endian).

| Offset | Size | 필드 | 설명 |
|--------|------|------|------|
| 0 | 16 bytes | UUID | 메시지 식별자 (바이너리) |
| 16 | 8 bytes | TotalSize | 전체 메시지 크기 (uint64) |
| 24 | 4 bytes | Index | 청크 인덱스 (uint32) |

### API

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `encode(uuid, message)` | `{ chunks: Bytes[]; totalSize: number }` | 메시지를 인코딩하고, 필요 시 자동 분할한다 |
| `decode<T>(bytes)` | `ServiceMessageDecodeResult<T>` | 바이너리 청크를 디코딩하고, 분할 메시지를 자동 조립한다 |
| `dispose()` | `void` | 내부 청크 누적기의 GC 타이머를 해제한다. 인스턴스 사용 종료 시 반드시 호출해야 한다 |

### 디코딩 결과 타입

`ServiceMessageDecodeResult<T>`는 두 가지 상태를 가지는 유니온 타입이다.

| `type` | 필드 | 설명 |
|--------|------|------|
| `"complete"` | `uuid`, `message: T` | 모든 청크가 수신되어 메시지 조립이 완료됨 |
| `"progress"` | `uuid`, `totalSize`, `completedSize` | 분할 메시지 수신 중 (일부 청크만 도착) |

### 사용 예시

```typescript
import { ServiceProtocol } from "@simplysm/service-common";
import { Uuid } from "@simplysm/core-common";

const protocol = new ServiceProtocol();

// 인코딩: 메시지를 바이너리 청크로 변환
const uuid = Uuid.new().toString();
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "TestService.echo",
  body: ["Hello, world!"],
});

// 디코딩: 수신된 청크를 하나씩 처리
for (const chunk of chunks) {
  const result = protocol.decode(chunk);
  if (result.type === "complete") {
    console.log(result.message);
    // { name: "TestService.echo", body: ["Hello, world!"] }
  } else {
    // 분할 메시지 수신 중
    const progress = (result.completedSize / result.totalSize) * 100;
    console.log(`수신 진행률: ${progress.toFixed(1)}%`);
  }
}

// 인스턴스 정리 (GC 타이머 해제)
protocol.dispose();
```

---

## 프로토콜 상수 (PROTOCOL_CONFIG)

프로토콜 동작을 제어하는 상수 객체이다.

```typescript
import { PROTOCOL_CONFIG } from "@simplysm/service-common";
```

| 상수 | 값 | 설명 |
|------|----|------|
| `MAX_TOTAL_SIZE` | 100MB (104,857,600 bytes) | 단일 메시지 최대 크기. 초과 시 `ArgumentError` 발생 |
| `SPLIT_MESSAGE_SIZE` | 3MB (3,145,728 bytes) | 청킹 임계값. 이 크기를 초과하면 자동 분할 |
| `CHUNK_SIZE` | 300KB (307,200 bytes) | 분할 시 각 청크의 바디 크기 |
| `GC_INTERVAL` | 10초 (10,000ms) | 미완성 메시지 가비지 컬렉션 주기 |
| `EXPIRE_TIME` | 60초 (60,000ms) | 미완성 메시지 만료 시간. 초과 시 메모리에서 제거 |

---

## 메시지 타입

클라이언트-서버 간 주고받는 메시지의 타입 정의이다. `ServiceMessage`는 모든 메시지 타입의 유니온이다.

### 메시지 방향별 분류

| 유니온 타입 | 방향 | 포함 메시지 |
|------------|------|------------|
| `ServiceClientMessage` | 클라이언트 -> 서버 | Request, Auth, 이벤트 관련 메시지 |
| `ServiceServerMessage` | 서버 -> 클라이언트 | Reload, Response, Error, Event |
| `ServiceServerRawMessage` | 서버 -> 클라이언트 (raw) | Progress + `ServiceServerMessage` |
| `ServiceMessage` | 양방향 전체 | 모든 메시지 타입의 유니온 |

### 개별 메시지 타입

#### 시스템 메시지

| 타입 | `name` | 방향 | `body` 타입 | 설명 |
|------|--------|------|-------------|------|
| `ServiceReloadMessage` | `"reload"` | 서버 -> 클라 | `{ clientName: string \| undefined; changedFileSet: Set<string> }` | 클라이언트 리로드 명령 |
| `ServiceProgressMessage` | `"progress"` | 서버 -> 클라 | `{ totalSize: number; completedSize: number }` | 분할 메시지 수신 진행률 |
| `ServiceErrorMessage` | `"error"` | 서버 -> 클라 | `{ name, message, code, stack?, detail?, cause? }` | 에러 발생 알림 |
| `ServiceAuthMessage` | `"auth"` | 클라 -> 서버 | `string` (토큰) | 인증 토큰 전송 |

#### 서비스 메서드 호출 메시지

| 타입 | `name` | 방향 | `body` 타입 | 설명 |
|------|--------|------|-------------|------|
| `ServiceRequestMessage` | `` `${service}.${method}` `` | 클라 -> 서버 | `unknown[]` (매개변수 배열) | RPC 메서드 호출 요청 |
| `ServiceResponseMessage` | `"response"` | 서버 -> 클라 | `unknown` (반환값) | 메서드 호출 응답 |

#### 이벤트 메시지

| 타입 | `name` | 방향 | `body` 타입 | 설명 |
|------|--------|------|-------------|------|
| `ServiceAddEventListenerMessage` | `"evt:add"` | 클라 -> 서버 | `{ key, name, info }` | 이벤트 리스너 등록 |
| `ServiceRemoveEventListenerMessage` | `"evt:remove"` | 클라 -> 서버 | `{ key }` | 이벤트 리스너 제거 |
| `ServiceGetEventListenerInfosMessage` | `"evt:gets"` | 클라 -> 서버 | `{ name }` | 이벤트 리스너 정보 목록 조회 |
| `ServiceEmitEventMessage` | `"evt:emit"` | 클라 -> 서버 | `{ keys, data }` | 이벤트 발생 |
| `ServiceEventMessage` | `"evt:on"` | 서버 -> 클라 | `{ keys, data }` | 이벤트 발생 알림 |

---

## ServiceEventListener

이벤트 리스너 타입 정의용 추상 클래스이다. 커스텀 이벤트를 정의할 때 상속하여 사용한다.

### 타입 매개변수

| 매개변수 | 설명 |
|---------|------|
| `TInfo` | 리스너 필터링을 위한 추가 정보 타입 |
| `TData` | 이벤트 발생 시 전달되는 데이터 타입 |

### 속성

| 속성 | 타입 | 설명 |
|------|------|------|
| `eventName` | `string` (abstract) | mangle 안전한 이벤트 식별자. 상속 시 반드시 구현해야 한다 |
| `$info` | `TInfo` (declare) | 타입 추출용. 런타임에서 사용되지 않는다 |
| `$data` | `TData` (declare) | 타입 추출용. 런타임에서 사용되지 않는다 |

### 사용 예시

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// 커스텀 이벤트 정의
export class DataChangeEvent extends ServiceEventListener<
  { tableName: string; filter: unknown },
  (string | number)[] | undefined
> {
  readonly eventName = "DataChangeEvent";
}

// 클라이언트에서 리스너 등록 (service-client 사용)
await client.addEventListener(
  DataChangeEvent,
  { tableName: "User", filter: null },
  (data) => {
    console.log("변경된 레코드:", data);
  },
);
```

---

## ServiceUploadResult

파일 업로드 결과를 나타내는 인터페이스이다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `path` | `string` | 서버 내 저장 경로 |
| `filename` | `string` | 원본 파일명 |
| `size` | `number` | 파일 크기 (bytes) |

---

## 서비스 인터페이스

서버 측에서 구현하고 클라이언트가 RPC로 호출하는 서비스 인터페이스 정의이다.

### OrmService

데이터베이스 연결, 트랜잭션 관리, 쿼리 실행 기능을 정의한다. MySQL, MSSQL, PostgreSQL을 지원한다.

| 메서드 | 매개변수 | 반환 타입 | 설명 |
|--------|---------|-----------|------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect, database?, schema? }>` | DB 연결 정보 조회 |
| `connect` | `opt: Record<string, unknown>` | `Promise<number>` | DB 연결 생성, 연결 ID 반환 |
| `close` | `connId: number` | `Promise<void>` | DB 연결 종료 |
| `beginTransaction` | `connId, isolationLevel?` | `Promise<void>` | 트랜잭션 시작 |
| `commitTransaction` | `connId: number` | `Promise<void>` | 트랜잭션 커밋 |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | 트랜잭션 롤백 |
| `executeParametrized` | `connId, query, params?` | `Promise<unknown[][]>` | 파라미터 바인딩 쿼리 실행 |
| `executeDefs` | `connId, defs, options?` | `Promise<unknown[][]>` | `QueryDef` 배열로 쿼리 실행 |
| `bulkInsert` | `connId, tableName, columnDefs, records` | `Promise<void>` | 대량 데이터 삽입 |

#### DbConnOptions

| 필드 | 타입 | 설명 |
|------|------|------|
| `configName?` | `string` | 서버 설정에서 참조할 설정 이름 |
| `config?` | `Record<string, unknown>` | 직접 전달하는 연결 설정 |

### CryptoService

SHA256 해시 생성 및 AES 대칭키 암호화/복호화 기능을 정의한다.

| 메서드 | 매개변수 | 반환 타입 | 설명 |
|--------|---------|-----------|------|
| `encrypt` | `data: string \| Bytes` | `Promise<string>` | SHA256 해시 생성 |
| `encryptAes` | `data: Bytes` | `Promise<string>` | AES 암호화 |
| `decryptAes` | `encText: string` | `Promise<Bytes>` | AES 복호화 |

#### CryptoConfig

| 필드 | 타입 | 설명 |
|------|------|------|
| `key` | `string` | AES 암호화 키 |

### SmtpService

이메일 전송 기능을 정의한다. SMTP 설정을 직접 전달하거나 서버 설정을 참조하여 전송할 수 있다.

| 메서드 | 매개변수 | 반환 타입 | 설명 |
|--------|---------|-----------|------|
| `send` | `options: SmtpSendOption` | `Promise<string>` | 직접 SMTP 설정으로 이메일 전송 |
| `sendByConfig` | `configName, options: SmtpSendByConfigOption` | `Promise<string>` | 서버 설정 참조로 이메일 전송 |

#### SmtpSendOption

`SmtpConnectionOptions`와 `SmtpEmailContentOptions`를 합친 타입이며, 추가로 `from` 필드를 포함한다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `host` | `string` | Y | SMTP 호스트 |
| `port` | `number` | N | SMTP 포트 |
| `secure` | `boolean` | N | TLS 사용 여부 |
| `user` | `string` | N | SMTP 인증 사용자 |
| `pass` | `string` | N | SMTP 인증 비밀번호 |
| `from` | `string` | Y | 발신자 주소 |
| `to` | `string` | Y | 수신자 주소 |
| `cc` | `string` | N | 참조 |
| `bcc` | `string` | N | 숨은 참조 |
| `subject` | `string` | Y | 제목 |
| `html` | `string` | Y | 본문 (HTML) |
| `attachments` | `SmtpSendAttachment[]` | N | 첨부 파일 목록 |

#### SmtpSendByConfigOption

`SmtpEmailContentOptions`와 동일하다. SMTP 연결 정보는 서버 설정(`configName`)에서 참조한다.

#### SmtpSendAttachment

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `filename` | `string` | Y | 첨부 파일명 |
| `content` | `Bytes` | N | 파일 내용 (바이너리). `path`와 둘 중 하나를 지정 |
| `path` | `string` | N | 서버 내 파일 경로. `content`와 둘 중 하나를 지정 |
| `contentType` | `string` | N | MIME 타입 (예: `"application/pdf"`) |

#### SmtpConfig

서버 측 SMTP 설정 타입이다.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `host` | `string` | Y | SMTP 호스트 |
| `port` | `number` | N | SMTP 포트 |
| `secure` | `boolean` | N | TLS 사용 여부 |
| `user` | `string` | N | SMTP 인증 사용자 |
| `pass` | `string` | N | SMTP 인증 비밀번호 |
| `senderName` | `string` | Y | 발신자 표시 이름 |
| `senderEmail` | `string` | N | 발신자 이메일 주소 |

### AutoUpdateService

클라이언트 애플리케이션의 최신 버전 정보를 조회하는 서비스를 정의한다.

| 메서드 | 매개변수 | 반환 타입 | 설명 |
|--------|---------|-----------|------|
| `getLastVersion` | `platform: string` | `Promise<{ version: string; downloadPath: string } \| undefined>` | 지정된 플랫폼의 최신 버전 정보 조회. 없으면 `undefined` |

`platform`에는 `"win32"`, `"darwin"`, `"linux"` 등의 값을 전달한다.

---

## 주의사항

- `ServiceProtocol` 인스턴스는 내부적으로 `LazyGcMap`을 사용하여 미완성 분할 메시지를 관리한다. 사용 완료 후 반드시 `dispose()`를 호출하여 GC 타이머를 해제해야 한다.
- `PROTOCOL_CONFIG.MAX_TOTAL_SIZE`(100MB)를 초과하는 메시지를 인코딩 또는 디코딩하면 `ArgumentError`가 발생한다.
- 디코딩 시 28바이트 미만의 바이너리 데이터가 전달되면 `ArgumentError`가 발생한다.
- 서비스 인터페이스(`OrmService`, `CryptoService` 등)는 타입 정의만 제공한다. 실제 구현은 `@simplysm/service-server` 패키지에서 담당한다.
- `ServiceEventListener`의 `$info`, `$data` 속성은 `declare`로 선언되어 런타임에 존재하지 않으며, TypeScript 타입 추출 용도로만 사용된다.

## 라이선스

Apache-2.0
