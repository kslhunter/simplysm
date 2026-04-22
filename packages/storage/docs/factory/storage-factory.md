# StorageFactory

스토리지 클라이언트 팩토리. 콜백 패턴으로 연결/종료를 자동 관리한다.

```typescript
class StorageFactory {
  static async connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connect` | static | `<R>(type: StorageProtocol, config: StorageConnConfig, fn: (storage: StorageClient) => R \| Promise<R>) => Promise<R>` | 프로토콜에 맞는 클라이언트를 생성하고, 연결 후 콜백을 실행하며, 완료/예외 시 자동으로 연결을 종료 |

### `connect<R>()` 파라미터

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `StorageProtocol` | 프로토콜 타입 |
| `config` | [`StorageConnConfig`](../types/storage-conn-config.md) | 연결 설정 |
| `fn` | `(storage: StorageClient) => R \| Promise<R>` | 연결된 클라이언트로 작업을 수행하는 콜백 |

**반환**: `Promise<R>` — 콜백의 반환값

**동작**:
- `type`에 따라 [`FtpStorageClient`](../clients/ftp-storage-client.md) 또는 [`SftpStorageClient`](../clients/sftp-storage-client.md)를 생성
- `client.connect(config)` 후 `fn(client)` 실행
- `fn` 완료 또는 예외 발생 여부와 무관하게 `finally`에서 `client.close()` 호출
- `fn`에서 발생한 예외는 그대로 전파

## Related Types

### `StorageProtocol`

`StorageFactory.connect()`의 `type` 파라미터 타입.

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

| Variant | Description |
|---------|-------------|
| `"ftp"` | 일반 FTP. `FtpStorageClient(false)` 생성 |
| `"ftps"` | TLS/SSL 암호화 FTP. `FtpStorageClient(true)` 생성 |
| `"sftp"` | SSH 기반 SFTP. `SftpStorageClient()` 생성 |

## Usage

```typescript
import { StorageFactory } from "@simplysm/storage";

// 파일 업로드
await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.mkdir("/remote/dir");
    await storage.put("/local/file.txt", "/remote/dir/file.txt");
  },
);

// 파일 목록 조회 후 반환
const list = await StorageFactory.connect(
  "ftp",
  { host: "ftp.example.com", port: 21, user: "user", password: "pass" },
  (storage) => storage.list("/data"),
);

// 바이트 데이터로 업로드
const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await StorageFactory.connect(
  "ftps",
  { host: "ftps.example.com", user: "user", password: "pass" },
  (storage) => storage.put(data, "/remote/file.bin"),
);
```
