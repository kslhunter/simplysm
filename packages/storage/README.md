# @simplysm/storage

FTP, FTPS, SFTP 프로토콜을 지원하는 스토리지 클라이언트 패키지이다. 통일된 `Storage` 인터페이스를 통해 프로토콜에 관계없이 동일한 API로 파일 업로드, 다운로드, 디렉토리 조작 등의 작업을 수행할 수 있다.

`StorageFactory`를 사용하면 연결/종료를 자동으로 관리할 수 있으며, 필요에 따라 `FtpStorageClient` 또는 `SftpStorageClient`를 직접 인스턴스화하여 사용할 수도 있다.

## 설치

```bash
npm install @simplysm/storage
# or
pnpm add @simplysm/storage
```

### 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티 (`Bytes` 타입 등) |
| `basic-ftp` | FTP/FTPS 프로토콜 구현체 |
| `ssh2-sftp-client` | SFTP 프로토콜 구현체 |

## 주요 모듈

### Export 목록

| 모듈 | 종류 | 설명 |
|------|------|------|
| `StorageFactory` | 클래스 | 스토리지 타입에 따라 클라이언트를 생성하고 연결/종료를 자동 관리 |
| `FtpStorageClient` | 클래스 | FTP/FTPS 프로토콜 클라이언트 (`basic-ftp` 기반) |
| `SftpStorageClient` | 클래스 | SFTP 프로토콜 클라이언트 (`ssh2-sftp-client` 기반) |
| `Storage` | 인터페이스 | 모든 스토리지 클라이언트가 구현하는 공통 인터페이스 |
| `StorageConnConfig` | 인터페이스 | 연결 설정 |
| `FileInfo` | 인터페이스 | 디렉토리 항목 정보 |
| `StorageType` | 타입 | 스토리지 프로토콜 종류 (`"ftp" \| "ftps" \| "sftp"`) |

## 타입 정의

### StorageConnConfig

서버 연결에 필요한 설정이다.

```typescript
interface StorageConnConfig {
  host: string;   // 서버 호스트
  port?: number;  // 포트 (FTP 기본값: 21, SFTP 기본값: 22)
  user?: string;  // 사용자명
  pass?: string;  // 비밀번호
}
```

### FileInfo

`readdir()` 결과로 반환되는 파일/디렉토리 정보이다.

```typescript
interface FileInfo {
  name: string;    // 파일 또는 디렉토리 이름
  isFile: boolean; // true면 파일, false면 디렉토리
}
```

### StorageType

지원하는 스토리지 프로토콜 종류이다.

```typescript
type StorageType = "ftp" | "ftps" | "sftp";
```

| 값 | 프로토콜 | 기본 포트 | 설명 |
|-----|---------|----------|------|
| `"ftp"` | FTP | 21 | 비암호화 FTP |
| `"ftps"` | FTPS | 21 | TLS 암호화 FTP |
| `"sftp"` | SFTP | 22 | SSH 기반 파일 전송 |

### Storage 인터페이스

모든 스토리지 클라이언트(`FtpStorageClient`, `SftpStorageClient`)가 구현하는 공통 인터페이스이다. `Bytes`는 `@simplysm/core-common`에서 정의한 `Uint8Array` 타입 별칭이다.

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `connect` | `(config: StorageConnConfig) => Promise<void>` | 서버에 연결 |
| `close` | `() => Promise<void>` | 연결 종료 |
| `put` | `(localPathOrBuffer: string \| Bytes, storageFilePath: string) => Promise<void>` | 파일 업로드 (로컬 경로 또는 바이트 데이터) |
| `readFile` | `(filePath: string) => Promise<Bytes>` | 파일 다운로드 (`Bytes` 반환) |
| `readdir` | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 목록 조회 |
| `remove` | `(filePath: string) => Promise<void>` | 파일 삭제 |
| `exists` | `(filePath: string) => Promise<boolean>` | 파일/디렉토리 존재 여부 확인 |
| `mkdir` | `(dirPath: string) => Promise<void>` | 디렉토리 생성 (재귀적) |
| `rename` | `(fromPath: string, toPath: string) => Promise<void>` | 파일/디렉토리 이름 변경 |
| `uploadDir` | `(fromPath: string, toPath: string) => Promise<void>` | 로컬 디렉토리 전체를 원격에 업로드 |

## 사용법

### StorageFactory (권장)

`StorageFactory.connect()`는 콜백 패턴으로 연결과 종료를 자동으로 관리한다. 콜백에서 예외가 발생하더라도 연결이 반드시 종료되므로, 직접 클라이언트를 사용하는 것보다 권장된다.

```typescript
import { StorageFactory } from "@simplysm/storage";

// FTP 연결
const result = await StorageFactory.connect("ftp", {
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
}, async (client) => {
  // 로컬 파일을 원격 서버에 업로드
  await client.put("/local/path/file.txt", "/remote/path/file.txt");

  // 바이트 데이터를 직접 업로드
  const data = new TextEncoder().encode("hello world");
  await client.put(data, "/remote/path/hello.txt");

  // 원격 파일 다운로드
  const content = await client.readFile("/remote/path/file.txt");

  // 콜백의 반환값이 StorageFactory.connect()의 반환값이 된다
  return content;
});
```

```typescript
// FTPS 연결 (TLS 암호화)
await StorageFactory.connect("ftps", {
  host: "ftps.example.com",
  user: "username",
  pass: "password",
}, async (client) => {
  await client.put("/local/file.txt", "/remote/file.txt");
});
```

```typescript
// SFTP 연결
await StorageFactory.connect("sftp", {
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
}, async (client) => {
  // 디렉토리 목록 조회
  const files = await client.readdir("/remote/path");
  for (const file of files) {
    console.log(`${file.name} - ${file.isFile ? "파일" : "디렉토리"}`);
  }

  // 디렉토리 전체 업로드
  await client.uploadDir("/local/dir", "/remote/dir");
});
```

### FtpStorageClient (직접 사용)

FTP 또는 FTPS 프로토콜을 사용하는 클라이언트이다. 생성자의 `secure` 파라미터로 FTPS 사용 여부를 설정한다.

```typescript
import { FtpStorageClient } from "@simplysm/storage";

// FTP 클라이언트 (secure: false가 기본값)
const client = new FtpStorageClient();

// FTPS 클라이언트
const secureClient = new FtpStorageClient(true);

await client.connect({
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
});

try {
  // 파일 업로드 - 로컬 파일 경로로 업로드
  await client.put("/local/path/file.txt", "/remote/path/file.txt");

  // 파일 업로드 - Uint8Array 바이트 데이터로 업로드
  const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  await client.put(bytes, "/remote/path/hello.bin");

  // 파일 다운로드 (Bytes, 즉 Uint8Array 반환)
  const data = await client.readFile("/remote/path/file.txt");
  const text = new TextDecoder().decode(data);

  // 디렉토리 목록 조회
  const files = await client.readdir("/remote/path");

  // 파일/디렉토리 존재 여부 확인
  const exists = await client.exists("/remote/path/file.txt");

  // 디렉토리 생성 (상위 디렉토리도 함께 생성)
  await client.mkdir("/remote/new/nested/path");

  // 파일 이름 변경
  await client.rename("/remote/old-name.txt", "/remote/new-name.txt");

  // 파일 삭제
  await client.remove("/remote/path/file.txt");

  // 로컬 디렉토리 전체를 원격에 업로드
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  // 반드시 연결을 종료해야 한다
  await client.close();
}
```

### SftpStorageClient (직접 사용)

SFTP 프로토콜을 사용하는 클라이언트이다. `FtpStorageClient`와 동일한 `Storage` 인터페이스를 구현하므로 API가 동일하다.

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();

await client.connect({
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
});

try {
  // Storage 인터페이스의 모든 메서드를 동일하게 사용할 수 있다
  await client.put("/local/path/file.txt", "/remote/path/file.txt");
  const data = await client.readFile("/remote/path/file.txt");
  const files = await client.readdir("/remote/path");
  const exists = await client.exists("/remote/path/file.txt");
  await client.mkdir("/remote/new/path");
  await client.rename("/remote/old.txt", "/remote/new.txt");
  await client.remove("/remote/path/file.txt");
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  await client.close();
}
```

## 주의사항

### 연결 관리

- `StorageFactory.connect()` 사용을 권장한다. 콜백이 끝나면 연결이 자동으로 종료되며, 예외가 발생하더라도 `finally` 블록에서 종료를 보장한다.
- 클라이언트를 직접 사용할 경우 반드시 `try/finally` 패턴으로 `close()`를 호출해야 한다. 그렇지 않으면 연결이 누수될 수 있다.
- 이미 연결된 인스턴스에서 `connect()`를 다시 호출하면 에러가 발생한다. 재연결이 필요하면 먼저 `close()`를 호출해야 한다.
- `close()`는 이미 종료된 상태에서 호출해도 에러가 발생하지 않는다.

### exists() 동작 방식

- FTP: 파일은 `SIZE` 명령(O(1))으로 확인하고, 실패 시 상위 디렉토리 목록을 조회하여 디렉토리 존재 여부를 확인한다. 항목 수가 많은 디렉토리에서는 성능이 저하될 수 있다.
- SFTP: `ssh2-sftp-client`의 `exists()`를 사용하며, 파일(`"-"`), 디렉토리(`"d"`), 심볼릭 링크(`"l"`) 모두 `true`를 반환한다.
- 두 구현체 모두 상위 디렉토리가 존재하지 않거나, 네트워크/권한 오류 시 예외 대신 `false`를 반환한다.

### 바이트 데이터 타입

- `readFile()`의 반환 타입과 `put()`의 입력 타입에 사용되는 `Bytes`는 `@simplysm/core-common`에서 정의한 `Uint8Array` 타입 별칭이다.

## 라이선스

Apache-2.0
