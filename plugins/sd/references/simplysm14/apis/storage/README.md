# @simplysm/storage

FTP/FTPS/SFTP 프로토콜로 원격 스토리지(파일 서버)에 연결하여 파일 업로드, 다운로드, 삭제 등 파일 시스템 작업을 수행함.

## 사용 트리거 인덱스

- **StorageFactory** — 스토리지 연결 자동 관리 (콜백 패턴으로 연결/종료 자동 처리)
- **FtpStorageClient** — FTP/FTPS 프로토콜 클라이언트 (직접 사용보다 StorageFactory 권장)
- **SftpStorageClient** — SFTP 프로토콜 클라이언트 (직접 사용보다 StorageFactory 권장)
- **StorageProtocol** — 스토리지 프로토콜 타입 정의
- **StorageConnConfig** — 스토리지 연결 설정 (호스트, 포트, 사용자, 암호)
- **StorageClient** — 스토리지 클라이언트 인터페이스
- **FileInfo** — 디렉토리 목록 조회 결과 (파일명, 파일 여부)

## StorageFactory

스토리지 연결을 자동으로 생성, 관리하는 팩토리. 콜백 패턴으로 연결/종료를 자동 처리하므로 직접 클라이언트를 사용하는 것보다 권장됨.

### StorageFactory.connect<R>()

```typescript
static connect<R>(
  type: StorageProtocol,
  config: StorageConnConfig,
  fn: (storage: StorageClient) => R | Promise<R>
): Promise<R>
```

스토리지에 연결하고, 콜백 함수를 실행한 뒤, 자동으로 연결을 종료함.

- `type`: `"ftp"` | `"ftps"` | `"sftp"` — 사용할 프로토콜. `"ftp"` = 일반 FTP, `"ftps"` = TLS 암호화 FTP, `"sftp"` = SSH 터널 기반 SFTP.
- `config`: 연결 설정 (호스트, 포트, 인증 정보).
- `fn`: 콜백 함수. 연결된 클라이언트를 매개변수로 받아 동기 또는 비동기 작업을 수행함. 반환값이 Promise로 감싸져 반환됨.
- 반환: 콜백 함수의 반환값을 Promise로 감싼 결과.

**주의사항**:

- 콜백 함수 내에서 예외가 발생해도 연결은 자동으로 종료됨.
- 동시에 여러 연결을 시작해도 각각 독립적으로 관리되므로 안전함.
- 연결 실패 시 예외가 발생하며, 콜백은 실행되지 않음.

## FtpStorageClient

FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트임. 직접 사용하기보다 `StorageFactory.connect()`를 권장함.

### 생성자

```typescript
constructor(secure: boolean = false)
```

- `secure`: boolean — 보안 모드 활성화. `true` = FTPS(TLS 암호화), `false` = 일반 FTP. 기본값은 `false`.

### connect()

```typescript
async connect(config: StorageConnConfig): Promise<void>
```

FTP 서버에 연결함.

**주의사항**:

- 사용 후 `close()`로 연결을 종료해야 함.
- 동일 인스턴스에서 여러 번 호출하면 "이미 연결되어 있습니다" 오류가 발생함. 먼저 `close()`를 호출해야 함.
- 자동 연결/종료 관리를 위해 `StorageFactory.connect()` 사용을 권장함.

### mkdir()

```typescript
async mkdir(dirPath: string): Promise<void>
```

디렉토리를 생성함. 부모 디렉토리가 없으면 함께 생성함 (mkdir -p 동작).

### rename()

```typescript
async rename(fromPath: string, toPath: string): Promise<void>
```

파일 또는 디렉토리의 이름을 변경함.

- `fromPath`: 원본 경로.
- `toPath`: 새 경로.

### list()

```typescript
async list(dirPath: string): Promise<FileInfo[]>
```

디렉토리의 파일 및 디렉토리 목록을 조회함.

- 반환: `FileInfo` 배열. 각 항목은 파일명(`name`)과 파일 여부(`isFile`) 포함함.

### readFile()

```typescript
async readFile(filePath: string): Promise<Bytes>
```

파일 내용을 바이트 배열로 다운로드함.

- 반환: `Uint8Array` 타입의 파일 바이트 데이터.

### exists()

```typescript
async exists(filePath: string): Promise<boolean>
```

파일 또는 디렉토리의 존재 여부를 확인함.

- 반환: 존재하면 `true`, 없으면 `false`.

**동작 상세**:

- 파일의 경우 `size()` 명령으로 O(1) 성능을 제공함.
- 디렉토리의 경우 부모 디렉토리 목록을 조회하므로 항목이 많으면 성능이 저하될 수 있음.
- 슬래시가 없는 경로(예: `file.txt`)는 루트 디렉토리(`/`)에서 검색함.
- 부모 디렉토리가 존재하지 않아도 `false`를 반환함.
- 네트워크 오류, 권한 오류 등 모든 예외에 대해 `false`를 반환함 (예외 발생 X).

### put()

```typescript
async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>
```

로컬 파일 또는 바이트 데이터를 원격 경로에 업로드함.

- `localPathOrBuffer`: 로컬 파일 경로(문자열) 또는 바이트 데이터(`Uint8Array`).
- `storageFilePath`: 원격 저장 경로.

### uploadDir()

```typescript
async uploadDir(fromPath: string, toPath: string): Promise<void>
```

로컬 디렉토리 전체를 원격으로 업로드함.

- `fromPath`: 로컬 디렉토리 경로.
- `toPath`: 원격 저장 디렉토리 경로.

### remove()

```typescript
async remove(filePath: string): Promise<void>
```

파일을 삭제함.

### close()

```typescript
close(): Promise<void>
```

연결을 종료함.

**주의사항**:

- 이미 종료된 상태에서 호출해도 안전함 (오류 미발생).
- 종료 후 동일 인스턴스에서 `connect()`를 다시 호출하여 재연결할 수 있음.

## SftpStorageClient

SFTP 프로토콜을 사용하는 스토리지 클라이언트임. 직접 사용하기보다 `StorageFactory.connect()`를 권장함.

### connect()

```typescript
async connect(config: StorageConnConfig): Promise<void>
```

SFTP 서버에 연결함.

**인증 방식**:

- `config.password`가 제공되면 패스워드 인증을 사용함.
- 패스워드가 없으면 SSH 키 기반 인증을 시도함:
  - 먼저 `~/.ssh/id_ed25519` 파일을 시도함.
  - SSH_AUTH_SOCK 환경변수가 설정되어 있으면 SSH agent를 함께 시도함.
  - 암호화된 키 등으로 privateKey 파싱이 실패하면 SSH agent만으로 재시도함.

**주의사항**:

- 사용 후 `close()`로 연결을 종료해야 함.
- 동일 인스턴스에서 여러 번 호출하면 "이미 연결되어 있습니다" 오류가 발생함. 먼저 `close()`를 호출해야 함.
- 자동 연결/종료 관리를 위해 `StorageFactory.connect()` 사용을 권장함.

### mkdir()

```typescript
async mkdir(dirPath: string): Promise<void>
```

디렉토리를 생성함. 부모 디렉토리가 없으면 함께 생성함.

### rename()

```typescript
async rename(fromPath: string, toPath: string): Promise<void>
```

파일 또는 디렉토리의 이름을 변경함.

### list()

```typescript
async list(dirPath: string): Promise<FileInfo[]>
```

디렉토리의 파일 및 디렉토리 목록을 조회함.

### readFile()

```typescript
async readFile(filePath: string): Promise<Bytes>
```

파일 내용을 바이트 배열로 다운로드함.

### exists()

```typescript
async exists(filePath: string): Promise<boolean>
```

파일 또는 디렉토리의 존재 여부를 확인함.

**동작 상세**:

- 부모 디렉토리가 존재하지 않아도 `false`를 반환함.
- 네트워크 오류, 권한 오류 등 모든 예외에 대해 `false`를 반환함 (예외 발생 X).

### put()

```typescript
async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void>
```

로컬 파일 또는 바이트 데이터를 원격 경로에 업로드함.

- `localPathOrBuffer`: 로컬 파일 경로(문자열) 또는 바이트 데이터(`Uint8Array`).
- `storageFilePath`: 원격 저장 경로.

### uploadDir()

```typescript
async uploadDir(fromPath: string, toPath: string): Promise<void>
```

로컬 디렉토리 전체를 원격으로 업로드함.

### remove()

```typescript
async remove(filePath: string): Promise<void>
```

파일을 삭제함.

### close()

```typescript
async close(): Promise<void>
```

연결을 종료함.

**주의사항**:

- 이미 종료된 상태에서 호출해도 안전함 (오류 미발생).
- 종료 후 동일 인스턴스에서 `connect()`를 다시 호출하여 재연결할 수 있음.

## 타입 정의

### StorageProtocol

```typescript
type StorageProtocol = "ftp" | "ftps" | "sftp";
```

스토리지 연결에 사용할 프로토콜:

- `"ftp"` — 일반 FTP (암호화 없음).
- `"ftps"` — TLS 암호화 FTP.
- `"sftp"` — SSH 터널 기반 SFTP.

### StorageConnConfig

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

스토리지 연결 설정:

- `host`: 서버 호스트명 또는 IP 주소. 필수.
- `port`: 연결 포트 번호. 선택사항. 미지정 시 프로토콜별 기본값 사용 (FTP: 21, SFTP: 22).
- `user`: 사용자명. 선택사항.
- `password`: 암호. 선택사항. SFTP에서는 미지정 시 SSH 키 인증을 시도함.

### StorageClient

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

스토리지 클라이언트의 공통 인터페이스. `FtpStorageClient`와 `SftpStorageClient`가 이를 구현함.

### FileInfo

```typescript
interface FileInfo {
  name: string;
  isFile: boolean;
}
```

디렉토리 목록 조회 결과의 각 항목:

- `name`: 파일명 또는 디렉토리명.
- `isFile`: 파일 여부. `true` = 파일, `false` = 디렉토리.
