# @simplysm/angular — shared-data

서버 마스터데이터(부서·거래처·코드 등)를 키 기반으로 등록/구독. 서버 변경 이벤트로 자동 부분 갱신.

## SdSharedDataProvider<T> (abstract, 사용자가 상속해 `initialize()` 안에서 `register` 호출)

```ts
abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string|number>>> {
  loadingCount: WritableSignal<number>;
  abstract initialize(): void;
  register<K extends keyof T & string>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K extends keyof T & string>(name: K): SharedDataHandle<T[K]>;
  emitAsync<K extends keyof T & string>(name: K, changeKeys?: (string|number)[]): Promise<void>;
  wait(): Promise<void>;     // loadingCount 가 0 될 때까지
}

interface SharedDataBase<TKey> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
interface SharedDataInfo<T> {
  serviceKey: string;                                    // SdServiceClientFactoryProvider 의 client key
  getter: (changeKeys?: (string|number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (item: T) => any;
}
interface SharedDataHandle<T> {
  items: Signal<T[]>;
  get(key: T["__valueKey"]|undefined): T|undefined;
}

const SdSharedDataChangeEvent = defineEvent<{ name: string; filter: unknown }, (string|number)[]|undefined>("SdSharedDataChange");
```

- `register` — 데이터 소스 등록. `getHandle` 첫 호출 시 `getter()` lazy 로드 + 서버 이벤트 리스너 등록. 이후 `SdSharedDataChangeEvent` 수신 시 `changeKeys` 기준 부분 갱신(또는 undefined 면 전체 reload).
- `getHandle.items` — readonly signal. orderBy 적용된 정렬 상태.
- `getHandle.get(key)` — `__valueKey` 로 O(1) 조회.
- `emitAsync` — 클라이언트에서 변경 발생 시 같은 `serviceKey` 의 다른 클라이언트에 변경 통지(filter 동일한 등록만 수신).
- `wait` — 초기 로드/갱신이 완료될 때까지. CRUD 컨테이너의 ready 처리에 사용.
- `SharedDataBase` 의 `__searchText` — `matchesSearchText` 가 사용할 검색 대상 문자열. `__isHidden` — 보이지 않을 항목 마킹. `__parentKey` — 트리형 데이터의 부모 키.
- `filter` — 서버 측 필터 식별자. 다른 filter 로 등록된 같은 name 은 별개 인스턴스.

```ts
@Injectable({ providedIn: "root" })
class MySharedData extends SdSharedDataProvider<{ depts: Dept }> {
  initialize() {
    this.register("depts", {
      serviceKey: "main",
      getter: async (keys) => await api.depts.list(keys),
      orderBy: (d) => d.name,
    });
  }
}
const depts = mySharedData.getHandle("depts").items();
```

## SdSharedDataSelect — `<sd-shared-data-select>`

```ts
class SdSharedDataSelect<TMode, TModal, TItem extends SharedDataBase<...>>
value = model<SelectModeValue<TItem["__valueKey"]|undefined>[TMode]>();
items = input.required<TItem[]>();
disabled/required/useUndefined/inset/inline = input(false); size = input<"sm"|"lg">();
selectMode = input("single" as TMode);
filterFn = input<(item, index, ...params) => boolean>();
filterFnParams = input<any[]>();
modal = input<SdSelectModalInfo<TModal>>();
editModal = input<SdModalInfo<SdModalContentDef<boolean>>>();
selectClass = input<string>();
multiSelectionDisplayDirection = input<"vertical">();
getIsHiddenFn = input<(item, index) => boolean>(...);    // 기본 (i)=>i.__isHidden
getSearchTextFn = input<(item, index) => string>(...);   // 기본 (i)=>i.__searchText
displayOrderKeyProp = input<string>();
```

- 공유데이터 전용 셀렉트. `items` 는 보통 `sharedData.getHandle("xx").items()`.
- `useUndefined` — true 면 "선택 안 함" 옵션 노출. 단일 모드에서 null 가능.
- `filterFn` + `filterFnParams` — 추가 필터(signal 변경 시 재계산).
- `modal` — "더보기" 검색 모달. 미지정 시 모달 버튼 안 보임.
- `editModal` — 항목 편집 모달(연필 아이콘). true emit 시 데이터 reload.
- `getIsHiddenFn`/`getSearchTextFn` — 기본은 `SharedDataBase` 의 `__isHidden`/`__searchText` 사용. 커스텀 가능.
- `displayOrderKeyProp` — 트리 표시 시 정렬에 쓸 prop 이름.

## SdSharedDataSelectButton — `<sd-shared-data-select-button>`

```ts
value = model<SelectModeValue<string|number>[TMode]>();
items = input<TItem[]>([]);
modal = input.required<SdSelectModalInfo<TModal>>();
selectMode = input<TMode>("single" as TMode);
disabled/required/inset = input(false); size = input<"sm"|"lg">();
```

- 셀렉트 드롭다운 대신 항상 모달로 검색. `<ng-content>` 가 선택값 표시 슬롯. `modal` 필수.

## SdSharedDataSelectList — `<sd-shared-data-select-list>`

```ts
class SdSharedDataSelectList<TItem extends SharedDataBase<...>, TModal>
selectedItem = model<TItem>();
canChangeFn = input<(item: TItem|undefined) => boolean|Promise<boolean>>(...);
items = input.required<TItem[]>();
selectedIcon = input<string>();
useUndefined = input(false);
filterFn = input<(item, index) => boolean>();
modal = input<SdSelectModalInfo<TModal>>();
header = input<string>();
pageItemCount = input<number>();
```

- 사이드 패널형 리스트(단일 선택). 검색 박스 + 페이지네이션 자동.
- `canChangeFn` — 변경 직전 비동기 확인.
- `pageItemCount` — 페이지당 항목 수. 미지정 시 페이지 분할 없음.

## matchesSearchText

```ts
function matchesSearchText(itemText: string, searchQuery: string|undefined): boolean
```

- 공백 분리 AND 검색. 모든 단어가 `itemText` (대소문자 무시) 안에 포함되면 true. 빈 query 는 true.
- 커스텀 선택 리스트에서 검색 필터 짤 때 사용.

```ts
items.filter((it) => matchesSearchText(it.name + " " + it.code, q()))
```

## 주의

- `SdSharedDataProvider` 상속 후 `initialize()` 안에서만 `register`. 부트스트랩 시 1회 호출.
- 같은 name 으로 다시 `register` 호출 시 generation 증가 + listener 교체 → 이전 비동기 결과는 무시.
- 변경 이벤트는 같은 `serviceKey` 의 같은 `name`·동일 `filter` 등록만 수신.
