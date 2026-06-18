# @simplysm/core-browser

브라우저 전용 유틸리티 — `Element`/`HTMLElement` 프로토타입 확장(조회·순회·위치·가시성)과 클립보드/경계 측정 함수, IndexedDB 키-값 영속화 및 그 위의 가상 파일트리, Blob 다운로드·URL 바이너리 수신·파일 선택 대화상자.

이 패키지의 심볼을 하나라도 import 하면 `index.ts` 가 `element-ext`/`html-element-ext` 를 사이드 이펙트로 실행한다. 그 시점에 `typeof Element !== "undefined"` 가드를 거쳐 브라우저에서만 `Element`/`HTMLElement` 프로토타입에 확장 메서드를 등록한다(SSR/node 에선 가드로 건너뜀, 별도 초기화 불필요).

## 사용 트리거 인덱스

- **DOM 요소 확장** — DOM 조회(`findAll`/`findFirst`)·조상·자식 순회·탭 이동 대상 탐색·offset/가시성 판정·부모 기준 상대 좌표·가림 보정 스크롤·강제 리페인트, 그리고 클립보드 복사/붙여넣기 이벤트 핸들러·다중 요소 경계 측정이 필요할 때. 자세히: [dom-element.md](./dom-element.md)
- **IndexedDB 영속화** — 브라우저 IndexedDB 에 키-값을 영구 저장(`IndexedDbStore`)하거나, 그 위에 경로 키 기반 가상 파일트리(`IndexedDbVirtualFs`)를 올릴 때. 자세히: [indexed-db.md](./indexed-db.md)
- **파일 입출력** — 메모리 Blob 을 파일로 내려받거나(`downloadBlob`), URL 에서 진행률과 함께 바이너리를 받거나(`fetchUrlBytes`), 파일 선택 대화상자를 코드로 열 때(`openFileDialog`). 아래 인라인 섹션 참조.

## 파일 입출력

데이터를 파일로 내보내거나, 외부 바이너리를 받거나, 사용자에게 파일을 고르게 하는 단발성 함수 묶음. named export 이므로 직접 import.

### downloadBlob

```ts
function downloadBlob(blob: Blob, fileName: string): void;
```

`blob` 으로 object URL 을 만들어 동적 `a[download]` 요소를 클릭해 저장하고, object URL 은 1초 뒤 `setTimeout` 으로 revoke 한다(`finally` 에 있어 클릭이 throw 해도 revoke 됨). 클릭 직후 동기 반환하며 다운로드 완료는 기다리지 않는다. 다운로드 버튼 핸들러에서 즉시 저장할 때.

- `blob: Blob` — 저장할 데이터. 엑셀·이미지·텍스트 등 메모리에서 만든 Blob 을 그대로 전달.
- `fileName: string` — 저장 파일명. `sanitize-filename` 으로 OS 금지 문자·예약어를 제거하고 추가로 `[`·`]` 도 제거한 뒤 사용하며, 결과가 빈 문자열이면 `"download"` 로 대체(예: 예약어 `CON.txt` → `"download"`). 확장자 포함, 사용자 입력 파일명을 그대로 넣어도 안전.

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

`fetch` 응답 본문을 스트림 reader 로 청크 단위 수신해 `Uint8Array` 로 반환하며 진행률을 보고한다. 큰 파일을 진행 바와 함께 받을 때.

- `url: string` — 다운로드 대상 URL. `response.ok` 가 아니면 `Error("다운로드 실패: <status> <statusText>")`, 본문 reader 가 없으면 `Error("응답 본문을 읽을 수 없습니다")` throw. 종료 시 `finally` 에서 `reader.releaseLock()` 호출(에러 경로 포함).
- `options.onProgress?: (progress: DownloadProgress) => void` — 청크 수신마다 호출되는 진행 콜백. `Content-Length` 헤더가 있는 경로에서만 호출됨. 헤더가 없으면 청크를 모아 `bytes.concat` 으로 마지막에 한 번 병합(chunked encoding 이라 중간 진행 보고 없음). 진행 바 갱신이 필요할 때만 전달.
- `DownloadProgress.receivedLength: number` — 지금까지 받은 누적 바이트 수.
- `DownloadProgress.contentLength: number` — 전체 바이트 수(`Content-Length` 헤더 값, 없으면 0). 헤더가 있으면 그 크기로 버퍼를 사전 할당하고, 수신량이 헤더 값을 초과하면 `"Content-Length를 초과"`, 미달하면 `"Content-Length보다 부족"` Error 로 무결성을 검증한다.

```ts
const data = await fetchUrlBytes("/api/file", {
  onProgress: (p) => setPct(p.receivedLength / p.contentLength),
});
```

### openFileDialog

```ts
function openFileDialog(options?: { accept?: string; multiple?: boolean }): Promise<File[] | undefined>;
```

동적 `input[type=file]` 을 만들어 `click()` 으로 파일 선택 대화상자를 표시하고, 선택/취소 결과를 Promise 로 반환한다. 업로드 버튼 핸들러에서 호출.

- `options.accept?: string` — 허용 MIME/확장자 필터(input `accept` 에 그대로 전달, 예: `".png,.jpg"`, `"image/*"`). 미지정 시 제한 없음.
- `options.multiple?: boolean` — 다중 선택 허용. `true` 면 여러 파일 선택 가능, 기본 `false`(단일). 여러 파일을 한 번에 받을 화면이면 `true`.
- 반환: 선택 파일이 있으면 `File[]`, 0개 선택이거나 사용자가 취소(`cancel` 이벤트)하면 `undefined`. 결측을 빈 배열로 뭉개지 않으므로 `== null` 로 취소를 구분.

```ts
const files = await openFileDialog({ accept: ".csv", multiple: true });
if (files == null) return; // 취소
```
