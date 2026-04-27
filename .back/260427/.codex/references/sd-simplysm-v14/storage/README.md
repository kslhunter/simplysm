# @simplysm/storage

> FTP/FTPS/SFTP 파일 저장소 클라이언트 라이브러리 (Node.js 전용). `StorageClient` 인터페이스로 프로토콜을 통일하고, `StorageFactory`로 연결 생명주기를 관리한다. 내부적으로 `basic-ftp`(FTP/FTPS)와 `ssh2-sftp-client`(SFTP)를 사용한다.

## Installation

```bash
npm install @simplysm/storage
```

## 하려는 작업 → 읽을 파일

### 파일 전송

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| FTP/FTPS/SFTP 서버에 파일 업로드·다운로드·목록 조회 | [`StorageFactory`](./factory/storage-factory.md) |
| FTP/FTPS 연결을 직접 생명주기 관리 (장시간 연결 유지 등) | [`FtpStorageClient`](./clients/ftp-storage-client.md) |
| SFTP 연결을 직접 생명주기 관리하거나 SSH 키 인증 방식 확인 | [`SftpStorageClient`](./clients/sftp-storage-client.md) |

### 타입 활용

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 프로토콜 무관하게 스토리지 작업을 추상화하는 함수 시그니처 작성 | [`StorageClient`](./types/storage-client.md) |
| 연결 설정 객체의 타입 확인 | [`StorageConnConfig`](./types/storage-conn-config.md) |
| `list()` 반환값의 구조 확인 | [`FileInfo`](./types/file-info.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 환경에서 파일 업로드/다운로드 → 이 패키지는 Node.js 전용이다
- HTTP/S3 등 FTP/SFTP 이외의 프로토콜 → 이 패키지는 FTP/FTPS/SFTP만 지원한다

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
