# Features

## `SdBaseContainer`

페이지/모달/뷰 공통 레이아웃 컨테이너. `currViewType()`에 따라 page(topbar 포함), modal(bottom 슬롯 포함), control(raw content) 중 하나를 렌더링한다.

```typescript
@Component({ selector: "sd-base-container" })
class SdBaseContainer {
  contentTplRef = contentChild.required("contentTpl", { read: TemplateRef });
  pageTopbarTplRef = contentChild("pageTopbarTpl", { read: TemplateRef });
  modalBottomTplRef = contentChild("modalBottomTpl", { read: TemplateRef });

  viewType = input<SdViewType>();
  currViewType: Signal<SdViewType>; // viewType ?? parentViewType
  header = input<string>();
  modalOrPageTitle: Signal<string>; // header ?? 모달 타이틀 ?? 앱 구조 타이틀

  initialized = input<boolean | undefined>(undefined);
  restricted = input(false, { transform: booleanAttribute });
  busy = input(false, { transform: booleanAttribute });
  busyMessage = input<string>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `viewType` | `SdViewType \| undefined` | `undefined` | 뷰 타입 오버라이드 |
| `header` | `string \| undefined` | `undefined` | 헤더 타이틀 오버라이드 |
| `initialized` | `boolean \| undefined` | `undefined` | `false`면 컨텐츠 숨김, `undefined`면 표시 |
| `restricted` | `boolean` | `false` | `true`면 권한 없음 메시지 표시 |
| `busy` | `boolean` | `false` | busy 상태 |
| `busyMessage` | `string \| undefined` | `undefined` | busy 메시지 |

Content children:
- `#contentTpl` (required): 메인 컨텐츠 템플릿
- `#pageTopbarTpl`: 페이지 모드에서 탑바에 추가할 템플릿
- `#modalBottomTpl`: 모달 모드에서 하단에 추가할 템플릿

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
class SdPermissionTable {
  permissions = input.required<SdPermission[]>();
  permRecord = model<Record<string, boolean>>({});
  disabled = input(false, { transform: booleanAttribute });
}
```

## Data View Abstractions

### `SdDataSheetBase`

데이터 시트 CRUD 추상 클래스. 소비 프로젝트에서 상속하여 구현한다. `SdSelectModal<TItem>`을 구현하므로 모달 선택에도 사용 가능.

```typescript
@Directive()
abstract class SdDataSheetBase<
  TFilter extends Record<string, any>,
  TItem,
  TKey extends string | number | undefined,
> implements SdSelectModal<TItem> {
  // 필수 구현
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract editMode: "inline" | "modal" | undefined;
  abstract selectMode: InputSignal<"single" | "multi" | undefined>;
  abstract bindFilter(): TFilter;
  abstract itemPropInfo: SdDataSheetItemPropInfo<TItem>;
  abstract getItemInfoFn: (item: TItem) => SdDataSheetItemInfo<TKey>;
  abstract search(usePagination: boolean): Promise<SdDataSheetSearchResult<TItem>> | SdDataSheetSearchResult<TItem>;

  // 선택적 구현
  hideTool?: Signal<boolean>;
  diffsExcludes?: string[];
  prepareRefreshEffect?(): void;
  editItem?(item?: TItem): Promise<boolean | undefined> | boolean | undefined;
  toggleDeleteItems?(del: boolean): Promise<boolean>;
  submitItems?(diffs: ArrayOneWayDiffResult<TItem>): Promise<boolean>;
  excelDownload?(items: TItem[]): Promise<void>;
  excelUpload?(): Promise<TItem[]>;
}
```

### `SdDataSheet`

데이터 시트 presentation 컴포넌트. `SdDataSheetBase`의 상속자를 부모로 자동 감지하여 렌더링한다.

```typescript
@Component({ selector: "sd-data-sheet" })
class SdDataSheet { }
```

### `SdDataSheetColumn`

데이터 시트 컬럼. `SdSheetColumn`를 확장하여 `edit` input을 추가한다.

```typescript
@Directive({ selector: "sd-data-sheet-column" })
class SdDataSheetColumn extends SdSheetColumn {
  edit = input(false, { transform: booleanAttribute });
}
```

### `SdDataSheetItemPropInfo`

```typescript
interface SdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;
  lastModifiedAt: (keyof I & string) | undefined;
  lastModifiedBy: (keyof I & string) | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isDeleted` | `keyof I \| undefined` | 삭제 여부 프로퍼티 키 |
| `lastModifiedAt` | `keyof I \| undefined` | 최종 수정일시 프로퍼티 키 |
| `lastModifiedBy` | `keyof I \| undefined` | 최종 수정자 프로퍼티 키 |

### `SdDataSheetItemInfo`

```typescript
interface SdDataSheetItemInfo<K> {
  key: K;
  canSelect: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `K` | 항목 키 |
| `canSelect` | `boolean` | 선택 가능 여부 |
| `canEdit` | `boolean` | 편집 가능 여부 |
| `canDelete` | `boolean` | 삭제 가능 여부 |

### `SdDataSheetSearchResult`

```typescript
interface SdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `I[]` | 조회된 항목 |
| `pageLength` | `number \| undefined` | 총 페이지 수 |
| `summary` | `Partial<I> \| undefined` | 요약 행 데이터 |

### `SdDataDetailBase`

상세 폼 추상 클래스. 모달로 표시되며, `SdModalContentDef<R>`을 구현한다.

```typescript
@Directive()
abstract class SdDataDetailBase<T extends object, R = boolean> implements SdModalContentDef<R> {
  // 필수 구현
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract load(): Promise<{ data: T; info: SdDataDetailDataInfo }> | { data: T; info: SdDataDetailDataInfo };

  // 선택적 구현
  canDelete?: Signal<boolean>;
  prepareRefreshEffect?(): void;
  toggleDelete?(del: boolean): Promise<R | undefined> | R | undefined;
  submit?(data: T): Promise<R | undefined> | R | undefined;
}
```

### `SdDataDetail`

상세 폼 presentation 컴포넌트.

```typescript
@Component({ selector: "sd-data-detail" })
class SdDataDetail { }
```

### `SdDataDetailDataInfo`

```typescript
interface SdDataDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isNew` | `boolean` | 신규 여부 |
| `isDeleted` | `boolean` | 삭제 여부 |
| `lastModifiedAt` | `DateTime \| undefined` | 최종 수정일시 |
| `lastModifiedBy` | `string \| undefined` | 최종 수정자 |

### `SdDataSelectButtonBase`

모달 기반 선택 버튼 추상 클래스.

```typescript
@Directive()
abstract class SdDataSelectButtonBase<TItem extends object, TKey, TMode extends keyof SelectModeValue<TKey>> {
  abstract modal: Signal<SdSelectModalInfo<SdSelectModal<any>>>;
  abstract load(keys: TKey[]): Promise<TItem[]> | TItem[];

  value = model<SelectModeValue<TKey>[TMode]>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<TMode>("single" as TMode);
}
```

### `SdDataSelectButton`

선택 버튼 presentation 컴포넌트.

```typescript
@Component({ selector: "sd-data-select-button" })
class SdDataSelectButton { }
```

## Shared Data Controls

### `SdSharedDataSelect`

공유 데이터 드롭다운 선택 컴포넌트. 검색 기능 포함.

```typescript
@Component({ selector: "sd-shared-data-select" })
class SdSharedDataSelect<TItem extends SharedDataBase<string | number>, TMode extends keyof SelectModeValue<...>> {
  items = input.required<TItem[]>();
  value = model<SelectModeValue<...>[TMode]>();
  selectMode = input<TMode>("single" as TMode);
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  // 기타 옵션...
}
```

### `SdSharedDataSelectButton`

공유 데이터 모달 선택 버튼. `SdDataSelectButton`을 래핑하여 공유 데이터 항목을 표시한다.

```typescript
@Component({ selector: "sd-shared-data-select-button" })
class SdSharedDataSelectButton<TItem extends SharedDataBase<...>, TMode extends keyof SelectModeValue<...>> { }
```

### `SdSharedDataSelectList`

공유 데이터 목록형 선택 컴포넌트. 검색, 페이지네이션, 외부 링크 기능을 포함한다.

```typescript
@Component({ selector: "sd-shared-data-select-list" })
class SdSharedDataSelectList<TItem extends SharedDataBase<...>> {
  items = input.required<TItem[]>();
  value = model<(string | number)[]>();
  disabled = input(false, { transform: booleanAttribute });
  pageLength = input(30);
  // 기타 옵션...
}
```

### `matchesSearchText`

공백 구분 AND 조건 텍스트 검색 매칭 함수.

```typescript
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean
```

모든 검색어(공백으로 분할)가 `itemText`에 포함되면 `true`. `searchQuery`가 undefined이거나 빈 문자열이면 항상 `true`.
