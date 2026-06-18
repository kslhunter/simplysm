# @simplysm/angular — CRUD 화면 골격·권한표·상태프리셋

목록/단건 화면의 표준 컨테이너 골격. `sd-base-container`(공통 셸) 위에 `sd-crud-list`(목록)·`sd-crud-detail`(단건)이 얹힘. 표준 시그널(`ready`/`initialized`/`busyCount`/`viewType`)·page/modal/control 컨텍스트별 탑바·하단바 자동 구성·CTRL+S 저장을 내장. 화면 작성 절차·데이터 흐름은 [client-crud.md](../manuals/client-crud.md) · [client-component.md](../manuals/client-component.md) 참조. 함께 쓰는 권한 테이블·상태 프리셋도 이 군에 둠.

공통: 세 컨테이너 모두 `viewType: SdViewType`(required, `"page"|"modal"|"control"`)에 따라 동작이 갈림. `"page"` = 라우팅 진입(탑바에 액션), `"modal"` = 모달(하단 명령바·확인 버튼), `"control"` = view 임베드(명령 영역에 액션).

## `SdBaseContainer` — `<sd-base-container>`

busy 컨테이너로 감싸고(`page` 면 탑바 포함) 권한 없음 placeholder 를 제공하는 공통 셸. `SdSharedDataProvider` 로드를 기다린 뒤 `ready` 를 set.

- `ready: model(false)` — 공유데이터 로드 완료(또는 `restricted` 면 즉시) 후 자동 `true`. 자식 effect 발화 시점.
- `initialized: input(false)` — true 일 때만 콘텐츠 렌더. busy 스피너는 `initialized() && busyCount() > 0` 일 때.
- `busyCount: model(0)` — 진행 중 작업 수. `>0` 이면 busy.
- `restricted: input(false)` — true 면 "사용권한 없음" 메시지 렌더 + `ready` 즉시 set(공유데이터 대기 스킵).
- `viewType: input.required<SdViewType>` — `"page"` 면 `<sd-topbar-container>` + viewTitle 렌더, `"modal"`/`"control"` 면 탑바 없이 콘텐츠.
- 슬롯: `#topbarTpl`(page 탑바 추가 버튼) / `#commandTpl`(콘텐츠 위 명령바) / `#contentTpl`(본문) / `#bottomCommandTpl`(하단 명령바).

```html
<sd-base-container [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount" [restricted]="!perms().includes('use')" [viewType]="viewType()">
  <ng-template #contentTpl>...</ng-template>
</sd-base-container>
```

## `SdCrudDetail` — `<sd-crud-detail>`

단건 편집 폼 골격(`sd-base-container` 기반). `readonly` 가 아니면 콘텐츠를 `<sd-form>` 으로 감싸고 저장 컨트롤 제공. `SdCommandDirective` 호스트(CTRL+S → 저장).

- `ready: model(false)` / `initialized: input(false)` / `busyCount: model(0)` / `restricted: input(false)` — base 로 전달.
- `readonly: input(false)` — true 면 저장 버튼 숨김 + `<sd-form>` 없이 plain `<div>` 렌더(제출 불가); false 면 `<sd-form>` 래핑 + 저장 컨트롤.
- `viewType: input.required<SdViewType>` — `"page"` = 탑바 `#topbarTpl` 에 "저장 (CTRL+S)" 버튼; `"control"` = `#commandTpl` 에 저장 버튼; `"modal"` = 하단 명령바에 "확인" 버튼.
- `submit: output()` — 내부 `<sd-form>` 의 유효 제출 시 emit.
- 슬롯: `#contentTpl`(필수, 폼 본문) / `#commandTpl` / `#bottomCommandTpl`.
- 메서드: `onSaveButtonClick()` — `formCtrl().requestSubmit()`.

```html
<sd-crud-detail [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount" [restricted]="!perms().includes('use')" [readonly]="!canEdit()" [viewType]="viewType()" (submit)="onSubmit()">
  <ng-template #contentTpl>...</ng-template>
</sd-crud-detail>
```

## `SdCrudList<TItem, TKey>` — `<sd-crud-list>`

목록 골격(`sd-base-container` + `sd-sheet`). 시트·검색 폼·등록/삭제/복구·CTRL+S 저장·페이징·정렬·선택·인라인 편집·모달 선택을 일괄 제공. `SdCommandDirective` 호스트.

- `ready: model(false)` / `initialized: input(false)` / `busyCount: model(0)` / `restricted: input(false)` — base 로 전달.
- `canCreate: input(true)` — false 면 등록 버튼 숨김.
- `canEdit: input(true)` — false 면 인라인 편집(저장 버튼·`<sd-form>` 래핑) 비활성. `inlineEdit` 과 AND(둘 다 true 여야 인라인 편집).
- `canDelete: input(true)` — false 면 선택 삭제/복구 버튼·per-row 삭제 컬럼 숨김 + 멀티선택 기본값 해제(`undefined`).
- `inlineEdit: input(true)` — `canEdit` 면 시트를 `<sd-form>` 으로 감싸 셀 인라인 편집 + 저장. per-row 삭제 컬럼은 `canDelete` 면 표시. false 면 인라인 편집 chrome 제거(조회·선택 전용, `submit` 미발화).
- `viewType: input.required<SdViewType>` — `"page"` = 탑바 저장 버튼(인라인 편집 시); `"modal"` = 하단 선택 명령바("선택 해제", multi 면 "확인(n)").
- `selectMode: "single"|"multi"|undefined` — `"single"` = 선택 삭제/복구 숨김·클릭 즉시 modal close; `"multi"` = 다중 선택·삭제/복구·"확인(n)"; `undefined`(비-modal) = `canDelete` 면 `'multi'`.
- `key: input.required<string>` — 시트 설정 키(내부 시트는 `key()+'-sheet'`).
- `items: TItem[]` (기본 `[]`) — 행 데이터.
- `currDeletedItems: TItem[]` (기본 `[]`) — 삭제(soft delete) 행. 취소선·복구 버튼·삭제/복구 아이콘 토글에. 삭제항목 포함 검색 목록은 필수.
- `trackByFn: input.required<(item: TItem) => TKey>` — 키 추출(선택 멤버십·시트 추적).
- `getItemSelectableFn: (item) => boolean | string | undefined` — 시트로 전달, `string`=불가+툴팁.
- `currentPage: model(0)` / `totalPageCount: input(0)`(서버 페이징; `0`이면 useAutoSort 활성) / `itemsPerPage: input(0)`(클라이언트 페이징) / `visiblePageCount: input(10)` / `sorts: model<SortingDef[]>([])` — 시트로 전달.
- `selectedKeys: model<NonNullable<TKey>[]>([])` — 선택 키(시트와 양방향).
- output: `filterSubmit`(조회 폼 제출) / `submit`(인라인 편집 저장) / `create`(등록) / `delete: TItem[]`(삭제 대상) / `restore: TItem[]`(복구 대상).
- 슬롯: `#filterTpl`(검색 폼; 내부가 이미 `form-box-inline`) / `#toolTpl`(도구 버튼) / `#commandTpl` / `#bottomCommandTpl`. `<sd-sheet-column>` 직속 자식은 내부 시트로 자동 투영.

```html
<sd-crud-list [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount" [restricted]="!perms().includes('use')" [canCreate]="canEdit()" [canEdit]="canEdit()" [canDelete]="canEdit()" [viewType]="viewType()" [selectMode]="selectMode() ?? 'multi'" [key]="'role'" [items]="items()" [currDeletedItems]="deletedItems()" [trackByFn]="trackByFn" [(selectedKeys)]="selectedKeys" [(currentPage)]="page" [totalPageCount]="pageLength()" [(sorts)]="sortingDefs" (filterSubmit)="onFilterSubmit()" (submit)="onSubmit()" (create)="onCreate()" (delete)="onDelete($event)" (restore)="onRestore($event)">
  <ng-template #filterTpl>...</ng-template>
  <sd-sheet-column [key]="'name'" [header]="'이름'"><ng-template [cell]="items()" let-item="item">...</ng-template></sd-sheet-column>
</sd-crud-list>
```

## `SdStatePreset<TState>` — `<sd-state-preset>`

임의 상태의 명명 스냅샷을 저장·복원(system config 영속화). 필터 프리셋 등에.

- `key: input.required<string>` — 프리셋 배열 저장 키.
- `state: model.required<TState>` — 현재 상태(양방향). 프리셋 클릭 시 그 상태로 set(deep clone), 저장 시 현재 상태 clone 보관.
- `size: "sm"|"lg"|undefined` — 추가 버튼/칩 패딩 스케일.
- 메서드: `onAddClick()`(이름 입력·중복 거부·추가) / `onPresetClick(preset)`(적용) / `onSaveClick(preset)`(덮어쓰기) / `onDeleteClick(preset)`(확인 후 삭제).
- `SdStatePresetDef<TState>` — `{ name: string; state: TState }`.

## `SdPermissionTable<TModule>` — `<sd-permission-table>`

권한 트리(사용/편집 체크박스)를 계층 표시. 부모/자식·use→edit 의존 규칙 강제. 권한 관리 화면에서 `getPermissionsByStructure` 결과를 넘김([client-app-structure.md](../manuals/client-app-structure.md)).

- `value: model<Record<string, boolean>>({})` — `"<codeChain>.<use|edit>" → boolean` 맵. 토글이 자식에 캐스케이드, `use` 해제 시 `edit` 자동 해제, `use` 미체크면 `edit` 체크 무시.
- `items: SdPermission<TModule>[]` (기본 `[]`) — 권한 트리.
- `disabled: boolean` — true 면 전체 체크박스 비활성.

```html
<sd-permission-table [items]="permissions()" [(value)]="data" />
```

(`SdPermission<TModule>` 타입은 [routing-appstructure.md](./routing-appstructure.md) 참조.)
