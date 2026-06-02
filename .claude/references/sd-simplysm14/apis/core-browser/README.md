# @simplysm/core-browser

브라우저 전용 유틸리티. `Element`/`HTMLElement` 프로토타입 확장(사이드 이펙트)과 파일 다운로드·업로드, IndexedDB 래퍼를 제공.

> 패키지의 어떤 심볼이든 import 하면 `index.ts` 가 `import "./extensions/..."` 를 실행해 프로토타입 확장이 자동 등록됨(`element-ext`, `html-element-ext` 의 사이드 이펙트). 별도 초기화 호출 없이 `el.findAll(...)` 식으로 사용 가능.

## 사용 트리거 인덱스

- **DOM 요소 확장** — DOM 조회(`findAll`/`findFirst`), 부모/탭이동 가능 요소 탐색, 가시성·offset 판정, 부모 기준 상대 좌표 계산, 가림 보정 스크롤, 강제 리페인트, 클립보드 복사/붙여넣기 핸들러, 다중 요소 경계 측정이 필요할 때. 자세히: [dom-element.md](./dom-element.md)
- **IndexedDB 저장소/가상 파일시스템** (`IndexedDbStore`, `IndexedDbVirtualFs`) — 브라우저 IndexedDB 에 KV 영구 저장하거나, 그 위에 경로 키 기반 가상 파일트리를 올릴 때. 자세히: [indexed-db.md](./indexed-db.md)
- **파일 다운로드/업로드** (`downloadBlob`, `fetchUrlBytes`/`DownloadProgress`, `openFileDialog`) — Blob 을 파일로 내려받거나, URL 바이너리를 진행률과 함께 받거나, 파일 선택 대화상자를 코드에서 띄울 때. (아래 인라인 섹션)

## 파일 다운로드/업로드

브라우저에서 파일을 내려받거나, URL 에서 바이너리를 받거나, 사용자가 파일을 고르게 할 때 쓰는 독립 함수 묶음.

### downloadBlob

```ts
function downloadBlob(blob: Blob, fileName: string): void;
```

Blob 을 objectURL 로 만들어 동적 `a[download]` 클릭으로 저장. objectURL 은 1초 뒤 revoke. 화면 다운로드 버튼 핸들러에서 즉시 저장할 때.

- `blob: Blob` — 저장할 데이터.
- `fileName: string` — 저장 파일명. `sanitize-filename` 으로 OS 금지 문자·예약어를 제거한 뒤 추가로 `[`·`]` 도 제거하며, 결과가 빈 문자열이면 `"download"` 로 대체. 사용자 입력 파일명을 그대로 넣어도 안전.

```ts
downloadBlob(new Blob([buf], { type: "application/pdf" }), "보고서[2026].pdf");
```

### fetchUrlBytes / DownloadProgress

```ts
interface DownloadProgress { receivedLength: number; contentLength: number }
function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>;
```

URL 바이너리를 스트림 reader 로 다운로드. 큰 파일을 진행률과 함께 받을 때.

- `url: string` — 다운로드 대상 URL. `response.ok` 가 아니면 `Error("다운로드 실패: <status> <statusText>")`, 본문 reader 가 없으면 `Error("응답 본문을 읽을 수 없습니다")` throw.
- `options.onProgress: (progress: DownloadProgress) => void` — 청크 수신마다 호출되는 진행 콜백. `Content-Length` 헤더가 있는 경로에서만 호출됨(없으면 청크를 모아 `bytes.concat` 으로 마지막에 한 번에 병합 → chunked encoding 이라 중간 보고 없음). 진행 바 갱신에.
- `DownloadProgress.receivedLength: number` — 누적 수신 바이트 수.
- `DownloadProgress.contentLength: number` — 전체 바이트(`Content-Length` 헤더 값, 없으면 0). 헤더가 있으면 그 크기로 버퍼를 사전 할당하고, 수신량이 헤더 값을 초과하거나 미달하면 무결성 위반으로 Error throw.

```ts
const data = await fetchUrlBytes("/api/file", {
  onProgress: (p) => setPct(p.receivedLength / p.contentLength),
});
```

### openFileDialog

```ts
function openFileDialog(options?: { accept?: string; multiple?: boolean }): Promise<File[] | undefined>;
```

동적 `input[type=file]` 을 만들어 클릭, 파일 선택 대화상자를 표시. 업로드 버튼 핸들러에서 호출.

- `options.accept: string` — 허용 MIME/확장자 필터(input `accept` 에 그대로 전달). 미지정 시 제한 없음. 특정 형식만 받을 때(예: `".png,.jpg"`, `"image/*"`).
- `options.multiple: boolean` — 다중 선택 허용. true 면 여러 파일 선택 가능, 기본 `false`(단일). 여러 파일 업로드 화면이면 true.
- 반환: 선택 파일이 있으면 `File[]`, 사용자가 취소하거나(`cancel` 이벤트) 0개 선택이면 `undefined`. 결측을 빈 배열로 뭉개지 않으므로 `== null` 로 취소를 구분.

```ts
const files = await openFileDialog({ accept: ".csv", multiple: true });
if (files == null) return; // 취소
```
