# `SftpStorageClient`

> **읽어야 하는 상황**: SFTP 연결을 직접 생명주기 관리하거나 SSH 키 인증 방식을 확인할 때. 단일 작업 단위로 자동 관리하려면 [`StorageFactory`](../factory/storage-factory.md) 사용.

`ssh2-sftp-client` 라이브러리 기반. [`StorageClient`](../types/storage-client.md) 인터페이스를 구현한다.

## When to use

- ✅ SFTP 연결을 직접 생명주기 관리해야 할 때 (장시간 연결 유지 등)
- ❌ 단일 작업 단위로 연결/종료를 자동 관리하고 싶을 때 → [`StorageFactory.connect()`](../factory/storage-factory.md) 사용 권장

## Signature

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

### 최소 예제

```typescript
import { SftpStorageClient } from "@simplysm/storage";

const client = new SftpStorageClient();
try {
  await client.connect({ host: "sftp.example.com", user: "user", password: "pass" });
  await client.put("/local/file.txt", "/remote/file.txt");
} finally {
  await client.close();
}
```

### 전형 예제

```typescript
import { SftpStorageClient } from "@simplysm/storage";

// SSH 키 인증 (password 생략)
const client = new SftpStorageClient();
try {
  await client.connect({ host: "sftp.example.com", user: "user" });
  await client.mkdir("/remote/dir");
  await client.put("/local/file.txt", "/remote/dir/file.txt");
  const list = await client.list("/remote/dir");
  for (const item of list.filter((f) => f.isFile)) {
    const content = await client.readFile(`/remote/dir/${item.name}`);
    // content는 Bytes (Uint8Array)
  }
} finally {
  await client.close(); // 예외 발생 여부와 무관하게 반드시 종료
}
```

## 🚫 Anti-patterns

### close() 없이 사용

```typescript
// ❌ finally 없이 사용하면 예외 시 연결 누수
const client = new SftpStorageClient();
await client.connect(config);
await client.put("/local/file.txt", "/remote/file.txt");
await client.close();

// ✅ try/finally로 보장하거나 StorageFactory.connect() 사용
```

**근거**: 예외 발생 시 `close()`가 호출되지 않아 SFTP 연결이 누수된다.

### 동일 인스턴스에서 connect() 중복 호출

```typescript
// ❌ close() 없이 connect()를 다시 호출하면 SdError 발생
await client.connect(config);
await client.connect(config); // SdError: "SFTP 서버에 이미 연결되어 있습니다"

// ✅ close() 후 재연결
await client.close();
await client.connect(config);
```

**근거**: 내부 클라이언트가 이미 존재하면 `SdError`를 던진다.
