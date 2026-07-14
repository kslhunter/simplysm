# @simplysm/core-browser

브라우저 전용 유틸리티: DOM 요소의 `Element`/`HTMLElement` 프로토타입 확장으로 조회·탐색·탭 이동·위치 계산·가시성 판정을 제공하고, IndexedDB 저장소 래퍼와 경로 키 기반 가상 파일시스템, Blob 다운로드·URL 바이너리 수신·파일 선택 함수를 포함함.

## 사용 트리거 인덱스

- **DOM 요소 확장** — DOM 요소를 직접 조회·탐색·조작하거나, 요소의 상대 위치·가시성을 판정하거나, 클립보드 이벤트를 처리하거나, 요소의 경계 정보를 측정할 때. 자세히: [dom-element.md](./dom-element.md)
- **IndexedDB 영속화** — IndexedDB 오브젝트 스토어의 연결·트랜잭션·CRUD를 감싸거나, 경로 키 기반 가상 파일트리를 저장·조회·삭제할 때. 자세히: [indexed-db.md](./indexed-db.md)
- **파일 입출력** — 브라우저에서 Blob을 파일로 다운로드하거나, URL에서 바이너리 데이터를 받거나, 파일 선택 대화상자를 열 때. 자세히: [file-io.md](./file-io.md)
