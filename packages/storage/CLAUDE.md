# CLAUDE.md — `@simplysm/storage`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

원격 파일 스토리지(FTP / SFTP) 통합 클라이언트. 빌드 타겟 `node`.

`StorageFactory.create({ type: "ftp" | "sftp", ... })` → 공통 인터페이스(`Storage`) 객체. 호출 측은 프로토콜을 의식하지 않는다.

## 구조

| 경로                                | 내용                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `storage-factory.ts`                | 진입 팩토리. config 타입에 따라 분기.                                           |
| `clients/ftp-storage-client.ts`     | `basic-ftp` 어댑터.                                                             |
| `clients/sftp-storage-client.ts`    | `ssh2-sftp-client` 어댑터.                                                      |
| `types/`                            | `Storage`(공용 인터페이스), `StorageConnConfig`, `StorageType`.                 |

외부 의존: `basic-ftp`, `ssh2-sftp-client`. `@simplysm/core-common` 워크스페이스 의존.

## 작업 시 주의

- 새 프로토콜(예: S3, WebDAV) 추가는 `clients/` 에 클라이언트 파일 1 + factory 분기 추가 + `StorageType`/`StorageConnConfig` 확장. 호출 측 API(`Storage`)는 가능한 한 깨지 않게.
- 경로 구분자는 항상 `/`. Windows 경로 형식이 들어오면 normalize 하라.
- 연결 풀·재시도 정책은 각 클라이언트가 책임진다 — 호출 측에서 try/catch 로 재시도하지 않게.
