# FtpStorageClient

FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트. `basic-ftp` 라이브러리 기반. [`StorageClient`](../types/storage-client.md) 인터페이스를 구현한다.

직접 사용하기보다 [`StorageFactory.connect()`](../factory/storage-factory.md)를 통해 콜백 패턴으로 사용하는 것을 권장한다.

```typescript
class FtpStorageClient implements StorageClient {
  constructor(private readonly _secure: boolean = false);
}
```

## Constructor

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `_secure` | `boolean` | `false` | `true`이면 FTPS (TLS/SSL 암호화), `false`이면 FTP |

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

```typescript
import { FtpStorageClient } from "@simplysm/storage";

// FTPS 사용
const client = new FtpStorageClient(true);
try {
  await client.connect({ host: "ftps.example.com", user: "user", password: "pass" });
  const exists = await client.exists("/remote/file.txt");
  if (exists) {
    await client.rename("/remote/file.txt", "/remote/backup.txt");
  }
} finally {
  await client.close();
}
```
