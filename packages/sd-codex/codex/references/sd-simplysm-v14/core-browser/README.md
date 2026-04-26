# @simplysm/core-browser

> 브라우저 전용 유틸리티 패키지. DOM 프로토타입 확장(Element/HTMLElement), 파일 다운로드/업로드, HTTP 바이너리 fetch, IndexedDB 추상화를 제공한다.
> 런타임: 브라우저 전용 (DOM API 필수). `@simplysm/core-common`에 의존한다.

## Installation

```bash
npm install @simplysm/core-browser
```

## 하려는 작업 → 읽을 파일

### DOM 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DOM 요소 검색/탐색, 탭 이동 가능 요소 찾기, 가시성/위치 확인, 리페인트/스크롤 조정 | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) |
| 여러 요소의 뷰포트 기준 경계(bounds)를 비동기로 조회 | [get-bounds.md](./extensions/get-bounds.md) |
| copy/paste 이벤트 핸들러에서 input/textarea 클립보드 동기화 | [copy-paste.md](./extensions/copy-paste.md) |

### 파일 다운로드/업로드

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 메모리의 Blob을 사용자 파일로 다운로드 | [download-blob.md](./utils/download-blob.md) |
| URL에서 바이너리 데이터를 Uint8Array로 다운로드 (진행률 포함) | [fetch-url-bytes.md](./utils/fetch-url-bytes.md) |
| 프로그래밍 방식으로 파일 선택 대화상자 열기 | [open-file-dialog.md](./utils/open-file-dialog.md) |

### 클라이언트 저장소

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| IndexedDB에 Promise 기반 CRUD 수행 | [indexed-db-store.md](./utils/indexed-db-store.md) |
| IndexedDB 위에 경로 기반 가상 파일시스템 구축 | [indexed-db-virtual-fs.md](./utils/indexed-db-virtual-fs.md) |

## 이 패키지를 쓰지 말아야 할 때

- Node.js 환경 → `@simplysm/core-node`
- 플랫폼 중립 유틸리티 (DateTime, UUID 등) → `@simplysm/core-common`
- Angular 컴포넌트/디렉티브 → `@simplysm/angular`

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
