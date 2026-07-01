# @simplysm/core-browser

브라우저 전용 유틸리티: DOM `Element`/`HTMLElement` 프로토타입 확장, IndexedDB 오브젝트 스토어 래퍼·경로 키 가상 파일트리, Blob 다운로드·URL 바이너리 수신·파일 선택 함수를 제공한다.

entry(`src/index.ts`)는 `extensions/element-ext`와 `extensions/html-element-ext`를 사이드 이펙트로 import한다. 두 확장은 브라우저에서 `Element`/`HTMLElement` 전역이 존재할 때만(`typeof ... !== "undefined"`) 프로토타입 메서드를 등록하므로, SSR(node) 환경에서는 등록을 건너뛴다.

## 사용 트리거 인덱스

- **DOM 요소 확장** — DOM 조회·조상/자식 탐색·탭 이동 가능 요소 탐색·offset/가시성 판정·상대 좌표·가림 보정 스크롤·클립보드 이벤트·요소 경계 측정을 다룰 때. 자세히: [dom-element.md](./dom-element.md)
- **IndexedDB 영속화** — IndexedDB 오브젝트 스토어 CRUD를 감싸거나 경로 키 기반 가상 파일트리를 저장할 때. 자세히: [indexed-db.md](./indexed-db.md)
- **파일 입출력** — Blob을 브라우저 다운로드로 내보내거나, URL 바이너리를 `Uint8Array`로 받거나, 파일 선택 대화상자를 열 때. 자세히: [file-io.md](./file-io.md)
