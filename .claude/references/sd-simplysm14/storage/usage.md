# @simplysm/storage

FTP/FTPS/SFTP 파일 저장소 클라이언트 라이브러리 (Node.js 전용). `StorageClient` 인터페이스로 프로토콜을 통일하고, `StorageFactory`로 연결 생명주기를 관리한다.

## Installation

```bash
npm install @simplysm/storage
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `StorageProtocol` | type | 지원 프로토콜 유니온 타입 (`"ftp" \| "ftps" \| "sftp"`) |
| `StorageConnConfig` | interface | 스토리지 연결 설정 (host, port, user, password) |
| `FileInfo` | interface | 파일/디렉토리 정보 (name, isFile) |
| `StorageClient` | interface | 스토리지 클라이언트 공통 인터페이스 |

#### `StorageProtocol`

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

#### `StorageConnConfig`

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | 서버 호스트 주소 |
| `port` | `number \| undefined` | 포트 번호 (생략 시 프로토콜 기본값 사용) |
| `user` | `string \| undefined` | 사용자 이름 |
| `password` | `string \| undefined` | 비밀번호. SFTP에서 생략하면 SSH agent + `~/.ssh/id_ed25519` 키 파일 인증 시도 |

#### `FileInfo`

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리 이름 |
| `isFile` | `boolean` | `true`이면 파일, `false`이면 디렉토리 |

#### `StorageClient`

스토리지 클라이언트 공통 인터페이스. `FtpStorageClient`와 `SftpStorageClient`가 구현한다.

```typescript
interface StorageClient {
  connect(config: StorageConnConfig): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  rename(fromPath: string, toPath: string): Promise<void>;
  list(dirPath: string): Promise<FileInfo[]>;
  readFile(filePath: string): Promise<Bytes>;
  exists(filePath: string): Promise<boolean>;
  put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;
  uploadDir(fromPath: string, toPath: string): Promise<void>;
  remove(filePath: string): Promise<void>;
  close(): Promise<void>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `connect` | `config: StorageConnConfig` | `Promise<void>` | 서버에 연결 |
| `mkdir` | `dirPath: string` | `Promise<void>` | 디렉토리 생성 (부모 디렉토리 자동 생성) |
| `rename` | `fromPath: string, toPath: string` | `Promise<void>` | 파일/디렉토리 이름 변경 |
| `list` | `dirPath: string` | `Promise<FileInfo[]>` | 디렉토리 내 파일/디렉토리 목록 조회 |
| `readFile` | `filePath: string` | `Promise<Bytes>` | 파일 내용을 `Bytes`(`Uint8Array`)로 읽기 |
| `exists` | `filePath: string` | `Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |
| `put` | `localPathOrBuffer: string \| Bytes, storageFilePath: string` | `Promise<void>` | 로컬 파일 경로 또는 바이트 데이터를 원격에 업로드 |
| `uploadDir` | `fromPath: string, toPath: string` | `Promise<void>` | 로컬 디렉토리 전체를 원격에 업로드 |
| `remove` | `filePath: string` | `Promise<void>` | 파일 삭제 |
| `close` | (없음) | `Promise<void>` | 연결 종료 |

### Clients

| API | Type | Description |
|-----|------|-------------|
| `FtpStorageClient` | class | FTP/FTPS 프로토콜 스토리지 클라이언트 (`basic-ftp` 기반) |
| `SftpStorageClient` | class | SFTP 프로토콜 스토리지 클라이언트 (`ssh2-sftp-client` 기반) |

#### `FtpStorageClient`

FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트. `StorageClient` 인터페이스를 구현한다.

```typescript
class FtpStorageClient implements StorageClient {
  constructor(private readonly _secure: boolean = false);
}
```

- `_secure` 생성자 매개변수: `true`이면 FTPS, `false`이면 FTP 사용
- 미연결 상태에서 메서드를 호출하면 `SdError`를 던진다
- `exists()`는 먼저 `size()` 명령으로 파일을 O(1) 확인하고, 실패 시 부모 디렉토리 목록을 조회하여 디렉토리 존재 여부를 확인한다. 모든 예외에 대해 `false`를 반환한다
- `close()`는 이미 종료된 상태에서 호출해도 안전하다

#### `SftpStorageClient`

SFTP 프로토콜을 사용하는 스토리지 클라이언트. `StorageClient` 인터페이스를 구현한다.

```typescript
class SftpStorageClient implements StorageClient {
  constructor();
}
```

- `password`가 있으면 패스워드 인증, 없으면 SSH agent(`SSH_AUTH_SOCK`) + `~/.ssh/id_ed25519` 키 파일 인증을 순서대로 시도한다
- 미연결 상태에서 메서드를 호출하면 `SdError`를 던진다
- `exists()`는 `ssh2-sftp-client`의 `exists()` 반환값(`false | 'd' | '-' | 'l'`)으로 판단한다
- `close()`는 이미 종료된 상태에서 호출해도 안전하다

### Factory

| API | Type | Description |
|-----|------|-------------|
| `StorageFactory` | class | 프로토콜에 따른 클라이언트 생성 및 연결 생명주기 관리 팩토리 |

#### `StorageFactory`

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `StorageProtocol` | 프로토콜 (`"ftp"`, `"ftps"`, `"sftp"`) |
| `config` | `StorageConnConfig` | 연결 설정 |
| `fn` | `(storage: StorageClient) => R \| Promise<R>` | 연결된 클라이언트를 받아 작업을 수행하는 콜백 |

콜백 완료 또는 예외 발생 시 연결이 자동으로 종료된다.

## Usage Examples

### StorageFactory.connect로 파일 업로드

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

### 파일 목록 조회 및 다운로드

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

### 클라이언트 직접 사용 (수동 생명주기 관리)

```typescript
import { FtpStorageClient } from "@simplysm/storage";

const client = new FtpStorageClient(true); // FTPS
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
