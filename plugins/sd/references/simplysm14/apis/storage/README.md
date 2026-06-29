# @simplysm/storage

FTP/FTPS/SFTP 스토리지 연결을 만들고 파일·디렉토리 작업을 `StorageClient` 공통 인터페이스로 다룬다.

## 사용 트리거 인덱스

- **StorageFactory** — 프로토콜과 접속 설정으로 연결을 열고 콜백 종료 후 연결까지 닫아야 할 때.
- **StorageClient** — 연결된 스토리지에서 공통 파일·디렉토리 작업 메서드 계약을 확인할 때.
- **StorageConnConfig / StorageProtocol / FileInfo** — 접속 설정 필드, 지원 프로토콜 리터럴, 목록 항목 반환 형태를 확인할 때.
- **FtpStorageClient / SftpStorageClient** — 팩토리 대신 구현체를 직접 생성하거나 프로토콜별 연결·인증 차이를 확인할 때.

## 연결 팩토리

### StorageFactory

```ts
class StorageFactory {
  static connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

- `type: StorageProtocol` — 생성할 구현체 선택값. `"sftp"` 는 `SftpStorageClient`, `"ftps"` 는 `FtpStorageClient(true)`, `"ftp"` 는 `FtpStorageClient(false)` 로 분기한다.
- `config: StorageConnConfig` — 선택된 구현체의 `connect` 로 전달되는 접속 설정.
- `fn: (storage: StorageClient) => R | Promise<R>` — 연결된 `StorageClient` 를 받는 콜백. 동기 반환값이나 `Promise` 반환값이 `connect` 의 결과가 된다.
- 동작 — `client.connect(config)` 성공 후 `fn(client)` 를 실행하고, `finally` 에서 `client.close()` 를 호출한다. `fn` 이 throw/reject 해도 종료 시도를 하며, 종료 중 오류는 catch 한다.

## 공통 타입

### StorageConnConfig

```ts
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

- `host: string` — 접속 대상 호스트. FTP/FTPS 는 `basic-ftp` 의 `host`, SFTP 는 `ssh2-sftp-client` 의 `host` 로 전달된다.
- `port?: number` — 접속 포트. FTP/FTPS 와 SFTP 연결 옵션의 `port` 로 그대로 전달된다.
- `user?: string` — 로그인 사용자. FTP/FTPS 는 `user`, SFTP 는 `username` 으로 전달된다.
- `password?: string` — 비밀번호. FTP/FTPS 는 `password` 로 전달되고, SFTP 는 값이 있으면 password 인증을 사용한다. SFTP 에서 값이 없으면 `~/.ssh/id_ed25519` 개인키와, `SSH_AUTH_SOCK` 이 있으면 agent 옵션을 함께 시도하며, 개인키 연결 실패 시 agent 옵션만으로 재시도한다.

### StorageProtocol

```ts
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

- `"ftp"` — `StorageFactory` 가 `FtpStorageClient(false)` 를 생성하는 리터럴. FTP 클라이언트의 `secure` 옵션이 `false` 로 전달된다.
- `"ftps"` — `StorageFactory` 가 `FtpStorageClient(true)` 를 생성하는 리터럴. FTP 클라이언트의 `secure` 옵션이 `true` 로 전달된다.
- `"sftp"` — `StorageFactory` 가 `SftpStorageClient` 를 생성하는 리터럴.

### FileInfo

```ts
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

- `name: string` — 목록 항목 이름. FTP/FTPS 와 SFTP 모두 라이브러리 항목의 `name` 값을 그대로 반환한다.
- `isFile: boolean` — 파일 여부. FTP/FTPS 는 라이브러리 항목의 `isFile` 값을 반환하고, SFTP 는 항목 `type` 이 `"-"` 일 때 `true`, 그 외에는 `false` 다.

### StorageClient

```ts
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

- `connect(config: StorageConnConfig)` — 서버에 연결한다. 두 구현체 모두 이미 연결된 인스턴스에서 다시 호출하면 `SdError` 를 throw 하고, 연결 실패 시 내부 클라이언트를 닫은 뒤 원래 오류를 다시 throw 한다.
- `mkdir(dirPath: string)` — 원격 디렉토리를 만든다. FTP/FTPS 는 `ensureDir`, SFTP 는 `mkdir(dirPath, true)` 로 부모 디렉토리까지 생성한다.
- `rename(fromPath: string, toPath: string)` — 원격 경로를 `fromPath` 에서 `toPath` 로 이름 변경 또는 이동한다.
- `list(dirPath: string)` — 원격 디렉토리 목록을 `FileInfo[]` 로 반환한다.
- `readFile(filePath: string)` — 원격 파일을 읽어 `Bytes` 로 반환한다. FTP/FTPS 는 다운로드 스트림 청크를 합치고, SFTP 는 `get(filePath)` 결과가 `Uint8Array` 면 그대로 반환하며 string 이면 `TextEncoder` 로 인코딩한다. 그 외 타입은 `SdError` 를 throw 한다.
- `exists(filePath: string)` — 원격 파일·디렉토리 존재 여부를 반환한다. 두 구현체 모두 내부 확인 중 예외가 나면 `false` 를 반환한다. FTP/FTPS 는 먼저 `size(filePath)` 로 확인하고 실패하면 부모 디렉토리 목록에서 파일명을 찾으며, SFTP 는 `exists(filePath)` 결과가 문자열이면 `true` 로 본다.
- `put(localPathOrBuffer: string | Bytes, storageFilePath: string)` — 로컬 파일 경로나 바이트 데이터를 원격 파일 경로에 업로드한다. 첫 인자가 string 이면 FTP/FTPS 는 `uploadFrom`, SFTP 는 `fastPut` 을 쓰고, `Bytes` 이면 FTP/FTPS 는 `Readable.from`, SFTP 는 `Buffer.from` 으로 업로드한다.
- `uploadDir(fromPath: string, toPath: string)` — 로컬 디렉토리 `fromPath` 를 원격 디렉토리 `toPath` 로 업로드한다. FTP/FTPS 는 `uploadFromDir`, SFTP 는 `uploadDir` 로 위임한다.
- `remove(filePath: string)` — 원격 파일을 삭제한다. FTP/FTPS 는 `remove`, SFTP 는 `delete` 로 위임한다.
- `close()` — 연결을 종료한다. 두 구현체 모두 미연결 상태에서 호출하면 즉시 완료하고, 연결 상태에서는 내부 클라이언트를 닫은 뒤 재연결 가능하도록 내부 참조를 비운다.
- 미연결 상태 작업 — 두 구현체 모두 작업 메서드에서 내부 클라이언트가 없으면 `SdError` 를 throw 한다.

## 프로토콜별 구현체

### FtpStorageClient

```ts
class FtpStorageClient implements StorageClient {
  constructor(_secure?: boolean);
}
```

- `_secure?: boolean` — FTP 보안 옵션. `true` 면 `basic-ftp` `access` 호출의 `secure` 가 `true`, 생략하거나 `false` 면 `secure` 가 `false` 다.
- 연결 동작 — `connect(config)` 는 `basic-ftp` `Client` 를 만들고 `host`, `port`, `user`, `password`, `secure` 옵션으로 `access` 를 호출한다.
- 작업 동작 — 공개 작업 메서드는 `StorageClient` 계약을 따른다.
- 종료 동작 — `close()` 는 내부 `Client.close()` 를 호출하고 내부 참조를 `undefined` 로 바꾼다. 이미 미연결이면 완료된 `Promise` 를 반환한다.

### SftpStorageClient

```ts
class SftpStorageClient implements StorageClient {
  constructor();
}
```

- 생성자 — 공개 생성자 인자가 없다.
- 연결 동작 — `connect(config)` 는 `ssh2-sftp-client` 인스턴스를 만들고 `host`, `port`, `username` 을 전달한다. `password` 값이 있으면 password 인증을 사용하고, 없으면 `~/.ssh/id_ed25519` 개인키와 선택적 agent 인증 경로를 사용한다.
- agent 옵션 — `SSH_AUTH_SOCK` 환경변수가 있으면 SFTP 연결 옵션에 `agent` 로 포함한다.
- 개인키 실패 처리 — 개인키를 포함한 연결 시도가 실패하면 같은 기본 옵션으로 agent-only 연결을 다시 시도한다.
- 작업 동작 — 공개 작업 메서드는 `StorageClient` 계약을 따른다.
- 종료 동작 — `close()` 는 내부 `client.end()` 를 await 하고 내부 참조를 `undefined` 로 바꾼다. 이미 미연결이면 반환한다.
