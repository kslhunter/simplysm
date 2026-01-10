# @simplysm/storage

FTP/SFTP 스토리지 연결 및 파일 전송 유틸리티 패키지입니다.

## 설치

```bash
yarn add @simplysm/storage
```

## 사용법

### StorageFactory 사용 (권장)

```typescript
import { StorageFactory } from "@simplysm/storage";

// FTP
await StorageFactory.connect("ftp", {
  host: "ftp.example.com",
  port: 21,
  user: "username",
  pass: "password",
}, async (storage) => {
  await storage.mkdir("/backup");
  await storage.uploadDir("./dist", "/backup/dist");
});

// FTPS
await StorageFactory.connect("ftps", config, async (storage) => {
  const files = await storage.readdir("/");
  console.log(files);
});

// SFTP
await StorageFactory.connect("sftp", {
  host: "sftp.example.com",
  port: 22,
  user: "username",
  pass: "password",
}, async (storage) => {
  const content = await storage.readFile("/config.json");
  console.log(content.toString());
});
```

### 클라이언트 직접 사용

```typescript
import { FtpStorageClient, SftpStorageClient } from "@simplysm/storage";

// FTP 클라이언트
const ftp = new FtpStorageClient(false); // false = FTP, true = FTPS
await ftp.connect({ host: "ftp.example.com", user: "user", pass: "pass" });
await ftp.put("./local.txt", "/remote/file.txt");
await ftp.close();

// SFTP 클라이언트
const sftp = new SftpStorageClient();
await sftp.connect({ host: "sftp.example.com", user: "user", pass: "pass" });
const exists = await sftp.exists("/path/to/file");
await sftp.close();
```

## API

### Storage 인터페이스

| 메서드 | 설명 |
|--------|------|
| `connect(config)` | 서버 연결 |
| `mkdir(dirPath)` | 디렉토리 생성 (재귀) |
| `rename(from, to)` | 이름 변경 |
| `readdir(dirPath)` | 디렉토리 목록 |
| `readFile(filePath)` | 파일 읽기 (Buffer) |
| `exists(filePath)` | 존재 여부 확인 |
| `put(source, dest)` | 파일 업로드 |
| `uploadDir(from, to)` | 디렉토리 업로드 |
| `remove(filePath)` | 파일 삭제 |
| `close()` | 연결 종료 |

### StorageConnConfig

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}
```

### FileInfo

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

## 지원 프로토콜

| 타입 | 설명 | 기본 포트 |
|------|------|----------|
| `ftp` | 일반 FTP | 21 |
| `ftps` | FTP over TLS/SSL | 21 |
| `sftp` | SSH File Transfer Protocol | 22 |

## 라이선스

MIT
