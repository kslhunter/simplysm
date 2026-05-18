# @simplysm/angular — crud

CRUD 화면 골격. 상단 명령바·필터·toolbar·페이지 페이저·시트를 갖춘 리스트 화면(`SdCrudList`)과 디테일 화면(`SdCrudDetail`)과 공통 컨테이너(`SdBaseContainer`).

## `<sd-base-container>`

페이지/모달 공통 컨테이너. `SdSharedDataProvider.wait()` 완료까지 busy 표시 후 `ready=true`.

inputs: `viewType: SdViewType` (required), `restricted`, `initialized`. models: `ready`, `busyCount`. content templates: `#topbarTpl`, `#commandTpl`, `#contentTpl`, `#bottomCommandTpl`.

```html
<sd-base-container [viewType]="vt">
  <ng-template #commandTpl>...</ng-template>
  <ng-template #contentTpl>...</ng-template>
</sd-base-container>
```

## `<sd-crud-list<TItem, TKey>>`

리스트+페이지+선택+삭제/복원 골격.

- 필수 input: `viewType`, `key`, `trackByFn: (TItem) => TKey`.
- inputs: `selectMode: "single"|"multi"`, `items`, `currDeletedItems`, `totalPageCount`, `itemsPerPage`, `visiblePageCount=10`, `readonly`, `restricted`, `initialized`.
- models: `ready`, `busyCount`, `selectedKeys: NonNullable<TKey>[]`, `currentPage`, `sorts: SortingDef[]`.
- outputs: `filterSubmit`, `submit`, `create`, `delete: TItem[]`, `restore: TItem[]`.
- content templates: `#commandTpl`, `#filterTpl`, `#toolTpl`, `#bottomCommandTpl` + `<sd-sheet-column>` 자식들이 자동으로 sheet 에 전달.
- 삭제된 아이템은 `text-decoration: line-through`.
- 모달 컨텍스트면 confirm/cancel 핸들러 자동 (`onModalSelectionConfirmClick`/`onModalSelectionCancelClick`).

## `<sd-crud-detail>`

단일 레코드 편집.

- 필수: `viewType`. inputs: `restricted`, `readonly`, `initialized`. models: `ready`, `busyCount`. output: `submit`. templates: `#commandTpl`, `#contentTpl`, `#bottomCommandTpl`.
- 저장 버튼 → 내부 `SdForm.requestSubmit()`.
