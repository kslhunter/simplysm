# @simplysm/angular — shared-data

서버에서 가져오는 코드성 데이터(부서, 거래처 등)를 키 기반으로 등록/구독, 변경 이벤트로 자동 부분 갱신.

## `SdSharedDataProvider<T>` (abstract)

```typescript
@Injectable({ providedIn: "root" })
class MySharedData extends SdSharedDataProvider<{ depts: DeptDto; vendors: VendorDto }> {
  initialize(): void {
    this.register("depts", {
      serviceKey: "main",
      getter: (changeKeys) => svc.depts.getList(changeKeys),
      orderBy: (it) => it.name,
    });
  }
}
```

- 각 아이템 타입은 `SharedDataBase<TKey>` 확장: `{ __valueKey: TKey, __searchText: string, __isHidden: boolean, __parentKey? }`.
- `register(name, info)` 후 `getHandle(name)` → `SharedDataHandle<T> { items: Signal<T[]>; get(key) }`. 첫 호출 시 lazy load + 이벤트 리스너 등록.
- `emitAsync(name, changeKeys?)` → 다른 클라이언트(또는 자기 자신)에 `SdSharedDataChangeEvent` 발행. `changeKeys` 없으면 전체 리로드, 있으면 해당 키들만 재조회 후 merge (orderBy 재적용).
- `loadingCount = signal(0)`, `wait()` (loadingCount 0까지).
- `SdSharedDataChangeEvent` = `defineEvent<{ name; filter }, (string|number)[] | undefined>("SdSharedDataChange")` — 동일 name+filter 매칭 리스너에 키 발행.

## `<sd-shared-data-select<TItem, TMode, TModal>>`

`SharedDataBase` 항목에서 키를 선택하는 셀렉트. `__isHidden`/`__searchText` 활용.

inputs: `items` (required), `value` (model: 단일/배열 키), `selectMode`, `disabled`, `required`, `useUndefined`, `inset`, `inline`, `size`, `filterFn(item, index, ...params)`, `filterFnParams`, `modal: SdSelectModalInfo<TModal>` (검색 모달), `editModal: SdModalInfo<SdModalContentDef<boolean>>` (신규 등록), `selectClass`, `multiSelectionDisplayDirection: "vertical"`, `getIsHiddenFn` (default `__isHidden`), `getSearchTextFn` (default `__searchText`), `displayOrderKeyProp`.

## `<sd-shared-data-select-button>`

modal 강제(검색 모달 필수). value: 단일/배열 키.

## `<sd-shared-data-select-list>`

list 형태 단일 선택. inputs: `items` (req), `selectedItem` (model), `canChangeFn(item) => boolean | Promise<boolean>`, `selectedIcon`, `useUndefined`, `filterFn`, `modal`, `header`, `pageItemCount`.

## `matchesSearchText(itemText, searchQuery)`

공백 분리 AND 매칭(lowercase). 빈 쿼리는 true.
