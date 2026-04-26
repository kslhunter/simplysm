# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/storage/README.md`를 참조한다.

## Package Overview

`@simplysm/storage`는 Node.js에서 FTP/FTPS/SFTP 파일 저장소에 접근하는 클라이언트 패키지다. 소스 파일은 7개이며, `StorageClient` 인터페이스로 프로토콜별 구현을 통일하고 `StorageFactory`로 연결 생명주기를 관리한다.

외부 의존성은 FTP/FTPS용 `basic-ftp`, SFTP용 `ssh2-sftp-client`, 공통 바이트 타입과 오류 타입용 `@simplysm/core-common`이다.

## Architecture

```text
src/
├── index.ts                     # public API re-export
├── storage-factory.ts           # 프로토콜별 클라이언트 생성 및 콜백 생명주기 관리
├── clients/
│   ├── ftp-storage-client.ts    # basic-ftp 기반 FTP/FTPS 구현
│   └── sftp-storage-client.ts   # ssh2-sftp-client 기반 SFTP 구현
└── types/
    ├── storage.ts               # StorageClient, FileInfo
    ├── storage-conn-config.ts   # 연결 설정 타입
    └── storage-type.ts          # StorageProtocol
```

## Key Patterns

### `StorageFactory.connect`가 기본 진입점

새 소비자 코드는 클라이언트를 직접 생성하기보다 `StorageFactory.connect`의 콜백 안에서 파일 작업을 수행한다. 이 메서드는 `client.connect(config)` 후 콜백을 실행하고, 성공과 예외 모두 `finally`에서 `close()`를 호출한다.

```typescript
const files = await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.put("/local/file.txt", "/remote/file.txt");
    return await storage.list("/");
  },
);
```

### 직접 클라이언트는 명시적 생명주기 관리가 필요

`FtpStorageClient`와 `SftpStorageClient`는 모두 `StorageClient`를 구현한다. 직접 사용할 때는 `try/finally`로 `close()`를 보장한다. 두 구현 모두 이미 연결된 상태에서 `connect()`를 다시 호출하면 `SdError`를 던진다.

```typescript
const client = new FtpStorageClient(true);
try {
  await client.connect({ host: "ftps.example.com", user: "user", password: "pass" });
  await client.uploadDir("/local/dir", "/remote/dir");
} finally {
  await client.close();
}
```

### 파일 데이터는 `Bytes`로 통일

`readFile()`은 `Bytes`를 반환하고, `put()`은 로컬 파일 경로 문자열 또는 `Bytes`를 받는다. FTP 구현은 `Bytes`를 `Readable`로 변환하고, SFTP 구현은 `ssh2-sftp-client` 요구에 맞춰 `Buffer.from()`으로 변환한다.

### SFTP 인증 분기

`SftpStorageClient.connect()`는 `password`가 있으면 패스워드 인증을 사용한다. `password`가 없으면 `SSH_AUTH_SOCK` 기반 agent 옵션과 `~/.ssh/id_ed25519` 개인키 인증을 시도하고, 개인키 파싱 실패 시 agent만으로 다시 연결한다.

### 존재 확인은 예외를 `false`로 흡수

`exists()`는 FTP와 SFTP 구현 모두 네트워크 오류, 권한 오류, 부모 디렉토리 부재 등 예외를 `false`로 반환한다. 호출자는 `false`를 “존재하지 않거나 확인 실패”로 취급해야 한다.

## Compiler Options

패키지 고유 설정은 `tsconfig.json`의 `typeRoots: ["./node_modules/@types"]`이다. `@types/ssh2-sftp-client`를 패키지 로컬 타입 루트에서 사용하기 위한 설정이다.

## Testing

테스트는 `packages/storage/tests`에 파일 단위로 있다.

- `ftp-storage-client.spec.ts`: `FtpStorageClient`의 연결, 파일 작업, 존재 확인, 종료 동작
- `sftp-storage-client.spec.ts`: `SftpStorageClient`의 인증 분기, 파일 작업, 존재 확인, 종료 동작
- `storage-factory.spec.ts`: `StorageFactory.connect`의 프로토콜 분기, 자동 종료, 예외 전파

외부 FTP/SFTP 서버에 접속하지 않고 `basic-ftp`와 `ssh2-sftp-client`를 `vi.mock`으로 대체한다. 새 테스트도 실제 네트워크 연결 없이 라이브러리 호출 파라미터와 생명주기 동작을 검증한다.
