# @simplysm/sd-storage

Node 전용 FTP / FTPS / SFTP 원격 파일 저장소 클라이언트. 연결·디렉토리·파일 업/다운로드를 공통 인터페이스로 다룬다.

## 사용 트리거 인덱스

- **SdStorage.connectAsync** — FTP/FTPS/SFTP 서버에 접속해 콜백 안에서 파일 작업을 수행하고 자동으로 연결을 닫을 때. 진입점이며 거의 항상 이것만 쓴다.
- **ISdStorageConnConf** — 접속 정보(host/port/user/pass)를 넘길 때.
- **SdSftpStorage / SdFtpStorage** — `connectAsync` 콜백이 넘겨주는 구체 storage 인스턴스. 직접 new 할 일은 드물고, 콜백 인자로 받아 메서드를 호출한다.
- **ISdStorage** — 두 storage가 공통으로 구현하는 최소 메서드 집합(타입 계약).

## 진입점: SdStorage

```ts
static SdStorage.connectAsync<T extends "sftp" | "ftp" | "ftps", R>(
  type: T,
  conf: ISdStorageConnConf,
  fn: (storage: T extends "sftp" ? SdSftpStorage : SdFtpStorage) => Promise<R>,
): Promise<R>
```

- `type` — 프로토콜 선택. `"sftp"` → `SdSftpStorage`(ssh2-sftp-client), `"ftp"` → `SdFtpStorage(secure=false)`, `"ftps"` → `SdFtpStorage(secure=true)`(TLS FTP). 콜백에 넘어오는 인스턴스 타입이 `type`에 따라 달라진다(`sftp`면 `SdSftpStorage`, 그 외 `SdFtpStorage`).
- `conf` — 접속 정보. `ISdStorageConnConf`.
- `fn` — 연결된 storage를 받아 작업하는 콜백. 반환값 `R`이 그대로 `connectAsync`의 결과가 된다.
- 동작: 접속 → `fn` 실행 → 모든 동시 작업이 끝날 때까지 대기 후 `closeAsync` → 결과 반환. `fn`에서 예외가 나면 닫고 다시 throw 한다.
- `static busyCount: number` — 동시에 열린 storage 수를 센다. 한 storage를 닫을 때 아직 작업 중인 다른 storage가 같이 닫히는 것을 막기 위해, `busyCount`가 0이 될 때까지 기다린 뒤에만 close 한다. 외부에서 직접 만질 필요는 없다.

## 접속 설정: ISdStorageConnConf

```ts
interface ISdStorageConnConf {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}
```

- `host` — 서버 주소(필수).
- `port` — 포트. 생략 시 각 클라이언트 라이브러리 기본값에 위임(코드에서 미지정 시 그대로 undefined 전달).
- `user` — 사용자명. SFTP에서는 `username`으로, FTP에서는 `user`로 매핑된다.
- `pass` — 비밀번호. SFTP/FTP 모두 `password`로 매핑된다.

## 공통 계약: ISdStorage

`SdSftpStorage`, `SdFtpStorage`가 모두 구현하는 최소 메서드. 두 구현 어느 쪽으로 와도 보장되는 것만 담겨 있다.

```ts
interface ISdStorage {
  connectAsync(connectionConfig: any): Promise<void>;
  mkdirAsync(storageDirPath: string): Promise<void>;
  renameAsync(fromPath: string, toPath: string): Promise<void>;
  putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void>;
  uploadDirAsync(fromPath: string, toPath: string): Promise<void>;
  closeAsync(): Promise<void>;
}
```

- `connectAsync` — 서버 접속. 보통 `SdStorage.connectAsync`가 대신 호출하므로 직접 부를 일은 거의 없다.
- `mkdirAsync` — 디렉토리 생성(없는 상위 경로까지 보장 생성).
- `renameAsync` — `fromPath`를 `toPath`로 이동/이름변경.
- `putAsync` — 단일 파일 업로드. 인자가 로컬 경로 문자열이면 그 파일을, `Buffer`면 메모리 데이터를 `storageFilePath`로 올린다.
- `uploadDirAsync` — 로컬 디렉토리(`fromPath`) 전체를 원격(`toPath`)으로 업로드.
- `closeAsync` — 연결 종료.

## 구체 구현: SdSftpStorage (type: "sftp")

ssh2-sftp-client 기반. `ISdStorage` 외에 추가 메서드를 제공한다.

- `mkdirAsync(path)` — 재귀 생성(`mkdir(path, true)`).
- `renameAsync(from, to)` — 이름변경/이동.
- `existsAsync(filePath): Promise<boolean>` — 경로 존재 여부. SFTP 전용(FTP에는 없음).
- `readdirAsync(filePath): Promise<string[]>` — 디렉토리 항목 이름 배열만 반환(파일/폴더 구분 없음).
- `readFileAsync(filePath): Promise<any>` — 파일 내용 가져오기(ssh2-sftp-client `get` 결과를 그대로 반환).
- `putAsync(localPathOrBuffer, storageFilePath)` — 문자열 경로면 `fastPut`(스트리밍 고속 업로드), `Buffer`면 `put`.
- `uploadDirAsync(from, to)` — 디렉토리 업로드.
- `closeAsync()` — `end()`로 연결 종료.
- 주의: 모든 메서드가 내부 `_sftp!`를 non-null 단언으로 접근하므로, 접속 전 호출 시 런타임 에러가 난다(`connectAsync` 선행 필수).

## 구체 구현: SdFtpStorage (type: "ftp" / "ftps")

basic-ftp 기반. 생성자 `new SdFtpStorage(secure: boolean)` — `secure=true`면 FTPS(TLS), `false`면 평문 FTP. `connectAsync`가 이 값을 `access({secure})`로 전달.

- `mkdirAsync(path)` — `ensureDir`로 경로 보장 생성.
- `renameAsync(from, to)` — 이름변경/이동.
- `readdirAsync(dirPath): Promise<{ name: string; isFile: boolean }[]>` — 항목별로 이름과 파일 여부(`isFile`)를 함께 반환(SFTP와 반환형이 다름).
- `readFileAsync(filePath): Promise<Buffer>` — 파일을 메모리로 다운로드해 `Buffer`로 반환(`PassThrough`에 청크를 모아 concat).
- `removeAsync(filePath): Promise<void>` — 파일 삭제. FTP 전용(SFTP에는 없음).
- `putAsync(localPathOrBuffer, storageFilePath)` — 문자열이면 경로 그대로, `Buffer`면 `Readable` 스트림으로 감싸 `uploadFrom`.
- `uploadDirAsync(from, to)` — `uploadFromDir`로 디렉토리 업로드.
- `closeAsync()` — `close()`로 연결 종료.
- 주의: 모든 메서드가 미접속(`_ftp === undefined`) 시 `"FTP 서버에 연결되어있지 않습니다."` 에러를 던진다.

## 구현별 차이 요약 (혼동 주의)

- `readdirAsync` 반환형: SFTP는 `string[]`, FTP/FTPS는 `{ name, isFile }[]`.
- `readFileAsync` 반환형: SFTP는 `any`(라이브러리 `get` 원형), FTP/FTPS는 `Buffer`.
- `existsAsync`는 SFTP에만, `removeAsync`는 FTP/FTPS에만 존재. 콜백에서 `type`에 맞는 메서드만 호출할 것.
