# `FileClient`

> **읽어야 하는 상황**: 서버에 파일을 업로드하거나 서버에서 파일을 다운로드할 때. 일반적으로 `ServiceClient.uploadFile()`/`downloadFileBuffer()`를 통해 간접 사용하며, 직접 생성은 인증 없이 다운로드만 수행하거나 커스텀 URL 구성이 필요할 때에만 사용한다.

## When to use

- ✅ 서버에 파일을 업로드하거나 서버에서 파일을 다운로드할 때
- ❌ 일반적으로 `ServiceClient.uploadFile()` / `ServiceClient.downloadFileBuffer()`를 통해 간접 사용한다. 직접 생성은 인증 없이 다운로드만 수행하거나 커스텀 URL 구성이 필요할 때에만 사용한다.

```typescript
export interface FileClient {
  download(relPath: string): Promise<Bytes>;
  upload(
    files: File[] | FileCollection | { name: string; data: BlobInput }[],
    authToken: string,
  ): Promise<ServiceUploadResult[]>;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `download(relPath)` | method | `Promise<Bytes>` | `GET {hostUrl}{relPath}`로 파일 다운로드. `Uint8Array` 반환 |
| `upload(files, authToken)` | method | `Promise<ServiceUploadResult[]>` | `POST {hostUrl}/upload`로 파일 업로드. `multipart/form-data` 사용 |

### `upload` Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileCollection \| { name: string; data: BlobInput }[]` | 업로드할 파일 목록 |
| `authToken` | `string` | 인증 토큰 (`Authorization: Bearer {token}` 헤더로 전송) |

## `createFileClient`

`FileClient` 팩토리 함수.

```typescript
export function createFileClient(hostUrl: string, clientName: string): FileClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `hostUrl` | `string` | 서버 기본 URL (`http://host:port` 형식) |
| `clientName` | `string` | 클라이언트 식별자 (`x-sd-client-name` 헤더로 전송) |

## Usage

```typescript
// 일반적으로 ServiceClient를 통해 간접 사용한다
// 파일 업로드 (auth() 호출 후 사용)
const results = await client.uploadFile([
  new File(["content"], "file.txt", { type: "text/plain" }),
]);

// 커스텀 데이터 업로드
const results2 = await client.uploadFile([
  { name: "report.csv", data: "col1,col2\nval1,val2" },
]);

// 파일 다운로드
const bytes = await client.downloadFileBuffer("/uploaded/file.txt");
```
