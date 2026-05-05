# API Index — @simplysm/storage

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Factory

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `StorageFactory` | class | [storage-factory.md](./factory/storage-factory.md) | 스토리지 서버에 연결하여 파일 작업을 수행할 때 (기본 진입점) |

## Clients

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `FtpStorageClient` | class | [ftp-storage-client.md](./clients/ftp-storage-client.md) | FTP/FTPS 클라이언트를 직접 생명주기 관리해야 할 때 |
| `SftpStorageClient` | class | [sftp-storage-client.md](./clients/sftp-storage-client.md) | SFTP 클라이언트를 직접 생명주기 관리해야 할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `StorageClient` | interface | [storage-client.md](./types/storage-client.md) | 스토리지 작업을 프로토콜 무관하게 추상화하는 함수 시그니처에 사용할 때 |
| `StorageConnConfig` | interface | [storage-conn-config.md](./types/storage-conn-config.md) | 연결 설정 객체를 타입으로 지정할 때 |
| `FileInfo` | interface | [file-info.md](./types/file-info.md) | `list()` 반환값을 처리할 때 |
| `StorageProtocol` | type | [storage-factory.md](./factory/storage-factory.md#storageprotocol) | `StorageFactory.connect()`의 `type` 파라미터 타입을 확인할 때 |
