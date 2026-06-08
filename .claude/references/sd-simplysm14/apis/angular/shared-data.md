# @simplysm/angular — 공유 마스터 데이터

고객사·품목 등 자주 참조하는 마스터 데이터를 한 번 등록해 어느 화면에서든 공유 시그널로 쓰고, 그 데이터를 선택하는 드롭다운/버튼/리스트 컨트롤을 제공하는 군. 등록·항목 추가 절차는 [client-shared-data.md](../manuals/client-shared-data.md) 참조.

## SdSharedDataProvider

```ts
@Injectable() abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string|number>>> {
  loadingCount: WritableSignal<number>;
  abstract initialize(): void;
  register<K>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K>(name: K): SharedDataHandle<T[K]>;
  emitAsync<K>(name: K, changeKeys?: (string|number)[]): Promise<void>;
  wait(): Promise<void>;
}
```

- 추상 클래스 — 앱에서 상속(`AppSharedDataProvider`)해 `initialize()` 안에서 `register`. `T` 는 이름→항목타입 매핑.
- `register(name, info)` — 마스터 데이터 등록. 재등록 시 이전 리스너 정리 + generation 증가로 이전 이벤트 무시 후 재로드.
- `getHandle(name)` — 핸들 반환(첫 접근 시 lazy 로드 + 변경 이벤트 리스너 등록). 미등록이면 throw.
- `emitAsync(name, changeKeys?)` — 변경 통지 이벤트 발생. `changeKeys` 지정 시 해당 키만 부분 갱신, 미지정 시 전체 리로드. CRUD 저장/삭제 후 호출해 다른 화면을 동기화.
- `wait()` — 진행 중인 로드(`loadingCount`)가 끝날 때까지 대기. `sd-base-container` 의 ready 게이트가 사용.

### 관련 타입

```ts
SharedDataBase<TKey> { __valueKey: TKey; __searchText: string; __isHidden: boolean; __parentKey?: TKey }
SharedDataInfo<T> { serviceKey: string; getter: (changeKeys?) => Promise<T[]>; filter?; orderBy?: (item) => ...|undefined }
SharedDataHandle<T> { items: Signal<T[]>; get(key): T | undefined }
SdSharedDataChangeEvent // defineEvent — 변경 통지 이벤트 정의
```

- `SharedDataBase` — 모든 공유 항목이 가져야 할 매직 필드: `__valueKey`(키), `__searchText`(검색 텍스트), `__isHidden`(숨김 여부), `__parentKey`(트리 부모, 선택).
- `SharedDataInfo.getter(changeKeys)` — DB 조회 함수. changeKeys 주어지면 그 키만 재조회(incremental refresh). `orderBy` 는 정렬 키 반환. `SharedDataHandle.get(key)` 로 단건 O(1) 조회.

```ts
sharedProducts = useSharedSignal("품목"); // 앱 헬퍼
// sharedProducts.items() / sharedProducts.get(id)
```

## 선택 컨트롤

### SdSharedDataSelect — `<sd-shared-data-select>`

```ts
value = model<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>();
items = input.required<TItem[]>();
disabled; required; useUndefined; inset; inline;
size = input<"sm"|"lg">(); selectMode = input<TMode>("single"); // "single" | "multi"
filterFn = input<(item, index, ...params) => boolean>(); filterFnParams = input<any[]>();
modal = input<SdSelectModalInfo<TModal>>(); editModal = input<SdModalInfo<SdModalContentDef<boolean>>>();
selectClass; multiSelectionDisplayDirection = input<"vertical">();
getIsHiddenFn = input(item => item.__isHidden); getSearchTextFn = input(item => item.__searchText);
displayOrderByFn = input<(item) => ...|undefined>();
// 콘텐츠: [itemOf] 템플릿(항목 렌더), #undefinedTpl(미지정 표시)
```

- 공유데이터 드롭다운 선택. `value` 는 선택된 `__valueKey`(single) 또는 키 배열(multi). `items` 에 `sharedX.items()` 전달.
- `selectMode` — `"single"`/`"multi"`. `useUndefined`=multi 에서 "미지정" 항목 노출, `required=false`+single 이면 미지정 선택 가능. 내부 검색바로 `__searchText` 필터(부모키 트리면 자식 매칭 포함).
- `modal` — 관리·선택 모달(`selectMode:"single"`+현재 키 주입, 결과로 선택 갱신). `editModal` — 관리 전용(선택 변경 없음). 둘 다 `<sd-select-button>` 아이콘으로 노출.
- `filterFn`/`displayOrderByFn` — 표시 필터/정렬. `getIsHiddenFn`/`getSearchTextFn` — 숨김·검색텍스트 추출 커스텀(기본 매직필드). `__parentKey` 있으면 트리(`getChildrenFn` 자동).

```html
<sd-shared-data-select [items]="sharedProducts.items()" [(value)]="productId" [required]="true">
  <ng-template [itemOf]="sharedProducts.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select>
```

### SdSharedDataSelectButton — `<sd-shared-data-select-button>`

```ts
value = model<SelectModeValue<string|number>[TMode]>();
items = input<TItem[]>([]); modal = input.required<SdSelectModalInfo<TModal>>();
selectMode = input<TMode>("single"); disabled; required; inset; size = input<"sm"|"lg">();
itemTplRef = contentChild.required(SdItemOfTemplate); // [itemOf] 템플릿(필수)
```

- 모달로만 선택하는 버튼형(`SdModalSelectButton` 래핑). 선택된 항목을 `[itemOf]` 템플릿으로 표시(multi 면 콤마 구분). 항목이 많아 드롭다운보다 모달 검색이 나을 때.

### SdSharedDataSelectList — `<sd-shared-data-select-list>`

```ts
selectedItem = model<TItem>();
canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(() => true);
items = input.required<TItem[]>(); selectedIcon = input<string>(); useUndefined;
filterFn = input<(item, index) => boolean>(); modal = input<SdSelectModalInfo<TModal>>();
header = input<string>(); pageItemCount = input<number>();
// 콘텐츠: [itemOf](항목) #headerTpl #filterTpl #undefinedTpl
```

- 좌측 선택 목록형(master-detail 의 좌측 패널). `selectedItem` 은 항목 객체(키 아님). `canChangeFn` 으로 선택 전환 가드(미저장 변경 보호), Promise 가능.
- `pageItemCount` 지정 시 페이징. `header`/`#headerTpl`=상단 제목, `#filterTpl`=검색 대체, `modal`=목록 관리 모달. 검색은 `__searchText` 매칭, `__isHidden` 항목 제외.

```html
<sd-shared-data-select-list [items]="sharedRoles.items()" [(selectedItem)]="selectedRole"
  [canChangeFn]="checkCanLeave" [header]="'역할'">
  <ng-template [itemOf]="sharedRoles.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select-list>
```

### matchesSearchText

```ts
matchesSearchText(itemText: string, searchQuery: string | undefined): boolean;
```

- 공백 분리 AND 부분일치(대소문자 무시). 빈 쿼리면 true. 선택 컨트롤이 내부 검색에 사용하며, 커스텀 필터에서 재사용 가능.
