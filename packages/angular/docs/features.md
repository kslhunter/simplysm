# Features

## `SdAddressSearchModal`

Daum Postcode API를 사용한 주소 검색 모달. `SdModalContentDef<Address>`를 구현한다.

```typescript
@Component({ selector: "sd-address-search-modal" })
class SdAddressSearchModal implements SdModalContentDef<Address>, OnInit {
  close = output<Address>();
  initialized = signal(false);
}
```

### `Address`

```typescript
interface Address {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postNumber` | `string \| undefined` | 우편번호 |
| `address` | `string \| undefined` | 주소 |
| `buildingName` | `string \| undefined` | 건물명 |

## `SdPermissionTable`

권한 매트릭스 테이블. `SdPermission` 트리를 테이블로 렌더링하여 use/edit 체크박스를 표시한다.

```typescript
@Component({ selector: "sd-permission-table" })
class SdPermissionTable<TModule = unknown> {
  value = model<Record<string, boolean>>({});
  items = input<SdPermission<TModule>[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `Record<string, boolean>` | `{}` | 권한 레코드 (two-way). 키는 `codeChain.join(".") + ".use"` 또는 `".edit"` 형태 |
| `items` | `SdPermission<TModule>[]` | `[]` | 권한 트리 |
| `disabled` | `boolean` | `false` | 비활성화 |

## Data View Composition (Recipes)

CRUD 리스트(시트) · 상세 폼 · 모달 선택 버튼은 추상 클래스 대신 **레시피 기반 직접 조립** 방식을 사용한다. `<sd-sheet>` + `<sd-form>` · `<sd-modal-select-button>` 등 표준 컴포넌트를 화면 코드가 직접 결합한다. 조립 레시피:

- 리스트(시트): [recipes/crud-list.md](./recipes/crud-list.md)
- 상세: [recipes/crud-detail.md](./recipes/crud-detail.md)
- 선택 버튼: [recipes/data-select-button.md](./recipes/data-select-button.md)
- 페이지/모달 컨테이너: [recipes/page-modal-container.md](./recipes/page-modal-container.md)

## Shared Data Controls

### `SdSharedDataSelect`

공유 데이터 드롭다운 선택 컴포넌트. 검색 기능 포함.

```typescript
@Component({ selector: "sd-shared-data-select" })
class SdSharedDataSelect<TItem extends SharedDataBase<string | number>, TMode extends keyof SelectModeValue<...>, TModal extends SdSelectModal<any>> {
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

### `SdSharedDataSelectButton`

공유 데이터 모달 선택 버튼. `<sd-modal-select-button>`을 컴포지션하여 공유 데이터 항목을 표시한다. `value` 또는 `items` 변경 시 내부에서 `items.filter(by __valueKey)`로 표시 항목이 자동 동기화된다.

```typescript
@Component({ selector: "sd-shared-data-select-button" })
class SdSharedDataSelectButton<TItem extends SharedDataBase<string | number>, TMode extends keyof SelectModeValue<string | number>, TModal extends SdSelectModal<any>> {
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

상세 사용 예시: [recipes/data-select-button.md](./recipes/data-select-button.md) "패턴 2" 섹션.

### `SdSharedDataSelectList`

공유 데이터 목록형 선택 컴포넌트. 검색, 페이지네이션, 외부 링크 기능을 포함한다.

```typescript
@Component({ selector: "sd-shared-data-select-list" })
class SdSharedDataSelectList<TItem extends SharedDataBase<string | number>, TModal extends SdSelectModal<any>> {
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

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `selectedItem` | `TItem \| undefined` | - | 선택된 항목 (two-way) |
| `canChangeFn` | `(item) => boolean \| Promise<boolean>` | `() => true` | 선택 변경 가능 여부 함수 |
| `items` | `TItem[]` | required | 공유 데이터 항목 |
| `selectedIcon` | `string \| undefined` | `undefined` | 선택됨 아이콘 |
| `useUndefined` | `boolean` | `false` | undefined 항목 포함 |
| `filterFn` | `((item, index) => boolean) \| undefined` | `undefined` | 필터 함수 |
| `modal` | `SdSelectModalInfo<TModal> \| undefined` | `undefined` | 모달 선택 정보 |
| `header` | `string \| undefined` | `undefined` | 헤더 텍스트 |
| `pageItemCount` | `number \| undefined` | `undefined` | 페이지당 항목 수 |

Content children:
- `#headerTpl`: 헤더 커스텀 템플릿
- `#filterTpl`: 필터 커스텀 템플릿
- `SdItemOfTemplate`: 항목 커스텀 템플릿
- `#undefinedTpl`: undefined 항목 커스텀 템플릿

### `matchesSearchText`

공백 구분 AND 조건 텍스트 검색 매칭 함수.

```typescript
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean
```

모든 검색어(공백으로 분할)가 `itemText`에 포함되면 `true`. `searchQuery`가 undefined이거나 빈 문자열이면 항상 `true`.

## `getOrmDataEditToastErrorMessage`

ORM 편집 에러 메시지를 사용자 친화적인 한국어 메시지로 변환한다. FK 제약 위반 등 DB 에러 메시지를 감지하여 적절한 메시지를 반환한다.

```typescript
function getOrmDataEditToastErrorMessage(err: unknown): string
```

| 감지 조건 | 반환 메시지 |
|-----------|-------------|
| FK 제약 위반 (`a parent row: a foreign key constraint` 또는 `conflicted with the REFERENCE`) | `"경고! 연결된 작업에 의한 처리 거부. 후속작업 확인 요망"` |
| 그 외 | `err.message` (또는 `String(err)`) |

`recipes/crud-list.md` · `recipes/crud-detail.md` 레시피에서 `sdToast.try(fn, getOrmDataEditToastErrorMessage)` 패턴으로 사용된다. 소비 코드에서도 직접 호출 가능.
