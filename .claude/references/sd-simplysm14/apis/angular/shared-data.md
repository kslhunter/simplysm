# @simplysm/angular — 공유 데이터(shared-data)

서버 마스터데이터(코드·분류 등)를 클라이언트에 캐시하고 서버 변경 이벤트로 동기화하며, 선택 UI 로 노출. `SdSharedDataProvider` 를 상속해 데이터셋을 등록하고, 선택 컨트롤(select/select-button/select-list)이 그 핸들의 items 를 소비.

## SdSharedDataProvider

`abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<...>>>` — 공유 데이터 등록·로드·동기화 추상 프로바이더. 앱별로 상속해 `initialize()` 에서 `register` 호출.

- `loadingCount: WritableSignal<number>` — 로딩 중 데이터 수.
- `abstract initialize(): void` — 앱이 구현. 보통 여러 `register` 호출.
- `register<K>(name, info: SharedDataInfo<T[K]>)` — 데이터셋 등록(재호출 시 갱신·리스너 재설정).
- `getHandle<K>(name): SharedDataHandle<T[K]>` — 핸들 반환. 최초 접근 시 lazy 로드·이벤트 리스너 등록. 미등록이면 throw.
- `emitAsync<K>(name, changeKeys?)` — 변경 이벤트 발행. `changeKeys` 없으면 전체 리로드 신호, 있으면 해당 키만 부분 갱신.
- `wait(): Promise<void>` — `loadingCount<=0` 까지 대기(CRUD 기반 컨테이너가 초기 로드 동기화에 사용).

타입:
- `SharedDataBase<TKey>` — 공유 항목 기본형. `__valueKey`(고유키), `__searchText`(검색대상), `__isHidden`(숨김), `__parentKey?`(트리 부모키).
- `SharedDataInfo<T>` — 등록 정보. `serviceKey`(서비스 클라이언트 키), `getter: (changeKeys?) => Promise<T[]>`(전체/부분 로더), `filter?`(이벤트 필터), `orderBy?`(부분 갱신 후 정렬 키).
- `SharedDataHandle<T>` — `{ items: Signal<T[]>; get(key) => T | undefined }`.
- `SdSharedDataChangeEvent` — 변경 동기화에 쓰는 `defineEvent` 정의(서버↔클라이언트).

## SdSharedDataSelect

`<sd-shared-data-select>` — 공유데이터 드롭다운 선택(검색·트리·모달 연계). 제네릭 `<TItem, TMode, TModal>`.

- `value = model<...>()` — 선택 키(single=단일, multi=배열). 값 타입은 `TItem["__valueKey"] | undefined`.
- `items = input.required<TItem[]>()` — 공유 항목 배열(핸들의 items).
- `selectMode: TMode("single"|"multi")` — 선택 모드. 기본 `"single"`.
- `disabled`/`required`/`inset`/`inline`/`size` — 공통.
- `useUndefined` — multi 에서도 "미지정" 항목 노출.
- `filterFn?: (item, index, ...params) => boolean` / `filterFnParams?: any[]` — 추가 필터.
- `modal?: SdSelectModalInfo<TModal>` — 검색 아이콘 → 선택 모달.
- `editModal?: SdModalInfo<SdModalContentDef<boolean>>` — 편집 아이콘 → 편집 모달.
- `selectClass`/`multiSelectionDisplayDirection: "vertical"` — 표시 옵션.
- `getIsHiddenFn?: (item, index) => boolean` — 숨김 판정(기본 `__isHidden`, 숨김 항목은 취소선).
- `getSearchTextFn?: (item, index) => string` — 검색 대상 텍스트(기본 `__searchText`).
- `displayOrderByFn?: (item) => 정렬키` — 표시 정렬.
- 항목 템플릿은 `<ng-template [itemOf]>`, 미지정 표시는 `#undefinedTpl`. `__parentKey` 있으면 트리.

## SdSharedDataSelectButton

`<sd-shared-data-select-button>` — 모달 선택 버튼 + 선택값 인라인 표시. 제네릭 `<TItem, TMode, TModal>`.

- `value = model<...>()` — 선택 키(single/multi).
- `items = input<TItem[]>([])` — 표시 라벨 조회용 전체 항목.
- `modal = input.required<SdSelectModalInfo<TModal>>()` — 선택 모달.
- `selectMode: TMode` — 기본 `"single"`.
- `disabled`/`required`/`inset`/`size` — 공통.
- 선택 항목 라벨은 `<ng-template [itemOf]>`(required)로 렌더.

## SdSharedDataSelectList

`<sd-shared-data-select-list>` — 검색·페이징되는 리스트형 단일 선택(패널 영역용). 제네릭 `<TItem, TModal>`.

- `selectedItem = model<TItem>()` — 선택 항목(객체). `canChangeFn?: (item) => boolean|Promise<boolean>` 로 변경 차단.
- `items = input.required<TItem[]>()` — 항목 배열. `__isHidden` 항목은 제외.
- `selectedIcon?` — 선택 표시 아이콘.
- `useUndefined` — "미지정" 항목 표시.
- `filterFn?: (item, index) => boolean` — 추가 필터.
- `modal?: SdSelectModalInfo<TModal>` — 외부 검색 모달 버튼.
- `header?` — 패널 헤더 텍스트.
- `pageItemCount?` — 페이지당 항목 수(지정 시 페이지네이션).
- 슬롯: `#headerTpl`/`#filterTpl`(기본 검색 textfield 대체)/`[itemOf]` 항목/`#undefinedTpl`.

## matchesSearchText

`matchesSearchText(itemText: string, searchQuery: string | undefined): boolean` — 공백 분리 AND 부분일치 검색 매처(소문자 비교). 위 선택 컨트롤이 검색에 사용.

- `itemText` — 항목의 검색 대상 텍스트.
- `searchQuery` — 검색어. 빈/`undefined` 면 모두 매치(true). 각 단어가 모두 포함돼야 매치.
