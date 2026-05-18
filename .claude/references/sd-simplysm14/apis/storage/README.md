# @simplysm/storage

FTP/FTPS/SFTP 원격 스토리지에 동일 인터페이스(`StorageClient`)로 파일을 읽고/쓰는 Node 라이브러리.

## 사용 트리거 인덱스

- **`StorageFactory.connect`** — FTP/FTPS/SFTP 어느 것이든 연결→작업→자동 종료를 한 번에 처리할 때 (권장 진입점).
- **`StorageClient`** — 콜백 안에서 사용하는 공통 파일 작업 인터페이스(mkdir/list/readFile/put/uploadDir/remove/rename/exists).
- **`FtpStorageClient` / `SftpStorageClient`** — 연결 생명주기를 직접 관리해야 할 때만 (장기 연결 풀 등). 그 외엔 `StorageFactory.connect` 사용.
- **`StorageConnConfig`, `StorageProtocol`, `FileInfo`** — 위 API 호출 시 타입.

## StorageFactory.connect

```ts
class StorageFactory {
  static connect<R>(
    type: StorageProtocol,                                   // "ftp" | "ftps" | "sftp"
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

- `type` 에 따라 `FtpStorageClient(secure=false)` / `FtpStorageClient(secure=true)` / `SftpStorageClient` 생성.
- 콜백 실행 전 `connect`, 콜백 종료(예외 포함) 후 `close` 자동 호출. `close` 실패는 무시.

```ts
const list = await StorageFactory.connect("sftp", { host, user, password }, async (s) => {
  await s.mkdir("/up/2026");
  await s.put(Buffer.from("hi"), "/up/2026/a.txt");
  return await s.list("/up/2026");
});
```

## StorageClient

```ts
interface StorageClient {
  connect(config: StorageConnConfig): Promise<void>;
  mkdir(dirPath: string): Promise<void>;                              // 부모 디렉토리 자동 생성
  rename(fromPath: string, toPath: string): Promise<void>;
  list(dirPath: string): Promise<FileInfo[]>;                         // { name, isFile }
  readFile(filePath: string): Promise<Bytes>;                         // Bytes = Uint8Array (@simplysm/core-common)
  exists(filePath: string): Promise<boolean>;                         // 모든 예외 시 false
  put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>;  // string=로컬 경로, Bytes=메모리 버퍼
  uploadDir(fromPath: string, toPath: string): Promise<void>;         // 디렉토리 통째로 업로드
  remove(filePath: string): Promise<void>;
  close(): Promise<void>;                                             // 이미 종료돼 있어도 안전
}

interface StorageConnConfig { host: string; port?: number; user?: string; password?: string; }
interface FileInfo { name: string; isFile: boolean; }
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

## FtpStorageClient / SftpStorageClient

`StorageClient` 구현체. 직접 사용 시 주의:

- `connect` 후 반드시 `close`. 동일 인스턴스에서 `connect` 중복 호출 금지(연결 누수 → `SdError` throw). `close` 후 재연결은 가능.
- `FtpStorageClient(secure: boolean)` — `secure=true` 가 FTPS.
- `SftpStorageClient` — `config.password` 가 있으면 비밀번호 인증. 없으면 `~/.ssh/id_ed25519` 키 + (있으면) `SSH_AUTH_SOCK` agent 로 시도, 키 파싱 실패 시 agent 단독 재시도.
- `FtpStorageClient.exists` — 파일은 `size()` 로 O(1), 디렉토리는 부모 `list()` 스캔. 슬래시 없는 경로는 `/` 기준.

```ts
const client = new SftpStorageClient();
await client.connect({ host, user, password });
try { /* ... */ } finally { await client.close(); }
```
