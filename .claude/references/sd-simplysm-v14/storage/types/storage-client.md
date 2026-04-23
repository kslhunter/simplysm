# `StorageClient`

스토리지 클라이언트 공통 인터페이스. [`FtpStorageClient`](../clients/ftp-storage-client.md)와 [`SftpStorageClient`](../clients/sftp-storage-client.md)가 구현한다.

## When to use

- ✅ 프로토콜에 무관한 스토리지 작업 함수를 작성할 때 (파라미터/반환 타입으로 사용)
- ❌ 직접 인스턴스화할 수 없다 — 구현체인 `FtpStorageClient`/`SftpStorageClient`를 사용하거나, [`StorageFactory.connect()`](../factory/storage-factory.md) 콜백에서 제공받는다

## Signature

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

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `connect` | method | `(config: StorageConnConfig) => Promise<void>` | 스토리지 서버에 연결. 이미 연결된 상태에서 호출하면 `SdError` 발생 |
| `mkdir` | method | `(dirPath: string) => Promise<void>` | 디렉토리 생성. 부모 디렉토리가 없으면 함께 생성 |
| `rename` | method | `(fromPath: string, toPath: string) => Promise<void>` | 파일/디렉토리 이름 변경 또는 이동 |
| `list` | method | `(dirPath: string) => Promise<FileInfo[]>` | 디렉토리 내 파일/디렉토리 목록 조회 |
| `readFile` | method | `(filePath: string) => Promise<Bytes>` | 파일 내용을 `Bytes`(`Uint8Array`)로 읽기 |
| `exists` | method | `(filePath: string) => Promise<boolean>` | 파일/디렉토리 존재 여부 확인. 모든 예외는 `false` 반환 |
| `put` | method | `(localPathOrBuffer: string \| Bytes, storageFilePath: string) => Promise<void>` | 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드 |
| `uploadDir` | method | `(fromPath: string, toPath: string) => Promise<void>` | 로컬 디렉토리 전체를 원격 경로에 업로드 |
| `remove` | method | `(filePath: string) => Promise<void>` | 파일 삭제 |
| `close` | method | `() => Promise<void>` | 연결 종료. 이미 종료된 상태에서 호출해도 안전 |

## Usage

```typescript
import type { StorageClient } from "@simplysm/storage";
import { StorageFactory } from "@simplysm/storage";

// StorageClient 타입을 직접 사용하는 경우 (예: 함수 파라미터 타입)
async function doWork(storage: StorageClient): Promise<void> {
  await storage.mkdir("/remote/dir");
  await storage.put("/local/file.txt", "/remote/dir/file.txt");
}

await StorageFactory.connect("sftp", { host: "sftp.example.com", user: "user", password: "pass" }, doWork);
```
