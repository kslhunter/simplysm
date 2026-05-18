# @simplysm/angular — select-dropdown

## `<sd-dropdown>` / `<sd-dropdown-popup>`

```html
<sd-dropdown [(open)]="open" [disabled]="false">
  trigger 컨텐츠
  <sd-dropdown-popup>팝업 컨텐츠</sd-dropdown-popup>
</sd-dropdown>
```

- `open` 시 popup을 body로 이동(트리거 위치 기준 배치). 모바일(`max-width:520px`)이면 backdrop+bottom sheet.
- 트리거 클릭/Enter/ArrowDown 으로 open.

## `<sd-select<M extends "single"|"multi", T>>`

```html
<sd-select [items]="items" [(value)]="value" [selectMode]="'single'" [trackByFn]="byId">
  <sd-select-item *ngFor="let it of items" [value]="it.id">{{ it.name }}</sd-select-item>
</sd-select>
```

`SelectModeValue<T> = { single: T; multi: T[] }`. value type = `SelectModeValue<T>[M]`.

주요 input: `selectMode`, `value` (model), `placeholder`, `disabled`, `inline`, `inset`, `size`, `required`, `hideSelectAll`, `multiSelectionDisplayDirection: "vertical"`, `items`, `trackByFn`, `getChildrenFn` (트리), `contentClass/Style`, `dropdownOpen` (model).

`<ng-template #headerTpl>`, `<ng-template #beforeTpl>`, `<ng-template itemOf>` (`SdItemOfTemplate`) 으로 커스터마이즈.

## `<sd-select-item<T> [value]>`

projected content 가 옵션 라벨.

## `<sd-select-button>`

검색 트리거 버튼만 노출하는 경량 select (내부 사용용).
