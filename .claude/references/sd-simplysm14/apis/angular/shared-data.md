# @simplysm/angular — 공유 마스터 데이터 + 선택 컨트롤

고객사·품목 등 자주 참조하는 마스터 데이터를 한 번 등록해 어느 화면에서든 공유 signal 로 쓰고, 그 데이터를 선택하는 드롭다운/버튼/리스트 컨트롤을 제공하는 군. 등록·항목 추가 절차는 `client-shared-data.md` 참조.

## SdSharedDataProvider<T> (abstract)

마스터 데이터를 이름별로 등록·로드·이벤트 동기화하는 root provider. 앱은 이걸 상속한 `AppSharedDataProvider` 를 만들고 `useSharedSignal` 헬퍼를 함께 export(client-shared-data.md).

- `abstract initialize(): void` — 여기서 `register(name, info)` 로 항목 등록(앱이 구현).
- `register<K>(name: K, info: SharedDataInfo<T[K]>): void` — 항목 등록. 재호출 시 기존 리스너 정리 + generation 증가로 이전 결과 무시 후 재로드.
- `getHandle<K>(name: K): SharedDataHandle<T[K]>` — 항목 핸들 반환(첫 접근 시 lazy 로드 + 변경 이벤트 리스너 등록). 미등록 이름이면 throw. `useSharedSignal` 이 이걸 감쌈.
- `emitAsync<K>(name: K, changeKeys?: (string|number)[]): Promise<void>` — 변경 브로드캐스트. `changeKeys` 주면 해당 키만 부분 갱신, 없으면 전체 리로드(다른 클라이언트 포함).
- `wait(): Promise<void>` — 진행 중 로드가 끝날 때까지 대기. `sd-base-container` 가 ready 전에 호출.
- `loadingCount: WritableSignal<number>` — 진행 중 로드 수.

### 타입

- `SharedDataBase<TKey extends string|number>` — 모든 공유 항목이 상속할 베이스. 매직 필드: `__valueKey: TKey`(항목 키), `__searchText: string`(검색용 텍스트), `__isHidden: boolean`(숨김), `__parentKey?: TKey`(트리 부모). getter 의 select 결과에 빠짐없이 포함.
- `SharedDataInfo<T>` — 등록 정보. `serviceKey: string`(이벤트 채널), `getter: (changeKeys?) => Promise<T[]>`(조회; changeKeys 주면 부분), `filter?: unknown`(이벤트 필터 매칭), `orderBy?: (item) => string|number|DateOnly|DateTime|Time|undefined`(정렬 키).
- `SharedDataHandle<T>` — `{ items: Signal<T[]>; get(key): T | undefined }`. 화면이 `useSharedSignal(name)` 으로 받아 `.items()`·`.get(id)` 사용.
- `SdSharedDataChangeEvent` — 변경 동기화에 쓰이는 `defineEvent`. payload `{ name; filter }`, data `(string|number)[] | undefined`.

사용(화면): `sharedCustomers = useSharedSignal("고객사"); sharedCustomers.items(); sharedCustomers.get(id)`.

## 선택 컨트롤

공유 데이터(또는 `SharedDataBase` 호환 배열)를 항목으로 받아 선택. 매직 필드(`__searchText`/`__isHidden`/`__parentKey`)를 자동 활용(검색·숨김·트리).

### SdSharedDataSelect (`sd-shared-data-select`)

드롭다운 셀렉트(검색창·트리·미지정 항목·모달 연동 내장).

- `value: model<...>` — 선택 키(single) 또는 키 배열(multi). 미지정은 `undefined`.
- `items: input.required<TItem[]>` — 공유 항목 배열(`SharedDataBase` 상속).
- `selectMode: "single"|"multi"` — 선택 모드(기본 single).
- `required: boolean` — 빈 값이면 invalid.
- `useUndefined: boolean` — multi 에서도 "미지정" 항목 노출(single 은 required 아니면 자동 노출).
- `filterFn: (item, index, ...params) => boolean` + `filterFnParams: any[]` — 표시 항목 필터.
- `getIsHiddenFn: (item, index) => boolean` — 숨김 판정(기본 `__isHidden`; 숨김 항목은 취소선 + 검색 시에만 표시).
- `getSearchTextFn: (item, index) => string` — 검색 대상 텍스트(기본 `__searchText`).
- `displayOrderByFn: (item) => ...` — 표시 정렬 키.
- `modal: SdSelectModalInfo<TModal>` — 검색 버튼으로 띄울 선택 모달. `editModal: SdModalInfo<...>` — 편집 버튼 모달.
- `multiSelectionDisplayDirection: "vertical"` — multi 표시 세로 나열.
- `disabled`/`inset`/`inline`/`size`/`selectClass` — 공통/스타일.
- 항목 템플릿: `<ng-template [itemOf]="items()" let-item="item">`, 미지정 표시 `#undefinedTpl`.
- 사용: `<sd-shared-data-select [items]="sharedCustomers.items()" [(value)]="data().customerId"><ng-template [itemOf]="sharedCustomers.items()" let-item="item">{{ item.name }}</ng-template></sd-shared-data-select>`.

### SdSharedDataSelectButton (`sd-shared-data-select-button`)

값 표시 + 모달 검색 버튼(드롭다운 없이 모달 전용). 항목 수가 많아 드롭다운이 부적합할 때.

- `value: model<...>` — 선택 키/키배열.
- `items: TItem[]` — 표시명 매핑용 항목 배열.
- `modal: input.required<SdSelectModalInfo<TModal>>` — 띄울 선택 모달.
- `selectMode: "single"|"multi"` / `disabled` / `required` / `inset` / `size` — 공통.
- 선택 항목 표시 템플릿: `<ng-template [itemOf]>`(필수).

### SdSharedDataSelectList (`sd-shared-data-select-list`)

검색창 + 리스트로 단건 선택(좌측 마스터 리스트 패널 등). `flex-column fill`.

- `selectedItem: model<TItem>` — 선택된 항목(키 아닌 항목 객체). `canChangeFn: (item|undefined) => boolean|Promise<boolean>` — 변경 가드.
- `items: input.required<TItem[]>` — 항목 배열(`__isHidden` 항목 자동 제외).
- `useUndefined: boolean` — "미지정" 항목 노출.
- `filterFn: (item, index) => boolean` — 추가 필터.
- `selectedIcon: string` — 선택 표시 아이콘.
- `pageItemCount: number` — 페이지당 항목 수(지정 시 페이지네이션).
- `modal: SdSelectModalInfo<TModal>` — 우상단 외부 링크로 띄울 모달.
- `header: string` — 상단 헤더 텍스트.
- 템플릿: `#headerTpl`(헤더 우측), `#filterTpl`(검색창 대체), `<ng-template [itemOf]>`(항목), `#undefinedTpl`(미지정).

## matchesSearchText

- `function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean` — 공백 구분 다중 검색어 AND 매칭(대소문자 무시). 빈 쿼리면 true. 위 선택 컨트롤들이 내부 검색에 사용. 커스텀 목록에서 동일 검색 동작이 필요할 때 직접 호출.
