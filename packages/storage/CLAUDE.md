# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/storage` — FTP/FTPS/SFTP 파일 저장소 클라이언트 라이브러리 (Node.js 전용). 소스 파일 7개.

외부 라이브러리 `basic-ftp`(FTP/FTPS), `ssh2-sftp-client`(SFTP)를 `StorageClient` 인터페이스로 통일하고, `StorageFactory`로 연결 생명주기를 관리한다.

## Architecture

```
src/
├── types/
│   ├── storage.ts             ← StorageClient 인터페이스, FileInfo 타입
│   ├── storage-conn-config.ts ← 연결 설정 타입 (host, port, user, password)
│   └── storage-type.ts        ← StorageProtocol 유니온 타입 ("ftp" | "ftps" | "sftp")
├── clients/
│   ├── ftp-storage-client.ts  ← FTP/FTPS 구현 (basic-ftp)
│   └── sftp-storage-client.ts ← SFTP 구현 (ssh2-sftp-client)
├── storage-factory.ts         ← 팩토리: 프로토콜에 따른 클라이언트 생성 및 연결 관리
└── index.ts                   ← public API re-exports
```

## Key Patterns

### StorageFactory 사용 (권장)

클라이언트를 직접 생성하지 않고 `StorageFactory.connect`를 통해 콜백 패턴으로 사용한다. 콜백 완료 또는 예외 발생 시 연결이 자동으로 종료된다.

```typescript
const result = await StorageFactory.connect(
  "sftp",
  { host: "sftp.example.com", user: "user", password: "pass" },
  async (storage) => {
    await storage.mkdir("/remote/dir");
    await storage.put("/local/file.txt", "/remote/dir/file.txt");
    return await storage.list("/remote/dir");
  },
);
```

### StorageClient 인터페이스

`FtpStorageClient`와 `SftpStorageClient` 모두 `StorageClient`를 구현한다. 직접 인스턴스화하여 수동으로 생명주기를 관리할 수도 있지만, 연결 누수 위험이 있으므로 `StorageFactory.connect` 사용을 권장한다.

```typescript
export interface StorageClient {
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

### 파일 데이터 타입

`readFile`은 `Bytes` (`Uint8Array`)를 반환한다. `put`은 로컬 파일 경로(`string`) 또는 바이트 데이터(`Bytes`) 모두 수신한다.

### SFTP 인증 방식

`SftpStorageClient`는 `password`가 있으면 패스워드 인증, 없으면 SSH agent(`SSH_AUTH_SOCK`) + `~/.ssh/id_ed25519` 키 파일 인증을 순서대로 시도한다.

### `_requireClient()` 패턴

두 클라이언트 모두 내부 클라이언트 인스턴스 접근 시 `_requireClient()`를 통해 미연결 상태를 검사하고 `SdError`를 던진다. 연결 전 호출된 메서드는 예외를 발생시킨다.

## Testing

**프레임워크**: Vitest

테스트 위치: `tests/` (소스 구조 미러링 없음, 파일 단위)

외부 라이브러리(`basic-ftp`, `ssh2-sftp-client`)는 `vi.mock`으로 모킹한다. 실제 서버 연결 없이 단위 테스트를 수행한다.

```typescript
vi.mock("basic-ftp", () => ({
  default: {
    Client: class MockClient {
      access = mockAccess;
      close = mockClose;
      // ...
    },
  },
}));

describe("FtpStorageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client = new FtpStorageClient();
  });

  it("연결 설정으로 연결해야 함", async () => {
    await client.connect({ host: "ftp.example.com", port: 21, user: "user", password: "pass" });
    expect(mockAccess).toHaveBeenCalledWith(expect.objectContaining({ secure: false }));
  });
});
```

각 테스트 파일이 다루는 범위:
- `ftp-storage-client.spec.ts` — `FtpStorageClient` 전체 메서드 (connect, mkdir, rename, list, readFile, exists, remove, put, uploadDir, close)
- `sftp-storage-client.spec.ts` — `SftpStorageClient` 전체 메서드
- `storage-factory.spec.ts` — `StorageFactory.connect`: 프로토콜별 클라이언트 생성, 자동 close, 오류 전파
