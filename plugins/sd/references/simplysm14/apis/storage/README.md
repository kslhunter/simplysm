# @simplysm/storage

FTP/FTPS/SFTP 원격 스토리지에 연결해 파일·디렉토리 작업을 `StorageClient` 공통 인터페이스로 수행한다. 프로토콜 선택과 연결/종료 자동 관리는 `StorageFactory.connect` 가, 실제 동작은 프로토콜별 구현체(`FtpStorageClient`, `SftpStorageClient`)가 담당한다.

## 사용 트리거 인덱스

- **StorageFactory** — 프로토콜·접속 설정으로 연결을 열고, 콜백 종료 후 연결까지 자동으로 닫고 싶을 때.
- **StorageClient** — 연결된 스토리지에서 쓸 수 있는 공통 파일·디렉토리 작업 메서드 계약을 확인할 때.
- **StorageConnConfig / StorageProtocol / FileInfo** — 접속 설정 필드, 지원 프로토콜 리터럴, 목록 항목 반환 형태를 확인할 때.
- **FtpStorageClient / SftpStorageClient** — 팩토리 대신 구현체를 직접 만들거나, 프로토콜별 연결·인증·작업 위임 차이를 확인할 때.

## 연결 팩토리

### StorageFactory

스토리지 클라이언트 팩토리. FTP/FTPS/SFTP 연결을 생성·관리한다.

```ts
class StorageFactory {
  static connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

- `type: StorageProtocol` — 생성할 구현체를 고르는 값. `"sftp"` → `SftpStorageClient`, `"ftps"` → `FtpStorageClient(true)`, `"ftp"` → `FtpStorageClient(false)` 로 내부 분기한다.
- `config: StorageConnConfig` — 선택된 구현체의 `connect(config)` 로 그대로 넘기는 접속 설정.
- `fn: (storage: StorageClient) => R | Promise<R>` — 연결된 `StorageClient` 를 받는 콜백. 동기 반환값이나 `Promise` 반환값이 `connect` 의 최종 결과(`R`)가 된다.
- 동작 — `client.connect(config)` 성공 후 `fn(client)` 를 `await` 하여 결과를 반환하고, `finally` 에서 항상 `client.close()` 를 호출한다. `fn` 이 throw/reject 해도 종료를 시도하며, 이때 `close()` 중 발생한 오류는 무시(catch)하므로 원래 오류만 전파된다. 직접 구현체를 다루는 것보다 이 콜백 패턴이 권장된다.

## 공통 타입

### StorageConnConfig

접속 설정. 프로토콜별 구현체의 `connect` 에 전달된다.

```ts
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

- `host: string` — 접속 대상 호스트. FTP/FTPS 는 `basic-ftp` `access` 의 `host`, SFTP 는 `ssh2-sftp-client` `connect` 의 `host` 로 전달된다.
- `port?: number` — 접속 포트. FTP/FTPS·SFTP 연결 옵션의 `port` 로 그대로 전달된다. 생략 시 라이브러리 기본 포트가 적용된다.
- `user?: string` — 로그인 사용자. FTP/FTPS 는 `user`, SFTP 는 `username` 으로 매핑된다.
- `password?: string` — 비밀번호. FTP/FTPS 는 `password` 로 전달된다. SFTP 는 값이 있으면(`!= null`) password 인증을 쓰고, 없으면 `~/.ssh/id_ed25519` 개인키 + 선택적 SSH agent 인증으로 대체한다(아래 SftpStorageClient 참조).

### StorageProtocol

`StorageFactory.connect` 의 `type` 으로 쓰이는 프로토콜 리터럴.

```ts
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

- `"ftp"` — 비보안 FTP. `StorageFactory` 가 `FtpStorageClient(false)` 를 만들어 `basic-ftp` `secure` 옵션을 `false` 로 둔다.
- `"ftps"` — 보안 FTP. `StorageFactory` 가 `FtpStorageClient(true)` 를 만들어 `secure` 옵션을 `true` 로 둔다.
- `"sftp"` — SSH 기반 SFTP. `StorageFactory` 가 `SftpStorageClient` 를 만든다.

### FileInfo

`list` 가 반환하는 디렉토리 항목 형태.

```ts
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

- `name: string` — 항목 이름. FTP/FTPS·SFTP 모두 라이브러리 항목의 `name` 을 그대로 옮긴다.
- `isFile: boolean` — 파일이면 `true`, 디렉토리 등은 `false`. FTP/FTPS 는 라이브러리 항목의 `isFile` 값을 그대로 쓰고, SFTP 는 항목 `type` 이 `"-"` 일 때만 `true`(그 외 `"d"`/`"l"` 등은 `false`)다.

### StorageClient

연결된 스토리지의 공통 작업 계약. `FtpStorageClient` 와 `SftpStorageClient` 가 모두 구현한다.

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

- `connect(config)` — 서버에 연결한다. 두 구현체 모두 이미 연결된 인스턴스에서 다시 호출하면 `SdError`("이미 연결되어 있습니다") 를 throw 하고, 연결 도중 실패하면 내부 클라이언트를 닫은 뒤 원래 오류를 다시 throw 한다. 사용 후 `close()` 로 종료해야 한다.
- `mkdir(dirPath)` — 원격 디렉토리를 만든다. 부모 디렉토리가 없으면 함께 생성한다(FTP/FTPS 는 `ensureDir`, SFTP 는 `mkdir(dirPath, true)`).
- `rename(fromPath, toPath)` — 원격 경로를 `fromPath` 에서 `toPath` 로 이름 변경/이동한다.
- `list(dirPath)` — 원격 디렉토리 목록을 `FileInfo[]` 로 반환한다.
- `readFile(filePath)` — 원격 파일을 읽어 `Bytes`(`@simplysm/core-common` 의 바이트 타입) 로 반환한다. FTP/FTPS 는 다운로드 스트림 청크를 모아 `bytes.concat` 하고, SFTP 는 `get` 결과가 바이트면 그대로, 문자열이면 `TextEncoder` 로 인코딩해 반환한다.
- `exists(filePath)` — 파일·디렉토리 존재 여부를 반환한다. 두 구현체 모두 확인 중 예외(네트워크/권한 등)가 나면 `false` 를 반환하며, 부모 디렉토리가 없어도 `false` 다.
- `put(localPathOrBuffer, storageFilePath)` — 로컬 파일 경로(`string`) 또는 바이트 데이터(`Bytes`)를 원격 파일 경로에 업로드한다.
- `uploadDir(fromPath, toPath)` — 로컬 디렉토리 `fromPath` 를 원격 디렉토리 `toPath` 로 업로드한다.
- `remove(filePath)` — 원격 파일을 삭제한다(FTP/FTPS 는 `remove`, SFTP 는 `delete` 로 위임).
- `close()` — 연결을 종료한다. 미연결 상태에서 호출해도 안전하며(오류 미발생), 종료 후 같은 인스턴스에서 `connect` 로 재연결할 수 있다.
- 미연결 상태 작업 — `connect` 전이거나 `close` 후에 작업 메서드(`mkdir`/`rename`/`list`/`readFile`/`exists`/`put`/`uploadDir`/`remove`)를 호출하면 두 구현체 모두 `SdError`("연결되어 있지 않습니다") 를 throw 한다.

## 프로토콜별 구현체

### FtpStorageClient

`basic-ftp` 기반 FTP/FTPS 클라이언트. `_secure` 로 FTPS 여부를 정한다. 직접 쓰기보다 `StorageFactory.connect` 가 권장된다.

```ts
class FtpStorageClient implements StorageClient {
  constructor(_secure?: boolean);
}
```

- `_secure?: boolean` — FTPS 사용 여부. `true` 면 `access` 호출의 `secure` 가 `true`(FTPS), 생략/`false` 면 `false`(평문 FTP). 기본값 `false`.
- 연결 — `connect(config)` 는 새 `ftp.Client` 를 만들고 `{ host, port, user, password, secure: _secure }` 로 `access` 를 호출한다. 실패 시 `client.close()` 후 오류를 재throw 한다.
- `mkdir` — `ensureDir(dirPath)` 로 부모까지 생성한다.
- `list` — `list(dirPath)` 결과를 `{ name, isFile }` 로 매핑한다.
- `readFile` — `PassThrough` 로 `downloadTo` 한 청크들을 `bytes.concat` 으로 합쳐 반환한다.
- `exists` — 먼저 `size(filePath)` 로 파일을 O(1) 확인하고, 실패하면 부모 디렉토리(슬래시가 없거나 루트면 `/`)를 `list` 해 `path.basename(filePath)` 와 같은 이름이 있는지로 판단한다. 두 단계 모두 실패하면 `false`.
- `put` — 첫 인자가 `string` 이면 경로 그대로, `Bytes` 면 `Readable.from(...)` 으로 만들어 `uploadFrom(param, storageFilePath)` 한다.
- `uploadDir` — `uploadFromDir(fromPath, toPath)` 로 위임한다.
- `remove` — `remove(filePath)` 로 위임한다.
- 종료 — `close()` 는 내부 `Client.close()` 호출 후 참조를 `undefined` 로 비운다. 미연결이면 완료된 `Promise` 를 즉시 반환한다.

### SftpStorageClient

`ssh2-sftp-client` 기반 SFTP 클라이언트. 직접 쓰기보다 `StorageFactory.connect` 가 권장된다.

```ts
class SftpStorageClient implements StorageClient {
  constructor();
}
```

- 생성자 — 공개 인자가 없다.
- 연결(password 인증) — `config.password != null` 이면 `{ host, port, username: user, password }` 로 `connect` 한다.
- 연결(키/agent 인증) — `password` 가 없으면 `~/.ssh/id_ed25519` 개인키를 읽어 `privateKey` 로 연결을 시도하고, `SSH_AUTH_SOCK` 환경변수가 있으면 그 값을 `agent` 옵션으로 함께 넣는다(`{ host, port, username }` 공통). 개인키 포함 연결이 실패하면(암호화된 키 등) 같은 기본 옵션으로 agent-only 재시도를 한다.
- 연결 실패 처리 — `connect` 가 끝까지 실패하면 `await client.end()` 후 오류를 재throw 한다.
- `mkdir` — `mkdir(dirPath, true)` 로 부모까지 생성한다.
- `list` — `list(dirPath)` 결과를 `{ name, isFile: type === "-" }` 로 매핑한다.
- `readFile` — `get(filePath)` 결과가 `Uint8Array` 면 그대로, `string` 이면 `TextEncoder().encode` 로 변환해 반환하고, 그 외 타입이면 `SdError`("예상하지 못한 응답 타입입니다") 를 throw 한다.
- `exists` — `exists(filePath)` 의 반환이 문자열(`'d'`/`'-'`/`'l'`)이면 `true`, `false` 면 존재하지 않음으로 본다. 예외 시 `false`.
- `put` — 첫 인자가 `string` 이면 `fastPut(localPath, storageFilePath)`, `Bytes` 면 `Buffer.from(...)` 으로 변환해 `put(...)` 한다.
- `uploadDir` — `uploadDir(fromPath, toPath)` 로 위임한다.
- `remove` — `delete(filePath)` 로 위임한다.
- 종료 — `close()` 는 내부 `client.end()` 를 `await` 한 뒤 참조를 `undefined` 로 비운다. 미연결이면 즉시 반환한다.
