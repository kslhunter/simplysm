# storage 개발 가이드

> SIMPLYSM 프레임워크의 스토리지 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-storage`(구버전)은 참고 금지.

**이 문서는 Claude Code가 storage 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md) 함께 확인하세요.**
**사용자 문서는 [README.md](README.md)를 참고하세요.**

## 아키텍처

```
Application (sd-cli, etc.)
    ↓
storage                 ← FTP/SFTP 스토리지 유틸리티
```

**핵심**: Node.js 환경 전용 FTP/SFTP 파일 전송 유틸리티 (독립적 패키지).

## 모듈 구조

```
src/
├── types/
│   ├── storage.ts              # Storage 인터페이스, FileInfo 타입
│   └── storage-conn-config.ts  # StorageConnConfig 타입
├── clients/
│   ├── ftp-storage-client.ts   # FTP/FTPS 클라이언트 구현
│   └── sftp-storage-client.ts  # SFTP 클라이언트 구현
├── storage-factory.ts          # StorageFactory (연결 헬퍼)
└── index.ts                    # 진입점
```

## 주요 컴포넌트

### Storage 인터페이스 (types/storage.ts)

| 메서드 | 설명 |
|--------|------|
| `connect(config)` | 서버 연결 |
| `mkdir(dirPath)` | 디렉토리 생성 (recursive) |
| `rename(from, to)` | 파일/디렉토리 이름 변경 |
| `readdir(dirPath)` | 디렉토리 목록 조회 (`FileInfo[]`) |
| `readFile(filePath)` | 파일 읽기 (`Buffer`) |
| `exists(filePath)` | 파일/디렉토리 존재 확인 |
| `put(source, dest)` | 파일 업로드 (로컬 경로 또는 Buffer) |
| `uploadDir(from, to)` | 디렉토리 업로드 |
| `remove(filePath)` | 파일 삭제 |
| `close()` | 연결 종료 |

### FtpStorageClient (clients/ftp-storage-client.ts)

FTP/FTPS 클라이언트. `basic-ftp` 라이브러리 기반.

```typescript
const client = new FtpStorageClient(true); // FTPS (secure)
await client.connect({ host: "ftp.example.com", user: "user", pass: "pass" });
await client.put("./local.txt", "/remote/file.txt");
await client.close();
```

### SftpStorageClient (clients/sftp-storage-client.ts)

SFTP 클라이언트. `ssh2-sftp-client` 라이브러리 기반.

```typescript
const client = new SftpStorageClient();
await client.connect({ host: "sftp.example.com", user: "user", pass: "pass" });
const files = await client.readdir("/");
await client.close();
```

### StorageFactory (storage-factory.ts)

연결 관리 헬퍼. try-finally 패턴으로 연결 자동 종료.

```typescript
await StorageFactory.connect("ftp", config, async (storage) => {
  await storage.mkdir("/backup");
  await storage.uploadDir("./dist", "/backup/dist");
});
```

**StorageType**: `"ftp"` | `"ftps"` | `"sftp"`

## 외부 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `basic-ftp` | ^5.1.0 | FTP/FTPS 클라이언트 |
| `ssh2-sftp-client` | ^12.0.1 | SFTP 클라이언트 |
| `@types/ssh2-sftp-client` | ^9.0.6 | 타입 정의 (dev) |

## sd-storage와의 차이

### 네이밍 변경

| 레거시 | 신규 |
|--------|------|
| `SdStorage` | `StorageFactory` |
| `SdFtpStorage` | `FtpStorageClient` |
| `SdSftpStorage` | `SftpStorageClient` |
| `ISdStorage` | `Storage` |
| `ISdStorageConnConf` | `StorageConnConfig` |
| `*Async` 접미사 | 제거 |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| `!` 단언 | `_requireClient()` 헬퍼로 대체 |
| `any` 타입 | 구체적 타입으로 대체 (`Buffer`) |
| `readdir` 반환 타입 | `FileInfo[]`로 통일 |

## 테스트

```bash
# 전체 테스트
npx vitest run packages/storage

# 특정 파일
npx vitest run packages/storage/tests/ftp-storage-client.spec.ts
```

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/storage/tsconfig.json 2>&1 | grep "^packages/storage/"

# ESLint
yarn run _sd-cli_ lint "packages/storage/**/*.ts"

# 테스트
npx vitest run packages/storage
```
