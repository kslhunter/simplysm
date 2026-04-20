# Recipe: CRUD 리스트 화면 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` · `<sd-sheet>` · `<sd-sheet-column>` 표준 컴포넌트를 **직접 조립**하여 CRUD 리스트 화면을 구성한다. 과거 `SdDataSheet` / `SdDataSheetBase` / `SdDataSheetColumn`이 감추고 있던 필터·페이지네이션·정렬·선택·편집·삭제복구·엑셀 업로드·다운로드·단축키 흐름을 화면 내부에 인라인으로 풀어쓴다.

## 1. Overview

- 제거된 추상화: `SdDataSheet`(컴포넌트) / `SdDataSheetBase`(추상 클래스) / `SdDataSheetColumn`(디렉티브) / `SdDataSheetItemPropInfo`·`SdDataSheetItemInfo`·`SdDataSheetSearchResult`(타입 3종) / `setupCloserWhenSingleSelectionChange`(단일 선택 시 모달 자동 닫기 유틸) / 내부 Manager 5종(`injectDataSheet{Refresh,InlineEdit,ModalEdit,Excel}Manager`, `useDataSheetFilterManager`)
- 대체: 소비 컴포넌트가 표준 조각을 직접 조립
- 조립 요소:
  - `<sd-busy-container [busy] [message]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 페이지 뷰 상단 헤더
  - `<sd-form (formSubmit)>` — 필터 제출 / inline 편집 저장 트리거
  - `<sd-sheet>` + `<sd-sheet-column>` + `<ng-template [cell]>` — 시트 본체 (items, 페이지네이션, 정렬, 선택, `cumulativeSelection`, 셀 스타일)
  - `injectViewTypeSignal()` — page / modal / control 뷰 판정
  - `injectPermsSignal()` — 권한 signal
  - `useSortingManager()` — 정렬 def 관리 (선택적)
  - `setupCanDeactivate()` — 이탈 방지
  - `mark(sig)` — signal 참조 갱신
  - `SdToastProvider.try(fn, messageFn)` — 에러 래퍼 + busy 카운트
  - `SdModalProvider.showAsync(...)` — 편집 모달 호출
  - `SdFileDialogProvider.showAsync(...)` — 엑셀 업로드 파일 선택
  - `getOrmDataEditToastErrorMessage(err)` — ORM 에러 → 사용자 메시지 변환
  - `SdCommandDirective`(`sdRefreshCommand` / `sdSaveCommand`) — Ctrl+Alt+L / Ctrl+S 단축키
- 데이터 비교:
  - `Array.prototype.oneWayDiffs(orgItems, keyFn)` (`@simplysm/core-common` side-effect import) — `ArrayOneWayDiffResult<T>[]` 반환 (`type: "create" | "update" | "same"`)
  - `obj.equal(a, b)` — deep equal

## 2. 언제 사용하는가

| 상황 | 적용 여부 |
|---|---|
| 필터 + 페이지네이션 + 정렬 + 선택이 있는 일반 CRUD 리스트 | 본 레시피 전체 적용 |
| 행을 직접 수정하는 인라인 편집 화면 | 레시피 + [변형 1: inline 편집 모드](#5-변형-inline-편집-모드) |
| 다른 화면에서 항목을 고르는 선택 모달 | 레시피 + [변형 2: 선택 모달](#6-변형-선택-모달-뷰) |
| 엑셀 업로드 / 다운로드가 필요 | 레시피 + [변형 3: 엑셀 업로드·다운로드](#7-변형-엑셀-업로드다운로드) |
| 상세 폼(단일 레코드 편집) | 본 레시피 대신 [`crud-detail.md`](./crud-detail.md) 사용 |
| 페이지 / 모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 완성 예제

아래는 **페이지 뷰 + modal 편집 모드** 기준 완성 컴포넌트다. CRUD 리스트의 가장 일반적 형태(필터 검색 → 페이지네이션 + 정렬 → 모달로 row 편집 → 선택 삭제/복구)를 커버한다. inline / 선택 모달 / 엑셀은 `## 5`~`## 7`의 변형 스니펫으로 교체·추가한다.

```typescript
import { NgIcon } from "@ng-icons/core";
import {
  tablerAlertTriangle,
  tablerCirclePlus,
  tablerEdit,
  tablerEraser,
  tablerRefresh,
  tablerRestore,
  tablerSearch,
} from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import {
  getOrmDataEditToastErrorMessage,
  injectCurrentPageCodeSignal,
  injectFullPageCodeSignal,
  injectPermsSignal,
  injectViewTypeSignal,
  mark,
  SdActivatedModalProvider,
  SdAnchor,
  SdAppStructureProvider,
  SdBusyContainer,
  SdButton,
  SdCommandDirective,
  SdForm,
  SdModalProvider,
  SdSheet,
  SdSheetColumn,
  SdSheetColumnCellTemplate,
  SdSystemLogProvider,
  SdTextfield,
  SdToastProvider,
  SdTopbar,
  SdTopbarContainer,
  setupCanDeactivate,
  type SortingDef,
} from "@simplysm/angular";
import "@simplysm/core-common";  // Array.prototype.oneWayDiffs 등 프로토타입 확장

interface ICustomer {
  id: string;
  name: string;
  phone: string;
  isDeleted: boolean;
}

interface ICustomerFilter {
  search: string;
}

interface ICustomerSearchResult {
  items: ICustomer[];
  pageLength: number;
  summary: Partial<ICustomer>;
}

@Component({
  selector: "app-customer-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdForm, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate,
    SdButton, SdAnchor, SdTextfield, NgIcon,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0" [message]="busyMessage()">
      @if (initialized()) {
        @if (!canUse()) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="icons.tablerAlertTriangle" [size]="'5em'" />
            <br /><br />
            '{{ modalOrPageTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else if (viewType() === "page") {
          <sd-topbar-container>
            <sd-topbar>
              <h4>{{ modalOrPageTitle() }}</h4>
              <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                <ng-icon [svg]="icons.tablerRefresh" />
                새로고침 <small>(CTRL+ALT+L)</small>
              </sd-button>
            </sd-topbar>

            <div class="flex-column fill">
              <!-- 필터 영역 -->
              <div class="p-default">
                <sd-form (formSubmit)="onFilterSubmit()">
                  <div class="form-box-inline">
                    <sd-button [type]="'submit'" [theme]="'info'">
                      <ng-icon [svg]="icons.tablerSearch" />
                      조회
                    </sd-button>
                    <sd-textfield
                      [type]="'text'"
                      [placeholder]="'이름/전화번호 검색'"
                      [(value)]="filterSearch"
                      [inset]="true"
                      [size]="'sm'"
                    />
                  </div>
                </sd-form>
              </div>

              <!-- 도구 영역 -->
              @if (canEdit()) {
                <div class="flex-row gap-sm p-xs-default">
                  <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onCreateItemButtonClick()">
                    <ng-icon [svg]="icons.tablerCirclePlus" />
                    등록
                  </sd-button>
                  <sd-button
                    [size]="'sm'"
                    [theme]="'link-danger'"
                    (click)="onToggleDeleteItemsButtonClick(true)"
                    [disabled]="!hasSelectedNotDeleted()"
                  >
                    <ng-icon [svg]="icons.tablerEraser" />
                    선택 삭제
                  </sd-button>
                  @if (hasSelectedDeleted()) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-warning'"
                      (click)="onToggleDeleteItemsButtonClick(false)"
                    >
                      <ng-icon [svg]="icons.tablerRestore" />
                      선택 복구
                    </sd-button>
                  }
                </div>
              }

              <!-- 시트 -->
              <sd-sheet
                [key]="'customer-list-sheet'"
                [items]="items()"
                [(currentPage)]="page"
                [totalPageCount]="pageLength()"
                [(sorts)]="sortingDefs"
                [selectMode]="'multi'"
                [(selectedItems)]="selectedItems"
                [trackByFn]="trackByFn"
                [getItemCellStyleFn]="getItemCellStyleFn"
                class="flex-fill p-default pt-0"
              >
                <sd-sheet-column [key]="'name'" [header]="'이름'" [width]="'200px'">
                  <ng-template [cell]="items()" let-item="item">
                    <sd-anchor (click)="onEditItemButtonClick(item, $event)" class="flex-row">
                      <div class="p-xs-sm">
                        <ng-icon [svg]="icons.tablerEdit" />
                      </div>
                      <div class="flex-fill p-xs-sm">{{ item.name }}</div>
                    </sd-anchor>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column [key]="'phone'" [header]="'전화번호'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm">{{ item.phone }}</div>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>
            </div>
          </sd-topbar-container>
        } @else if (viewType() === "modal") {
          <!-- 모달 뷰 분기는 변형 2 "선택 모달" 참조 -->
        } @else {
          <!-- control 뷰: 다른 화면의 영역으로 삽입될 때 -->
        }
      }
    </sd-busy-container>
  `,
})
export class CustomerListPage {
  //== DI ==
  private readonly _sdToast = inject(SdToastProvider);
  private readonly _sdModal = inject(SdModalProvider);
  private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  private readonly _sdAppStructure = inject(SdAppStructureProvider);
  private readonly _sdSystemLog = inject(SdSystemLogProvider);

  //== 라우팅 / 권한 ==
  private readonly _fullPageCode = injectFullPageCodeSignal();
  private readonly _currPageCode = injectCurrentPageCodeSignal();
  protected readonly viewType = injectViewTypeSignal();
  protected readonly canUse = injectPermsSignal(
    () => ["sales.customer"],
    () => ["use"],
  );
  protected readonly canEdit = injectPermsSignal(
    () => ["sales.customer"],
    () => ["edit"],
  );

  //== 상태 ==
  protected readonly busyCount = signal(0);
  protected readonly busyMessage = signal<string | undefined>(undefined);
  protected readonly initialized = signal(false);

  protected readonly items = signal<ICustomer[]>([]);
  protected readonly summaryData = signal<Partial<ICustomer>>({});
  protected readonly selectedItems = signal<ICustomer[]>([]);
  protected readonly page = signal(0);
  protected readonly pageLength = signal(0);
  protected readonly sortingDefs = signal<SortingDef[]>([{ key: "name", desc: false }]);
  protected readonly filterSearch = signal("");
  private readonly _lastFilter = signal<ICustomerFilter>({ search: "" });
  private _snapshot: ICustomer[] = [];

  //== 파생 ==
  protected readonly modalOrPageTitle = computed(() => {
    try {
      return (
        this._sdActivatedModal?.modalComponent()?.title() ??
        this._sdAppStructure.getTitleByFullCode(this._currPageCode?.() ?? this._fullPageCode())
      );
    } catch (err) {
      void this._sdSystemLog.writeAsync("warn", `title 계산 실패: ${String(err)}`);
      return "";
    }
  });

  protected readonly hasSelectedDeleted = computed(() =>
    this.selectedItems().some((it) => it.isDeleted),
  );
  protected readonly hasSelectedNotDeleted = computed(() =>
    this.selectedItems().some((it) => !it.isDeleted),
  );

  protected readonly trackByFn = (item: ICustomer): string => item.id;

  protected readonly getItemCellStyleFn = (item: ICustomer): string | undefined =>
    item.isDeleted ? "text-decoration: line-through;" : undefined;

  protected readonly icons = {
    tablerAlertTriangle, tablerCirclePlus, tablerEdit, tablerEraser,
    tablerRefresh, tablerRestore, tablerSearch,
  };

  //== 라이프사이클 ==
  constructor() {
    // 최초 로딩 + 필터/페이지/정렬 변경 시 재조회
    effect(() => {
      this._lastFilter();
      this.page();
      this.sortingDefs();
      if (!this.canUse()) return;
      untracked(() => {
        void this._refresh();
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
  }

  //== 메서드 ==
  protected onFilterSubmit(): void {
    this.page.set(0);
    this._lastFilter.set({ search: this.filterSearch() });
  }

  protected onRefreshButtonClick(): void {
    if (this.busyCount() > 0) return;
    if (!this.canUse()) return;
    if (!this._checkIgnoreChanges()) return;
    mark(this._lastFilter); // 참조만 갱신 → effect 재실행
  }

  protected async onCreateItemButtonClick(): Promise<void> {
    await this._editItem();
  }

  protected async onEditItemButtonClick(item: ICustomer, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this._editItem(item);
  }

  protected async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
    await this._sdToast.try(async () => {
      this.busyCount.update((v) => v + 1);
      try {
        // 서버 호출 (앱별 구현):
        //   await this._api.toggleDeleteAsync(this.selectedItems().map((it) => it.id), del);
        await this._refresh();
      } finally {
        this.busyCount.update((v) => v - 1);
      }
    }, getOrmDataEditToastErrorMessage);
  }

  private _checkIgnoreChanges(): boolean {
    return this._getDiffs().length === 0
      || confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?");
  }

  private _getDiffs() {
    return this.items().oneWayDiffs(this._snapshot, "id");
  }

  private async _refresh(): Promise<void> {
    await this._sdToast.try(async () => {
      this.busyCount.update((v) => v + 1);
      try {
        const r = await this._fetchList(this._lastFilter(), this.page(), this.sortingDefs());
        this.items.set(r.items);
        this.pageLength.set(r.pageLength);
        this.summaryData.set(r.summary);
        // 선택 유지 (현재 items에 없는 item 제외)
        const currKeys = new Set(r.items.map((it) => this.trackByFn(it)));
        this.selectedItems.update((sel) =>
          sel.filter((it) => currKeys.has(this.trackByFn(it))),
        );
        this._snapshot = r.items.map((it) => ({ ...it }));
        this.initialized.set(true);
      } finally {
        this.busyCount.update((v) => v - 1);
      }
    }, getOrmDataEditToastErrorMessage);
  }

  private async _editItem(item?: ICustomer): Promise<void> {
    // 편집 모달 (소비 앱이 구현한 CustomerEditModal 사용):
    //   const r = await this._sdModal.showAsync({
    //     title: item == null ? "고객 등록" : "고객 수정",
    //     type: CustomerEditModal,
    //     inputs: { itemId: item?.id },
    //   });
    //   if (r != null) await this._refresh();
  }

  private async _fetchList(
    filter: ICustomerFilter,
    page: number,
    sortingDefs: SortingDef[],
  ): Promise<ICustomerSearchResult> {
    // 예시 (orm-common):
    //   let qr = this._dbCtx.customer.where((it) => ... filter.search ... );
    //   for (const s of sortingDefs) qr = qr.orderBy(s.key, s.desc ? "DESC" : "ASC");
    //   const items = await qr.limit(page * 50, 50).resultAsync();
    //   const pageLength = Math.ceil((await qr.countAsync()) / 50);
    //   return { items, pageLength, summary: {} };
    throw new Error("구현 필요");
  }
}
```

## 4. 분해 설명

각 블록의 역할과 원본 `SdDataSheet` 코드 대응 지점:

| 블록 | 역할 | 원본 대응 |
|---|---|---|
| `<sd-busy-container [busy] [message]>` | 전체 busy 오버레이 | `sd-data-sheet.ts:65-71` + `SdBaseContainer` |
| `@if (initialized())` | 초기 데이터 로딩 전 콘텐츠 숨김 (깜박임 방지) | `sd-data-sheet.base.ts:94`·`_refresh()` 말미 `initialized.set(true)` |
| `@if (!canUse())` | 권한 없음 메시지 | `sd-base-container.ts:44-51` + `page-modal-container.md` |
| `@if (viewType() === "page")` / `"modal"` / else | 뷰 타입 분기 (`page-modal-container.md` 참조) | `sd-data-sheet.ts:65` `viewType` → `SdBaseContainer` 내부 분기 |
| `<sd-topbar-container>` + `<sd-topbar>` | 페이지 뷰 헤더 | `sd-data-sheet.ts:72-87` `pageTopbarTpl` |
| `<sd-form (formSubmit)>` + `form-box-inline` | 필터 제출 폼 | `sd-data-sheet.ts:111-125` 필터 슬롯 |
| 도구 영역 (`<sd-button size=sm theme=link-*>`) | 등록 / 선택 삭제 / 선택 복구 | `sd-data-sheet.ts:127-203` 도구 영역 |
| `<sd-sheet>` + `<sd-sheet-column>` + `<ng-template [cell]>` | 시트 본체, 셀 렌더링 | `sd-data-sheet.ts:205-346` |
| `[cell]` 템플릿의 `<sd-anchor (click)>` | 셀 클릭 → 편집 모달 진입 | `sd-data-sheet.ts:284-315` |
| `getItemCellStyleFn` | `isDeleted` 시 취소선 | `sd-data-sheet.base.ts:137-140` |
| `hostDirectives` + `SdCommandDirective` | Ctrl+Alt+L / Ctrl+S 단축키 | `sd-data-sheet.ts:57-63` |
| `setupCanDeactivate(() => viewType() === "modal" || checkIgnoreChanges())` | 라우트 이탈 시 변경사항 확인 | `sd-data-sheet.base.ts:227` |
| `_refresh()` 내 `busyCount.update + try/finally + sdToast.try` | busy 카운트 증감 + 에러 토스트 | `injectDataSheetRefreshManager.ts:33-46` (삭제됨) |
| `_getDiffs()` = `items.oneWayDiffs(snapshot, "id")` | 변경 감지 | `injectDataSheetRefreshManager.ts`의 `getDiffs()` (삭제됨) |
| `effect(() => { lastFilter(); page(); sortingDefs(); ... })` | 필터/페이지/정렬 변경 시 재조회 | `injectDataSheetRefreshManager.ts` (삭제됨) |
| `mark(this._lastFilter)` | lastFilter 참조 갱신 → effect 재실행 (값 변경 없음) | `sd-data-sheet.base.ts:245` |
| `modalOrPageTitle` computed | `modal title ?? app structure title` | `sd-base-container.ts:102-113` (`header ??` 부분은 필요 시 `input()` 추가) |

### 상태 분해

| signal / computed | 역할 |
|---|---|
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `busyMessage` | busy 오버레이 문구 |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `items` | 현재 페이지 items |
| `summaryData` | 서버가 반환한 합계·집계 (선택적으로 시트 summary row에 표시) |
| `selectedItems` | 선택된 item 배열 (`<sd-sheet [(selectedItems)]>`로 양방향) |
| `page` / `pageLength` | 0-based 현재 페이지 / 전체 페이지 수 |
| `sortingDefs` | `SortingDef[]` — `{ key: string; desc: boolean }[]`, `<sd-sheet [(sorts)]>`로 양방향 |
| `filterSearch` / `_lastFilter` | filter는 입력 버퍼, lastFilter는 "조회" 제출 시점 스냅샷 |
| `_snapshot` | 최근 `_refresh()` 시점의 items 복사본 (변경 감지용) |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onFilterSubmit()` | page=0 리셋 + `_lastFilter.set(filter 스냅샷)` |
| `onRefreshButtonClick()` | busy/권한/변경사항 확인 후 `mark(_lastFilter)` |
| `_refresh()` | search → items.set + pageLength + summary + 선택 유지 + snapshot 갱신 |
| `_editItem(item?)` | `SdModalProvider.showAsync(...)`로 편집 모달 실행 후 refresh |
| `onToggleDeleteItemsButtonClick(del)` | 선택 item ID들을 서버에 전송하여 isDeleted 토글 + refresh |
| `_checkIgnoreChanges()` | snapshot 대비 diff 없으면 true, 있으면 `confirm` 후 true/false |
| `_getDiffs()` | `items.oneWayDiffs(_snapshot, "id")` — `ArrayOneWayDiffResult<T>[]` |

## 5. 변형: inline 편집 모드

행을 직접 수정하고 `ArrayOneWayDiffResult` 기반 diff로 일괄 저장한다. `CustomerListPage`를 기준으로 아래 변경을 적용한다:

```typescript
// 1) imports에 추가: FormatPipe (선택)
//    host에 sdSaveCommand 추가
hostDirectives: [
  { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
],
host: {
  "(sdRefreshCommand)": "onRefreshButtonClick()",
  "(sdSaveCommand)": "onSaveButtonClick()",
},

// 2) template — 도구 영역에 "행 추가" 버튼 추가
<sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
  <ng-icon [svg]="icons.tablerCirclePlus" />
  행 추가
</sd-button>

// 3) template — <sd-sheet>를 <sd-form>으로 감싸고 (formSubmit)="onSubmit()" 추가
<sd-form #formCtrl (formSubmit)="onSubmit()" class="flex-fill p-default pt-0">
  <sd-sheet ...>
    <!-- isDeleted 전용 고정 컬럼 -->
    @if (canEdit()) {
      <sd-sheet-column [fixed]="true" [key]="'isDeleted'">
        <ng-template #headerTpl>
          <div class="p-xs-sm tx-center"><ng-icon [svg]="icons.tablerEraser" /></div>
        </ng-template>
        <ng-template [cell]="items()" let-item="item">
          <div class="p-xs-sm tx-center">
            <sd-anchor
              [theme]="'danger'"
              (click)="onToggleDeleteItemButtonClick(item)"
            >
              <ng-icon [svg]="item.isDeleted ? icons.tablerRestore : icons.tablerEraser" />
              {{ item.isDeleted ? "복구" : "삭제" }}
            </sd-anchor>
          </div>
        </ng-template>
      </sd-sheet-column>
    }

    <!-- 편집 가능 셀: sd-textfield 등은 [inset]="true" [size]="'sm'" 명시 -->
    <sd-sheet-column [key]="'name'" [header]="'이름'">
      <ng-template [cell]="items()" let-item="item">
        <sd-textfield [type]="'text'" [(value)]="item.name" [inset]="true" [size]="'sm'" />
      </ng-template>
    </sd-sheet-column>
  </sd-sheet>
</sd-form>

// 4) 메서드 추가/대체
protected readonly formCtrl = viewChild<SdForm>("formCtrl");

protected onSaveButtonClick(): void {
  this.formCtrl()?.requestSubmit();
}

protected onAddItemButtonClick(): void {
  const newItem: ICustomer = { id: Uuid.generate().toString(), name: "", phone: "", isDeleted: false };
  this.items.update((list) => [newItem, ...list]);
}

protected onToggleDeleteItemButtonClick(item: ICustomer): void {
  item.isDeleted = !item.isDeleted;
  mark(this.items); // OnPush 재렌더 + effect 알림
}

protected async onSubmit(): Promise<void> {
  const diffs = this._getDiffs();
  if (diffs.length === 0) {
    this._sdToast.info("변경사항이 없습니다.");
    return;
  }
  await this._sdToast.try(async () => {
    this.busyCount.update((v) => v + 1);
    try {
      // 서버 호출: await this._api.submitAsync(diffs);
      //   diffs.forEach((d) => {
      //     if (d.type === "create") { ... insert ... }
      //     else if (d.type === "update") { ... update ... }
      //     // "same"은 includeSame=true 옵션에서만 등장. 여기서는 create/update만.
      //   });
      // 삭제는 `isDeleted: true`로 업데이트 → 서버가 soft-delete 처리
      await this._refresh();
    } finally {
      this.busyCount.update((v) => v - 1);
    }
  }, getOrmDataEditToastErrorMessage);
}
```

> **`oneWayDiffs`는 delete를 다루지 않는다.** `newItems.oneWayDiffs(orgItems, keyFn)`은 `type: "create" | "update" | "same"`만 반환한다. 삭제 의사는 **`item.isDeleted = true` 플래그**로 표현하여 `"update"` diff로 전송된다. 행을 items 배열에서 제거하면 diff에서 누락되므로 절대 삭제하지 않는다.

## 6. 변형: 선택 모달 뷰

화면을 선택 모달로 재사용한다. `<sd-sheet>`가 items 기반이므로 key는 `selectedItems().map((it, i) => trackByFn(it, i))` 수동 변환으로 `SelectModalOutputResult<T>`를 구성한다.

```typescript
// 1) 컴포넌트 import
import {
  type SdSelectModal,
  type SelectModalOutputResult,
} from "@simplysm/angular";
import { input, output, model } from "@angular/core";

// 2) 클래스 선언에 implements 추가
export class CustomerListPage implements SdSelectModal<ICustomer> {
  // ...기존 필드 유지

  // SdModalContentDef<SelectModalOutputResult<ICustomer>> 요구 필드
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  // SdSelectModal<ICustomer> 요구 필드
  selectMode = input<"single" | "multi">();
  selectedItemKeys = input<string[]>([]);

  // initialized는 WritableSignal이 아닌 Signal을 요구하므로 computed 또는 기존 signal 그대로 노출
  // (위 완성 예제의 protected readonly initialized = signal(false) 를 그대로 사용)
}

// 3) template — 시트의 selectMode를 input 값으로 연결, 누적 선택 활성화
<sd-sheet
  ...
  [selectMode]="selectMode()"
  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
  [trackByFn]="trackByFn"
  [(selectedItems)]="selectedItems"
>
  ...
</sd-sheet>

// 4) template — 모달 뷰 분기 (page-modal-container.md 기반)
} @else if (viewType() === "modal") {
  <div class="flex-column fill">
    <div class="flex-fill">
      <!-- 필터 / 도구 / 시트를 이곳에 동일하게 배치 (page 분기와 같은 구조) -->
    </div>
    <!-- 하단 액션 바 -->
    <div class="p-sm-default flex-row gap-sm bdt bdt-theme-gray-lightest">
      <div class="flex-fill"></div>
      @if (selectedItems().length > 0) {
        <sd-button [size]="'sm'" [theme]="'danger'" (click)="onModalCancelClick()">
          {{ selectMode() === "multi" ? "모두" : "선택" }} 해제
        </sd-button>
      }
      @if (selectMode() === "multi") {
        <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalConfirmClick()">
          확인({{ selectedItems().length }})
        </sd-button>
      }
    </div>
  </div>
}

// 5) 메서드 추가 — close.emit 수동 변환
protected onModalConfirmClick(): void {
  const items = this.selectedItems();
  this.close.emit({
    selectedItemKeys: items.map((it, i) => this.trackByFn(it, i) as string),
    selectedItems: items,
  });
}

protected onModalCancelClick(): void {
  this.selectedItems.set([]);
  this.close.emit({ selectedItemKeys: [], selectedItems: [] });
}

// 6) 최초 진입 시 selectedItemKeys input으로 전달된 key들에 해당하는 item을 미리 선택에 반영
//    (필요한 경우 refresh 직후 effect 하나 추가)
effect(() => {
  const keys = this.selectedItemKeys();
  if (keys.length === 0) return;
  untracked(() => {
    const selected = this.items().filter((it) => keys.includes(this.trackByFn(it)));
    if (selected.length > 0) this.selectedItems.set(selected);
  });
});
```

### `cumulativeSelection` 동적 바인딩 원칙

- `cumulativeSelection` **기본값은 `false`** — `<sd-sheet>`의 items가 교체될 때 `selectedItems`가 빈 배열로 초기화된다
- 선택 모달(`viewType() === "modal"`) + 다중 선택(`selectMode() === "multi"`) 조합에서는 **여러 페이지를 돌며 선택 누적**이 필요하므로 `true`로 바인딩
- 그 외(page 뷰 또는 single selectMode)는 현재 뷰의 **일괄 작업**이 일반적 — `false`(기본값)가 맞다
- 그러므로 정적 `true`가 아니라 **동적 computed**로 바인딩:
  ```html
  <sd-sheet
    [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
    [trackByFn]="trackByFn"
    ...
  >
  ```
- 누적 모드 사용 시 `trackByFn` 명시 필수. 기본 `(item) => item`은 reference 기반이라 서버 페이지네이션에서 새 객체 reference가 내려오면 `obj.equal`로 비교해도 실패할 수 있다. `(item) => item.id` 같은 key 추출 함수를 반드시 지정한다.

## 7. 변형: 엑셀 업로드/다운로드

`SdFileDialogProvider`로 파일 선택, 서버 API로 처리, `SdToastProvider.try`로 래핑한다.

```typescript
// 1) import 추가
import { tablerFileExcel, tablerUpload } from "@ng-icons/tabler-icons";
import { SdFileDialogProvider } from "@simplysm/angular";

// 2) DI 추가
private readonly _sdFileDialog = inject(SdFileDialogProvider);

// 3) icons 맵에 추가
protected readonly icons = {
  ...existingIcons,
  tablerFileExcel, tablerUpload,
};

// 4) template — 도구 영역 끝에 추가
@if (canEdit()) {
  <sd-button [size]="'sm'" [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
    <ng-icon [svg]="icons.tablerUpload" />
    엑셀 업로드
  </sd-button>
}
<sd-button [size]="'sm'" [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
  <ng-icon [svg]="icons.tablerFileExcel" />
  엑셀 다운로드
</sd-button>

// 5) 메서드 추가
protected async onDownloadExcelButtonClick(): Promise<void> {
  await this._sdToast.try(async () => {
    this.busyCount.update((v) => v + 1);
    this.busyMessage.set("엑셀 다운로드 중...");
    try {
      // 전체 조회 (페이지네이션 없이)
      const r = await this._fetchList(this._lastFilter(), 0, this.sortingDefs());
      // 서버 호출 또는 클라이언트 변환 (앱별):
      //   await this._api.downloadExcelAsync(r.items);
    } finally {
      this.busyMessage.set(undefined);
      this.busyCount.update((v) => v - 1);
    }
  }, getOrmDataEditToastErrorMessage);
}

protected async onUploadExcelButtonClick(): Promise<void> {
  const file = await this._sdFileDialog.showAsync(false, ".xlsx");
  if (file == null) return;
  await this._sdToast.try(async () => {
    this.busyCount.update((v) => v + 1);
    this.busyMessage.set("엑셀 업로드 중...");
    try {
      // 서버 호출 (앱별):
      //   await this._api.uploadExcelAsync(file);
      await this._refresh();
    } finally {
      this.busyMessage.set(undefined);
      this.busyCount.update((v) => v - 1);
    }
  }, getOrmDataEditToastErrorMessage);
}
```

## 8. 뷰 타입 분기

`@if (viewType() === "page") ... @else if (viewType() === "modal") ... @else { ... }` 분기 구조와 `modalOrPageTitle` computed 계산은 [`page-modal-container.md`](./page-modal-container.md)의 레시피와 동일하다. 본 레시피의 완성 예제도 그 패턴을 그대로 사용한다. control 뷰(다른 화면의 영역으로 삽입)로만 쓰일 경우에는 `@if` 분기를 생략하고 본문만 작성한다.

## 9. 주의사항 (자주 하는 실수)

### 공통 유틸 재도입 금지

- `useCrudList()`, `useDataSheet()`, `setupCumulateSelectedKeys2()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다

### 시트 셀 스타일 함정

- `<sd-sheet-column>`의 `[cell]` 템플릿 내부에 삽입되는 컨트롤(`sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea` 등)은 **`[inset]="true" [size]="'sm'"` 명시 필수**. 누락 시 컴파일 에러 없이 스타일만 깨진다(테두리·여백이 시트 셀에 맞지 않음). 예외: 복합 구조(텍스트+컨트롤)는 `[inset]="false"`, 시트 행 높이가 큰 경우는 `[size]` 생략 가능

### `oneWayDiffs`의 삭제 처리

- `newItems.oneWayDiffs(orgItems, keyFn)`은 **삭제(delete)를 다루지 않는다**. `type: "create" | "update" | "same"`만 반환
- 삭제 의사 표현은 **`item.isDeleted = true` 플래그**로 하고 `"update"` diff로 전송 (서버가 soft-delete 처리)
- inline 편집 시 `items` 배열에서 row를 제거하지 말 것. diff에서 해당 row가 누락되어 서버가 변경을 감지할 수 없다

### `selectedItemKeys` 수동 변환

- `<sd-sheet>`는 key 기반이 아니라 item 기반이다. `SelectModalOutputResult<T>.selectedItemKeys`를 구성하려면 `selectedItems().map((it, i) => trackByFn(it, i))`로 수동 변환한다
- `trackByFn`의 signature는 `(item: T, index: number) => unknown`이므로 두 번째 인자(index)를 전달해야 타입이 맞는다

### `injectViewTypeSignal()` 호출 시점

- `injectViewTypeSignal()`은 생성자 실행 중 또는 필드 이니셜라이저에서만 호출한다. `computed`·`effect` 콜백이나 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다 (Angular `inject()` 제약)

## 10. 레시피 작성 관용 규칙

향후 `crud-detail.md` · `data-select-button.md` 등 데이터 관련 레시피가 추가될 때 아래 3개 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다. 자주 하는 실수 섹션에 명시

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

- `mark(sig)`는 `WritableSignal`의 값을 shallow copy하여 **참조를 갱신**한다 (배열: `[...v]`, 객체: `{...v}`)
- 역할: **OnPush 템플릿 재렌더링** + **다른 computed / effect의 의존성 갱신**
- **"저장 감지"가 아니다.** `obj.equal`이 deep equal로 값 차이를 감지하므로, `item.name = "new"` 같은 mutation은 `mark` 없이도 `_getDiffs()` / submit에서 감지된다
- Chrome 61 호환성(Proxy 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 호출이 필요
- ❌ "mark 없으면 저장이 안 된다" 식 서술 금지

### 규칙 3: `sortingDefs` + `orderBy` 체인은 string overload 사용

- `Queryable.orderBy`는 string overload를 지원한다 (`packages/orm-common/src/exec/queryable.ts:420`)
- 레시피는 아래 형태로 작성:
  ```typescript
  for (const s of sortingDefs) {
    qr = qr.orderBy(s.key, s.desc ? "DESC" : "ASC");
  }
  ```
- 체인 경로도 string으로 지원: `qr.orderBy("user.name")` 형태
- 과거 람다 형태 (`qr.orderBy((item) => obj.getChainValue(item, s.key, true) as any, ...)`)는 **쓰지 않는다** — overload 도입 전 우회 코드였다
