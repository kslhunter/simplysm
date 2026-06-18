# @simplysm/sd-angular — features (CRUD 화면·공유데이터 선택·권한표·주소·기반 컨테이너)

업무 화면 조립용 고수준 컨트롤. 목록·상세 CRUD 화면은 `Abs*` 추상 클래스를 상속하고 `sd-data-sheet`/`sd-data-detail` 컨트롤을 템플릿에 두는 패턴. 공유데이터 선택, 권한표, 주소검색 모달, 화면 공통 컨테이너 포함.

## 기반 컨테이너

### `sd-base-container` (SdBaseContainerControl)
페이지/모달/컨트롤 공통 골격(제목·busy·접근제한·topbar/modal 영역).
- **viewType: TSdViewType** — `"page"|"modal"|"control"` 강제(미지정 시 부모로 자동 판정).
- **header: string** — 제목(미지정 시 모달 제목 또는 SdAppStructure fullCode 제목).
- **initialized: boolean | undefined** — false 면 busy 오버레이. (transformBoolean, undefined 허용)
- **restricted: boolean** — true 면 접근 제한 화면 표시.
- **busy: boolean** / **busyMessage: string** — busy 표시.
- 템플릿: `#contentTpl`(필수), `#pageTopbarTpl`, `#modalBottomTpl`.

## data-view (목록/상세 CRUD)

### `sd-data-sheet` (SdDataSheetControl) + `AbsSdDataSheet<TFilter, TItem, TKey>`
목록 화면. 컨트롤은 부모(Abs 상속 컴포넌트)에 위임. 컨트롤 입력은 텍스트/아이콘과 템플릿 슬롯.
- 컨트롤 input: **insertText / deleteText / restoreText: string**(버튼 라벨), **deleteIcon / restoreIcon**(기본 tabler eraser/restore).
- 템플릿 슬롯: `#pageTopbarTpl`, `#prevTpl`, `#filterTpl`, `#beforeToolTpl`, `#toolTpl`, `#modalBottomTpl`, `#modalActionTpl`; 컬럼은 `<sd-data-sheet-column>`.

**AbsSdDataSheet** (implements ISdSelectModal<TItem>) — 상속하여 구현:
- abstract **canUse / canEdit: Signal<boolean>** — 사용/편집 권한. **hideTool?: Signal<boolean>**.
- abstract **editMode: "inline" | "modal" | undefined** — 편집 방식. **selectMode: InputSignal<"single"|"multi"|undefined>**.
- abstract **bindFilter(): TFilter** — 필터 signal 바인딩. **itemPropInfo: ISdDataSheetItemPropInfo<TItem>**(`{ isDeleted; lastModifiedAt; lastModifiedBy }` 프로퍼티명). **getItemInfoFn: (item) => ISdDataSheetItemInfo<TKey>**(`{ key; canSelect; canEdit; canDelete }`).
- abstract **search(usePagination): ISdDataSheetSearchResult<TItem>**(`{ items; pageLength?; summary? }`).
- 선택 구현: **editItem?(item?)**, **toggleDeleteItems?(del)**, **newItem?()**(inline 행추가), **submit?(diffs: TArrayDiffs2Result[])**(inline 저장), **downloadExcel?(items)**, **uploadExcel?(file)**, **prepareRefreshEffect?()**, **diffsExcludes?: string[]**.
- 제공 멤버: **items / selectedItems / selectedItemKeys(model) / summaryData / page / pageLength / sortingDefs** signal, **doRefresh / doFilterSubmit / doSubmit({permCheck?,hideNoChangeMessage?}) / doAddItem / doEditItem / doToggleDeleteItems(del) / doDownloadExcel / doUploadExcel / doModalConfirm / doModalCancel**, **close: output<ISelectModalOutputResult<TItem>>**, **submitted: output<boolean>**. 변경 무시 confirm·낙관 diff·선택키 누적·single 선택 시 모달 자동닫기 내장.

### `sd-data-sheet-column` (SdDataSheetColumnDirective<T> extends SdSheetColumnDirective)
시트 컬럼 + **edit: boolean** — 편집 가능 셀 표시. 나머지 input 은 sd-sheet-column(sheet.md) 동일.

### `sd-data-detail` (SdDataDetailControl) + `AbsSdDataDetail<T, R = boolean>`
단건 상세/편집 화면.
- 컨트롤 템플릿: `#contentTpl`(필수), `#toolTpl`, `#prevTpl`, `#nextTpl`, `#modalActionTpl`; 내부 `#formCtrl` submit 으로 저장.
**AbsSdDataDetail** (implements ISdModal<R>) — 상속하여 구현:
- abstract **canUse / canEdit: Signal<boolean>**, **canDelete?: Signal<boolean>**.
- abstract **load(): { data: T; info: ISdDataDetailDataInfo }** — 데이터+메타 로드. **submit?(data): R | undefined**, **toggleDelete?(del): R | undefined**, **prepareRefreshEffect?()**.
- 제공: **data: signal<T>**, **dataInfo: signal<ISdDataDetailDataInfo>**, **initialized / busyCount / busyMessage** signal, **close: output<R>**, **doRefresh / doSubmit({permCheck?,hideNoChangeMessage?}) / doToggleDelete(del) / refresh / checkIgnoreChanges**. $obj 스냅샷으로 변경감지, 변경 무시 confirm.
- **ISdDataDetailDataInfo** `{ isNew: boolean; isDeleted: boolean; lastModifiedAt: DateTime|undefined; lastModifiedBy: string|undefined }`.

### `sd-data-select-button` (SdDataSelectButtonControl) + `AbsSdDataSelectButton<TItem, TKey, TMode>`
값을 선택 모달로 고르는 버튼.
- 컨트롤 템플릿: `[itemOf]` 표시 템플릿.
**AbsSdDataSelectButton** — abstract **modal: Signal<TSdSelectModalInfo<ISdSelectModal<any>>>**, abstract **load(keys): TItem[]**.
- input: **value: model<single이면 TKey, multi면 TKey[]>**, **disabled/required/inset: boolean**, **size: "sm"|"lg"**, **selectMode: "single"|"multi"**(기본 single). **doShowModal / doInitialValue** 제공. required+빈값 시 무효표시(setupInvalid).

### 선택 모달 공통 타입 (data-view export)
- **ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>>** — `selectMode: InputSignal<"single"|"multi"|undefined>`, `selectedItemKeys: InputSignal<any[]>` 입력 보유.
- **TSdSelectModalInfo<T>** = `ISdModalInfo<T, "selectMode" | "selectedItemKeys">`(두 입력은 버튼이 주입하므로 inputs 에서 제외).
- **ISelectModalOutputResult<T>** `{ selectedItemKeys: any[]; selectedItems: T[] }`.

## shared-data (공유데이터 선택)

SdSharedDataProvider 의 마스터데이터를 고르는 컨트롤. 모두 `[itemOf]` 표시 템플릿 필요.

### `sd-shared-data-select` (SdSharedDataSelectControl<TItem, TMode, TModal>)
드롭다운형 공유데이터 선택(검색·트리·신규/편집 모달 연동).
- **value: model<single이면 TItem["__valueKey"]|undefined, multi면 그 배열>**, **items: TItem[] (required)**.
- **selectMode: "single"|"multi"**(기본 single), **disabled/required/useUndefined/inset/inline: boolean**, **size: "sm"|"lg"**.
- **filterFn: (item,index,...params) => boolean** / **filterFnParams: any[]** — 필터(params 변경 시 재평가).
- **modal: TSdSelectModalInfo<TModal>**(전체선택 모달) / **editModal: ISdModalInfo<ISdModal<boolean>>**(신규/편집).
- **selectClass: string**, **multiSelectionDisplayDirection: "vertical"|"horizontal"**.
- **getIsHiddenFn: (item,index) => boolean**(기본 `item.__isHidden`), **getSearchTextFn**(기본 `item.__searchText`).
- **parentKeyProp / displayOrderKeyProp: string** — 트리/정렬 속성명. `#undefinedTpl` 슬롯.

### `sd-shared-data-select-list` (SdSharedDataSelectListControl<TItem, TModal>)
리스트형 단일 선택(상세 화면 좌측 목록 등).
- **selectedItem: model<TItem>**, **canChangeFn: (item|undefined) => boolean|Promise<boolean>**(기본 true), **items: TItem[] (required)**.
- **selectedIcon: string**, **useUndefined: boolean**, **filterFn: (item,index) => boolean**, **modal: TSdSelectModalInfo<TModal>**, **header: string**, **pageItemCount: number**.
- 템플릿: `#headerTpl`, `#filterTpl`, `[itemOf]`, `#undefinedTpl`.

### `sd-shared-data-select-button` (SdSharedDataSelectButtonControl<TItem, TModal>)
- **items: TItem[]**(기본 []), **modal: TSdSelectModalInfo<TModal> (required)**, `[itemOf]` 템플릿 필수.

## 기타 feature

### `sd-permission-table` (SdPermissionTableControl<TModule>)
권한 트리를 use/edit 체크박스 표로 편집.
- **value: model<Record<string, boolean>>**(기본 {}) — `"<codeChain>.<perm>" → boolean` 권한 맵.
- **items: ISdPermission<TModule>[]**(기본 [], SdAppStructure.getPermissionsByStructure 결과), **disabled: boolean**.

### `sd-address-search-modal` (SdAddressSearchModal, implements ISdModal<IAddress>)
다음(카카오) 우편번호 검색 모달. `SdModalProvider.showAsync` 로 사용.
- **close: output<IAddress>** — `IAddress { postNumber; address; buildingName }`(모두 string|undefined). 도로명/지번은 userSelectedType 에 따라 선택.

### `sd-theme-selector` (SdThemeSelectorControl)
테마(compact/mobile/kiosk)·다크모드 전환 드롭다운(입력 없음, SdThemeProvider 연동).
