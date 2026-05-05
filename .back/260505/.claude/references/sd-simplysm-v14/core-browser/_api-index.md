# API Index — @simplysm/core-browser

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Extensions

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Element.findAll` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 선택자로 하위 요소를 모두 검색할 때 |
| `Element.findFirst` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 선택자로 첫 번째 하위 요소를 검색할 때 |
| `Element.prependChild` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 요소를 첫 번째 자식으로 삽입할 때 |
| `Element.getParents` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 모든 부모 요소를 배열로 조회할 때 |
| `Element.findTabbableParent` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 탭 이동 가능한 부모 요소를 찾을 때 |
| `Element.findFirstTabbableChild` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 탭 이동 가능한 첫 번째 자식 요소를 찾을 때 |
| `Element.isOffsetElement` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 요소가 offset parent인지 확인할 때 |
| `Element.isVisible` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 요소가 화면에 보이는지 확인할 때 |
| `HTMLElement.repaint` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 강제 리페인트가 필요할 때 |
| `HTMLElement.getRelativeOffset` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 부모 기준 상대 위치를 계산할 때 |
| `HTMLElement.scrollIntoViewIfNeeded` | prototype method | [element-prototype-extensions.md](./extensions/element-prototype-extensions.md) | 고정 헤더/컬럼에 가려진 요소를 스크롤할 때 |
| `getBounds` | function | [get-bounds.md](./extensions/get-bounds.md) | 여러 요소의 경계 정보를 비동기 조회할 때 |
| `ElementBounds` | interface | [get-bounds.md](./extensions/get-bounds.md) | `getBounds` 반환 타입 |
| `copyElement` | function | [copy-paste.md](./extensions/copy-paste.md) | copy 이벤트 핸들러에서 input 값을 클립보드에 복사할 때 |
| `pasteToElement` | function | [copy-paste.md](./extensions/copy-paste.md) | paste 이벤트 핸들러에서 클립보드 내용을 input에 붙여넣을 때 |

## Utils

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `downloadBlob` | function | [download-blob.md](./utils/download-blob.md) | Blob을 파일로 다운로드할 때 |
| `fetchUrlBytes` | function | [fetch-url-bytes.md](./utils/fetch-url-bytes.md) | URL에서 바이너리 데이터를 Uint8Array로 다운로드할 때 |
| `DownloadProgress` | interface | [fetch-url-bytes.md](./utils/fetch-url-bytes.md) | `fetchUrlBytes` 진행 콜백 파라미터 타입 |
| `openFileDialog` | function | [open-file-dialog.md](./utils/open-file-dialog.md) | 프로그래밍 방식으로 파일 선택 대화상자를 열 때 |
| `IndexedDbStore` | class | [indexed-db-store.md](./utils/indexed-db-store.md) | IndexedDB에 Promise 기반 CRUD가 필요할 때 |
| `StoreConfig` | interface | [indexed-db-store.md](./utils/indexed-db-store.md) | `IndexedDbStore` 생성자 스토어 설정 타입 |
| `IndexedDbVirtualFs` | class | [indexed-db-virtual-fs.md](./utils/indexed-db-virtual-fs.md) | IndexedDB 위에 경로 기반 파일시스템이 필요할 때 |
| `VirtualFsEntry` | interface | [indexed-db-virtual-fs.md](./utils/indexed-db-virtual-fs.md) | 가상 파일시스템 엔트리 타입 |
