# @simplysm/angular — sheet

가상 스크롤 데이터 그리드. 컬럼·셀 템플릿·정렬·페이징·선택·확장 트리·설정 모달 내장.

## 기본 사용

```html
<sd-sheet
  [key]="'order-list'"
  [items]="items"
  [trackByFn]="byId"
  [selectMode]="'multi'"
  [(selectedKeys)]="selectedKeys"
  [(sorts)]="sorts"
  [(currentPage)]="page"
  [totalPageCount]="totalPages"
  [itemsPerPage]="50"
  [useAutoSort]="false">

  <sd-sheet-column [key]="'no'" [header]="'번호'" [width]="'80px'" [fixed]="true">
    <ng-template cell let-item="item" let-index="index">{{ index + 1 }}</ng-template>
  </sd-sheet-column>
</sd-sheet>
```

## `<sd-sheet<TItem>>` 입력/출력

- inputs: `key`, `items`, `trackByFn`, `selectMode`, `autoSelect: "click"|"focus"`, `getItemSelectableFn`, `getChildrenFn` (트리), `useAutoSort`, `visiblePageCount=10`, `totalPageCount`, `itemsPerPage`, `focusMode: "row"|"cell" = "cell"`, `inset`, `contentStyle`, `getItemCellClassFn`, `getItemCellStyleFn`, `hideConfigBar`, `columnControlsInput` (외부 정의된 컬럼 추가).
- outputs: `itemKeydown: SdSheetItemKeydownEventParam<T> { item, event }`, `cellKeydown: SdSheetCellKeydownEventParam<T> { item, key, event }`.
- models: `selectedKeys: unknown[]`, `expandedItems: TItem[]`, `sorts: SortingDef[]`, `currentPage: number`.
- `key` 지정 시 설정 모달(`SdSheetConfigModal`)로 너비/숨김/고정/순서를 `SdSystemConfigProvider`에 영속화.

## `<sd-sheet-column<T> [key] [header]>`

inputs: `key`(required), `header: string|string[]` (배열은 다중 행 헤더), `headerStyle`, `tooltip`, `width`, `fixed`, `hidden`, `collapse`, `disableSorting`, `disableResizing`, `ordering`.

자식 template:
- `<ng-template cell let-item="item">` (필수, `SdSheetColumnCellTemplate`, ctx: `SdSheetCellContext<T> = { $implicit, item, index, depth, edit }`).
- `<ng-template #headerTpl>` (선택, 커스텀 헤더).
- `<ng-template #summaryTpl>` (선택, 합계 행).

## 타입

```typescript
interface SdSheetColumnDef { key; header; headerStyle?; tooltip?; width?; fixed; hidden; collapse; disableSorting; disableResizing; ordering }
interface SdSheetHeaderDef { text; colspan; rowspan; isLastRow; fixed; colDef?; colIndex }
interface SdSheetConfig    { columnRecord: Record<string, { width?; hidden?; fixed?; ordering? }> }
```

## 설정 모달

`SdSheetConfigModal` (`SdModalContentDef<SdSheetConfig | undefined>`): `sheetKey`, `controls: SdSheetColumn[]`, `config: SdSheetConfig | undefined` inputs. 사용자가 컬럼 너비/숨김/고정/순서 편집 후 저장 → `close.emit(config)`.
