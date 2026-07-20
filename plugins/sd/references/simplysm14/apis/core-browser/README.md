# @simplysm/core-browser

브라우저 전용 유틸리티. `Element`/`HTMLElement` prototype 확장, 클립보드, 경계 측정 함수, 파일 다운로드, 선택, URL 바이너리 수신, IndexedDB 저장소와 가상 파일시스템을 제공한다.

entry(`src/index.ts`)는 `extensions/element-ext`, `extensions/html-element-ext` 를 사이드 이펙트로 import 하므로, 패키지를 import 하면 prototype 확장이 등록된다.
확장 등록부는 `typeof Element !== "undefined"` / `typeof HTMLElement !== "undefined"` 가드 안에 있어 SSR(node) 에서는 건너뛴다.

## 사용 트리거 인덱스

- **DOM 요소 확장** — 요소 탐색(`findAll`/`findFirst`), 조상, 탭 이동 가능 요소 검색, 가시성, positioned 판정,
  부모 기준 상대좌표 계산, 가림 보정 스크롤, 클립보드 copy/paste 핸들러, 다중 요소 경계 측정.
  자세히: [dom-element.md](./dom-element.md)
- **파일 입출력** — Blob 을 파일로 저장, 파일 선택 대화상자 열기, URL 바이너리를 진행률 콜백과 함께 수신. 자세히: [file-io.md](./file-io.md)
- **IndexedDB 영속화** — IndexedDB 연결, 트랜잭션, CRUD 래핑, 경로 키 기반 가상 파일트리 저장, 조회, 삭제. 자세히: [indexed-db.md](./indexed-db.md)
