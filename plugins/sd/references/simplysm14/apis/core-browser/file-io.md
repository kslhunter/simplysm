# @simplysm/core-browser — 파일 입출력

브라우저에서 파일을 저장하거나 가져오는 단발성 작업에서 함께 읽는 묶음임. Blob을 브라우저 다운로드로 내보내기, URL에서 바이너리 데이터 수신, 파일 선택 대화상자 함수를 포함함.

## downloadBlob

```ts
function downloadBlob(blob: Blob, fileName: string): void;
```

Blob 객체를 브라우저 파일 다운로드로 내보냄. `URL.createObjectURL(blob)`로 object URL을 생성하고, 동적 `<a>` 요소의 `href`와 `download` 속성을 설정한 후 `click()`을 호출하여 브라우저의 표준 다운로드 메커니즘을 트리거함.

- `blob` — 다운로드할 바이너리 데이터.
- `fileName` — 저장 파일명. `sanitize-filename` 라이브러리로 파일시스템 금지 문자와 예약어를 제거한 후 `[`, `]` 문자도 추가로 제거함. 남은 값이 빈 문자열이면 `"download"`를 기본값으로 사용함.
- 정리 — `finally` 블록에서 `setTimeout(() => URL.revokeObjectURL(url), 1000)`을 등록하므로, 다운로드 클릭이 예외를 던져도 object URL 해제가 약 1초 후에 수행됨.

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

URL에서 바이너리 데이터를 `Uint8Array`로 받음. 응답의 `Content-Length` 헤더 유무에 따라 두 경로로 나뉨: 헤더가 있으면 해당 크기를 사전 할당해 청크를 순서대로 복사하고, 없으면 청크 배열을 모아 병합함.

- `url` — 다운로드할 URL. `fetch(url)`에 전달되며, `response.ok`가 거짓이면 `Error("다운로드 실패: <상태코드> <상태텍스트>")`를 던짐.
- `options.onProgress` — 진행 콜백 함수. `Content-Length > 0` 경로에서만 각 청크 수신 후에 호출되고, 헤더가 없거나 0이면 호출되지 않음.
- `DownloadProgress.receivedLength` — 지금까지 수신한 누적 바이트 수.
- `DownloadProgress.contentLength` — 응답 헤더 `Content-Length`를 숫자로 변환한 값.
- 본문 reader — `response.body?.getReader()`가 없으면 `Error("응답 본문을 읽을 수 없습니다")`를 던짐.
- `Content-Length > 0` 경로 — 해당 크기의 `Uint8Array`를 미리 할당하고 각 청크를 `set()` 메서드로 순서대로 복사함. 수신량이 헤더 크기보다 많으면(초과) `Error("수신 데이터가 Content-Length를 초과했습니다 (Content-Length: <예상>, 수신: <실제>+)")`를, 적으면(부족) `Error("수신 데이터가 Content-Length보다 부족합니다 (Content-Length: <예상>, 수신: <실제>)")`를 던짐.
- `Content-Length` 없음 경로 — 청크를 배열에 수집한 후 `bytes.concat(chunks)` 함수로 모두 병합하여 반환함.
- 정리 — 성공·실패 어느 경로에서도 `finally` 블록에서 `reader.releaseLock()`을 호출하여 reader 리소스를 해제함.

## openFileDialog

```ts
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>;
```

동적으로 생성한 `<input type="file">` 요소의 `click()`을 호출하여 브라우저 파일 선택 대화상자를 엶. 선택 완료 또는 취소 후 `File[]` 배열 또는 `undefined`로 resolve함.

- `options.accept` — 선택 input의 `accept` 속성. `null`이나 `undefined`가 아닐 때만 input에 설정함. MIME 타입이나 파일 확장자 필터(예: `".pdf"`, `"image/*"`, `".pdf,.doc"`).
- `options.multiple` — 다중 파일 선택 허용 여부. 미지정 시 `false`로 단일 선택 모드로 동작함.
- 선택 완료 — `input.onchange` 이벤트에서 `input.files`가 존재하고 길이가 1 이상이면 배열로 풀어 `File[]`로 resolve함.
- 선택 없음·취소 — 파일이 없거나 `cancel` 이벤트가 발생하면 `undefined`로 resolve함.
