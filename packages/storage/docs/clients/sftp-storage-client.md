# SftpStorageClient

SFTP 프로토콜을 사용하는 스토리지 클라이언트. `ssh2-sftp-client` 라이브러리 기반. [`StorageClient`](../types/storage-client.md) 인터페이스를 구현한다.

직접 사용하기보다 [`StorageFactory.connect()`](../factory/storage-factory.md)를 통해 콜백 패턴으로 사용하는 것을 권장한다.

```typescript
class SftpStorageClient implements StorageClient {
  constructor();
}
```

## Members

[`StorageClient`](../types/storage-client.md) 인터페이스의 모든 메서드를 구현한다. 구현 특이사항:

| Member | Kind | Description |
|--------|------|-------------|
| `connect` | method | 이미 연결된 상태에서 호출하면 `SdError` 발생. `password` 유무에 따라 인증 방식이 달라짐 (아래 인증 메커니즘 참조). 연결 실패 시 `client.end()`를 호출하고 예외를 전파 |
| `mkdir` | method | `ssh2-sftp-client`의 `mkdir(path, true)`를 호출하여 부모 디렉토리 포함 재귀 생성 |
| `list` | method | `item.type === "-"`이면 파일(`isFile: true`), 아니면 디렉토리(`isFile: false`)로 변환 |
| `exists` | method | `ssh2-sftp-client`의 `exists()` 반환값(`false \| 'd' \| '-' \| 'l'`)을 검사. 문자열이면 존재. 모든 예외는 `false` 반환 |
| `readFile` | method | `ssh2-sftp-client`의 `get()` 반환값(`Buffer` 또는 `string`)을 `Bytes`(`Uint8Array`)로 변환 |
| `put` | method | `string`이면 `fastPut()`으로, `Bytes`이면 `Buffer.from()` 변환 후 `put()`으로 업로드 (`ssh2-sftp-client` 라이브러리 요구사항) |
| `close` | method | `client.end()`를 호출하여 연결 종료. 이미 종료된 상태에서 호출해도 안전 |

## Authentication

`connect()` 호출 시 [`StorageConnConfig`](../types/storage-conn-config.md)의 `password` 유무에 따라 인증 방식이 결정된다:

**`password`가 있는 경우**: 패스워드 인증

**`password`가 없는 경우**: 다음 순서로 시도
1. SSH agent (`SSH_AUTH_SOCK` 환경변수가 설정된 경우 `agent` 옵션 추가)
2. `~/.ssh/id_ed25519` 개인키 파일 읽어 `privateKey` 옵션으로 인증 시도
3. `privateKey` 파싱 실패 시 (암호화된 키 등) SSH agent만으로 재시도

## Usage

```typescript
import { SftpStorageClient } from "@simplysm/storage";

// 패스워드 인증
const client = new SftpStorageClient();
try {
  await client.connect({ host: "sftp.example.com", user: "user", password: "pass" });
  await client.mkdir("/remote/dir");
  await client.put("/local/file.txt", "/remote/dir/file.txt");
} finally {
  await client.close();
}
```

SSH 키 인증 사용 시 `password` 필드를 생략한다:

```typescript
await client.connect({ host: "sftp.example.com", user: "user" }); // password 생략
```
