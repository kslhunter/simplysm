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
| `StorageProtocol` | type | 지원 프로토콜 유니온 타입 (`"ftp"` \| `"ftps"` \| `"sftp"`) |
| `StorageConnConfig` | interface | 스토리지 연결 설정 |
| `FileInfo` | interface | 파일/디렉토리 정보 |
| `StorageClient` | interface | 스토리지 클라이언트 공통 인터페이스 |

#### `StorageProtocol`

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

지원하는 프로토콜을 나타내는 유니온 타입:
- `"ftp"`: 일반 FTP 프로토콜
- `"ftps"`: TLS/SSL 암호화 FTP 프로토콜
- `"sftp"`: SSH 기반 SFTP 프로토콜

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
| `port` | `number \| undefined` | 포트 번호. 생략 시 프로토콜 기본값 사용 (FTP: 21, FTPS: 21, SFTP: 22) |
| `user` | `string \| undefined` | 사용자 이름 |
| `password` | `string \| undefined` | 비밀번호. SFTP에서 생략하면 SSH agent (`SSH_AUTH_SOCK` 환경변수) + `~/.ssh/id_ed25519` 키 파일 인증을 순서대로 시도 |

#### `FileInfo`

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 파일 또는 디렉토리의 이름 |
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
| `connect` | `config: StorageConnConfig` | `Promise<void>` | 스토리지 서버에 연결. 연결 해제 전 한 번만 호출 가능 |
| `mkdir` | `dirPath: string` | `Promise<void>` | 디렉토리 생성. 부모 디렉토리가 없으면 함께 생성 |
| `rename` | `fromPath: string, toPath: string` | `Promise<void>` | 파일/디렉토리 이름 변경 또는 이동 |
| `list` | `dirPath: string` | `Promise<FileInfo[]>` | 디렉토리 내 파일/디렉토리 목록 조회 |
| `readFile` | `filePath: string` | `Promise<Bytes>` | 파일 내용을 `Bytes`(`Uint8Array`)로 읽기 |
| `exists` | `filePath: string` | `Promise<boolean>` | 파일/디렉토리 존재 여부 확인. 모든 예외는 `false` 반환 |
| `put` | `localPathOrBuffer: string \| Bytes, storageFilePath: string` | `Promise<void>` | 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드 |
| `uploadDir` | `fromPath: string, toPath: string` | `Promise<void>` | 로컬 디렉토리 전체를 원격 경로에 업로드 |
| `remove` | `filePath: string` | `Promise<void>` | 파일 삭제 |
| `close` | 없음 | `Promise<void>` | 연결 종료. 이미 종료된 상태에서 호출해도 안전 |

### Clients

| API | Type | Description |
|-----|------|-------------|
| `FtpStorageClient` | class | FTP/FTPS 프로토콜 스토리지 클라이언트 (`basic-ftp` 라이브러리 기반) |
| `SftpStorageClient` | class | SFTP 프로토콜 스토리지 클라이언트 (`ssh2-sftp-client` 라이브러리 기반) |

#### `FtpStorageClient`

FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트. `StorageClient` 인터페이스를 구현한다.

```typescript
class FtpStorageClient implements StorageClient {
  constructor(private readonly _secure: boolean = false);
}
```

**생성자**:
- `_secure`: `true`이면 FTPS (TLS/SSL 암호화), `false`이면 FTP (기본값)

**특징**:
- `connect()`로 연결 후 메서드 호출. 미연결 상태에서 호출하면 `SdError` 발생
- `exists()`는 먼저 `size()` 명령으로 파일을 O(1) 성능으로 확인하고, 실패 시 부모 디렉토리 목록을 조회하여 디렉토리 존재 여부 확인. 모든 예외는 `false` 반환
- 슬래시가 없는 경로(예: `file.txt`)는 루트 디렉토리(`/`)에서 검색
- `close()`는 이미 종료된 상태에서 호출해도 안전 (오류 미발생)

#### `SftpStorageClient`

SFTP 프로토콜을 사용하는 스토리지 클라이언트. `StorageClient` 인터페이스를 구현한다.

```typescript
class SftpStorageClient implements StorageClient {
  constructor();
}
```

**인증 메커니즘**:
- `password`가 있으면 패스워드 인증 사용
- `password`가 없으면 다음 순서대로 시도:
  1. SSH agent (`SSH_AUTH_SOCK` 환경변수 설정 시)
  2. `~/.ssh/id_ed25519` 개인키 파일 인증
  3. privateKey 파싱 실패 시 (암호화된 키 등) agent만으로 재시도

**특징**:
- `connect()`로 연결 후 메서드 호출. 미연결 상태에서 호출하면 `SdError` 발생
- `exists()`는 `ssh2-sftp-client`의 `exists()` 반환값 (`false | 'd' | '-' | 'l'`)을 검사하여 존재 여부 판단. 모든 예외는 `false` 반환
- `close()`는 이미 종료된 상태에서 호출해도 안전 (오류 미발생)

### Factory

| API | Type | Description |
|-----|------|-------------|
| `StorageFactory` | class | 프로토콜별 클라이언트 생성 및 연결 생명주기 자동 관리 |

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

**메서드**:
- `StorageFactory.connect<R>()` (정적 메서드)

**파라미터**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `StorageProtocol` | 프로토콜 타입 (`"ftp"`, `"ftps"`, `"sftp"`) |
| `config` | `StorageConnConfig` | 연결 설정 |
| `fn` | `(storage: StorageClient) => R \| Promise<R>` | 연결된 클라이언트를 받아 작업을 수행하는 콜백. 반환값은 `Promise<R>` 형태로 래핑되어 반환됨 |

**동작**:
- `fn` 콜백이 완료되거나 예외를 발생시키면 연결이 자동으로 종료됨
- `fn`에서 발생한 예외는 그대로 전파됨
- 반환값: 콜백의 반환값

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
      console.log(`Read ${file.name}: ${content.length} bytes`);
    }
    return list;
  },
);
```

### FTPS로 파일 이름 변경

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect(
  "ftps",
  { host: "ftps.example.com", user: "user", password: "pass" },
  async (storage) => {
    const exists = await storage.exists("/remote/file.txt");
    if (exists) {
      await storage.rename("/remote/file.txt", "/remote/backup.txt");
    }
  },
);
```

### 클라이언트 직접 사용 (수동 생명주기 관리)

클라이언트를 직접 인스턴스화하여 수동으로 연결 생명주기를 관리할 수 있다. 하지만 연결 누수 위험이 있으므로 `StorageFactory.connect` 사용을 권장한다.

```typescript
import { FtpStorageClient } from "@simplysm/storage";

const client = new FtpStorageClient(true); // FTPS 사용
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

### SSH 키 인증으로 SFTP 연결 (비밀번호 생략)

`password`를 생략하면 SSH agent와 `~/.ssh/id_ed25519` 키 파일을 사용하여 인증한다.

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user" }, // password 생략
  async (storage) => {
    const list = await storage.list("/home/user");
    console.log(`Files: ${list.map((f) => f.name).join(", ")}`);
  },
);
```

### 바이트 데이터로 파일 업로드

```typescript
import { StorageFactory } from "@simplysm/storage";

const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.put(data, "/remote/file.bin");
  },
);
```

### 로컬 디렉토리 전체 업로드

```typescript
import { StorageFactory } from "@simplysm/storage";

await StorageFactory.connect(
  "ftp",
  { host: "ftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.uploadDir("/local/folder", "/remote/backup");
  },
);
```
