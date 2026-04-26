# Shared Data Components

> **읽어야 하는 상황**: 공유 데이터에서 항목을 선택하는 UI(드롭다운, 모달 버튼, 목록)가 필요할 때.

공유 데이터(`SdSharedDataProvider`)와 연동하는 UI 컴포넌트 모음.

## `SdSharedDataSelect`

공유 데이터 드롭다운 선택 컴포넌트. 검색 기능 포함.

```typescript
@Component({ selector: "sd-shared-data-select" })
class SdSharedDataSelect<
  TItem extends SharedDataBase<string | number>,
  TMode extends keyof SelectModeValue<...>,
  TModal extends SdSelectModal<any>
> {
  value = model<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();
  items = input.required<TItem[]>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  useUndefined = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input("single" as TMode);
  filterFn = input<(item: TItem, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();
  modal = input<SdSelectModalInfo<TModal>>();
  editModal = input<SdModalInfo<SdModalContentDef<boolean>>>();
  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical">();
  getIsHiddenFn = input<(item: TItem, index: number) => boolean>();
  getSearchTextFn = input<(item: TItem, index: number) => string>();
  displayOrderKeyProp = input<string>();
}
```

### Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `value` | model | `SelectModeValue<TItem["__valueKey"] \| undefined>[TMode]` | - | 선택된 값 (two-way) |
| `items` | input (required) | `TItem[]` | - | 공유 데이터 항목 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `required` | input | `boolean` | `false` | 필수 |
| `useUndefined` | input | `boolean` | `false` | undefined 항목 포함 |
| `inset` | input | `boolean` | `false` | 삽입 스타일 |
| `inline` | input | `boolean` | `false` | 인라인 표시 |
| `size` | input | `"sm" \| "lg" \| undefined` | `undefined` | 크기 |
| `selectMode` | input | `TMode` | `"single"` | 선택 모드 |
| `filterFn` | input | `((item, index, ...params) => boolean) \| undefined` | `undefined` | 필터 함수 |
| `modal` | input | `SdSelectModalInfo<TModal> \| undefined` | `undefined` | 모달 선택 정보 |

### 시트 셀 내 사용 패턴

```html
<sd-sheet-column [header]="'거래처'" [key]="'vendorId'">
  <ng-template [cell]="items()" let-item let-edit="edit">
    <sd-shared-data-select
      [items]="sharedVendors()"
      [inset]="true"
      [size]="'sm'"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.vendorId"
      (valueChange)="mark(items)"
    >
      <ng-template [itemOf]="sharedVendors()">
        <div class="flex-row gap-sm">
          <div>{{ item.__searchText }}</div>
        </div>
      </ng-template>
    </sd-shared-data-select>
  </ng-template>
</sd-sheet-column>
```

시트 셀 내 사용 시 `[inset]="true" [size]="'sm'"`을 반드시 지정한다.

## `SdSharedDataSelectButton`

공유 데이터 모달 선택 버튼. `<sd-modal-select-button>`을 컴포지션하여 공유 데이터 항목을 표시한다.

```typescript
@Component({ selector: "sd-shared-data-select-button" })
class SdSharedDataSelectButton<
  TItem extends SharedDataBase<string | number>,
  TMode extends keyof SelectModeValue<string | number>,
  TModal extends SdSelectModal<any>
> {
  value = model<SelectModeValue<string | number>[TMode]>();
  items = input<TItem[]>([]);
  modal = input.required<SdSelectModalInfo<TModal>>();
  selectMode = input<TMode>("single" as TMode);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
}
```

### Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `value` | model | `SelectModeValue<string \| number>[TMode]` | - | 선택된 값 (two-way) |
| `items` | input | `TItem[]` | `[]` | 공유 데이터 항목 |
| `modal` | input (required) | `SdSelectModalInfo<TModal>` | - | 모달 정보 |
| `selectMode` | input | `TMode` | `"single"` | 선택 모드 |
| `disabled` | input | `boolean` | `false` | 비활성화 |
| `required` | input | `boolean` | `false` | 필수 |

## `SdSharedDataSelectList`

공유 데이터 목록형 선택 컴포넌트. 검색, 페이지네이션, 외부 링크 기능을 포함한다.

```typescript
@Component({ selector: "sd-shared-data-select-list" })
class SdSharedDataSelectList<
  TItem extends SharedDataBase<string | number>,
  TModal extends SdSelectModal<any>
> {
  selectedItem = model<TItem>();
  canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(() => true);
  items = input.required<TItem[]>();
  selectedIcon = input<string>();
  useUndefined = input(false, { transform: booleanAttribute });
  filterFn = input<(item: TItem, index: number) => boolean>();
  modal = input<SdSelectModalInfo<TModal>>();
  header = input<string>();
  pageItemCount = input<number>();
}
```

### Members

| Member | Kind | Type | Default | Description |
|--------|------|------|---------|-------------|
| `selectedItem` | model | `TItem \| undefined` | - | 선택된 항목 (two-way) |
| `canChangeFn` | input | `(item) => boolean \| Promise<boolean>` | `() => true` | 선택 변경 가능 여부 함수 |
| `items` | input (required) | `TItem[]` | - | 공유 데이터 항목 |
| `selectedIcon` | input | `string \| undefined` | `undefined` | 선택됨 아이콘 |
| `useUndefined` | input | `boolean` | `false` | undefined 항목 포함 |
| `filterFn` | input | `((item, index) => boolean) \| undefined` | `undefined` | 필터 함수 |
| `modal` | input | `SdSelectModalInfo<TModal> \| undefined` | `undefined` | 모달 선택 정보 |
| `header` | input | `string \| undefined` | `undefined` | 헤더 텍스트 |
| `pageItemCount` | input | `number \| undefined` | `undefined` | 페이지당 항목 수 |

Content children: `#headerTpl`, `#filterTpl`, `SdItemOfTemplate`, `#undefinedTpl`

## `matchesSearchText`

공백 구분 AND 조건 텍스트 검색 매칭 함수.

```typescript
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean
```

모든 검색어(공백으로 분할)가 `itemText`에 포함되면 `true`. `searchQuery`가 undefined이거나 빈 문자열이면 항상 `true`.
