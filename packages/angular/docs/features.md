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

## Data View Abstractions

CRUD·선택 워크플로의 보일러플레이트를 제거하는 추상 클래스 3종. 소비 프로젝트는 Base 클래스를 상속하고 컴포넌트 템플릿 루트에 presentation 컴포넌트(`<sd-data-sheet>` / `<sd-data-detail>` / `<sd-data-select-button>`)를 배치한다. presentation 컴포넌트는 `injectParent<…Base<…>>()`로 부모 상속자를 자동 감지하여 렌더링한다.

각 추상화의 상세 스펙(override 체크리스트, Base 노출 signal/메서드, 템플릿 슬롯, 단축키, 합성 패턴, 실전 예시)은 전용 문서를 참조한다.

| 추상화 | Base 클래스 | Presentation | 용도 |
|---|---|---|---|
| 시트 | `SdDataSheetBase<TFilter, TItem, TKey>` | `<sd-data-sheet>` + `<sd-data-sheet-column>` | 목록 + 필터 + 페이지네이션 + 정렬 + CRUD + 엑셀 업·다운로드 + 모달 선택 |
| 상세 | `SdDataSheetBase<T, R>` | `<sd-data-detail>` | 단일 레코드 로딩/저장/삭제 폼 (페이지·모달·컨트롤 뷰) |
| 선택 버튼 | `SdDataSelectButtonBase<TItem, TKey, TMode>` | `<sd-data-select-button>` | 모달 기반 선택 버튼 (키 저장 + 비동기 load로 표시) |

### Cross-reference

- 시트: [features-data-sheet.md](./features-data-sheet.md)
- 상세: [features-data-detail.md](./features-data-detail.md)
- 선택 버튼: [features-data-select-button.md](./features-data-select-button.md)

### 공통 타입

```typescript
interface SdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;
  lastModifiedAt: (keyof I & string) | undefined;
  lastModifiedBy: (keyof I & string) | undefined;
}

interface SdDataSheetItemInfo<K> {
  key: K;
  canSelect: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface SdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}

interface SdDataDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
```

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

공유 데이터 모달 선택 버튼. `SdDataSelectButton`을 래핑하여 공유 데이터 항목을 표시한다.

```typescript
@Component({ selector: "sd-shared-data-select-button" })
class SdSharedDataSelectButton<TItem extends SharedDataBase<...>, TMode extends keyof SelectModeValue<...>, TModal extends SdSelectModal<any>> {
  items = input<TItem[]>([]);
  modal = input.required<SdSelectModalInfo<TModal>>();
}
```

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

`SdDataSheetBase`, `SdDataDetailBase` 내부에서 사용되며, 소비 코드에서 직접 사용할 수도 있다.
