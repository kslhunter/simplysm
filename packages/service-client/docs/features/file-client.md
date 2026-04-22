# FileClient

파일 업로드(POST)/다운로드(GET) 인터페이스. 팩토리 함수 `createFileClient`로 생성한다.

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
