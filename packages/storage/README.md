# @simplysm/storage

FTP/FTPS/SFTP 파일 저장소 클라이언트 라이브러리 (Node.js 전용). `StorageClient` 인터페이스로 프로토콜을 통일하고, `StorageFactory`로 연결 생명주기를 관리한다.

## Installation

```bash
npm install @simplysm/storage
```

## API Overview

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`StorageConnConfig`](./docs/types/storage-conn-config.md) | interface | 스토리지 서버 연결 설정 |
| [`FileInfo`](./docs/types/file-info.md) | interface | 파일/디렉토리 정보 |
| [`StorageClient`](./docs/types/storage-client.md) | interface | 스토리지 클라이언트 공통 인터페이스 (포함: `StorageProtocol`) |

### Clients

| Entry | Kind | Description |
|-------|------|-------------|
| [`FtpStorageClient`](./docs/clients/ftp-storage-client.md) | class | FTP/FTPS 프로토콜 스토리지 클라이언트 (`basic-ftp` 기반) |
| [`SftpStorageClient`](./docs/clients/sftp-storage-client.md) | class | SFTP 프로토콜 스토리지 클라이언트 (`ssh2-sftp-client` 기반) |

### Factory

| Entry | Kind | Description |
|-------|------|-------------|
| [`StorageFactory`](./docs/factory/storage-factory.md) | class | 프로토콜별 클라이언트 생성 및 연결 생명주기 자동 관리 (포함: `StorageProtocol`) |

## Usage Examples

### SFTP로 파일 업로드 (StorageFactory 사용 권장)

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.mkdir("/remote/dir");
    await storage.put("/local/file.txt", "/remote/dir/file.txt");
  },
);
```

콜백이 완료되거나 예외가 발생하면 자동으로 연결이 종료된다.

### FTP로 파일 목록 조회 및 다운로드

```typescript
import { StorageFactory } from "@simplysm/storage";

const files = await StorageFactory.connect(
  "ftp",
  { host: "ftp.example.com", port: 21, user: "user", password: "pass" },
  async (storage) => {
    const list = await storage.list("/data");
    for (const file of list.filter((f) => f.isFile)) {
      const content = await storage.readFile(`/data/${file.name}`);
      // content는 Bytes (Uint8Array)
    }
    return list;
  },
);
```

### SSH 키 인증으로 SFTP 연결 (비밀번호 생략)

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user" }, // password 생략 → SSH agent/키 파일 인증
  async (storage) => {
    const list = await storage.list("/home/user");
  },
);
```
