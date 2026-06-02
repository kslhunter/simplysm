# @simplysm/angular — CRUD 화면 골격

목록·상세 화면의 표준 레이아웃(타이틀바·커맨드 영역·콘텐츠·하단 커맨드)과 busy·권한제한·뷰타입(page/modal/control)별 분기·모달 선택 모드를 제공하는 컨테이너. 콘텐츠는 `<ng-template #...>` 슬롯으로 주입. `viewType` 은 `injectViewTypeSignal()`(routing 군) 결과를 넣는 것이 일반적.

## SdBaseContainer

`<sd-base-container>` — 모든 CRUD 컨테이너의 기반. busy·권한제한·뷰타입 분기·공유데이터 로드 대기 처리.

- `viewType = input.required<SdViewType>()` — `"page"|"modal"|"control"`. page 면 탑바+제목 표시, 그 외엔 콘텐츠만.
- `initialized = input(false)` — 초기화 완료 여부. false 면 busy 표시.
- `restricted = input(false)` — 권한 제한. true 면 콘텐츠 대신 "사용권한 없음" 안내.
- `ready = model(false)` — 준비 완료 신호(공유데이터 대기 후 set).
- `busyCount = model(0)` — busy 카운트(0 초과 시 busy).
- 슬롯: `#topbarTpl`(탑바 액션), `#commandTpl`(상단 커맨드 바), `#contentTpl`(본문), `#bottomCommandTpl`(하단 커맨드). `viewTitle` 은 라우팅 군의 제목 신호 자동 사용.

## SdCrudDetail

`<sd-crud-detail>` — 단일 레코드 상세/편집 화면. 저장 버튼·CTRL+S·폼 검증 연동.

- `viewType = input.required<SdViewType>()` — 뷰 타입. page=탑바 저장버튼, control=상단 저장버튼, modal=하단 확인버튼.
- `initialized`/`restricted`/`busyCount`/`ready` — `SdBaseContainer` 와 동일 의미.
- `readonly = input(false)` — 읽기전용(폼·저장버튼 숨김).
- `submit = output()` — 저장(폼 검증 통과) 시 emit. CTRL+S/저장버튼 → 폼 제출 → 이 이벤트.
- 슬롯: `#commandTpl`/`#contentTpl`/`#bottomCommandTpl`. contentTpl 은 readonly 가 아니면 `<sd-form>` 으로 감싸짐.

## SdCrudList

`<sd-crud-list>` — 목록 화면(필터 폼 + 시트 + 등록/삭제/복구/선택). 제네릭 `<TItem, TKey>`.

- `viewType = input.required<SdViewType>()` / `initialized`/`restricted`/`busyCount`/`ready`/`readonly` — 기반 동일.
- `key = input.required<string>()` — 시트 설정 키(`{key}-sheet`).
- `selectMode: "single"|"multi"` — 모달 선택 모드. modal 뷰에서 single 은 행 선택 즉시 확정 close, multi 는 확인 버튼.
- `items = input<TItem[]>([])` — 목록 데이터.
- `selectedKeys = model<NonNullable<TKey>[]>([])` — 선택 키.
- `trackByFn = input.required<(item) => TKey>()` — 행 키 추출.
- `currDeletedItems = input<TItem[]>([])` — 삭제 표시(취소선) 항목 집합.
- `currentPage = model(0)`/`totalPageCount`/`itemsPerPage`/`visiblePageCount`/`sorts = model<SortingDef[]>()` — 페이징·정렬(시트로 전달).
- outputs: `filterSubmit`(조회 버튼), `submit`(저장/CTRL+S), `create`(등록 버튼), `delete = output<TItem[]>()`(선택/행 삭제), `restore = output<TItem[]>()`(선택/행 복구).
- 슬롯: `#filterTpl`(필터 폼 필드), `#commandTpl`/`#toolTpl`/`#bottomCommandTpl`. `<sd-sheet-column>` 자식은 시트 컬럼으로 합쳐짐(삭제 컬럼은 자동 주입).

```html
<sd-crud-list [viewType]="viewType()" key="user" [items]="users()"
              [(selectedKeys)]="sel" [trackByFn]="trackById"
              (create)="onCreate()" (delete)="onDelete($event)" (submit)="onSave()">
  <ng-template #filterTpl><sd-textfield [type]="'text'" [(value)]="filter.name" /></ng-template>
  <sd-sheet-column key="name" header="이름">
    <ng-template [cell]="users()" let-item="item">{{ item.name }}</ng-template>
  </sd-sheet-column>
</sd-crud-list>
```
