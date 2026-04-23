# `fetchUrlBytes`

URL에서 바이너리 데이터를 `Uint8Array`로 다운로드하는 함수. 진행 콜백을 지원한다.

## When to use

- ✅ URL에서 바이너리 파일을 메모리로 가져올 때 (이미지, WASM, 압축 파일 등)
- ✅ 다운로드 진행률 표시가 필요할 때
- ❌ 텍스트/JSON 응답 → 표준 `fetch()` API 직접 사용
- ❌ 다운로드한 데이터를 바로 파일로 저장 → 이 함수로 가져온 후 [`downloadBlob`](./download-blob.md) 사용

## Signature

```typescript
export async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `url` | `string` | 다운로드 대상 URL |
| `options.onProgress` | `(progress: DownloadProgress) => void` | 진행 콜백. `Content-Length` 헤더가 있는 경우에만 호출됨 |

## Returns

`Promise<Uint8Array>` — 다운로드된 바이너리 데이터.

## Usage

### 최소 예제

```typescript
import { fetchUrlBytes } from "@simplysm/core-browser";

const data = await fetchUrlBytes("/api/files/report.pdf");
```

### 전형 예제 — 진행률 표시

```typescript
import { fetchUrlBytes } from "@simplysm/core-browser";

const data = await fetchUrlBytes("/api/files/large-file.zip", {
  onProgress: (progress) => {
    const percent = Math.round((progress.receivedLength / progress.contentLength) * 100);
    updateProgressBar(percent);
  },
});
```

## 🚫 Anti-patterns

### Content-Length 없는 응답에서 진행률 의존

```typescript
// ❌ chunked encoding 응답은 Content-Length가 0이므로 onProgress가 호출되지 않음
const data = await fetchUrlBytes("/api/stream", {
  onProgress: (p) => {
    // contentLength가 0이면 이 콜백은 호출되지 않음
    showProgress(p.receivedLength / p.contentLength);
  },
});
```

**근거**: `Content-Length` 헤더가 없거나 0이면 청크 수집 모드로 전환되며, 이 경우 `onProgress`가 호출되지 않는다.

## 에러 처리

- HTTP 응답이 실패하면 (`response.ok === false`) `Error` 발생: `"다운로드 실패: {status} {statusText}"`
- 응답 본문을 읽을 수 없으면 `Error` 발생: `"응답 본문을 읽을 수 없습니다"`
- 수신 데이터가 `Content-Length`를 초과하거나 부족하면 `Error` 발생

## Related Types

### `DownloadProgress`

```typescript
export interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `receivedLength` | `number` | 현재까지 수신한 바이트 수 |
| `contentLength` | `number` | 전체 콘텐츠 길이 (Content-Length 헤더 값) |
