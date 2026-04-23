# @simplysm/core-browser

> 브라우저 전용 유틸리티 패키지. DOM 프로토타입 확장(Element/HTMLElement), 파일 다운로드/업로드, HTTP 바이너리 fetch, IndexedDB 추상화를 제공한다.
> 런타임: 브라우저 전용 (DOM API 필수). `@simplysm/core-common`에 의존한다.

## Installation

```bash
npm install @simplysm/core-browser
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| DOM 요소 검색/탐색 (findAll, findFirst 등) | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) |
| 요소 위치 계산, 스크롤 조정, 리페인트 | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) |
| 여러 요소의 경계(bounds) 비동기 조회 | [get-bounds.md](./extensions/get-bounds.md) |
| copy/paste 이벤트 핸들러 구현 | [copy-paste.md](./extensions/copy-paste.md) |
| Blob을 파일로 다운로드 | [download-blob.md](./utils/download-blob.md) |
| URL에서 바이너리 데이터 다운로드 | [fetch-url-bytes.md](./utils/fetch-url-bytes.md) |
| 프로그래밍 방식으로 파일 선택 대화상자 열기 | [open-file-dialog.md](./utils/open-file-dialog.md) |
| IndexedDB CRUD 작업 | [indexed-db-store.md](./utils/indexed-db-store.md) |
| IndexedDB 기반 가상 파일시스템 | [indexed-db-virtual-fs.md](./utils/indexed-db-virtual-fs.md) |

## API Overview

### Extensions

사이드 이펙트 모듈로, `@simplysm/core-browser`를 임포트하면 자동으로 `Element`와 `HTMLElement` 프로토타입에 메서드가 추가된다.

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`Element/HTMLElement Prototype Extensions`](./extensions/element-prototype-extensions.md) | prototype extension | DOM 요소 검색, 탭 이동, 가시성 확인, 위치 계산, 스크롤 조정이 필요할 때 |
| [`getBounds`](./extensions/get-bounds.md) | function | IntersectionObserver로 여러 요소의 경계 정보를 비동기 조회할 때 |
| [`copyElement` / `pasteToElement`](./extensions/copy-paste.md) | function | copy/paste 이벤트 핸들러에서 input/textarea 값을 클립보드와 동기화할 때 |

### Utils

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`downloadBlob`](./utils/download-blob.md) | function | 메모리의 Blob을 사용자 파일로 다운로드할 때 |
| [`fetchUrlBytes`](./utils/fetch-url-bytes.md) | function | URL에서 바이너리 데이터를 Uint8Array로 가져올 때 (진행 콜백 필요) |
| [`openFileDialog`](./utils/open-file-dialog.md) | function | `<input type="file">`없이 프로그래밍 방식으로 파일 선택할 때 |
| [`IndexedDbStore`](./utils/indexed-db-store.md) | class | IndexedDB에 Promise 기반 CRUD가 필요할 때 |
| [`IndexedDbVirtualFs`](./utils/indexed-db-virtual-fs.md) | class | IndexedDB 위에 경로 기반 파일시스템 추상화가 필요할 때 |

## 이 패키지를 쓰지 말아야 할 때

- Node.js 환경 → `@simplysm/core-node`
- 플랫폼 중립 유틸리티 (DateTime, UUID 등) → `@simplysm/core-common`
- Angular 컴포넌트/디렉티브 → `@simplysm/angular`
