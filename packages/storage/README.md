# @simplysm/storage

FTP/SFTP 스토리지 클라이언트 패키지이다.

## 설치

```bash
npm install @simplysm/storage
# or
pnpm add @simplysm/storage
```

## 주요 기능

### StorageFactory (권장)

스토리지 타입에 따라 적절한 클라이언트를 생성하고 자동으로 연결/종료를 관리한다.

```typescript
import { StorageFactory } from "@simplysm/storage";

// FTP 연결 (콜백 패턴 - 자동 연결/종료)
const result = await StorageFactory.connect("ftp", {
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
}, async (client) => {
  // 파일 업로드
  await client.put("/local/file.txt", "/remote/file.txt");

  // 파일 다운로드
  const data = await client.readFile("/remote/file.txt");

  // 결과 반환
  return data;
});

// FTPS 연결 (암호화)
await StorageFactory.connect("ftps", config, async (client) => {
  await client.put(buffer, "/remote/file.txt");
});

// SFTP 연결
await StorageFactory.connect("sftp", {
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
}, async (client) => {
  const files = await client.readdir("/remote/path");
  return files;
});
```

### FtpStorageClient

FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트이다.

```typescript
import { FtpStorageClient } from "@simplysm/storage";

// FTP 클라이언트 (secure: false)
const client = new FtpStorageClient();

// FTPS 클라이언트 (secure: true)
const secureClient = new FtpStorageClient(true);

await client.connect({
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
});

// 파일 업로드 (로컬 경로 또는 Uint8Array)
await client.put("/local/path/file.txt", "/remote/path/file.txt");
await client.put(new Uint8Array([...]), "/remote/path/file.txt");

// 파일 다운로드
const data = await client.readFile("/remote/path/file.txt");

// 디렉토리 목록 조회
const files = await client.readdir("/remote/path");

// 파일 삭제
await client.remove("/remote/path/file.txt");

// 디렉토리 생성
await client.mkdir("/remote/new/path");

// 파일/디렉토리 존재 확인
const exists = await client.exists("/remote/path/file.txt");

// 이름 변경
await client.rename("/remote/old.txt", "/remote/new.txt");

// 디렉토리 전체 업로드
await client.uploadDir("/local/dir", "/remote/dir");

await client.close();
```

### SftpStorageClient

SFTP 프로토콜을 사용하는 스토리지 클라이언트이다.

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();

await client.connect({
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
});

// FtpStorageClient와 동일한 API
await client.put("/local/path/file.txt", "/remote/path/file.txt");
const data = await client.readFile("/remote/path/file.txt");

await client.close();
```

## 스토리지 타입

```typescript
type StorageType = "ftp" | "ftps" | "sftp";
```

## Storage 인터페이스

모든 스토리지 클라이언트가 구현하는 인터페이스이다.

| 메서드 | 설명 |
|-------|------|
| `connect(config)` | 서버 연결 |
| `close()` | 연결 종료 |
| `put(localPathOrBuffer, remotePath)` | 파일 업로드 |
| `readFile(path)` | 파일 다운로드 (Uint8Array 반환) |
| `readdir(path)` | 디렉토리 목록 조회 (FileInfo[] 반환) |
| `remove(path)` | 파일 삭제 |
| `exists(path)` | 파일/디렉토리 존재 여부 확인 |
| `mkdir(path)` | 디렉토리 생성 |
| `rename(from, to)` | 파일/디렉토리 이름 변경 |
| `uploadDir(localPath, remotePath)` | 디렉토리 전체 업로드 |

## 타입 정의

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}

interface FileInfo {
  name: string;
  isFile: boolean; // 파일 여부 (false면 디렉토리)
}
```

## 라이선스

Apache-2.0
