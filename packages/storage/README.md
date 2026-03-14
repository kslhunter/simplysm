# @simplysm/storage

FTP, FTPS, SFTP 원격 스토리지 통합 라이브러리. 팩토리 패턴으로 프로토콜에 독립적인 파일 전송을 제공한다.

## 설치

```bash
npm install @simplysm/storage
```

**의존성:** `basic-ftp` (FTP/FTPS), `ssh2-sftp-client` (SFTP), `@simplysm/core-common`

## 빠른 시작

```typescript
import { StorageFactory } from "@simplysm/storage";

// 팩토리 패턴: 연결 → 작업 → 자동 종료
await StorageFactory.connect("sftp", {
  host: "example.com",
  port: 22,
  user: "deploy",
  password: "secret",
}, async (storage) => {
  await storage.put("/local/file.zip", "/remote/file.zip");
  await storage.uploadDir("/local/dist", "/remote/www");
  const files = await storage.list("/remote/www");
  const exists = await storage.exists("/remote/file.zip");
});
// 콜백 종료 시 연결 자동 해제 (예외 발생해도 보장)
```

## 타입 정의

### StorageProtocol

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

| 값 | 설명 | 내부 클라이언트 |
|-----|------|----------------|
| `"ftp"` | File Transfer Protocol | `FtpStorageClient(secure=false)` |
| `"ftps"` | FTP over SSL/TLS | `FtpStorageClient(secure=true)` |
| `"sftp"` | SSH File Transfer Protocol | `SftpStorageClient` |

### StorageConnConfig

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;   // 미지정 시 프로토콜 기본값 사용
  user?: string;
  password?: string;
}
```

- **SFTP에서 `password` 미지정 시**: SSH 키 인증으로 전환
  1. `~/.ssh/id_ed25519` 키 파일 자동 탐색
  2. 키 파싱 실패 시 `SSH_AUTH_SOCK` 환경변수의 SSH 에이전트로 재시도

### FileInfo

```typescript
interface FileInfo {
  name: string;     // 파일/디렉토리 이름
  isFile: boolean;  // true: 파일, false: 디렉토리
}
```

### Bytes

`@simplysm/core-common`에서 정의한 바이트 배열 타입 (`Uint8Array` 기반).

## API 레퍼런스

### StorageFactory

프로토콜에 독립적으로 스토리지 클라이언트를 생성하고 연결을 관리하는 팩토리 클래스.

#### `StorageFactory.connect<R>(type, config, fn): Promise<R>`

```typescript
static async connect<R>(
  type: StorageProtocol,
  config: StorageConnConfig,
  fn: (storage: StorageClient) => R | Promise<R>,
): Promise<R>
```

- 연결 수립 → 콜백 실행 → 연결 종료를 자동 관리
- 콜백에서 예외가 발생해도 `finally`에서 연결이 안전하게 종료됨
- 콜백의 반환값을 그대로 반환 (제네릭 `R`)

```typescript
// 반환값 활용 예시
const fileList = await StorageFactory.connect("ftp", config, async (storage) => {
  return await storage.list("/data");
});
// fileList: FileInfo[]
```

### StorageClient (공통 인터페이스)

`FtpStorageClient`와 `SftpStorageClient`가 구현하는 공통 인터페이스. `StorageFactory.connect` 콜백의 `storage` 파라미터 타입이다.

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `connect` | `(config: StorageConnConfig) => Promise<void>` | 서버 연결. 이미 연결된 인스턴스에서 호출하면 에러 발생 |
| `close` | `() => Promise<void>` | 연결 종료. 이미 종료된 상태에서 호출해도 안전함 |
| `mkdir` | `(dirPath: string) => Promise<void>` | 디렉토리 생성 (부모 디렉토리 자동 생성) |
| `rename` | `(fromPath: string, toPath: string) => Promise<void>` | 파일/디렉토리 이름 변경 |
| `list` | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 내 항목 목록 조회 |
| `readFile` | `(filePath: string) => Promise<Bytes>` | 원격 파일을 바이트 배열로 읽기 |
| `exists` | `(filePath: string) => Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |
| `put` | `(localPathOrBuffer: string \| Bytes, remotePath: string) => Promise<void>` | 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드 |
| `uploadDir` | `(fromPath: string, toPath: string) => Promise<void>` | 로컬 디렉토리 전체를 원격 경로에 업로드 |
| `remove` | `(filePath: string) => Promise<void>` | 원격 파일 삭제 |

#### 메서드별 주의사항

**`exists`**: 부모 디렉토리가 존재하지 않아도 `false` 반환. 네트워크 오류/권한 오류 등 모든 예외에 대해서도 `false` 반환.
- FTP: `size()` 명령으로 파일 확인 (O(1)), 실패 시 부모 디렉토리 `list()`로 폴백
- SFTP: `exists()` 내장 메서드 사용 (반환값 `false | 'd' | '-' | 'l'`)

**`mkdir`**: 부모 디렉토리가 없으면 재귀적으로 생성한다.

**`put`**: 첫 번째 인자로 로컬 파일 경로(string) 또는 바이트 데이터(Bytes)를 받는다.
- SFTP는 파일 경로 전달 시 `fastPut` 사용 (병렬 전송으로 더 빠름)

**`connect`**: 이미 연결된 인스턴스에서 중복 호출하면 `SdError` 발생. 반드시 `close()` 후 재연결해야 한다.

### FtpStorageClient

FTP/FTPS 프로토콜 클라이언트. 내부적으로 `basic-ftp` 라이브러리를 사용한다.

```typescript
import { FtpStorageClient } from "@simplysm/storage";

const client = new FtpStorageClient(secure?: boolean);
// secure=false: FTP (기본값)
// secure=true: FTPS
```

직접 사용 시 반드시 `connect` → 작업 → `close` 순서를 지켜야 한다. `StorageFactory.connect` 사용을 권장한다.

### SftpStorageClient

SFTP 프로토콜 클라이언트. 내부적으로 `ssh2-sftp-client` 라이브러리를 사용한다.

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();
```

**인증 방식 (자동 선택):**
1. `password`가 있으면 비밀번호 인증
2. `password`가 없으면 키 기반 인증:
   - `~/.ssh/id_ed25519` 키 파일 + SSH 에이전트(`SSH_AUTH_SOCK`) 시도
   - 키 파싱 실패 시 SSH 에이전트만으로 재시도

## 사용 예제

### 파일 업로드/다운로드

```typescript
await StorageFactory.connect("sftp", config, async (storage) => {
  // 로컬 파일 업로드
  await storage.put("/local/path/file.txt", "/remote/path/file.txt");

  // 바이트 데이터 직접 업로드
  const data = new TextEncoder().encode("hello");
  await storage.put(data, "/remote/path/hello.txt");

  // 파일 읽기
  const content = await storage.readFile("/remote/path/file.txt");
});
```

### 디렉토리 관리

```typescript
await StorageFactory.connect("ftp", config, async (storage) => {
  // 디렉토리 생성 (중첩 경로 자동 생성)
  await storage.mkdir("/remote/a/b/c");

  // 디렉토리 전체 업로드
  await storage.uploadDir("/local/dist", "/remote/www");

  // 디렉토리 목록 조회
  const items = await storage.list("/remote/www");
  for (const item of items) {
    // item.name: 이름, item.isFile: 파일 여부
  }
});
```

### 파일 존재 확인 및 삭제

```typescript
await StorageFactory.connect("ftps", config, async (storage) => {
  if (await storage.exists("/remote/old-file.txt")) {
    await storage.remove("/remote/old-file.txt");
  }

  await storage.rename("/remote/temp.txt", "/remote/final.txt");
});
```

### SSH 키 인증 (SFTP)

```typescript
// password 미지정 시 자동으로 키 기반 인증
await StorageFactory.connect("sftp", {
  host: "example.com",
  port: 22,
  user: "deploy",
  // password 생략 → ~/.ssh/id_ed25519 + SSH_AUTH_SOCK 사용
}, async (storage) => {
  await storage.uploadDir("/local/build", "/var/www/html");
});
```
