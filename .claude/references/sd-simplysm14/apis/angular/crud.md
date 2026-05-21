# @simplysm/angular — crud

CRUD 화면 골격. 공통 컨테이너(`SdBaseContainer`) + 리스트(`SdCrudList`) + 상세(`SdCrudDetail`) + 사용자 상태 프리셋(`SdStatePreset`).

## SdBaseContainer — `<sd-base-container>`

```ts
ready = model(false);
initialized = input(false);
busyCount = model(0);
restricted = input(false);
viewType = input.required<SdViewType>();      // "page"|"modal"|"control" (routing.md)

// content slots: #topbarTpl #commandTpl #contentTpl #bottomCommandTpl
```

- 모든 simplysm 화면의 기본 컨테이너. 진입 시 `SdSharedDataProvider.wait()` 후 `ready` true.
- `restricted=true` 면 권한 없음 안내 화면 표시(데이터 로드 스킵).
- `viewType` — 보통 `injectViewTypeSignal()` 결과 바인딩.
- 슬롯: `<ng-template #topbarTpl>` 상단 영역, `#commandTpl` 명령바, `#contentTpl` 본문, `#bottomCommandTpl` 하단.

## SdCrudList — `<sd-crud-list>`

```ts
class SdCrudList<TItem, TKey>
ready = model(false); initialized = input(false); busyCount = model(0);
restricted = input(false); readonly = input(false);
viewType = input.required<SdViewType>();
selectMode = input<"single"|"multi">();
key = input.required<string>();                // 시트/프리셋 key prefix

filterSubmit = output(); submit = output();
create = output(); delete = output<TItem[]>(); restore = output<TItem[]>();

items = input<TItem[]>([]);
selectedKeys = model<NonNullable<TKey>[]>([]);
currDeletedItems = input<TItem[]>([]);         // 삭제됨 표시(취소선) 대상

currentPage = model(0); totalPageCount = input(0);
itemsPerPage = input(0); visiblePageCount = input(10);
sorts = model<SortingDef[]>([]);
trackByFn = input.required<(item) => TKey>();

// content slots: #commandTpl #filterTpl #toolTpl #bottomCommandTpl
// + 자식: <sd-sheet-column> 들
```

- 표준 리스트 화면: 필터 영역 + 시트 + 페이지바 + 명령(저장/추가/삭제/복원).
- `filterSubmit` — 필터 폼 submit. 호출자가 데이터 fetch.
- `submit` — 명령바의 저장 버튼.
- `create`/`delete`/`restore` — 행 추가/선택 삭제/선택 복원.
- `currDeletedItems` — soft-delete 표시. 해당 행 셀에 취소선 자동.
- `readonly=true` 면 명령바·편집 차단.
- 모달로 띄워서 선택 picker 로도 동작: 모달 confirm 시 `SdActivatedModalProvider.contentComponent.close.emit({ selectedKeys })`.
- `key` — 자식 `<sd-sheet key>` 와 `SdStatePreset key` 가 이 값을 prefix 로 사용.

```html
<sd-crud-list [viewType]="viewType()" key="invoice" [trackByFn]="trackById"
              [items]="items()" [(selectedKeys)]="sel" selectMode="multi"
              (filterSubmit)="reload()" (create)="onCreate()" (delete)="onDelete($event)">
  <ng-template #filterTpl>...필터 폼...</ng-template>
  <sd-sheet-column key="no" header="번호" />
</sd-crud-list>
```

## SdCrudDetail — `<sd-crud-detail>`

```ts
ready = model(false); initialized = input(false); busyCount = model(0);
restricted = input(false); readonly = input(false);
viewType = input.required<SdViewType>();
submit = output();

// content slots: #commandTpl #contentTpl #bottomCommandTpl
```

- 상세 화면 골격. 내부에 `<sd-form>` 자동 배치. 저장 버튼 클릭 시 form submit → invalid 없으면 `submit` 발화.

## SdStatePreset — `<sd-state-preset>`

```ts
key = input.required<string>();
state = model<any>();              // 적용할 상태 객체 (필터 등)
size = input<"sm"|"lg">();

interface SdStatePresetDef { name: string; state: any; }
```

- 사용자가 현재 `state` 를 이름 붙여 저장/불러오기. `SdSystemConfigProvider` 키 `key` 로 `SdStatePresetDef[]` 저장.
- 별 아이콘 클릭 → 이름 입력(`SdPromptModal`) → 추가. 프리셋 클릭 → `state` 에 적용. 디스켓 아이콘 → 현재 state 덮어쓰기. X 아이콘 → 삭제.

```html
<sd-state-preset key="invoice-filter" [(state)]="filter" />
```

## 주의

- 모든 CRUD 컴포넌트의 `ready` 는 진입 후 데이터 준비 완료 시 true. 호출자가 `[ready]="ready()"` 로 자식 조건부 렌더링.
- `key` 는 한 클라이언트 내 고유해야 함. 시트 컬럼 설정·프리셋·기타 영구 상태가 이 키로 충돌 없이 저장됨.
- `SdCrudList` 의 selectMode 가 설정되었고 컨테이너가 모달 안에 있으면 자동으로 picker 모드로 동작.
