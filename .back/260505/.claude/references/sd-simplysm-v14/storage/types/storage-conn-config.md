# `StorageConnConfig`

> **읽어야 하는 상황**: 연결 설정 객체의 필드와 타입을 확인할 때. SFTP에서 `password`를 생략하면 SSH 키 인증으로 전환된다.

스토리지 서버 연결 설정 인터페이스.

```typescript
interface StorageConnConfig {
  host: string;
  port?: number;
  user?: string;
  password?: string;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | 서버 호스트 주소 |
| `port` | `number \| undefined` | 포트 번호. 생략 시 프로토콜 기본값 사용 (FTP/FTPS: 21, SFTP: 22) |
| `user` | `string \| undefined` | 사용자 이름 |
| `password` | `string \| undefined` | 비밀번호. SFTP에서 생략하면 SSH agent + `~/.ssh/id_ed25519` 키 파일 인증을 순서대로 시도 |

## Usage

```typescript
import type { StorageConnConfig } from "@simplysm/storage";

const config: StorageConnConfig = {
  host: "sftp.example.com",
  port: 22,
  user: "user",
  password: "pass",
};
```
