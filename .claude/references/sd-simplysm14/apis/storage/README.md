# @simplysm/storage

Node.js 환경에서 FTP/FTPS/SFTP 원격 스토리지에 접속해 파일·디렉토리를 업로드·다운로드·조회·삭제하는 라이브러리. 프로토콜별 구현을 동일 인터페이스(`StorageClient`)로 통일하고, `StorageFactory.connect` 콜백 패턴으로 연결/종료를 자동 관리한다. 전 구현이 Node 전용(`basic-ftp`·`ssh2-sftp-client`·`fs`/`os`/`path`/`stream` 의존)이라 브라우저에서 사용 불가.

## 사용 트리거 인덱스

- **StorageFactory.connect** — 프로토콜·접속정보로 연결을 열고 콜백 안에서 파일 작업 후 자동 종료할 때. 직접 클라이언트 인스턴스화보다 권장되는 진입점.
- **StorageClient** — connect 콜백이 받는 파일 작업 인터페이스(mkdir/list/put/readFile/exists/remove/rename/uploadDir 등). 어떤 메서드를 호출할 수 있는지 확인할 때.
- **StorageConnConfig / StorageProtocol / FileInfo** — connect 인자 형태, 지원 프로토콜 리터럴, list 반환 항목 형태를 확인할 때.
- **FtpStorageClient / SftpStorageClient** — 팩토리 없이 연결을 직접 잡거나(수명·재연결 직접 제어), 프로토콜별 인증·동작 차이를 확인할 때. 비권장.

## StorageFactory (진입점)

스토리지 접속 진입점. 인스턴스를 만들 필요 없이 정적 `connect` 만 사용한다. 연결 생성 → 콜백 실행 → 자동 종료를 한 번에 묶어 처리한다.

```ts
class StorageFactory {
  static connect<R>(
    type: StorageProtocol,
    config: StorageConnConfig,
    fn: (storage: StorageClient) => R | Promise<R>,
  ): Promise<R>;
}
```

- `type: StorageProtocol` — 사용할 프로토콜. 내부에서 `"sftp"` → `SftpStorageClient`, `"ftps"` → `FtpStorageClient(secure=true)`, `"ftp"` → `FtpStorageClient(secure=false)` 를 생성. 보안 전송이 필요하면 `"ftps"`/`"sftp"`.
- `config: StorageConnConfig` — 접속 설정(host/port/user/password). 아래 StorageConnConfig 참조.
- `fn: (storage: StorageClient) => R | Promise<R>` — 연결된 `StorageClient` 를 받아 파일 작업을 수행하는 콜백. 반환값이 그대로 `connect` 의 결과(`Promise<R>`) 가 됨. 동기·비동기 모두 허용.
- 동작: `client.connect(config)` 후 `fn` 실행, `finally` 에서 `client.close()` 호출하며 종료 중 오류는 무시(이미 종료된 경우 대비). 콜백에서 예외가 나도 연결은 반드시 닫히고 예외는 그대로 전파됨.

```ts
const names = await StorageFactory.connect("sftp", { host: "10.0.0.1", user: "u", password: "p" }, async (s) => {
  await s.mkdir("/upload");
  await s.put(buffer, "/upload/a.txt");
  return (await s.list("/upload")).map((f) => f.name);
});
```

주의: 콜백 밖으로 `storage` 를 유출해 나중에 호출하면 이미 닫힌 연결이므로 실패한다.

## 연결·작업 타입

### StorageConnConfig

원격 서버 접속 정보.

```ts
interface StorageConnConfig { host: string; port?: number; user?: string; password?: string; }
```

- `host: string` — 접속 대상 서버 호스트명 또는 IP. 필수.
- `port?: number` — 접속 포트. 미지정 시 각 라이브러리 기본값(FTP 21, SFTP 22) 사용. 비표준 포트면 명시.
- `user?: string` — 로그인 사용자명. 미지정 시 익명/기본 사용자.
- `password?: string` — 로그인 비밀번호. **SFTP 에서 이 값이 미지정이면** password 인증 대신 `~/.ssh/id_ed25519` 개인키 + SSH agent(`SSH_AUTH_SOCK` 환경변수가 있으면 `agent` 옵션)로 인증을 시도하고, 키 파싱 실패(암호화 키 등) 시 agent 단독 재시도. FTP/FTPS 에서는 미지정 시 라이브러리 기본(익명) 처리. SFTP 키 인증을 쓰려면 password 를 넘기지 말 것.

### StorageProtocol

```ts
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

- `"ftp"` — 평문 FTP. 보안 채널 없음(`FtpStorageClient` 를 `secure=false` 로 생성). 내부망·테스트에서만 권장.
- `"ftps"` — TLS 로 암호화된 FTP(`FtpStorageClient` 를 `secure=true` 로 생성). 외부망 FTP 접속 시.
- `"sftp"` — SSH 기반 SFTP(`SftpStorageClient`). 가장 일반적인 보안 전송.

### FileInfo

`list()` 가 반환하는 항목.

```ts
interface FileInfo { name: string; isFile: boolean; }
```

- `name: string` — 항목 이름(파일명 또는 디렉토리명, 경로 아님).
- `isFile: boolean` — 파일이면 `true`, 디렉토리면 `false`. 디렉토리 탐색 시 파일만 골라 처리하는 분기 기준으로 사용. FTP 는 라이브러리의 `isFile`, SFTP 는 항목 type 이 `"-"`(일반 파일)인 경우만 `true`(디렉토리·심볼릭 링크는 `false`).

### StorageClient

`connect` 콜백 안에서 받는 파일 작업 인터페이스. `FtpStorageClient`·`SftpStorageClient` 가 구현. 모든 메서드는 `Promise` 반환. 경로는 원격 기준 경로 문자열.

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

- `connect(config)` — 서버에 연결. 이미 연결된 인스턴스에서 재호출하면 `SdError` throw(먼저 `close()` 필요). `StorageFactory.connect` 사용 시 직접 호출 불필요. 연결 도중 실패하면 내부 라이브러리 연결을 닫고 예외를 다시 throw.
- `mkdir(dirPath)` — 디렉토리 생성. 부모 디렉토리가 없으면 함께 생성(FTP `ensureDir`, SFTP 재귀 `mkdir`).
- `rename(fromPath, toPath)` — 파일/디렉토리 경로 이동·이름 변경. `toPath` 로 옮기거나 새 이름을 부여할 때.
- `list(dirPath)` — 디렉토리 내 항목을 `FileInfo[]` 로 반환. 목록을 파일/폴더로 갈라 처리할 때.
- `readFile(filePath)` — 원격 파일 전체를 `Bytes`(Uint8Array) 로 메모리에 다운로드(스트리밍 아님 — 큰 파일은 메모리 부담). 텍스트가 필요하면 호출 측에서 디코딩. SFTP 는 응답이 예상 타입(Buffer/string) 이 아니면 `SdError` throw.
- `exists(filePath)` — 파일/디렉토리 존재 여부. **모든 예외(부모 없음·권한·네트워크 오류 포함) 에 대해 `false` 반환** — throw 없음이므로 `true` 만 "확실히 존재"로 신뢰한다. FTP 는 `size()` 로 파일을 O(1) 확인 후 실패 시 부모 디렉토리 목록으로 디렉토리 확인(슬래시 없는 경로는 루트 `/` 기준이라 항목 많은 디렉토리에서는 느려질 수 있음). SFTP 는 `exists()` 결과가 문자열(`'d'`/`'-'`/`'l'`)이면 존재로 판정. 작업 전 분기 확인에 사용.
- `put(localPathOrBuffer, storageFilePath)` — 단일 파일 업로드. 첫 인자가 `string` 이면 로컬 파일 경로에서, `Bytes` 면 메모리 바이트에서 업로드. 생성한 콘텐츠를 바로 올릴 땐 `Bytes` 로 전달.
- `uploadDir(fromPath, toPath)` — 로컬 디렉토리 전체를 원격 디렉토리로 재귀 업로드. 빌드 산출물 폴더를 통째로 배포할 때.
- `remove(filePath)` — 원격 파일 삭제.
- `close()` — 연결 종료. 이미 종료/미연결 상태에서 호출해도 오류 없음. 종료 후 같은 인스턴스에서 `connect()` 로 재연결 가능. `StorageFactory.connect` 사용 시 직접 호출 불필요.

미연결 상태에서 작업 메서드를 호출하면 모든 구현체가 `SdError`("연결되어 있지 않습니다") throw.

## FtpStorageClient / SftpStorageClient (직접 사용, 비권장)

`StorageClient` 직접 구현체. 보통은 `StorageFactory.connect` 로 충분하며, 연결 수명을 콜백 밖에서 수동으로 다뤄야 할 때만 직접 생성한다.

```ts
new FtpStorageClient(secure?: boolean)  // secure=true → FTPS, 생략/false → 평문 FTP
new SftpStorageClient()
```

- `FtpStorageClient` 의 `secure` 생성자 인자 — `true` 면 TLS(FTPS), 생략/`false`(기본) 면 평문 FTP. 팩토리는 `"ftps"`→`true`, `"ftp"`→`false` 로 매핑.
- `SftpStorageClient` 는 생성자 인자 없음. password 미지정 시 키/agent 인증 경로를 탄다(StorageConnConfig 의 `password` 풀이 참조).
- 직접 사용 시 `connect()` → 작업 → `close()` 순으로 호출하고, 예외 발생 시에도 `close()` 가 호출되도록 `try/finally` 로 감쌀 것. 동일 인스턴스에서 `close()` 없이 `connect()` 를 재호출하면 연결 누수로 throw.

```ts
const client = new SftpStorageClient();
await client.connect({ host: "10.0.0.1", user: "u", password: "p" });
try { await client.put(buf, "/x.txt"); } finally { await client.close(); }
```
