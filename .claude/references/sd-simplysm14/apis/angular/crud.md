# @simplysm/angular — CRUD 화면 골격

목록/단건 화면의 표준 컨테이너 골격. `sd-base-container`(공통 셸) 위에 `sd-crud-list`(목록), `sd-crud-detail`(단건)이 얹힘. 표준 시그널(ready/initialized/busyCount/viewType)·page/modal/control 컨텍스트별 탑바·하단바 자동 구성·CTRL+S 저장을 내장. 화면 데이터 흐름·시그널 전파 규약은 client-component.md / client-crud.md 를 따름.

## 표준 시그널 (3 컴포넌트 공통)

세 컴포넌트 모두 화면 표준 시그널을 입력/모델로 받음:
- `ready: model<boolean>` — 자식이 데이터 로드를 시작해도 되는 시점. 컨테이너가 공유데이터 로드 완료 후 true 로 set.
- `initialized: input<boolean>` — 첫 데이터 로드 완료 여부(자식이 set 한 값을 받음). true 가 되어야 본문 렌더.
- `busyCount: model<number>` — 진행 중 비동기 작업 수. 0 보다 크면 busy 표시.
- `restricted: input<boolean>` — 권한 없음. true 면 "사용권한이 없습니다" 안내만 표시.
- `viewType: input.required<SdViewType>` — page/modal/control 컨텍스트(`injectViewTypeSignal()` 전달). page 면 탑바를, modal 이면 하단 확인/취소를 구성.

## SdBaseContainer

selector `sd-base-container`. 모든 화면의 공통 셸(busy·권한 안내·page 탑바·콘텐츠/명령 슬롯).

- 위 표준 시그널 + 슬롯: `#topbarTpl`(page 탑바 추가 영역), `#commandTpl`(상단 명령 줄), `#contentTpl`(본문), `#bottomCommandTpl`(하단 명령 줄).
- 생성자에서 `SdSharedDataProvider` 가 있으면 그 로드 완료(`wait()`)를 기다린 뒤 `ready` 를 true 로 set.

```html
<sd-base-container [(ready)]="ready" [initialized]="initialized()" [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')" [viewType]="viewType()">
  <ng-template #contentTpl>...</ng-template>
</sd-base-container>
```

## SdCrudList<TItem, TKey>

selector `sd-crud-list`. 검색폼·등록/삭제/복원 버튼·시트·페이지네이션을 갖춘 목록 골격. 직속 자식 `<sd-sheet-column>` 들을 내부 시트로 투영. `Ctrl+S` 로 저장 명령.

추가 입력:
- `readonly: input<boolean>` — 읽기 전용. true 면 등록/삭제/저장 버튼 숨김.
- `inlineEdit: input<boolean>` — 시트 셀 인라인 편집 + 저장 버튼 노출(기본 true). `readonly` 면 무시.
- `selectMode: "single"|"multi"` — 선택 모드. 모달 선택 시 하단 확인/해제 버튼 구성.
- `key: input.required<string>` — 시트 컬럼 구성 영속화 키.
- `items: input<TItem[]>` — 행 데이터.
- `selectedKeys: model<NonNullable<TKey>[]>` — 선택 키.
- `currDeletedItems: input<TItem[]>` — 삭제 표시 행(복원 대상 판정).
- `currentPage: model<number>`, `totalPageCount`/`itemsPerPage`/`visiblePageCount: input<number>` — 페이징(서버 페이징은 `totalPageCount`, 클라 페이징은 `itemsPerPage`).
- `sorts: model<SortingDef[]>` — 정렬 상태.
- `trackByFn: input.required<(item) => TKey>` — 행 키 함수.
- `getItemSelectableFn: input<(item) => boolean | string>` — 행 선택 가능 여부(문자열 반환 시 불가 사유). 내부 시트로 전달.

출력:
- `filterSubmit: output` — 검색폼 제출(조회).
- `submit: output` — 인라인 편집 저장(Ctrl+S/저장 버튼).
- `create: output` — 등록 버튼.
- `delete: output<TItem[]>` — 선택 행 삭제(선택 항목 전달).
- `restore: output<TItem[]>` — 선택된 삭제 행 복원.

슬롯: `#filterTpl`(검색 폼 항목), `#commandTpl`/`#bottomCommandTpl`(명령 줄), `#toolTpl`(도구 줄).

```html
<sd-crud-list [viewType]="viewType()" [key]="'goods-list'" [(selectedKeys)]="selectedKeys"
  [items]="items()" [trackByFn]="trackByFn" [totalPageCount]="pageLength()" [(currentPage)]="page"
  (filterSubmit)="onFilterSubmit()" (create)="onCreate()" (delete)="onDelete($event)">
  <ng-template #filterTpl>...</ng-template>
  <sd-sheet-column [key]="'name'" [header]="'이름'">
    <ng-template [cell]="items()" let-item="item"><div class="p-xs-sm">{{ item.name }}</div></ng-template>
  </sd-sheet-column>
</sd-crud-list>
```

## SdCrudDetail

selector `sd-crud-detail`. 단건 편집 골격(폼 + 저장 명령).

추가 입력/출력:
- `readonly: input<boolean>` — 읽기 전용(저장 버튼 숨김).
- `submit: output` — 저장(폼 제출/저장 버튼).
- 슬롯: `#commandTpl`(상단 명령), `#contentTpl`(폼 본문), `#bottomCommandTpl`(하단 명령).
- `onSaveButtonClick()` — 내부 폼의 `requestSubmit()` 호출(저장 트리거).

```html
<sd-crud-detail [viewType]="viewType()" [(ready)]="ready" [initialized]="initialized()"
  [(busyCount)]="busyCount" (submit)="onSubmit()">
  <ng-template #contentTpl><div class="form-table">...</div></ng-template>
</sd-crud-detail>
```
