# `FtpStorageClient`

> **읽어야 하는 상황**: FTP/FTPS 연결을 직접 생명주기 관리해야 할 때 (장시간 연결 유지 등). 단일 작업 단위로 자동 관리하려면 [`StorageFactory`](../factory/storage-factory.md) 사용.

`basic-ftp` 라이브러리 기반. [`StorageClient`](../types/storage-client.md) 인터페이스를 구현한다.

## When to use

- ✅ FTP/FTPS 연결을 직접 생명주기 관리해야 할 때 (장시간 연결 유지 등)
- ❌ 단일 작업 단위로 연결/종료를 자동 관리하고 싶을 때 → [`StorageFactory.connect()`](../factory/storage-factory.md) 사용 권장

## Signature

```typescript
class FtpStorageClient implements StorageClient {
  constructor(_secure?: boolean);
}
```

## Constructor

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `_secure` | `boolean \| undefined` | `false` | `true`이면 FTPS (TLS/SSL 암호화), `false` 또는 생략이면 FTP |

## Members

[`StorageClient`](../types/storage-client.md) 인터페이스의 모든 메서드를 구현한다. 구현 특이사항:

| Member | Kind | Description |
|--------|------|-------------|
| `connect` | method | 이미 연결된 상태에서 호출하면 `SdError` 발생. 연결 실패 시 내부 `ftp.Client`를 즉시 닫고 예외를 전파 |
| `mkdir` | method | `basic-ftp`의 `ensureDir()`을 사용하여 부모 디렉토리 포함 재귀 생성 |
| `exists` | method | 먼저 `size()` 명령으로 파일을 O(1) 성능으로 확인. 실패 시 부모 디렉토리 `list()`로 디렉토리 존재 여부 확인. 슬래시 없는 경로(예: `file.txt`)는 루트(`/`)에서 검색. 모든 예외는 `false` 반환 |
| `put` | method | `string`이면 파일 경로로, `Bytes`이면 `Readable` 스트림으로 변환하여 `uploadFrom()` 호출 |
| `close` | method | 동기적으로 내부 클라이언트를 정리하고 `Promise.resolve()` 반환. 이미 종료된 상태에서 호출해도 안전 |

## Usage

### 최소 예제

```typescript
import { FtpStorageClient } from "@simplysm/storage";

const client = new FtpStorageClient();
try {
  await client.connect({ host: "ftp.example.com", user: "user", password: "pass" });
  await client.put("/local/file.txt", "/remote/file.txt");
} finally {
  await client.close();
}
```

### 전형 예제

```typescript
import { FtpStorageClient } from "@simplysm/storage";

// FTPS 사용
const client = new FtpStorageClient(true); // true = FTPS
try {
  await client.connect({ host: "ftps.example.com", user: "user", password: "pass" });
  const exists = await client.exists("/remote/file.txt");
  if (exists) {
    await client.rename("/remote/file.txt", "/remote/backup.txt");
  }
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  await client.close(); // 예외 발생 여부와 무관하게 반드시 종료
}
```

## 🚫 Anti-patterns

### close() 없이 사용

```typescript
// ❌ finally 없이 사용하면 예외 시 연결 누수
const client = new FtpStorageClient();
await client.connect(config);
await client.put("/local/file.txt", "/remote/file.txt");
await client.close();

// ✅ try/finally로 보장하거나 StorageFactory.connect() 사용
```

**근거**: 예외 발생 시 `close()`가 호출되지 않아 FTP 연결이 누수된다.

### 동일 인스턴스에서 connect() 중복 호출

```typescript
// ❌ close() 없이 connect()를 다시 호출하면 SdError 발생
await client.connect(config);
await client.connect(config); // SdError: "FTP 서버에 이미 연결되어 있습니다"

// ✅ close() 후 재연결
await client.close();
await client.connect(config);
```

**근거**: 내부 클라이언트가 이미 존재하면 `SdError`를 던진다.
