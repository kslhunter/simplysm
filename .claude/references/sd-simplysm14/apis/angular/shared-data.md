# @simplysm/angular — 공유 데이터(shared-data)

서버의 마스터 데이터(코드·거래처 등)를 클라이언트 전역에서 캐시·구독하고, 그 데이터를 고른 select/list/button UI 로 노출하는 묶음. 데이터 변경은 서비스 이벤트로 전파되어 자동 갱신됨.

## 데이터 규약 타입

- **SharedDataBase<TKey>** — 공유 데이터 항목의 베이스. `{ __valueKey: TKey; __searchText: string; __isHidden: boolean; __parentKey?: TKey }`. `__searchText` 로 검색, `__isHidden` 으로 목록 숨김, `__parentKey` 있으면 트리 구성. 도메인 타입이 이 인터페이스를 확장.
- **SharedDataInfo<T>** — 등록 정보. `{ serviceKey: string; getter: (changeKeys?) => Promise<T[]>; filter?: unknown; orderBy?: (item) => 비교키 }`. getter 는 전체/부분(changeKeys) 로드, filter 는 이벤트 매칭, orderBy 는 정렬키.
- **SharedDataHandle<T>** — `{ items: Signal<T[]>; get(key): T | undefined }`. 화면에서 데이터 소비 핸들.

## SdSharedDataProvider<T>

`@Injectable()` abstract. 앱별로 상속해 `initialize()` 구현. T 는 `{ name: SharedDataBase 파생 }` 맵.
- loadingCount: WritableSignal<number> — 로딩 중 카운트.
- abstract initialize(): void — 앱 시작 시 각 데이터 register.
- register<K>(name, info: SharedDataInfo<T[K]>) — 데이터 등록(재호출 시 generation 증가로 이전 이벤트 무시·재로드).
- getHandle<K>(name): SharedDataHandle<T[K]> — 핸들 획득(첫 호출 시 lazy 로드 + 이벤트 리스너 등록). 미등록이면 throw.
- emitAsync<K>(name, changeKeys?) — 변경 이벤트 발행(같은 name·filter 구독자 갱신). changeKeys 지정 시 부분 갱신.
- wait(): Promise<void> — loadingCount 가 0 이 될 때까지 대기(화면 진입 전 데이터 준비).

**SdSharedDataChangeEvent** — `defineEvent` 로 정의된 서비스 이벤트(`{ name; filter }`, 페이로드 `(string|number)[] | undefined`). provider 가 내부 사용.

## SdSharedDataSelect<TItem, TMode, TModal>

`<sd-shared-data-select [items]="...">` — 공유 데이터 드롭다운 선택(검색·트리·모달 연동).
- value = model<...>() — 선택값(single=키, multi=키 배열). 키는 `TItem["__valueKey"] | undefined`.
- items: input.required<TItem[]> — 후보(보통 handle.items()).
- selectMode: "single"|"multi"(기본 single).
- disabled/required/inset/inline/size — 컨트롤 공통.
- useUndefined: boolean — multi 에서도 "미지정" 항목 노출.
- filterFn?/filterFnParams? — 후보 필터(item,index,...params).
- modal?: SdSelectModalInfo — 우측 검색 버튼으로 띄울 선택 모달.
- editModal?: SdModalInfo<SdModalContentDef<boolean>> — 편집 버튼으로 띄울 모달.
- selectClass?/multiSelectionDisplayDirection?("vertical").
- getIsHiddenFn?(item,index)/getSearchTextFn?(item,index)/displayOrderByFn?(item) — 기본은 `__isHidden`/`__searchText`/없음. 검색·표시·정렬 재정의.
- (contentChild) `itemOf` 템플릿 — 항목 렌더. `undefinedTpl` 로 "미지정" 표시 커스텀.
- `__parentKey` 있으면 자동 트리(자식은 부모 펼침 시 노출).

## SdSharedDataSelectButton<TItem, TMode, TModal>

`<sd-shared-data-select-button [modal]="...">` — 모달 선택 버튼 + 선택 항목 인라인 표시(`SdModalSelectButton` 래퍼).
- value = model<...>(), items: TItem[](선택값→표시용 매핑), modal: input.required<SdSelectModalInfo>, selectMode(기본 single), disabled/required/inset/size.
- (contentChild) `itemOf` 템플릿 필수 — 선택된 항목 표시.

## SdSharedDataSelectList<TItem, TModal>

`<sd-shared-data-select-list [items]="...">` — 단일 선택 리스트(검색·페이징·모달 연동).
- selectedItem = model<TItem>(), canChangeFn?(item) — 선택 변경 가드.
- items: input.required<TItem[]>, selectedIcon?, useUndefined(미지정 항목), filterFn?(item,index).
- modal? — 우상단 외부창 버튼으로 띄울 선택 모달.
- header?: string — 상단 헤더 텍스트.
- pageItemCount?: number — >0 이면 페이지당 항목 수로 페이징.
- (contentChild) `itemOf`/`headerTpl`/`filterTpl`/`undefinedTpl` 템플릿.

## matchesSearchText

`matchesSearchText(itemText: string, searchQuery: string | undefined): boolean` — 검색어를 공백으로 나눈 모든 토큰이 itemText(소문자)에 포함되면 true(AND 매칭). 빈 검색어면 true. 위 select/list 가 내부 사용하나 커스텀 검색에도 활용 가능.
