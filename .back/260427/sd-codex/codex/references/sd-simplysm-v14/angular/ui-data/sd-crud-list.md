# `SdCrudList`

> **읽어야 하는 상황**: CRUD 목록 화면(시트 + 필터 + 등록/삭제)을 만들 때. 상세 화면은 [`SdCrudDetail`](./sd-crud-detail.md) 참조.

CRUD 목록 화면 스캐폴드. `SdBaseContainer`를 내부에 사용하며, `SdSheet` 기반 데이터 표시, 필터 폼, 등록/삭제/복구 버튼, 모달 선택 모드를 제공한다.

## Import

```typescript
import { SdCrudList } from "@simplysm/angular";
```

## Selector

`sd-crud-list`

## Type Parameters

```typescript
SdCrudList<TItem, TKey>
```

- `TItem` — 목록 항목 타입 (`items` 배열의 요소)
- `TKey` — 항목 식별자 타입 (`trackByFn`의 반환 타입, 보통 `number`)

## Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `initialized` | `boolean` | `false` | 외부 초기화 완료 여부. `true`일 때만 콘텐츠 렌더링. |
| `restricted` | `boolean` | `false` | `true`이면 "사용권한이 없습니다" 메시지 표시. |
| `readonly` | `boolean` | `false` | 읽기 전용 모드. 저장/등록/삭제/복구 버튼 숨김, 시트 셀 편집 비활성, `<sd-form>` 비활성. |
| `viewType` | `SdViewType` | **required** | `"page"` \| `"modal"` \| `"control"`. 레이아웃과 저장 버튼 위치를 결정. |
| `selectMode` | `"single" \| "multi"` | `undefined` | 모달 선택 모드. 미지정 시 일반 CRUD 모드. |
| `key` | `string` | **required** | `SdSheet`의 `key`에 `"-sheet"` 접미사를 붙여 전달. 컬럼 너비/순서 등 사용자 설정 저장에 사용. |
| `items` | `TItem[]` | `[]` | 시트에 표시할 데이터 배열. |
| `currDeletedItems` | `TItem[]` | `[]` | 현재 삭제 표시할 항목 배열. 이 배열에 포함된 항목은 `text-decoration: line-through` 스타일이 적용되고, 행별 삭제 버튼이 복구 버튼으로 변경된다. |
| `totalPageCount` | `number` | `0` | 서버 페이징 시 총 페이지 수. `0`이면 클라이언트 정렬(`useAutoSort=true`)이 활성화된다. |
| `trackByFn` | `(item: TItem) => TKey` | **required** | 항목 식별 함수. 보통 `(item: IItem) => item.id`로 정의. |

## Two-way Bindings (model)

| Model | Type | Default | Description |
|-------|------|---------|-------------|
| `ready` | `boolean` | `false` | SdBaseContainer의 공유 데이터 로딩 완료 시 `true`. |
| `busyCount` | `number` | `0` | 로딩 카운터. |
| `selectedKeys` | `NonNullable<TKey>[]` | `[]` | 현재 선택된 항목들의 키 배열. |
| `currentPage` | `number` | `0` | 현재 페이지 번호 (0-based). |
| `sorts` | `SortingDef[]` | `[]` | 현재 정렬 상태. `SortingDef = { key: string; desc: boolean }`. |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `filterSubmit` | `void` | 필터 폼의 "조회" 버튼 클릭 시 발생. 소비 컴포넌트에서 `page`를 0으로 리셋하고 `lastFilter`를 갱신하는 데 사용. |
| `submit` | `void` | 데이터 폼 제출 시 발생 (저장 버튼 클릭 또는 `Ctrl+S`). |
| `create` | `void` | "등록" 버튼 클릭 시 발생. 소비 컴포넌트에서 items 배열 앞에 빈 항목을 추가하는 데 사용. |
| `delete` | `TItem[]` | 삭제 버튼 클릭 시 발생. 행별 삭제 아이콘 클릭 시 `[해당항목]`, 선택 삭제 버튼 클릭 시 `선택된 항목들` 배열. |
| `restore` | `TItem[]` | 복구 버튼 클릭 시 발생. 행별 복구 아이콘 클릭 시 `[해당항목]`, 선택 복구 버튼 클릭 시 `선택된 항목들` 배열. |

## Content Children (ng-template)

### `#filterTpl` — 필터 폼 영역

`<sd-form>` 내부에 렌더링된다. "조회" 버튼은 `SdCrudList`가 자동으로 추가하므로 직접 넣지 않는다.
`form-box-inline` 클래스의 `<div>` 안에 배치되며, 각 필터 항목은 `form-box-item` 클래스의 `<div>`로 감싼다.

```html
<ng-template #filterTpl>
  <div class="form-box-item">
    <label>검색어</label>
    <sd-textfield
      [type]="'text'"
      [placeholder]="'코드/명칭'"
      [(value)]="filter().searchText"
      (valueChange)="mark(filter)"
    />
  </div>
  <div class="form-box-item">
    <label>기간</label>
    <sd-date-range-picker
      [(from)]="filter().fromDate"
      (fromChange)="mark(filter)"
      [(to)]="filter().toDate"
      (toChange)="mark(filter)"
    />
  </div>
  <div class="form-box-item">
    <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="mark(filter)">
      삭제항목 포함
    </sd-checkbox>
  </div>
</ng-template>
```

> **`mark(filter)` 패턴**: 필터 객체는 `signal<IFilter>`로 관리하며, 내부 프로퍼티 변경 시 `mark(filter)`를 호출하여 signal의 참조를 갱신한다. `mark`는 `@simplysm/angular`에서 import한다.

### `#commandTpl` — 추가 명령 버튼 영역

viewType에 따라 렌더링 위치가 달라진다:

| viewType | 렌더링 위치 |
|----------|------------|
| `page` | `<sd-topbar>` 내부 (저장 버튼 우측) |
| 그 외 | 상단 명령 영역 (저장 버튼 우측) |

```html
<ng-template #commandTpl>
  <sd-button [theme]="'link-success'" (click)="onExportExcel()">
    <ng-icon [svg]="tablerFileExcel" />
    엑셀 다운로드
  </sd-button>
</ng-template>
```

### `#toolTpl` — 도구 버튼 영역

"등록/삭제/복구" 버튼 옆에 렌더링된다. `readonly=false`일 때만 도구 영역 전체가 표시되지만, `toolTpl`이 있으면 `readonly=true`여도 도구 영역이 표시된다.

```html
<ng-template #toolTpl>
  @if (canEdit()) {
    <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
      <ng-icon [svg]="tablerUpload" />
      엑셀 업로드
    </sd-button>
  }
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
    <ng-icon [svg]="tablerFileExcel" />
    엑셀 다운로드
  </sd-button>
</ng-template>
```

```html
<!-- readonly=true인 목록에서 toolTpl만 사용하는 경우 -->
@if (canEdit()) {
  <ng-template #toolTpl>
    <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
      <ng-icon [svg]="tablerCirclePlus" />
      신규등록
    </sd-button>
  </ng-template>
}
```

### `#bottomCommandTpl` — 하단 명령 영역

모달 선택 모드의 "선택 해제"/"확인" 버튼 옆(좌측)에 렌더링된다. `bottomCommandTpl`이 있으면 `selectMode` 없이도 하단 영역이 표시된다.

## Content Children (컴포넌트): `SdSheetColumn`

`SdSheetColumn` 디렉티브를 `<sd-crud-list>` 직접 자식으로 배치하면 내부 `<sd-sheet>`의 `columnControlsInput`에 자동 전달된다.

### `SdSheetColumn` Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | **required** | 컬럼 식별자. 사용자 설정 저장, 정렬 키로 사용. |
| `header` | `string \| string[]` | `""` | 헤더 텍스트. `string[]`이면 다단 헤더(병합) — 예: `['납품', '담당자명']`은 "납품" 그룹 아래 "담당자명" 서브 헤더. |
| `headerStyle` | `string` | — | 헤더 셀 인라인 CSS. |
| `tooltip` | `string` | — | 헤더 셀 툴팁. |
| `width` | `string` | — | CSS 너비 문자열 (예: `"120px"`). |
| `fixed` | `boolean` | `false` | 좌측 고정 컬럼 여부 (가로 스크롤 시 고정). |
| `hidden` | `boolean` | `false` | 기본 숨김 여부 (사용자가 토글 가능). |
| `collapse` | `boolean` | `false` | 축소 상태 여부. |
| `disableSorting` | `boolean` | `false` | 정렬 비활성화. |
| `disableResizing` | `boolean` | `false` | 너비 조절 비활성화. |
| `ordering` | `number` | `0` | 컬럼 표시 순서. |

### `SdSheetColumn` Content Children (ng-template)

#### 셀 템플릿: `<ng-template [cell]="items()" let-item="item">`

**필수**. `SdSheetColumnCellTemplate` 디렉티브(`ng-template[cell]`)를 사용한다. `[cell]` input에 items 배열을 바인딩하면 TypeScript 타입 추론이 활성화된다.

**템플릿 컨텍스트 변수:**

| 변수 | Type | Description |
|------|------|-------------|
| `$implicit` | `TItem` | 현재 행 항목 (기본 let- 변수) |
| `item` | `TItem` | 현재 행 항목 (명시적 이름) |
| `index` | `number` | 행 인덱스 |
| `depth` | `number` | 트리 데이터의 중첩 깊이 |
| `edit` | `boolean` | 현재 행이 편집 모드인지 여부. 행 클릭(또는 더블클릭) 시 `true`가 된다. `SdTextfield`의 `[readonly]`에 `!edit`을 바인딩하여 인라인 편집을 구현한다. |

```html
<!-- 읽기 전용 셀 -->
<sd-sheet-column [key]="'id'" [header]="'#'" [fixed]="true">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm tx-right">
      {{ item.id }}
    </div>
  </ng-template>
</sd-sheet-column>

<!-- 편집 가능한 텍스트 셀 -->
<sd-sheet-column [key]="'code'" [header]="'코드'">
  <ng-template [cell]="items()" let-item="item" let-edit="edit">
    <sd-textfield
      [type]="'text'"
      [inset]="true"
      [size]="'sm'"
      [required]="true"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.code"
      (valueChange)="mark(items)"
    />
  </ng-template>
</sd-sheet-column>

<!-- 드롭다운 셀 (edit 무관하게 항상 편집 가능) -->
<sd-sheet-column [key]="'endCustomerName'" [header]="'최종고객사'">
  <ng-template [cell]="items()" let-item="item">
    <sd-shared-data-select
      [inset]="true"
      [size]="'sm'"
      [required]="true"
      [disabled]="!canEdit()"
      [items]="sharedEndCustomers.items()"
      [(value)]="item.endCustomerId"
      (valueChange)="mark(items)"
    >
      <ng-template [itemOf]="sharedEndCustomers.items()" let-ec>
        {{ ec.name }}
      </ng-template>
    </sd-shared-data-select>
  </ng-template>
</sd-sheet-column>

<!-- 다단 헤더 셀 -->
<sd-sheet-column [header]="['납품', '담당자명']" [key]="'contactName'">
  <ng-template [cell]="items()" let-item="item" let-edit="edit">
    <sd-textfield
      [inset]="true"
      [size]="'sm'"
      [type]="'text'"
      [disabled]="!canEdit()"
      [readonly]="!edit"
      [(value)]="item.contactName"
      (valueChange)="mark(items)"
    />
  </ng-template>
</sd-sheet-column>

<!-- 날짜 포맷 셀 -->
<sd-sheet-column [key]="'lastModifiedAt'" [header]="'수정일시'" [hidden]="true">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm tx-center">
      {{ item.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
    </div>
  </ng-template>
</sd-sheet-column>

<!-- 숫자 포맷 셀 -->
<sd-sheet-column [header]="['박스수', '지시']" [key]="'instructionBoxCount'">
  <ng-template [cell]="items()" let-item="item">
    <div class="p-xs-sm tx-right">
      {{ item.instructionBoxCount | number }}
    </div>
  </ng-template>
</sd-sheet-column>

<!-- 버튼 셀 (정렬 비활성) -->
<sd-sheet-column [header]="'내역'" [key]="'historyButton'" [disableSorting]="true">
  <ng-template [cell]="items()" let-item="item">
    <sd-button [inset]="true" [size]="'sm'" (click)="onItemHistoryButtonClick(item, $event)">
      <ng-icon [svg]="tablerHistory" />
      내역
    </sd-button>
  </ng-template>
</sd-sheet-column>
```

#### 헤더 템플릿: `<ng-template #headerTpl>`

기본 텍스트 헤더 대신 커스텀 헤더를 렌더링한다 (잘 사용하지 않음).

#### 요약 템플릿: `<ng-template #summaryTpl>`

시트 하단 요약 행에 렌더링된다.

## Host Directives

- `SdCommandDirective` — `Ctrl+S` 키보드 단축키를 `sdSaveCommand` 이벤트로 변환. `formCtrl.requestSubmit()` → `submit` 이벤트.

## 내부 레이아웃 구조

```
<sd-base-container>
  ┌─ #topbarTpl (page) 또는 #commandTpl (기타) ──────┐
  │  [저장 버튼] [#commandTpl 내용]                   │
  │  (readonly=true이면 저장 버튼 숨김)               │
  └──────────────────────────────────────────────────┘

  ┌─ #contentTpl ────────────────────────────────────┐
  │  <div class="flex-column fill">                  │
  │    [필터 영역] filterTpl이 있을 때만              │
  │      - 조회 버튼 자동 추가                        │
  │      - #filterTpl 내용 렌더링                     │
  │                                                   │
  │    [도구 영역] readonly=false 또는 toolTpl        │
  │      - 등록/선택 삭제/선택 복구 버튼 자동 추가    │
  │      - #toolTpl 내용 렌더링                       │
  │                                                   │
  │    [시트 영역]                                   │
  │      - readonly=false: <sd-form> 안에 sd-sheet    │
  │      - readonly=true: <div> 안에 sd-sheet         │
  │      - columnControls()를 sd-sheet에 전달         │
  │      - 자동 삭제/복구 버튼 컬럼 추가              │
  │  </div>                                          │
  └──────────────────────────────────────────────────┘

  ┌─ #bottomCommandTpl (modal+selectMode 또는 있을 때) ┐
  │  [#bottomCommandTpl 내용 (좌측)]                    │
  │  [선택 해제 버튼] [확인 버튼(multi만)]               │
  └────────────────────────────────────────────────────┘
</sd-base-container>
```

## 자동 생성되는 삭제/복구 컬럼

`readonly=false`일 때 시트 맨 앞(좌측 고정)에 삭제/복구 아이콘 컬럼이 자동 추가된다:
- `currDeletedItems`에 포함되지 않은 항목: 삭제(eraser) 아이콘 → 클릭 시 `delete.emit([item])`
- `currDeletedItems`에 포함된 항목: 복구(restore) 아이콘 → 클릭 시 `restore.emit([item])`

## selectMode (시트 선택 모드) 상세

| `selectMode` 값 | 시트 `selectMode` | 동작 |
|-----------------|-------------------|------|
| `undefined` (미지정) | `readonly ? undefined : 'multi'` | 일반 CRUD: 쓰기 모드이면 multi 선택(체크박스), 읽기 모드이면 선택 없음 |
| `"single"` | `"single"` | 모달 선택: 항목 클릭 시 즉시 선택 → `SdActivatedModalProvider.close` 호출 |
| `"multi"` | `"multi"` | 모달 선택: 체크박스 선택 → 하단 "확인" 버튼 클릭 시 `close` 호출 |

### 모달 선택 모드에서 자동 close

- `selectMode="single"`: `selectedKeysChange` 이벤트에서 `selectedKeys.length === 1`이면 자동으로 `SdActivatedModalProvider.close.emit({ selectedKeys })`
- `selectMode="multi"`: "확인" 버튼 클릭 시 `close.emit({ selectedKeys })`
- "선택 해제" 버튼: `selectedKeys`를 `[]`로 초기화. `single` 모드에서는 추가로 `close.emit({ selectedKeys: [] })`

## `totalPageCount`와 정렬 동작

| `totalPageCount` | `useAutoSort` | 정렬 동작 |
|-------------------|--------------|----------|
| `0` (기본) | `true` | 클라이언트 측 정렬 (SdSheet 내부) |
| `> 0` | `false` | 서버 측 정렬 (소비 컴포넌트에서 `sorts` 변경 감지 → 재조회) |

## Usage: 전체 CRUD 목록 (페이지 viewType)

```typescript
@Component({
  imports: [SdCrudList, SdSheetColumn, SdSheetColumnCellTemplate, SdTextfield, SdCheckbox, FormatPipe],
  template: `
    <sd-crud-list
      [(ready)]="ready"
      [initialized]="initialized()"
      [(busyCount)]="busyCount"
      [restricted]="!perms().includes('use')"
      [readonly]="!canEdit()"
      [viewType]="viewType()"
      [selectMode]="selectMode()"
      [key]="'customer'"
      [items]="items()"
      [currDeletedItems]="currDeletedItems()"
      [(selectedKeys)]="selectedKeys"
      [(currentPage)]="page"
      [totalPageCount]="pageLength()"
      [(sorts)]="sortingDefs"
      [trackByFn]="trackByFn"
      (filterSubmit)="onFilterSubmit()"
      (submit)="onSubmit()"
      (create)="onCreate()"
      (delete)="onDelete($event)"
      (restore)="onRestore($event)"
    >
      <ng-template #filterTpl>
        <div class="form-box-item">
          <label>검색어</label>
          <sd-textfield
            [type]="'text'"
            [placeholder]="'코드/명칭'"
            [(value)]="filter().searchText"
            (valueChange)="mark(filter)"
          />
        </div>
        <div class="form-box-item">
          <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="mark(filter)">
            삭제항목 포함
          </sd-checkbox>
        </div>
      </ng-template>

      <sd-sheet-column [fixed]="true" [key]="'id'" [header]="'#'">
        <ng-template [cell]="items()" let-item="item">
          <div class="p-xs-sm tx-right">
            {{ item.id }}
          </div>
        </ng-template>
      </sd-sheet-column>

      <sd-sheet-column [header]="'코드'" [key]="'code'">
        <ng-template [cell]="items()" let-item="item" let-edit="edit">
          <sd-textfield
            [type]="'text'"
            [inset]="true"
            [size]="'sm'"
            [required]="true"
            [disabled]="!canEdit()"
            [readonly]="!edit"
            [(value)]="item.code"
            (valueChange)="mark(items)"
          />
        </ng-template>
      </sd-sheet-column>

      <sd-sheet-column [header]="'명칭'" [key]="'name'">
        <ng-template [cell]="items()" let-item="item" let-edit="edit">
          <sd-textfield
            [type]="'text'"
            [inset]="true"
            [size]="'sm'"
            [required]="true"
            [disabled]="!canEdit()"
            [readonly]="!edit"
            [(value)]="item.name"
            (valueChange)="mark(items)"
          />
        </ng-template>
      </sd-sheet-column>

      <sd-sheet-column [key]="'lastModifiedAt'" [header]="'수정일시'" [hidden]="true">
        <ng-template [cell]="items()" let-item="item">
          <div class="p-xs-sm tx-center">
            {{ item.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
          </div>
        </ng-template>
      </sd-sheet-column>
    </sd-crud-list>
  `,
})
export class CustomerList implements SdSelectModal<number> {
  //== DI ==
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _sdToast = inject(SdToastProvider);

  //== 권한 ==
  perms = injectPermsSignal(["base.customer"], ["use", "edit"]);
  canEdit = computed(() => this.perms().includes("edit") && this.viewType() === "page");

  viewType = injectViewTypeSignal();

  //== SdSelectModal<number> 계약 (모달로 열릴 때) ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedKeys = model<number[]>([]);
  close = output<SelectModalOutputResult<number> | undefined>();

  //== 상태 ==
  ready = signal(false);
  initialized = signal(false);
  busyCount = signal(0);

  private _itemsSnapshot: IItem[] = [];
  items = signal<IItem[]>([]);
  currDeletedItems = computed(() => this.items().filter((it) => it.isDeleted));
  diffs = computed(() => this.items().oneWayDiffs(this._itemsSnapshot, "id"));

  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<SortingDef[]>([]);

  filter = signal<IFilter>({ isIncludeDeleted: false });
  lastFilter = signal<IFilter>({ isIncludeDeleted: false });

  trackByFn = (item: IItem) => item.id;

  constructor() {
    effect(() => {
      if (!this.perms().includes("use") || !this.ready()) {
        this.initialized.set(true);
        return;
      }

      this.lastFilter();  // 변경 감지 의존성
      this.page();
      this.sortingDefs();

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => {
          await this._refresh();
        });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
  }

  onFilterSubmit() {
    this.page.set(0);
    this.lastFilter.set({ ...this.filter() });
  }

  async onSubmit(): Promise<void> {
    if (this.busyCount() > 0) return;
    const diffs = this.diffs();
    if (diffs.length === 0) {
      this._sdToast.info("변경사항이 없습니다.");
      return;
    }
    // ... 저장 로직
  }

  onCreate(): void {
    this.items.update((list) => [{ isDeleted: false }, ...list]);
  }

  async onDelete(items: IItem[]): Promise<void> {
    // id 없는 신규 항목: 목록에서 제거
    if (items.every((it) => it.id == null)) {
      this.items.update((list) => list.filter((it) => !items.includes(it)));
      return;
    }
    // id 있는 항목: DB에서 삭제 처리
    // ...
  }

  async onRestore(items: IItem[]): Promise<void> {
    // DB에서 복구 처리
    // ...
  }
}
```

## Usage: 읽기 전용 목록 (control viewType, readonly)

```html
<sd-crud-list
  [(ready)]="ready"
  [initialized]="initialized()"
  [(busyCount)]="busyCount"
  [restricted]="!perms().includes('use')"
  [readonly]="true"
  [viewType]="viewType()"
  [selectMode]="selectMode() ?? 'multi'"
  [key]="'outbound-instruction'"
  [items]="items()"
  [totalPageCount]="pageLength()"
  [trackByFn]="trackByFn"
  [(currentPage)]="page"
  [(sorts)]="sortingDefs"
  [(selectedKeys)]="selectedKeys"
  (filterSubmit)="onFilterSubmit()"
>
  <!-- readonly=true이므로 submit/create/delete/restore 이벤트 불필요 -->

  <!-- toolTpl로 커스텀 등록 버튼만 제공 -->
  @if (canEdit()) {
    <ng-template #toolTpl>
      <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
        <ng-icon [svg]="tablerCirclePlus" />
        신규등록
      </sd-button>
    </ng-template>
  }

  <sd-sheet-column [fixed]="true" [header]="'#'" [key]="'id'">
    <!-- ... -->
  </sd-sheet-column>
</sd-crud-list>
```

## Anti-patterns

```html
<!-- ❌ filterTpl 안에 조회 버튼을 직접 넣지 않는다 (자동 추가됨) -->
<ng-template #filterTpl>
  <sd-button [type]="'submit'">조회</sd-button>  <!-- ❌ -->
  <sd-textfield [(value)]="filter().name" />
</ng-template>

<!-- ❌ sd-sheet를 직접 배치하지 않는다 (SdCrudList가 내부에서 생성) -->
<sd-crud-list>
  <sd-sheet>  <!-- ❌ -->
    <sd-sheet-column />
  </sd-sheet>
</sd-crud-list>

<!-- ✅ sd-sheet-column을 sd-crud-list 직접 자식으로 배치한다 -->
<sd-crud-list>
  <sd-sheet-column [key]="'name'" [header]="'이름'">  <!-- ✅ -->
    <ng-template [cell]="items()" let-item="item">
      {{ item.name }}
    </ng-template>
  </sd-sheet-column>
</sd-crud-list>

<!-- ❌ cell 템플릿에서 items 시그널 호출을 빠뜨리지 않는다 -->
<ng-template [cell]="[]" let-item="item">  <!-- ❌ 타입 추론 불가 -->
<ng-template [cell]="items()" let-item="item">  <!-- ✅ -->
```
