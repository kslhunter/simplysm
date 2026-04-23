# @simplysm/storage

> FTP/FTPS/SFTP 파일 저장소 클라이언트 라이브러리 (Node.js 전용). `StorageClient` 인터페이스로 프로토콜을 통일하고, `StorageFactory`로 연결 생명주기를 관리한다. 내부적으로 `basic-ftp`(FTP/FTPS)와 `ssh2-sftp-client`(SFTP)를 사용한다.

## Installation

```bash
npm install @simplysm/storage
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| FTP/SFTP 서버에 파일 업로드/다운로드 | [`StorageFactory`](./factory/storage-factory.md) |
| 프로토콜별 구현 차이 확인 (FTP/FTPS) | [`FtpStorageClient`](./clients/ftp-storage-client.md) |
| SFTP 인증 방식 (패스워드/SSH 키) 확인 | [`SftpStorageClient`](./clients/sftp-storage-client.md) |
| 스토리지 작업을 추상화하는 함수 작성 | [`StorageClient`](./types/storage-client.md) |
| 연결 설정 타입 확인 | [`StorageConnConfig`](./types/storage-conn-config.md) |

## API Overview

### Factory

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`StorageFactory`](./factory/storage-factory.md) | class | 스토리지 서버에 연결하여 파일 작업을 수행할 때 (기본 진입점) |

### Clients

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`FtpStorageClient`](./clients/ftp-storage-client.md) | class | FTP/FTPS 클라이언트를 직접 생명주기 관리해야 할 때 |
| [`SftpStorageClient`](./clients/sftp-storage-client.md) | class | SFTP 클라이언트를 직접 생명주기 관리해야 할 때 |

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`StorageClient`](./types/storage-client.md) | interface | 스토리지 작업을 프로토콜 무관하게 추상화하는 함수 시그니처에 사용할 때 |
| [`StorageConnConfig`](./types/storage-conn-config.md) | interface | 연결 설정 객체를 타입으로 지정할 때 |
| [`FileInfo`](./types/file-info.md) | interface | `list()` 반환값을 처리할 때 |

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

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경에서 파일 업로드/다운로드 → 이 패키지는 Node.js 전용이다
- HTTP/S3 등 FTP/SFTP 이외의 프로토콜 → 이 패키지는 FTP/FTPS/SFTP만 지원한다
