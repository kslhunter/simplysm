# @simplysm/core-browser — 파일 입출력

브라우저에서 파일을 내보내거나 가져오는 단발성 작업에서 함께 읽는 묶음이다. Blob 다운로드, URL 바이너리 다운로드, 파일 선택 대화상자 함수를 포함한다.

## downloadBlob

```ts
function downloadBlob(blob: Blob, fileName: string): void;
```

- `blob: Blob` — 다운로드할 데이터. `URL.createObjectURL(blob)`으로 object URL을 만든다.
- `fileName: string` — `a.download`에 넣을 파일명. `sanitize-filename` 결과에서 `[`/`]`를 추가 제거하고, 남는 값이 없으면 `"download"`를 사용한다.
- 동작 — 동적 `a` 요소를 만들고 `href`에 object URL, `download`에 정리된 파일명을 넣은 뒤 `click()`을 호출한다.
- 정리 — `finally`에서 `setTimeout(() => URL.revokeObjectURL(url), 1000)`을 등록하므로 `click()`이 throw해도 object URL 해제를 예약한다.

## DownloadProgress / fetchUrlBytes

```ts
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}

function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>;
```

- `url: string` — `fetch(url)`에 전달할 다운로드 URL. `response.ok`가 거짓이면 `Error("다운로드 실패: <status> <statusText>")`를 던진다.
- `options.onProgress?: (progress: DownloadProgress) => void` — `Content-Length`가 0보다 클 때 각 청크를 받은 뒤 호출된다. 헤더가 없거나 0이면 호출되지 않는다.
- `DownloadProgress.receivedLength: number` — 현재까지 받은 누적 바이트 수다.
- `DownloadProgress.contentLength: number` — 응답 `Content-Length` 헤더를 숫자로 바꾼 값이다.
- 본문 reader — `response.body?.getReader()`가 없으면 `Error("응답 본문을 읽을 수 없습니다")`를 던진다.
- `Content-Length > 0` 경로 — 해당 길이의 `Uint8Array`를 사전 할당하고 청크를 순서대로 `set`한다. 수신량이 헤더보다 크거나 작으면 각각 초과/부족 Error를 던진다.
- `Content-Length` 없음 경로 — 청크 배열을 모은 뒤 `bytes.concat(chunks)`로 병합해 반환한다.
- 정리 — 성공·실패 어느 경로에서도 `finally`에서 `reader.releaseLock()`을 호출한다.

## openFileDialog

```ts
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>;
```

- `options.accept?: string` — 파일 선택 input의 `accept` 속성. 값이 `null`/`undefined`가 아닐 때만 설정한다.
- `options.multiple?: boolean` — 파일 선택 input의 `multiple` 속성. 미지정 시 `false`로 설정되어 단일 선택이다.
- 선택 완료 — `input.onchange`에서 `input.files`가 있고 길이가 1 이상이면 `File[]`로 풀어 반환한다.
- 선택 없음/취소 — 파일이 없거나 `cancel` 이벤트가 발생하면 `undefined`로 resolve한다.
- 동작 — 동적 `input`을 만들고 `type`을 `"file"`로 설정한 뒤 `click()`으로 대화상자를 연다.
