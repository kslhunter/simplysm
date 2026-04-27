# `SdPublishConfig`

> **읽어야 하는 상황**: 패키지 배포 방식(npm / 로컬 디렉토리 / FTP·FTPS·SFTP)을 설정할 때.

패키지 배포 설정. `type` 필드로 분기하는 discriminated union이다.

```typescript
export type SdPublishConfig =
  | SdNpmPublishConfig
  | SdLocalDirectoryPublishConfig
  | SdStoragePublishConfig;
```

| `type` 값 | 타입 | 설명 |
|-----------|------|------|
| `"npm"` | `SdNpmPublishConfig` | npm 레지스트리 배포 |
| `"local-directory"` | `SdLocalDirectoryPublishConfig` | 로컬 디렉토리 복사 |
| `"ftp"` \| `"ftps"` \| `"sftp"` | `SdStoragePublishConfig` | 스토리지 업로드 |

## Related Types

### `SdNpmPublishConfig`

npm 레지스트리에 배포한다. 버전은 자동으로 증가된다.

```typescript
export interface SdNpmPublishConfig {
  type: "npm";
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"npm"` | 배포 타입 식별자 |

### `SdLocalDirectoryPublishConfig`

로컬 디렉토리로 빌드 산출물을 복사한다.

```typescript
export interface SdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local-directory"` | 배포 타입 식별자 |
| `path` | `string` | 배포 대상 경로. 환경 변수 치환 지원: `%VER%` (버전), `%PROJECT%` (프로젝트명) |

### `SdStoragePublishConfig`

FTP/FTPS/SFTP 서버에 빌드 산출물을 업로드한다.

```typescript
export interface SdStoragePublishConfig {
  type: "ftp" | "ftps" | "sftp";
  host: string;
  port?: number;
  path?: string;
  user?: string;
  password?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"ftp" \| "ftps" \| "sftp"` | 스토리지 프로토콜 |
| `host` | `string` | 서버 호스트 |
| `port` | `number?` | 서버 포트 |
| `path` | `string?` | 원격 경로 |
| `user` | `string?` | 사용자명 |
| `password` | `string?` | 비밀번호 |
