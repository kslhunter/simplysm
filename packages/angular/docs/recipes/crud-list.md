# Recipe: CRUD 리스트 화면 직접 조립

> **CRITICAL: 뷰 범위 + modal 용도 확인 선행**
> 이 레시피로 실제 화면을 생성하기 전, 지원할 뷰(page / modal / control)를 **반드시 사용자에게 질문**한다. **modal을 포함하면 용도까지 함께 질문한다 — (a) 선택 모달: 다른 화면에서 항목을 골라 `close.emit`으로 돌려주는 selector / (b) 조회 전용 modal: input으로 받은 부모 레코드의 자식 목록·이력 등을 보여주기만 함(닫기는 SdModal 기본 "X").** 본 레시피는 **최소 뼈대(§3. 조회 전용 page) → 확장 A~G 누적** 구조로 구성된다. 필요한 확장만 선택적으로 얹고, 당장 쓰지 않는 뷰/확장의 분기·계약은 **죽은 코드가 되므로 생성에서 제외**한다. 선택 모달 계약(`implements SdSelectModal<T>` / `selectMode` / `selectedItemKeys` / `close` / `cumulativeSelection`)은 [확장 D](#8-확장-d-선택-모달-전환)에서, 부모 레코드의 자식 목록·이력 조회 전용 modal은 [확장 E](#9-확장-e-조회-전용-modal)에서 각각 다룬다. 추측으로 "modal = 선택 모달"로 단정하여 선택 계약을 반사적으로 부착하지 않는다.

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` · `<sd-sheet>` · `<sd-sheet-column>` 표준 컴포넌트를 **직접 조립**하여 CRUD 리스트 화면을 구성한다. 과거 `SdDataSheet` / `SdDataSheetBase` / `SdDataSheetColumn`이 감추고 있던 필터·페이지네이션·정렬·선택·편집·삭제복구·엑셀 업로드·다운로드·단축키 흐름을 화면 내부에 인라인으로 풀어쓴다. **최소 시작점(§3)에서 출발해 필요한 확장만 얹는다** — A. inline 편집/저장 / B. 선택 + 선택 삭제·복구 / C. inline 삭제 열 / D. 선택 모달 전환 / E. 조회 전용 modal / F. 모달 편집 모드 / G. 엑셀 업로드·다운로드.

## 1. Overview

- **구성 원칙:** 최소 뼈대([§3](#3-최소-뼈대-조회-전용-page)) → [확장 A~G](#5-확장-a-inline-편집저장) 누적. 최소 뼈대는 "조회 전용 page"이며, 편집·선택·모달·엑셀은 각각 별도 확장 섹션에서 얹는다.
- **최소 뼈대(§3) 조립 요소:**
  - `<sd-busy-container [busy]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 공통 컨테이너, `<sd-topbar>`는 page 뷰에서만 조건부 렌더
  - `<sd-dock-container>` + `<sd-dock>` — 필터 영역
  - `<sd-form (formSubmit)>` — 필터 제출 트리거
  - `<sd-sheet>` + `<sd-sheet-column>` + `<ng-template [cell]>` — 시트 본체 (읽기 전용 셀, 페이지네이션, 정렬)
  - `injectViewTypeSignal()` / `injectPermsSignal()` / `injectViewTitleSignal()` — 뷰 타입·권한·타이틀 signal
  - `mark(sig)` — signal 참조 갱신 (UI 동기화)
  - `SdToastProvider.try(fn)` — 에러 래퍼 (busy 카운트는 호출부에서 `busyCount.update`로 직접 제어)
  - `SdCommandDirective`(`sdRefreshCommand`) — Ctrl+Alt+L 단축키
- **확장이 도입하는 요소**는 각 확장 섹션(A~G) 서두에서 명시한다. 누적된 전체 조립 결과는 [부록 A. 풀 스택 합본 완성본](#부록-a-풀-스택-합본-완성본)에서 한눈에 확인할 수 있다.
- **제거된 추상화:** `SdDataSheet`(컴포넌트) / `SdDataSheetBase`(추상 클래스) / `SdDataSheetColumn`(디렉티브) / `SdDataSheetItemPropInfo`·`SdDataSheetItemInfo`·`SdDataSheetSearchResult`(타입 3종) / `setupCloserWhenSingleSelectionChange`(단일 선택 시 모달 자동 닫기 유틸) / 내부 Manager 5종(`injectDataSheet{Refresh,InlineEdit,ModalEdit,Excel}Manager`, `useDataSheetFilterManager`). 대체: 소비 컴포넌트가 표준 조각을 직접 조립.

## 2. 언제 사용하는가

| 상황 | 시작 지점 + 필요한 확장 |
|---|---|
| 부모 레코드·대시보드용 **조회 전용 리스트** (검색 + 페이지네이션 + 정렬만) | §3 최소 뼈대만 |
| 셀을 직접 편집하고 일괄 저장하는 **inline 편집** CRUD | §3 + [확장 A](#5-확장-a-inline-편집저장) |
| 선택 체크박스·"선택 삭제/복구" 버튼이 필요 | §3 + [확장 A](#5-확장-a-inline-편집저장) + [확장 B](#6-확장-b-선택-기능--선택-삭제복구) |
| 시트 맨 앞에 row별 inline 삭제/복구 열이 필요 | §3 + 확장 A + [확장 C](#7-확장-c-inline-삭제-열) |
| 다른 화면에서 항목을 고르는 **선택 모달**(single/multi)로도 재사용 | §3 + 확장 A + 확장 B + [확장 D](#8-확장-d-선택-모달-전환) |
| 부모 레코드의 자식 목록·이력을 input으로 받아 **조회만** 하는 modal | §3 + [확장 E](#9-확장-e-조회-전용-modal) (입력 기반 조회 전용 화면) |
| 행 클릭 시 편집 모달을 띄우는 **모달 편집 모드** | §3 + [확장 F](#10-확장-f-모달-편집-모드) (확장 A inline 편집 대신 선택) |
| 엑셀 업로드/다운로드가 필요 | §3 + 확장 A + [확장 G](#11-확장-g-엑셀-업로드다운로드) |
| 단일 레코드 상세 폼 | 본 레시피 대신 [`crud-detail.md`](./crud-detail.md) 사용 |
| 페이지/모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 최소 뼈대: 조회 전용 page

아래는 **조회 전용 page** 기준의 최소 뼈대 완성 컴포넌트다. 라우트로 진입하면 검색 + 페이지네이션 + 정렬이 동작하는 읽기 전용 리스트로 표시된다. 편집·선택·모달·엑셀이 필요하면 [§5 확장 A ~ §11 확장 G](#5-확장-a-inline-편집저장)를 선택적으로 얹는다.

본 섹션에 등장하는 개별 API의 단독 사용법:

- [`<sd-busy-container>`](../ui-overlay.md#sdbusycontainer) — busy 오버레이 + [busyCount 패턴](../ui-overlay.md#busycount-카운트-패턴)
- [`<sd-topbar-container>` · `<sd-topbar>`](../ui-navigation.md#기본-사용-예제) — 탑바 + [슬롯 활용](../ui-navigation.md#topbar-내부-슬롯-활용) + [조건부 렌더](../ui-navigation.md#viewtype-조건부-렌더)
- [`<sd-dock-container>` · `<sd-dock>`](../ui-layout.md#sddock) — 도킹 레이아웃 + [사용 패턴](../ui-layout.md#사용-패턴)
- [`<sd-form>`](../ui-form.md#sdform) — 폼 래퍼 + `(formSubmit)` + `requestSubmit()`
- [`<sd-button>`](../ui-form.md#sdbutton) · [`<sd-textfield>`](../ui-form.md#sdtextfield) — 버튼 · 텍스트 입력
- [`<sd-sheet>` · `<sd-sheet-column>` · `<ng-template [cell]>`](../ui-data.md#sdsheet) — 스프레드시트 + [셀 작성 지침](../ui-data.md#sdsheetcolumncelltemplate)
- [`injectViewTypeSignal`](../utils.md#injectviewtypesignal) · [`injectViewTitleSignal`](../utils.md#injectviewtitlesignal) · [`mark`](../utils.md#mark) · [`injectPermsSignal`](../utils.md#injectpermssignal) · [`SdToastProvider.try`](../providers.md#try-사용-패턴)

```typescript
import { NgIcon } from "@ng-icons/core";
import { tablerAlertTriangle, tablerRefresh, tablerSearch } from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { str } from "@simplysm/core-common";
import {
  injectPermsSignal,
  injectViewTitleSignal,
  injectViewTypeSignal,
  mark,
  SdBusyContainer,
  SdButton,
  SdCommandDirective,
  SdDock,
  SdDockContainer,
  SdForm,
  SdSheet,
  SdSheetColumn,
  SdSheetColumnCellTemplate,
  SdTextfield,
  SdToastProvider,
  SdTopbar,
  SdTopbarContainer,
  type SortingDef,
} from "@simplysm/angular";
// 앱별 대체: ORM provider + DbContext. simplysm 패키지가 아니라 각 앱이 소유한다.
import { AppOrmProvider } from "@adtek/client-common";

interface IFilter {
  searchText?: string;
}

interface ICustomer {
  id: number;
  name: string;
  phone?: string;
}

@Component({
  selector: "app-customer-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdDockContainer, SdDock,
    SdForm, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate,
    SdButton, SdTextfield,
    NgIcon,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (initialized()) {
        @if (!perms().includes("use")) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br />
            <br />
            '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else {
          <sd-topbar-container>
            @if (viewType() === "page") {
              <sd-topbar>
                <h4>{{ viewTitle() }}</h4>

                <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                  <ng-icon [svg]="tablerRefresh" />
                  새로고침
                  <small>(CTRL+ALT+L)</small>
                </sd-button>
              </sd-topbar>
            }

            <sd-dock-container>
              <!-- 필터 -->
              <sd-dock class="p-default">
                <sd-form (formSubmit)="onFilterSubmit()">
                  <div class="form-box-inline">
                    <div class="form-box-item">
                      <sd-button [type]="'submit'" [theme]="'info'">
                        <ng-icon [svg]="tablerSearch" />
                        조회
                      </sd-button>
                    </div>
                    <div class="form-box-item">
                      <label>검색어</label>
                      <sd-textfield
                        [type]="'text'"
                        [placeholder]="'이름/전화번호'"
                        [(value)]="filter().searchText"
                        (valueChange)="mark(filter)"
                      />
                    </div>
                  </div>
                </sd-form>
              </sd-dock>

              <!-- 시트 (main 영역) -->
              <sd-sheet
                [key]="'customer-list-sheet'"
                [items]="items()"
                [(currentPage)]="page"
                [totalPageCount]="pageLength()"
                [(sorts)]="sortingDefs"
                [trackByFn]="trackByFn"
              >
                <sd-sheet-column [fixed]="true" [key]="'id'" [header]="'#'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm tx-right">{{ item.id }}</div>
                  </ng-template>
                </sd-sheet-column>

                <sd-sheet-column [key]="'name'" [header]="'이름'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm">{{ item.name }}</div>
                  </ng-template>
                </sd-sheet-column>

                <sd-sheet-column [key]="'phone'" [header]="'전화번호'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm">{{ item.phone }}</div>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>
            </sd-dock-container>
          </sd-topbar-container>
        }
      }
    </sd-busy-container>
  `,
})
export class CustomerListPage {
  //== DI ==
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _sdToast = inject(SdToastProvider);

  //== 식별 / 권한 ==
  perms = injectPermsSignal(["sales.customer"], ["use"]);

  viewType = injectViewTypeSignal();
  viewTitle = injectViewTitleSignal();

  //== 상태 ==
  initialized = signal(false);
  busyCount = signal(0);

  items = signal<ICustomer[]>([]);

  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<SortingDef[]>([]);

  filter = signal<IFilter>({});
  lastFilter = signal<IFilter>({});

  //== 시트 fn ==
  trackByFn = (item: ICustomer) => item.id;

  constructor() {
    // 필터/페이지/정렬/perms 변경 시 재조회
    effect(() => {
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.lastFilter();
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
  }

  //== Handlers ==
  onFilterSubmit(): void {
    this.page.set(0);
    this.lastFilter.set({ ...this.filter() });
  }

  onRefreshButtonClick(): void {
    if (this.busyCount() > 0) return;
    if (!this.perms().includes("use")) return;

    mark(this.lastFilter);
  }

  //== Internals ==
  private async _refresh(): Promise<void> {
    const r = await this._search(true);
    this.items.set(r.items);
    this.pageLength.set(r.pageLength);
  }

  private async _search(
    usePagination: boolean,
  ): Promise<{ items: ICustomer[]; pageLength: number }> {
    const filter = this.lastFilter();
    const sortingDefs = this.sortingDefs();
    const page = this.page();

    return this._appOrm.connectAsync(async (db) => {
      let qr1 = db.customer();

      if (!str.isNullOrEmpty(filter.searchText)) {
        qr1 = qr1.search((item) => [item.name, item.phone], filter.searchText);
      }

      const pageLength = usePagination ? Math.ceil((await qr1.count()) / 50) : 0;

      let qr2 = qr1.select((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
      }));

      for (const sortingDef of sortingDefs) {
        qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc ? "DESC" : "ASC");
      }
      if (!sortingDefs.some((s) => s.key === "name")) {
        qr2 = qr2.orderBy((item) => item.name);
      }

      if (usePagination) {
        qr2 = qr2.limit(page * 50, 50);
      }

      const items = await qr2.execute();
      return { items, pageLength };
    });
  }

  //== 아이콘 ==
  protected readonly tablerAlertTriangle = tablerAlertTriangle;
  protected readonly tablerRefresh = tablerRefresh;
  protected readonly tablerSearch = tablerSearch;
  protected readonly mark = mark;
}
```

## 4. 최소 뼈대 분해 설명

### 블록 역할

| 블록 | 역할 |
|---|---|
| `<sd-busy-container [busy]>` | 전체 busy 오버레이 (`busyCount() > 0`일 때 표시) |
| `@if (initialized())` | 초기 조회 전 콘텐츠 숨김 (깜박임 방지) |
| `@if (!perms().includes("use"))` | 권한 없음 메시지 |
| `<sd-topbar-container>` + `@if (viewType() === "page") <sd-topbar>` | 공통 컨테이너 + page 뷰 전용 topbar (새로고침 버튼만) |
| `<sd-dock-container>` + `<sd-dock>` (필터) | 필터 영역을 dock로 부착. 본문(시트)은 main 영역 |
| `<sd-form (formSubmit)>` + `form-box-inline` / `form-box-item` | 필터 제출 폼 — 각 입력을 `<div class="form-box-item">`로 감싸 label/버튼 배치 |
| `<sd-sheet>` + `<sd-sheet-column>` + `[cell]` 템플릿 (읽기 전용) | 시트 본체 — items / 페이지네이션 / 정렬 |
| `hostDirectives`: `SdCommandDirective` + `(sdRefreshCommand)` | Ctrl+Alt+L 단축키 → `onRefreshButtonClick()` |
| 초기 effect (`perms` / `lastFilter` / `page` / `sortingDefs` 의존성 + `untracked(async)`) | 최초 + 변경 시 재조회 + `initialized.set(true)` |
| `mark(lastFilter)` | lastFilter 참조 갱신 → effect 재실행 (값 변경 없음) |

### 상태 분해

| signal | 역할 |
|---|---|
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `items` | 현재 페이지 items |
| `page` / `pageLength` | 0-based 현재 페이지 / 전체 페이지 수. `<sd-sheet [(currentPage)]>` / `[totalPageCount]`로 바인딩 |
| `sortingDefs` | `SortingDef[]` — `{ key: string; desc: boolean }[]`. `<sd-sheet [(sorts)]>`로 양방향 |
| `filter` / `lastFilter` | `filter`는 입력 버퍼, `lastFilter`는 "조회" 제출 시점 스냅샷. effect 의존성은 `lastFilter` |
| `perms` | 권한 signal. `use`는 `perms().includes("use")`로 호출처에서 직접 검사 |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onFilterSubmit()` | page=0 리셋 + `lastFilter.set({ ...filter() })` |
| `onRefreshButtonClick()` | busy/권한 확인 후 `mark(lastFilter)` — 참조 갱신으로 effect 재실행 |
| `trackByFn(item)` | 시트 row 추적 — `item.id`로 identity 유지 |
| `_refresh()` | `_search(true)` → `items.set` + `pageLength.set` |
| `_search(usePagination)` | ORM 쿼리 (filter / sort / limit). `usePagination: false`는 전체 조회 — 엑셀 다운로드 등에서 재사용 |

> **확장이 도입하는 블록·상태·메서드** (예: `canEdit` / `diffs` / `selectedItems` / `onSubmit` / `close` output / `cumulativeSelection` 등)는 [§5 확장 A ~ §11 확장 G](#5-확장-a-inline-편집저장) 각 확장 섹션의 "포인트" bullet에서 다룬다. 전체 누적된 완성본은 [부록 A. 풀 스택 합본 완성본](#부록-a-풀-스택-합본-완성본)에서 한눈에 확인 가능.

## 5. 확장 A: inline 편집/저장

시트 셀을 **직접 편집**하고 상단 저장 버튼(또는 Ctrl+S)으로 **일괄 저장**한다. 최소 뼈대(§3)의 읽기 전용 셀을 `<sd-textfield [inset]="true" [size]="'sm'" [readonly]="!edit">`로 교체하고, `oneWayDiffs` 기반 변경 감지 + `_upsertItem` 일괄 실행을 추가한다. `crud-detail.md` 레시피로 편집 모달을 쓰려면 [확장 F. 모달 편집 모드](#10-확장-f-모달-편집-모드)를 대신 얹는다.

**이 확장이 도입하는 요소:**

- **imports:** `computed`, `oneWayDiffs`(side-effect import), `obj`, `ArgumentError`, `expr`, `FormatPipe`, `SdSharedDataSelect`, `SdItemOfTemplate`, `SdAnchor`(신규 행 삭제 아이콘), `SdCheckbox`(삭제 포함 필터), `SdCommandDirective` 출력에 `sdSaveCommand` 추가, `setupCanDeactivate`, `viewChild`, `DateTime` 등
- **DI:** `AppAuthProvider`, `AppSharedDataProvider`
- **상태:** `_itemsSnapshot: ICustomer[]`, `diffs = computed(...)` (`oneWayDiffs`)
- **파생:** `canEdit = computed(() => perms().includes("edit") && viewType() === "page")`
- **hostDirectives·host:** `outputs`에 `sdSaveCommand` 추가, `host`에 `(sdSaveCommand)="onSaveButtonClick()"` 추가
- **viewChild:** `formCtrl = viewChild<SdForm>("formCtrl")`
- **메서드:** `onSaveButtonClick`, `onSubmit`, `onAddItemButtonClick`, `onRemoveNewItemButtonClick`, `_upsertItem`, `_checkIgnoreChanges`, `getIsItemChanged`
- **생성자:** `setupCanDeactivate(() => this._checkIgnoreChanges())`
- **템플릿:** topbar에 "저장" 버튼, 필터에 "삭제항목 포함" 체크박스, 시트 셀을 inline 편집 컨트롤(`<sd-textfield>` / `<sd-shared-data-select>`)로 교체, 시트를 `<sd-form #formCtrl (formSubmit)="onSubmit()">`로 감쌈
- **_refresh 변경:** `_itemsSnapshot = obj.clone(r.items)` 추가

> 상세: [`setupCanDeactivate`](../utils.md#setupcandeactivate) · [`<sd-form>`](../ui-form.md#sdform) · [`<sd-textfield>`](../ui-form.md#sdtextfield) · [`<sd-checkbox>`](../ui-form.md#sdcheckbox) · [`<sd-anchor>`](../ui-form.md#sdanchor) · [`[cell] let-edit`](../ui-data.md#sdsheetcolumncelltemplate)

```typescript
// 1) imports 교체 — @simplysm/angular에 {SdAnchor, SdCheckbox, setupCanDeactivate, SdSharedDataSelect, SdItemOfTemplate, FormatPipe, viewChild 등}을 추가.
//    @simplysm/core-common에 {ArgumentError, type DateTime, obj}를 추가. @simplysm/orm-common에서 {expr}를 가져온다.
//    oneWayDiffs는 @simplysm/core-common의 side-effect import로 Array.prototype을 확장하므로 `import "@simplysm/core-common";` 한 줄만으로 활성화된다.
import { NgIcon } from "@ng-icons/core";
import {
  tablerAlertTriangle, tablerCirclePlus, tablerDeviceFloppy, tablerEraser,
  tablerRefresh, tablerRestore, tablerSearch, tablerX,
} from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked,
  viewChild, ViewEncapsulation,
} from "@angular/core";
import { ArgumentError, type DateTime, obj, str } from "@simplysm/core-common";
import { expr } from "@simplysm/orm-common";
import {
  FormatPipe, injectPermsSignal, injectViewTitleSignal, injectViewTypeSignal, mark,
  SdAnchor, SdBusyContainer, SdButton, SdCheckbox, SdCommandDirective, SdDock, SdDockContainer,
  SdForm, SdItemOfTemplate, SdSharedDataSelect, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate,
  SdTextfield, SdToastProvider, SdTopbar, SdTopbarContainer,
  setupCanDeactivate, type SortingDef,
} from "@simplysm/angular";
// 앱별 대체: ORM + 공유 데이터 + 인증 provider / DbContext.
import { AppOrmProvider, AppSharedDataProvider, useSharedSignal } from "@adtek/client-common";
import type { MainDbContext } from "@adtek/db-main";
import { AppAuthProvider } from "../../../providers/AppAuthProvider";

// 2) ICustomer 확장 — 편집 가능한 필드(선택적 신규 id 포함 / 카테고리 / 삭제 플래그 / 감사 필드)
interface IFilter {
  searchText?: string;
  isIncludeDeleted: boolean;
}

interface ICustomer {
  id?: number;                  // 신규 행은 undefined
  name?: string;
  phone?: string;
  categoryId?: number;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

// 3) @Component — imports 배열에 SdAnchor/SdCheckbox/SdSharedDataSelect/SdItemOfTemplate/FormatPipe 추가.
//    hostDirectives outputs에 "sdSaveCommand" 추가. host에 (sdSaveCommand) 바인딩 추가.
@Component({
  // ...selector/cd/encapsulation/standalone 동일
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdDockContainer, SdDock,
    SdForm, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate,
    SdButton, SdAnchor, SdCheckbox, SdTextfield,
    SdSharedDataSelect, SdItemOfTemplate,
    NgIcon, FormatPipe,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  // template: 아래 7)에서 상세
})

// 4) DI 추가
private readonly _appAuth = inject(AppAuthProvider);
private readonly _appSharedData = inject(AppSharedDataProvider);

// 5) 권한·공유 데이터·상태·파생 추가
SHARED_DATA_KEY = "고객" as const;
perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);
canEdit = computed(() => this.perms().includes("edit") && this.viewType() === "page");

sharedCategories = useSharedSignal("카테고리");

private _itemsSnapshot: ICustomer[] = [];
diffs = computed(() => this.items().oneWayDiffs(this._itemsSnapshot, "id"));

// filter 기본값에 isIncludeDeleted 포함
filter = signal<IFilter>({ isIncludeDeleted: false });
lastFilter = signal<IFilter>({ isIncludeDeleted: false });

// viewChild (Ctrl+S → form submit 경로 공유)
formCtrl = viewChild<SdForm>("formCtrl");

// 시트 셀 스타일 — 삭제된 행 취소선
getItemCellStyleFn = (item: ICustomer): string | undefined =>
  item.isDeleted ? "text-decoration: line-through;" : undefined;

// 6) 생성자에 setupCanDeactivate 추가 + _refresh에 snapshot 갱신
constructor() {
  // 기존 초기 effect는 동일...
  setupCanDeactivate(() => this._checkIgnoreChanges());
}

getIsItemChanged(item: ICustomer): boolean {
  if (item.id == null) return true;
  return this.diffs().some((diff) => diff.item.id === item.id);
}

// 7) template — topbar에 "저장" 버튼, 필터에 "삭제항목 포함" 체크박스, 시트 셀을 inline 편집으로 교체,
//    시트를 <sd-form #formCtrl (formSubmit)="onSubmit()">로 감싼다. `[getItemCellStyleFn]` 바인딩 추가.
template: `
  <sd-busy-container [busy]="busyCount() > 0">
    @if (initialized()) {
      @if (!perms().includes("use")) { <!-- 경고 동일 --> }
      @else {
        <sd-topbar-container>
          @if (viewType() === "page") {
            <sd-topbar>
              <h4>{{ viewTitle() }}</h4>
              <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                <ng-icon [svg]="tablerRefresh" /> 새로고침 <small>(CTRL+ALT+L)</small>
              </sd-button>
              @if (canEdit()) {
                <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">
                  <ng-icon [svg]="tablerDeviceFloppy" /> 저장 <small>(CTRL+S)</small>
                </sd-button>
              }
            </sd-topbar>
          }

          <sd-dock-container>
            <!-- 필터: "삭제항목 포함" 체크박스 추가 -->
            <sd-dock class="p-default">
              <sd-form (formSubmit)="onFilterSubmit()">
                <div class="form-box-inline">
                  <div class="form-box-item">
                    <sd-button [type]="'submit'" [theme]="'info'"><ng-icon [svg]="tablerSearch" /> 조회</sd-button>
                  </div>
                  <div class="form-box-item">
                    <label>검색어</label>
                    <sd-textfield [type]="'text'" [placeholder]="'이름/전화번호'"
                      [(value)]="filter().searchText" (valueChange)="mark(filter)" />
                  </div>
                  <div class="form-box-item">
                    <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="mark(filter)">
                      삭제항목 포함
                    </sd-checkbox>
                  </div>
                </div>
              </sd-form>
            </sd-dock>

            <!-- 시트를 일괄 저장용 <sd-form>으로 감싼다. #formCtrl는 Ctrl+S 경로 공유 -->
            <sd-form #formCtrl (formSubmit)="onSubmit()" class="block fill p-default pt-0">
              <sd-sheet
                [key]="'customer-list-sheet'"
                [items]="items()"
                [(currentPage)]="page"
                [totalPageCount]="pageLength()"
                [(sorts)]="sortingDefs"
                [trackByFn]="trackByFn"
                [getItemCellStyleFn]="getItemCellStyleFn"
              >
                <!-- id 컬럼: 신규 행이면 <sd-anchor>로 제거 버튼 -->
                <sd-sheet-column [fixed]="true" [key]="'id'" [header]="'#'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm"
                      [class.tx-right]="item.id"
                      [style.background]="getIsItemChanged(item) ? 'yellow' : ''">
                      @if (item.id) {
                        {{ item.id }}
                      } @else if (canEdit()) {
                        <sd-anchor (click)="onRemoveNewItemButtonClick(item)">
                          <ng-icon [svg]="tablerX" />
                        </sd-anchor>
                      }
                    </div>
                  </ng-template>
                </sd-sheet-column>

                <!-- 이름/전화번호: inline 편집 가능 — [inset]/[size]/[readonly]="!edit" -->
                <sd-sheet-column [key]="'name'" [header]="'이름'">
                  <ng-template [cell]="items()" let-item="item" let-edit="edit">
                    <sd-textfield
                      [type]="'text'" [inset]="true" [size]="'sm'" [required]="true"
                      [disabled]="!canEdit()" [readonly]="!edit"
                      [(value)]="item.name" (valueChange)="mark(items)" />
                  </ng-template>
                </sd-sheet-column>

                <sd-sheet-column [key]="'phone'" [header]="'전화번호'">
                  <ng-template [cell]="items()" let-item="item" let-edit="edit">
                    <sd-textfield
                      [type]="'text'" [inset]="true" [size]="'sm'"
                      [disabled]="!canEdit()" [readonly]="!edit"
                      [(value)]="item.phone" (valueChange)="mark(items)" />
                  </ng-template>
                </sd-sheet-column>

                <!-- 카테고리: <sd-shared-data-select> + <ng-template [itemOf]> -->
                <sd-sheet-column [key]="'categoryId'" [header]="'카테고리'">
                  <ng-template [cell]="items()" let-item="item">
                    <sd-shared-data-select
                      [inset]="true" [size]="'sm'" [disabled]="!canEdit()"
                      [items]="sharedCategories.items()"
                      [(value)]="item.categoryId" (valueChange)="mark(items)">
                      <ng-template [itemOf]="sharedCategories.items()" let-cat>
                        {{ cat.name }}
                      </ng-template>
                    </sd-shared-data-select>
                  </ng-template>
                </sd-sheet-column>

                <!-- 수정일시/수정자: [hidden]="true" 기본 숨김 -->
                <sd-sheet-column [key]="'lastModifiedAt'" [header]="'수정일시'" [hidden]="true">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm tx-center">{{ item.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}</div>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column [key]="'lastModifiedBy'" [header]="'수정자'" [hidden]="true">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm tx-center">{{ item.lastModifiedBy }}</div>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>
            </sd-form>
          </sd-dock-container>
        </sd-topbar-container>
      }
    }
  </sd-busy-container>
`

// 8) 메서드 추가
onSaveButtonClick(): void {
  this.formCtrl()?.requestSubmit();
}

async onSubmit(): Promise<void> {
  if (this.busyCount() > 0) return;

  const diffs = this.diffs();
  if (diffs.length === 0) {
    this._sdToast.info("변경사항이 없습니다.");
    return;
  }

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const changedIds: number[] = [];
    await this._appOrm.connectAsync(async (db) => {
      for (const diff of diffs) {
        changedIds.push(await this._upsertItem(
          db, diff.item, diff.type === "create" ? "등록" : "수정",
        ));
      }
    });
    await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, changedIds);
    this._sdToast.success("저장되었습니다.");
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

onAddItemButtonClick(): void {
  this.items.update((list) => [{ isDeleted: false }, ...list]);
}

onRemoveNewItemButtonClick(item: ICustomer): void {
  this.items.update((list) => list.filter((it) => it !== item));
}

// 9) onRefreshButtonClick / _refresh에 변경 감지·스냅샷 갱신 추가
onRefreshButtonClick(): void {
  if (this.busyCount() > 0) return;
  if (!this.perms().includes("use")) return;
  if (!this._checkIgnoreChanges()) return;
  mark(this.lastFilter);
}

private _checkIgnoreChanges(): boolean {
  return this.diffs().length === 0 || confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?");
}

private async _refresh(): Promise<void> {
  const r = await this._search(true);
  this.items.set(r.items);
  this.pageLength.set(r.pageLength);
  this._itemsSnapshot = obj.clone(r.items);    // ← snapshot 갱신
}

// 10) _search의 where절·select에 isDeleted/카테고리/감사 필드 반영 + _upsertItem 추가
private async _search(usePagination: boolean): Promise<{ items: ICustomer[]; pageLength: number }> {
  const filter = this.lastFilter();
  const sortingDefs = this.sortingDefs();
  const page = this.page();

  return this._appOrm.connectAsync(async (db) => {
    let qr1 = db.customer();
    if (!str.isNullOrEmpty(filter.searchText)) {
      qr1 = qr1.search((item) => [item.name, item.phone], filter.searchText);
    }
    if (!filter.isIncludeDeleted) {
      qr1 = qr1.where((item) => [expr.eq(item.isDeleted, false)]);
    }

    const pageLength = usePagination ? Math.ceil((await qr1.count()) / 50) : 0;

    let qr2 = qr1.joinLastDataLog().select((item) => ({
      id: item.id, name: item.name, phone: item.phone, categoryId: item.categoryId,
      isDeleted: item.isDeleted,
      lastModifiedAt: item.lastDataLog?.dateTime,
      lastModifiedBy: item.lastDataLog?.userName,
    }));

    for (const s of sortingDefs) qr2 = qr2.orderBy(s.key, s.desc ? "DESC" : "ASC");
    if (!sortingDefs.some((s) => s.key === "name")) qr2 = qr2.orderBy((item) => item.name);
    if (usePagination) qr2 = qr2.limit(page * 50, 50);

    const items = await qr2.execute();
    return { items, pageLength };
  });
}

private async _upsertItem(
  db: MainDbContext, item: ICustomer, logType: string,
): Promise<number> {
  if (!item.isDeleted && (await db.customer().where((c) => [
    expr.eq(c.name, item.name),
    expr.not(expr.eq(c.id, item.id)),
    expr.eq(c.isDeleted, false),
  ]).exists())) {
    throw new ArgumentError("동일한 명칭이 이미 등록되어 있습니다.", { 명칭: item.name });
  }

  const upsertResult = await db.customer()
    .where((c) => [expr.eq(c.id, item.id)])
    .upsert(() => ({
      name: item.name!, phone: item.phone, categoryId: item.categoryId, isDeleted: item.isDeleted,
    }), ["id"]);
  const upsertId = upsertResult[0].id;

  await db.customer().insertDataLogAsync({
    type: logType, itemId: upsertId, valueJson: undefined,
    userId: this._appAuth.authInfo()!.user.id,
  });

  return upsertId;
}
```

**포인트:**

- **`diffs = computed(() => items.oneWayDiffs(_itemsSnapshot, "id"))`는 변경 감지 signal**. 템플릿(`getIsItemChanged`) / 호출부(`onSubmit` / `_checkIgnoreChanges`) 모두에서 `this.diffs()`로 참조한다. `_itemsSnapshot`은 `obj.clone(r.items)`로 `_refresh()` 시점마다 deep 복제.
- **`oneWayDiffs`는 delete를 다루지 않는다.** `type: "create" | "update" | "same"`만 반환한다. 삭제 의사는 `item.isDeleted = true` 플래그로 표현하여 `"update"` diff로 전송된다(서버가 soft-delete 처리). `items` 배열에서 row를 물리 제거하면 diff에서 누락되어 서버가 변경을 감지할 수 없다 — 신규 행(id == null)이 "저장하지 않겠다"일 때만 `onRemoveNewItemButtonClick`로 제거한다.
- **시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시 필수** — `<sd-textfield>` / `<sd-shared-data-select>` / `<sd-checkbox>` 모두. 누락 시 컴파일 에러 없이 스타일만 깨진다. 예외: 복합 구조는 `[inset]="false"`, 큰 시트 행은 `[size]` 생략 가능.
- **`let-edit="edit"` + `[readonly]="!edit"` + `[disabled]="!canEdit()"` 3종 바인딩**으로 (a) 전체 권한 / (b) 개별 행 편집 모드 분리 제어. 시트가 제공하는 편집 모드 토글을 사용하지 않는다면 `[readonly]="!canEdit()"`만 써도 된다.
- **`canEdit = computed(() => perms().includes("edit") && viewType() === "page")`**: edit 권한이 있어도 modal(선택 모달, 조회 전용 modal) 뷰에서는 항상 false. 확장 D/E 적용 시 자동으로 inline 편집이 꺼진다.
- **`setupCanDeactivate(() => this._checkIgnoreChanges())`**: 라우트 이탈 시 `diffs().length > 0`이면 `confirm`으로 사용자 확인. 이탈을 허용할지 true/false를 리턴한다.
- **Ctrl+S 경로 통일:** `hostDirectives` → `(sdSaveCommand)="onSaveButtonClick()"` → `formCtrl()?.requestSubmit()` → `<sd-form (formSubmit)="onSubmit()">`. 상단 "저장" 버튼 클릭과 완전히 동일한 경로로 통합.
- **신규 행 삽입:** `this.items.update((list) => [{ isDeleted: false }, ...list])`. id=undefined이면 snapshot에 존재하지 않으므로 `diffs`에서 `type: "create"`로 잡힌다. `getIsItemChanged(item)`은 `item.id == null`일 때 true를 반환 — 노란 배경 하이라이트.
- **`_upsertItem`의 중복 명칭 검사**: `expr.not(expr.eq(c.id, item.id))`로 자기 자신 제외. `expr.eq(c.isDeleted, false)`로 soft-delete된 동일 명칭은 허용.
- **`insertDataLogAsync`로 감사 로그 기록**: `type` 필드에 "등록" / "수정" / "엑셀업로드"(확장 G) 등 맥락 구분 문자열. `_refresh` 이후 `joinLastDataLog()`로 `lastModifiedAt`/`lastModifiedBy` 표시.

## 6. 확장 B: 선택 기능 + 선택 삭제/복구

시트에 **체크박스 기반 선택 기능**을 추가하고, 선택된 행에 대한 "선택 삭제 / 선택 복구" 버튼 바를 상단에 배치한다. 확장 A(inline 편집)를 전제로 한다 — `canEdit` / `mark(items)` / 일괄 저장 흐름이 필요하기 때문이다.

**이 확장이 도입하는 요소:**

- **상태:** `selectedItems = signal<ICustomer[]>([])`
- **파생:** `hasSelectedDeleted = computed(() => selectedItems().some((it) => it.isDeleted))`, `hasSelectedNotDeleted` (대응)
- **메서드:** `onToggleDeleteItemsButtonClick(del: boolean)`
- **템플릿:** `<sd-sheet>`에 `[selectMode]="'multi'"` + `[(selectedItems)]="selectedItems"` + `[trackByFn]` 추가. 필터 dock 아래에 inline 도구 dock(등록 / 선택 삭제 / 선택 복구) 추가.
- **_refresh 변경:** `selectedItems` 중 현재 페이지에 없는 항목 필터링 — 페이지 이동 시 선택 유지를 위해

> 상세: [`<sd-sheet> selectMode/selectedItems`](../ui-data.md#sdsheet)

```typescript
// 1) 상태·파생 추가
selectedItems = signal<ICustomer[]>([]);

hasSelectedDeleted = computed(() => this.selectedItems().some((it) => it.isDeleted));
hasSelectedNotDeleted = computed(() => this.selectedItems().some((it) => !it.isDeleted));

// 2) 메서드 추가 (플래그 토글 방식 — 일괄 저장 시 _upsertItem이 update diff로 처리)
onToggleDeleteItemsButtonClick(del: boolean): void {
  for (const it of this.selectedItems()) it.isDeleted = del;
  mark(this.items);
}

// 3) _refresh에 페이지 이동 시 선택 유지 로직 추가
private async _refresh(): Promise<void> {
  const r = await this._search(true);
  this.items.set(r.items);
  this.pageLength.set(r.pageLength);

  // 현재 페이지에 남아 있는 항목만 선택 유지
  const currKeys = new Set(r.items.map((it) => this.trackByFn(it)));
  this.selectedItems.update((sel) => sel.filter((it) => currKeys.has(this.trackByFn(it))));

  this._itemsSnapshot = obj.clone(r.items);
}

// 4) template — <sd-sheet>에 selectMode + selectedItems 바인딩 추가.
//    필터 dock 아래에 inline 도구 dock 추가 (canEdit 필수, page 뷰 한정)
`
  <sd-dock class="p-default"><!-- 필터 (동일) --></sd-dock>

  <!-- 도구 (inline 편집용, page 뷰에서만) -->
  @if (canEdit() && viewType() === "page") {
    <sd-dock class="flex-row gap-sm p-xs-default">
      <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
        <ng-icon [svg]="tablerCirclePlus" /> 등록
      </sd-button>
      <sd-button [size]="'sm'" [theme]="'link-danger'"
        (click)="onToggleDeleteItemsButtonClick(true)"
        [disabled]="!hasSelectedNotDeleted()">
        <ng-icon [svg]="tablerEraser" /> 선택 삭제
      </sd-button>
      @if (hasSelectedDeleted()) {
        <sd-button [size]="'sm'" [theme]="'link-warning'"
          (click)="onToggleDeleteItemsButtonClick(false)">
          <ng-icon [svg]="tablerRestore" /> 선택 복구
        </sd-button>
      }
    </sd-dock>
  }

  <sd-form #formCtrl (formSubmit)="onSubmit()" class="block fill p-default pt-0">
    <sd-sheet
      [key]="'customer-list-sheet'"
      [items]="items()"
      [(currentPage)]="page"
      [totalPageCount]="pageLength()"
      [(sorts)]="sortingDefs"
      [selectMode]="'multi'"                <!-- ← 추가 -->
      [(selectedItems)]="selectedItems"     <!-- ← 추가 -->
      [trackByFn]="trackByFn"
      [getItemCellStyleFn]="getItemCellStyleFn"
    >
      <!-- 컬럼들은 확장 A와 동일 -->
    </sd-sheet>
  </sd-form>
`
```

**포인트:**

- **선택 삭제/복구는 DB 즉시 업데이트가 아니다**. `item.isDeleted = del` + `mark(items)`로 메모리 플래그만 바꾸고, 실제 DB 반영은 저장 버튼 클릭 시 `onSubmit`에서 `_upsertItem`의 `"update"` diff로 일괄 처리된다. 확장 A의 일괄 저장 흐름에 자연스럽게 통합.
- **`selectMode` 기본값은 `"multi"`** — 한 번에 여러 행 삭제/복구가 기본 요구. 단일 선택이 필요하면 `"single"`로 둔다.
- **선택 유지 (`_refresh` 내부 `selectedItems.update(...)`)**: 페이지 이동 / 정렬 변경 / 필터 제출 후 선택 상태를 **현재 페이지에 남아 있는 항목만** 유지한다. `useSelectionManager`의 trackByFn 기반 identity 비교와 동일 원리이므로, 다른 페이지로 넘어가면 해당 페이지 selection은 사라진다(페이지 누적 선택이 필요하면 [확장 D: 선택 모달 전환](#8-확장-d-선택-모달-전환)의 `[cumulativeSelection]`을 참고하되, 그것은 선택 모달 전용).

## 7. 확장 C: inline 삭제 열

시트 맨 앞 고정 컬럼에 **row별 inline 삭제/복구 아이콘**을 추가한다. 확장 B("선택 삭제 / 선택 복구" 상단 바)와 **공존** 가능 — row별 빠른 토글 + 다건 일괄 토글.

**이 확장이 도입하는 요소:**

- **메서드:** `onToggleDeleteItemButtonClick(item)`
- **템플릿:** 시트 맨 앞에 `[fixed]="true" [key]="'_isDeleted'"` 컬럼 추가 + `#headerTpl`(아이콘 헤더) + `[cell]`(`<sd-anchor>` 토글)

> 상세: [`<sd-sheet-column> #headerTpl`](../ui-data.md#sdsheetcolumn) · [`<sd-anchor>`](../ui-form.md#sdanchor)

```typescript
// 1) 메서드 추가
protected onToggleDeleteItemButtonClick(item: ICustomer): void {
  item.isDeleted = !item.isDeleted;
  mark(this.items);   // OnPush 재렌더 + diffs computed 알림
}

// 2) template — <sd-sheet> 가장 앞에 _isDeleted 고정 컬럼 삽입.
//    canEdit && viewType() === "page" 조건부 (modal 뷰나 권한 없으면 열 자체 숨김)
`
<sd-sheet ...>
  @if (canEdit() && viewType() === "page") {
    <sd-sheet-column [fixed]="true" [key]="'_isDeleted'">
      <ng-template #headerTpl>
        <div class="p-xs-sm tx-center">
          <ng-icon [svg]="tablerEraser" />
        </div>
      </ng-template>
      <ng-template [cell]="items()" let-item="item">
        <div class="p-xs-sm tx-center">
          <sd-anchor [theme]="'danger'" (click)="onToggleDeleteItemButtonClick(item)">
            <ng-icon [svg]="item.isDeleted ? tablerRestore : tablerEraser" />
            {{ item.isDeleted ? "복구" : "삭제" }}
          </sd-anchor>
        </div>
      </ng-template>
    </sd-sheet-column>
  }
  <!-- 나머지 컬럼(id / name / phone / categoryId / ...)은 확장 A와 동일 -->
</sd-sheet>
`
```

**포인트:**

- **row 삭제는 `isDeleted` 플래그 토글로 표현**. 확장 A / B와 동일 원리. DB 반영은 저장 버튼 클릭 시 일괄 처리(soft-delete).
- **컬럼 key는 `"_isDeleted"`** (언더스코어 prefix) — 서버 정렬·컬럼 지속성 설정과 충돌하지 않는 임의 키.
- **`canEdit() && viewType() === "page"` 조건부**: modal 뷰 / 권한 없음이면 열 자체 숨김. `canEdit`은 이미 page 한정이지만 명시적으로 표기하면 의도가 분명.

## 8. 확장 D: 선택 모달 전환

같은 리스트 화면이 **다른 화면에서 항목을 골라주는 "선택 모달"로도 재사용**되도록 한다. 라우트로 진입하면 page 뷰(CRUD 리스트), `SdModalProvider.showAsync()`로 열리면 modal 뷰(selectMode에 따라 single/multi)로 자동 전환되며, 선택 결과를 `close.emit`으로 돌려준다. 조회 전용 modal(부모 레코드의 자식 목록·이력)은 [확장 E](#9-확장-e-조회-전용-modal)이며 계약이 다르다.

**이 확장이 도입하는 요소:**

- **imports:** `input`, `output`, `type SdSelectModal`, `type SelectModalOutputResult`
- **계약:** `implements SdSelectModal<ICustomer>` + `selectMode = input<"single" | "multi" | undefined>()` + `selectedItemKeys = input<(number | undefined)[]>([])` + `close = output<SelectModalOutputResult<ICustomer> | undefined>()`
- **생성자 effect:** modal 뷰일 때 `selectedItemKeys` → `selectedItems` 복원
- **메서드:** `onModalConfirmClick`, `onModalCancelClick`
- **`setupCanDeactivate` 변경:** modal 뷰에서는 변경사항 체크 스킵
- **템플릿:** `<sd-sheet>`에 `[selectMode]="selectMode() ?? 'multi'"` + `[cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"`. 시트 아래에 modal 전용 하단 dock(`[position]="'bottom'"`) — 선택 해제·확인 버튼.

<!-- MOVE: docs/provider-types.md#sdselectmodal --> → [`SdSelectModal<T>` 선택 모달 구현 패턴](../provider-types.md#선택-모달-구현-패턴) 참조
<!-- MOVE: docs/provider-types.md#selectmodaloutputresult --> → [`SelectModalOutputResult<T>` 사용 패턴](../provider-types.md#사용-패턴) 참조
> 상세: [`<sd-dock> position="bottom"`](../ui-layout.md#sddock) · [`cumulativeSelection 사용 패턴`](../ui-data.md#cumulativeselection-사용-패턴)

```typescript
// 1) imports 추가 — @angular/core의 {input, output}, @simplysm/angular의 {type SdSelectModal, type SelectModalOutputResult}
import { input, output } from "@angular/core";
import { type SdSelectModal, type SelectModalOutputResult } from "@simplysm/angular";

// 2) 클래스에 SdSelectModal<ICustomer> 계약 구현
export class CustomerListPage implements SdSelectModal<ICustomer> {
  // ...

  //== SdSelectModal<ICustomer> 계약 ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  // 3) 생성자에 복원 effect + setupCanDeactivate 조건 완화
  constructor() {
    // ... 기존 초기 effect

    // modal 뷰: selectedItemKeys → selectedItems 복원 (items 로드 후)
    effect(() => {
      if (this.viewType() !== "modal") return;

      const keys = this.selectedItemKeys();
      if (keys.length === 0) return;

      const currItems = this.items();
      if (currItems.length === 0) return;

      untracked(() => {
        const sel = currItems.filter((it) => keys.includes(this.trackByFn(it)));
        if (sel.length > 0) this.selectedItems.set(sel);
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
  }

  // 4) 메서드 추가
  onModalConfirmClick(): void {
    const sel = this.selectedItems();
    this.close.emit({
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  onModalCancelClick(): void {
    this.selectedItems.set([]);

    // single 모드에서만 즉시 close (multi는 "확인" 버튼 필요)
    if (this.selectMode() === "single") {
      this.close.emit({ selectedItemKeys: [], selectedItems: [] });
    }
  }
}

// 5) template — <sd-sheet>에 selectMode·cumulativeSelection 추가, 시트 뒤에 modal 하단 dock 배치
`
<sd-sheet
  ...(기존)
  [selectMode]="selectMode() ?? 'multi'"
  [(selectedItems)]="selectedItems"
  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
>
  <!-- 컬럼들 동일 -->
</sd-sheet>

<!-- modal 하단 확인 바 -->
@if (viewType() === "modal") {
  <sd-dock
    [position]="'bottom'"
    class="p-sm-default flex-row main-align-end gap-sm bdt bdt-theme-gray-lightest"
  >
    <sd-button [size]="'sm'" [theme]="'danger'"
      (click)="onModalCancelClick()"
      [disabled]="selectedItems().length < 1">
      선택 해제
    </sd-button>
    @if (selectMode() === "multi") {
      <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalConfirmClick()">
        확인({{ selectedItems().length }})
      </sd-button>
    }
  </sd-dock>
}
`
```

**포인트:**

- **`<sd-dock>` 하단 바는 `[position]="'bottom'"` 반드시 명시.** 생략 시 기본값 `"top"`이 적용되어 필터 위에 쌓이며 레이아웃이 깨진다(`sd-dock.ts:97`).
- **`cumulativeSelection` 의도**: 페이지를 넘어 선택을 **누적**한다. 기본값(`false`)이면 페이지 이동 시 선택 초기화. 선택 모달에서는 multi 모드일 때만 누적 의미가 있으므로 `viewType() === 'modal' && selectMode() === 'multi'`로 조건부 활성화. page 뷰의 "선택 삭제/복구"는 현재 페이지 행만 다루므로 누적하지 않는다.
- **모달 "선택 해제"는 single 모드에서만 즉시 close.** multi 모드에서 `close.emit`을 무조건 호출하면 "선택 해제 = 취소 + 닫기"가 되어 다시 선택하려면 모달을 재오픈해야 한다. multi에서는 `selectedItems.set([])`만 하고 close는 호출하지 않는다(사용자가 "확인" 버튼으로 최종 emit).
- **`selectedItemKeys`는 `filterExists()`로 undefined 제거.** `<sd-sheet>`는 key 기반이 아니라 item 기반이므로 `SelectModalOutputResult<T>.selectedItemKeys`는 수동 변환: `selectedItems().map((it) => trackByFn(it)).filterExists()`. **index fallback(`trackByFn(it, i) ?? i`) 금지** — id=undefined인 신규 행이 있을 때 0, 1, 2 같은 index 값이 가짜 key로 들어가 호출 측이 잘못된 selection을 돌려받는다.
- **`canEdit = computed(() => perms().includes("edit") && viewType() === "page")`**: modal 뷰에서는 항상 false가 되어 inline 편집 셀이 자동으로 읽기 전용으로 전환되고, 상단 "저장" 버튼과 inline 도구 dock(등록/선택 삭제·복구)이 숨겨진다. 선택 모달에서는 편집이 필요 없기 때문.
- **`setupCanDeactivate` 조건 완화:** modal 뷰에서는 라우트 이탈 개념이 없으므로 `viewType() === "modal"`이면 무조건 true 리턴. 변경사항 확인은 page 뷰에서만.
- **selectedItemKeys 복원 effect는 items 로드 후에만 동작** — 두 번째 effect가 `items()`와 `selectedItemKeys()` 둘 다 의존. `untracked()`로 감싸 set 호출이 effect 자기 자신을 재실행하지 않도록.

## 9. 확장 E: 조회 전용 modal

호출하는 쪽(상세 화면 등)에서 부모 레코드 식별자를 input으로 전달하고, 이 modal은 **해당 부모의 자식 목록·이력만 필터링해서 읽기 전용으로 보여준다.** 사용자는 내용을 훑어본 뒤 SdModal 기본 "X" 버튼으로 닫는다. **선택·확정·저장·이탈 방지가 전부 불필요**하므로 최소 뼈대(§3)에서 부모 식별자 input과 `_search` where절만 얹는다. 확장 A/B/D(편집/선택/선택 모달 계약)를 **얹지 않는다**.

호출 예:

```typescript
await this._sdModal.showAsync({
  title: "고객 주문 이력",
  type: CustomerOrderHistoryModal,
  inputs: { customerId: 123 },
});
```

**이 확장이 도입하는 요소:**

- **imports:** `input` (최소 뼈대에 없음)
- **input:** 부모 식별자 (예: `customerId = input.required<number>()`)
- **_search 변경:** where절에 부모 식별자 반영
- **초기 effect 의존성:** 부모 식별자 input 추가
- **SdSelectModal<T> 계약 / selectedItems / 하단 바 / cumulativeSelection / canEdit / diffs / setupCanDeactivate / `<sd-form #formCtrl>` 래퍼 등은 전부 부착하지 않는다.**

```typescript
// 1) 클래스 선언 — implements 없음. SdSelectModal<T> 계약 3종 제거
import { input } from "@angular/core";

export class CustomerOrderHistoryModal {
  // ...DI, perms, 상태는 최소 뼈대와 동일

  // 2) 부모 식별자 input (필수) — 맥락에 맞는 이름(customerId / orderId / companyId 등)
  customerId = input.required<number>();

  // 3) 초기 effect 의존성에 input 추가
  constructor() {
    effect(() => {
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.lastFilter();
      this.page();
      this.sortingDefs();
      this.customerId();        // ← input 의존성 추가

      void untracked(async () => {
        this.busyCount.update((v) => v + 1);
        await this._sdToast.try(async () => { await this._refresh(); });
        this.busyCount.update((v) => v - 1);
        this.initialized.set(true);
      });
    });
  }

  // 4) _search — where절에 부모 식별자 하드 필터. filter.searchText 등 기존 조건과 AND
  private async _search(usePagination: boolean): Promise<{ items: ICustomer[]; pageLength: number }> {
    const filter = this.lastFilter();
    const sortingDefs = this.sortingDefs();
    const page = this.page();
    const customerId = this.customerId();    // ← input 값

    return this._appOrm.connectAsync(async (db) => {
      let qr1 = db.customerOrder()
        .where((item) => [expr.eq(item.customerId, customerId)]);

      if (!str.isNullOrEmpty(filter.searchText)) {
        qr1 = qr1.search((item) => [item.name], filter.searchText);
      }
      // 나머지는 최소 뼈대 _search와 동일 (paging/sorting/select/limit)
      // ...
    });
  }
}

// 5) template — <sd-topbar-container> 내부에서 modal 전용 레이아웃으로 구성.
//    <sd-topbar>의 viewType() === "page" 분기는 실제 안 쓴다면 제거하고 바로 dock-container로 진입 가능.
//    <sd-sheet>에 selectMode / selectedItems / cumulativeSelection 미사용. 시트 셀은 순수 표시.
`
<sd-topbar-container>
  <sd-dock-container>
    <sd-dock class="p-default">
      <sd-form (formSubmit)="onFilterSubmit()">
        <!-- 필터 (최소 뼈대와 동일) -->
      </sd-form>
    </sd-dock>

    <sd-sheet
      [key]="'customer-order-history-sheet'"
      [items]="items()"
      [(currentPage)]="page"
      [totalPageCount]="pageLength()"
      [(sorts)]="sortingDefs"
      [trackByFn]="trackByFn"
    >
      <!-- selectMode / selectedItems / cumulativeSelection 없음. 셀은 읽기 전용 표시 -->
      <sd-sheet-column [key]="'name'" [header]="'이름'">
        <ng-template [cell]="items()" let-item="item">
          <div class="p-xs-sm">{{ item.name }}</div>
        </ng-template>
      </sd-sheet-column>
      <!-- ... 필요한 조회 컬럼만 -->
    </sd-sheet>

    <!-- modal 하단 "선택 해제 / 확인" <sd-dock [position]="'bottom'"> 블록 없음 -->
    <!-- 상단 inline 도구 <sd-dock>(등록 / 선택 삭제/복구)도 없음 -->
  </sd-dock-container>
</sd-topbar-container>
`
```

**포인트:**

- **`SdSelectModal<T>` 계약은 선택 모달 전용**이다. 조회 전용 modal에서는 `implements SdSelectModal<T>` 및 `selectMode` / `selectedItemKeys` input / `close` output을 **전부 제거**한다. "modal = 선택 계약 구현"이 아니다.
- **부모 식별자는 호출자가 `inputs`으로 전달.** 값이 반드시 주어져야 하면 `input.required<T>()`, 없으면 전체 조회로 fallback하는 설계면 `input<T | undefined>()`. 어느 쪽이든 `_search`의 `where` 절과 초기 effect 의존성에 반드시 포함시킨다.
- **닫기 = SdModal 기본 "X"**. `close` output이 없으므로 `SdModalProvider.showAsync`의 리턴값(close emit 값)도 사용하지 않는다. 호출 측은 `await showAsync(...)` 결과를 버리거나 `void`로 처리한다.
- **시트는 읽기 전용.** `[cell]` 템플릿에 `<sd-textfield>` 대신 `{{ item.name }}` 같은 순수 표시만 쓰고, `let-edit="edit"` / `[readonly]="!edit"` / `(valueChange)="mark(items)"`는 제거. `canEdit` / `diffs` / `_itemsSnapshot` / `setupCanDeactivate`도 함께 제거.
- **`viewType()` 분기는 쓰지 않아도 된다.** 조회 전용 modal은 보통 modal 전용 화면으로 라우트 없이 등록된다. page/modal 양쪽을 모두 지원해야 할 때만 `viewType()`으로 topbar 영역을 분기하고, 시트·필터는 공통으로 둔다.
- **부모 대상에 대한 inline 편집/삭제가 필요하면** 이 확장이 아니라 최소 뼈대 + 확장 A(+B) 또는 [확장 F. 모달 편집 모드](#10-확장-f-모달-편집-모드)를 사용한다. 조회 전용 variant는 이름 그대로 조회만 담당한다.
- **확장 E는 독립 경로** — 최소 뼈대에만 얹으며 확장 A/B/D를 얹지 않는다. 조립 결과는 [부록 B. 확장 매트릭스 표](#부록-b-확장-매트릭스-표)에서 한눈에 확인할 수 있다.

## 10. 확장 F: 모달 편집 모드

시트 셀 직접 수정(inline 편집) + 일괄 저장 대신, **행 클릭 시 편집 모달을 띄워 한 행씩 편집**하는 모드. 확장 A(inline 편집)와 **상호 배타적**이다 — inline 편집 파이프라인(`diffs` / `_itemsSnapshot` / `onSubmit` / `setupCanDeactivate` / `hostDirectives.sdSaveCommand` 등)을 **전부 제거**하고, 대신 `SdModalProvider.showAsync`로 편집 모달을 호출한다.

**이 확장이 도입하는 요소:**

- **imports:** `SdAnchor`, `SdModalProvider`, `tablerEdit`
- **DI:** `SdModalProvider`
- **메서드:** `onCreateItemButtonClick`, `onEditItemButtonClick`, `_editItem`
- **템플릿:** 이름 컬럼 셀을 `<sd-anchor>` + 편집 아이콘으로 교체. inline 편집용 `<sd-textfield let-edit="edit">`는 사용하지 않는다.
- **제거 대상(확장 A의 inline 편집을 얹지 않는 경우):** `hostDirectives.sdSaveCommand` / `host (sdSaveCommand)` / `onSaveButtonClick` / `onSubmit` / `diffs` / `_itemsSnapshot` / `_checkIgnoreChanges` / `_upsertItem` / `getIsItemChanged` / `onRemoveNewItemButtonClick` / `setupCanDeactivate` / `<sd-form #formCtrl (formSubmit)="onSubmit()">` 래퍼

> 상세: [`SdModalProvider.showAsync` 사용 패턴](../providers.md#모달-호출-패턴) · [`<sd-anchor>`](../ui-form.md#sdanchor)

```typescript
// 1) imports 추가
import { SdAnchor, SdModalProvider } from "@simplysm/angular";
import { tablerEdit } from "@ng-icons/tabler-icons";
// 앱별 편집 모달 컴포넌트 (crud-detail.md 레시피로 작성):
import { CustomerEditModal } from "./CustomerEditModal";

// 2) DI 추가
private readonly _sdModal = inject(SdModalProvider);

// 3) 클래스 필드 추가 — 편집 버튼 아이콘
protected readonly tablerEdit = tablerEdit;

// 4) template — 이름 컬럼 셀을 <sd-anchor> + 편집 아이콘으로 교체.
//    inline 편집용 <sd-textfield>/let-edit 제거.
`
<sd-sheet-column [key]="'name'" [header]="'이름'">
  <ng-template [cell]="items()" let-item="item">
    <sd-anchor (click)="onEditItemButtonClick(item, $event)" class="flex-row">
      <div class="p-xs-sm">
        <ng-icon [svg]="tablerEdit" />
      </div>
      <div class="flex-fill p-xs-sm">{{ item.name }}</div>
    </sd-anchor>
  </ng-template>
</sd-sheet-column>
`

// 5) inline 편집용 도구 dock의 "등록" 버튼은 _editItem() 호출로 바꾼다.
//    "선택 삭제/복구"를 남기려면 bulk API로 전환 (아래 포인트 참조).
// template:
`<sd-button ... (click)="onCreateItemButtonClick()">등록</sd-button>`

// 6) 메서드 교체
protected async onCreateItemButtonClick(): Promise<void> {
  await this._editItem();
}

protected async onEditItemButtonClick(item: ICustomer, event: MouseEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  await this._editItem(item);
}

private async _editItem(item?: ICustomer): Promise<void> {
  const r = await this._sdModal.showAsync({
    title: item == null ? "고객 등록" : "고객 수정",
    type: CustomerEditModal,
    inputs: { itemId: item?.id },
  });
  if (r != null) await this._refresh();
}

// 7) 제거 대상 (확장 A를 얹지 않을 때):
//    - @Component hostDirectives의 sdSaveCommand / host의 (sdSaveCommand)
//    - onSaveButtonClick / onSubmit / onAddItemButtonClick
//    - diffs computed / _itemsSnapshot / _checkIgnoreChanges / _upsertItem
//    - getIsItemChanged / onRemoveNewItemButtonClick
//    - setupCanDeactivate(...) 호출 (이탈 방지는 편집 모달 쪽 책임)
//    - <sd-form #formCtrl (formSubmit)="onSubmit()"> 래퍼 → <sd-sheet>를 main 영역에 직접 배치
```

**포인트:**

- **모달 편집 모드에는 inline diff 개념이 없다.** 개별 item 변경은 `CustomerEditModal`(상세 폼) 내부에서 즉시 upsert하고 결과를 `close.emit(true)` 같은 신호로 전달. 리스트는 모달 close 후 `_refresh()`로 재조회.
- **`CustomerEditModal`은 [`crud-detail.md`](./crud-detail.md) 레시피로 별도 작성.** modal 뷰 분기를 그대로 활용.
- **시트 `[cell]` 템플릿에 `let-edit="edit"` / `[readonly]="!edit"`는 불필요** (inline 편집 아님). 읽기 전용 표시만.
- **"선택 삭제/복구"를 남길 경우 (확장 B와 병용)** `onToggleDeleteItemsButtonClick(del)` 내부를 diff 방식 대신 **bulk API 호출 + `_refresh()`** 로 구현한다:
  ```typescript
  protected async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
    if (this.busyCount() > 0) return;
    const ids = this.selectedItems().map((it) => this.trackByFn(it)).filterExists();
    if (ids.length === 0) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._appOrm.connectAsync((db) =>
        db.customer().where((c) => [expr.in(c.id, ids)])
          .updateAsync(() => ({ isDeleted: del })));
      await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, ids);
      this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }
  ```
- **`itemId: item?.id`**: `item`이 undefined이면 "등록", id가 있으면 "수정"으로 위임. `CustomerEditModal` 내부에서 id 유무로 분기.

## 11. 확장 G: 엑셀 업로드/다운로드

`SdFileDialogProvider`로 파일 선택, `ExcelWrapper`(@simplysm/excel) + `zod` 스키마로 읽기/쓰기. 다운로드는 `_search(false)`로 **전체 페이지 조회** 후 `@simplysm/core-browser`의 `downloadBlob`으로 내려받는다. 확장 A(`_upsertItem` / 중복 검사 / 감사 로그)를 전제로 한다 — 업로드된 각 행을 일관된 경로로 upsert하기 때문.

**이 확장이 도입하는 요소:**

- **imports:** `SdFileDialogProvider`, `DateTime`, `downloadBlob`(@simplysm/core-browser), `ExcelWrapper`(@simplysm/excel), `z`(zod), `tablerFileExcel`, `tablerUpload`
- **DI:** `SdFileDialogProvider`
- **필드:** `_excelWrapper` (zod 스키마로 컬럼 정의)
- **메서드:** `onDownloadExcelButtonClick`, `onUploadExcelButtonClick`
- **템플릿:** page 뷰 topbar에 엑셀 다운로드/업로드 버튼 추가

<!-- MOVE: docs/providers.md#sdfiledialogprovider --> → [`SdFileDialogProvider.showAsync` 사용 패턴](../providers.md#파일-선택-사용-패턴) 참조

```typescript
// 1) imports 추가
import { tablerFileExcel, tablerUpload } from "@ng-icons/tabler-icons";
import { SdFileDialogProvider } from "@simplysm/angular";
import { DateTime } from "@simplysm/core-common";
import { downloadBlob } from "@simplysm/core-browser";
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

// 2) DI 추가
private readonly _sdFileDialog = inject(SdFileDialogProvider);

// 3) 클래스 필드 — 아이콘 + ExcelWrapper (zod 스키마로 컬럼 정의)
protected readonly tablerFileExcel = tablerFileExcel;
protected readonly tablerUpload = tablerUpload;

private readonly _excelWrapper = new ExcelWrapper(
  z.object({
    id: z.number().optional().describe("ID"),
    name: z.string().describe("이름"),
    phone: z.string().optional().describe("전화번호"),
    categoryId: z.number().optional().describe("카테고리.ID"),
    isDeleted: z.boolean().describe("삭제"),
    lastModifiedAt: z.custom<DateTime>().optional().describe("최종수정일시"),
    lastModifiedBy: z.string().optional().describe("최종수정자"),
  }),
);

// 4) template — page 뷰 topbar에 엑셀 버튼 2개 추가
`
<sd-topbar>
  <!-- 기존 "새로고침" / "저장" 버튼 옆 -->
  <sd-button [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
    <ng-icon [svg]="tablerFileExcel" />
    엑셀 다운로드
  </sd-button>
  @if (canEdit()) {
    <sd-button [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
      <ng-icon [svg]="tablerUpload" />
      엑셀 업로드
    </sd-button>
  }
</sd-topbar>
`

// 5) 메서드 추가
async onDownloadExcelButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 전체 조회 (페이지네이션 없이) — 확장 A의 _search를 그대로 재사용
    const r = await this._search(false);
    const wb = await this._excelWrapper.write(this.viewTitle(), r.items);
    try {
      downloadBlob(
        await wb.toBlob(),
        `${this.viewTitle()}_${new DateTime().toFormatString("yyMMdd")}.xlsx`,
      );
    } finally {
      await wb.close();
    }
  });
  this.busyCount.update((v) => v - 1);
}

async onUploadExcelButtonClick(): Promise<void> {
  const file = await this._sdFileDialog.showAsync(false, ".xlsx");
  if (file == null) return;
  if (Array.isArray(file)) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const excelItems = await this._excelWrapper.read(file);
    const changedIds: number[] = [];
    await this._appOrm.connectAsync(async (db) => {
      for (const raw of excelItems) {
        changedIds.push(await this._upsertItem(db, raw, "엑셀업로드"));
      }
    });
    await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, changedIds);

    this._sdToast.success("업로드되었습니다.");

    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}
```

**포인트:**

- **다운로드는 `_search(false)`**(페이지네이션 없이 전체)로 쿼리. 페이지당 50건 제한이 걸리면 현재 페이지만 다운로드되는 실수가 생기므로 `usePagination: false` 명시 필수.
- **업로드는 `_excelWrapper.read(file)` → `_upsertItem` 재사용.** 확장 A의 중복 검사·DataLog 기록 로직이 동일하게 적용됨 (`logType: "엑셀업로드"`로 감사 로그 구분).
- **엑셀의 텍스트 컬럼(고객사명·MPN 등)을 FK id로 변환해야 하면** DB 재조회 대신 `useSharedSignal(...)`로 이미 로드된 공유 데이터를 재사용한다. 예: `this.sharedCategories.items().toMapValues((it) => it.name, (it) => it.orderBy((v) => (v.__isHidden ? 1 : 0))[0])`. 같은 키에 숨김·비숨김 항목이 섞여 있으면 `orderBy`로 비숨김(`__isHidden: false`)을 우선순위로 정렬한다. 별도 `_buildIdMap` 같은 helper로 분리하지 말고 `toMapValues`를 `onUploadExcelButtonClick` 내부에 직접 인라인한다 (단일 호출처).
- **`busyMessage`는 필요할 때만 추가** — 최소 뼈대는 `<sd-busy-container [busy]="busyCount() > 0">`만 사용하고 `busyMessage` signal을 두지 않는다. 짧은 CRUD는 progress 아이콘만으로 충분. 오래 걸리는 작업(대량 엑셀 업로드·집계 등)에 진행 문구가 필요하면 **필요한 화면에만** `busyMessage = signal<string | undefined>(undefined)` 추가 + `[message]="busyMessage()"` 바인딩 + 구간별 `busyMessage.set(...)`/`set(undefined)` 제어. 미사용 시 선언·바인딩 모두 생략.

## 12. 뷰 타입 분기

page·modal·control 세 뷰는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 세 뷰별로 별도 블록을 전체 복제하지 않는다. modal은 동일한 `viewType() === "modal"`이어도 **용도에 따라 선택 / 조회 전용**으로 나뉘며, 각기 다른 조각을 얹는다.

| 뷰 | topbar | dock (도구 바) | main (시트) | 하단 바 |
|---|---|---|---|---|
| page | `<sd-topbar>` (새로고침/저장/...) | inline 도구 `<sd-dock>` (canEdit) | `<sd-form>` + `<sd-sheet>` | 없음 |
| modal (선택) | 없음 | inline 도구 숨김 (`canEdit` = false) | 동일 (selectMode·selectedItems·cumulativeSelection 사용) | `<sd-dock [position]="'bottom'">` (선택 해제 / 확인) |
| modal (조회 전용) | 없음 | inline 도구 제거 | `<sd-sheet>` 직접 배치, selectMode·selectedItems·cumulativeSelection **미사용**, 셀은 읽기 전용 | 없음 (SdModal 기본 "X"로 닫기) |
| control | 없음 | 필요 시 주석만 | 동일 | 없음 |

- `<sd-dock>` position 규칙·`[cumulativeSelection]`·modal 하단 바 상세 → [§8 확장 D: 선택 모달 전환](#8-확장-d-선택-모달-전환)
- `canEdit = perms().includes("edit") && viewType() === "page"` 정의·효과 → [§5 확장 A: inline 편집/저장](#5-확장-a-inline-편집저장)
- 조회 전용 modal의 계약 미부착·`selectMode` input 미도입 → [§9 확장 E: 조회 전용 modal](#9-확장-e-조회-전용-modal)

## 13. 주의사항 (자주 하는 실수)

> 확장 레이어와 직결된 주의사항(`<sd-dock>` position 누락 / 시트 셀 `[inset]`·`[size]` / `oneWayDiffs`의 delete 미처리 / `selectedItemKeys` `filterExists()` / 모달 "선택 해제" single / `busyMessage`)은 [§5 확장 A ~ §11 확장 G](#5-확장-a-inline-편집저장) 각 확장 섹션의 "포인트" bullet에서 해당 확장과 함께 다룬다. 이 섹션에는 **최소 뼈대 + 모든 확장에 공통되는 구조·시스템 레벨 주의**만 남긴다.

### modal 뷰 = 반드시 선택 모달인 것은 아니다

- `viewType() === "modal"`이라는 사실만으로 "선택 모달"이라고 단정하지 않는다. modal 용도는 최소 두 가지다 — **(a) 선택 모달**: 항목을 골라 `close.emit`으로 돌려줌([확장 D](#8-확장-d-선택-모달-전환)) / **(b) 조회 전용**: 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 보여줌([확장 E](#9-확장-e-조회-전용-modal), SdModal 기본 "X"로 닫기).
- 조회 전용 modal에는 `implements SdSelectModal<T>`, `selectMode` / `selectedItemKeys` input, `close` output, 하단 "선택 해제 / 확인" 바, `cumulativeSelection`, `selectedItems` 상태·복원 effect를 **전부 부착하지 않는다.** 부착해도 호출되지 않아 죽은 코드가 된다.
- LLM이 부록 A(풀 스택 합본)를 복사하면서 modal 지원이라는 이유로 선택 모달 계약을 반사적으로 이식하는 경우가 잦다. 상단 "뷰 범위 + modal 용도 확인 선행"에 따라 **용도를 먼저 확정**하고, 조회 전용이면 확장 E 스켈레톤부터 조립한다.

### 공통 유틸 재도입 금지

- `useCrudList()` / `useDataSheet()` / `setupCumulateSelectedKeys2()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다.

### 뷰 분기를 "완전 분리 블록"으로 쓰지 않는다

- 시트 페이지를 modal로도 쓰는 경우(확장 D), LLM이 page 블록과 modal 블록을 각각 완성하면서 **필터·시트를 중복 작성**하기 쉽다. 최소 뼈대처럼 **하나의 껍데기 + 차이점만 `@if`** 로 얹어야 한다. 필터 하나를 수정할 때 두 블록을 모두 고치는 상황이 나오면 구조가 잘못된 것.

### `injectViewTypeSignal()` 호출 시점

- `injectViewTypeSignal()`은 **생성자 실행 중 또는 필드 이니셜라이저에서만** 호출한다. `computed`·`effect` 콜백이나 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다 (Angular `inject()` 제약). `canEdit = computed(() => ... && this.viewType() === "page")`처럼 생성자 시점에 필드로 선언된 signal을 **읽는** 것은 computed 안에서도 문제 없다 — 호출 자체는 클래스 초기화 시점에 이미 완료됐기 때문.

### 테스트만을 위한 public API 금지

- `async submit(diffs) { await this._submitAsync(diffs); }` 같이 "테스트에서 호출하려고" private 메서드의 얇은 public wrapper를 노출하지 않는다. 캡슐화를 깨고 컴포넌트의 외부 API 인상을 오염시킨다. 테스트는 TestBed fixture + click/dispatch 이벤트 경로 또는 host의 `sdSaveCommand` 트리거로 수행.

## 14. 레시피 작성 관용 규칙

향후 `crud-detail.md` · `data-select-button.md` 등 데이터 관련 레시피가 추가될 때 아래 3개 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

> 상세: [셀 내용 작성 지침](../ui-data.md#sdsheetcolumncelltemplate)

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다. 확장 A(inline 편집)의 "포인트"에도 동일 경고 포함

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

> 상세: [`mark` — 역할·주의사항](../utils.md#mark)

- `mark(sig)`는 `WritableSignal`의 값을 shallow copy하여 **참조를 갱신**한다 (배열: `[...v]`, 객체: `{...v}`)
- 역할: **OnPush 템플릿 재렌더링** + **다른 computed / effect의 의존성 갱신**
- **"저장 감지"가 아니다.** `obj.equal`이 deep equal로 값 차이를 감지하므로, `item.name = "new"` 같은 mutation은 `mark` 없이도 `diffs()` / submit에서 감지된다
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

## 부록 A. 풀 스택 합본 완성본

**A + B + C + D + G 누적 적용** — page 뷰 + 선택 모달 뷰 동시 지원 + inline 편집 + 다건 선택 삭제/복구 + row별 inline 삭제 열 + 엑셀 업로드/다운로드. LLM이 CRUD 리스트 화면을 만들 때 **복사 시작점**으로 사용한다. (확장 E 조회 전용 modal / 확장 F 모달 편집 모드는 경로가 달라 합본에 포함하지 않음 — 해당 §9 / §10 스니펫에서 단독으로 조립)

```typescript
import { NgIcon } from "@ng-icons/core";
import {
  tablerAlertTriangle,
  tablerCirclePlus,
  tablerDeviceFloppy,
  tablerEraser,
  tablerFileExcel,
  tablerRefresh,
  tablerRestore,
  tablerSearch,
  tablerUpload,
  tablerX,
} from "@ng-icons/tabler-icons";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { ArgumentError, type DateTime, obj, str } from "@simplysm/core-common";
import { downloadBlob } from "@simplysm/core-browser";
import { expr } from "@simplysm/orm-common";
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";
import {
  FormatPipe,
  injectPermsSignal,
  injectViewTitleSignal,
  injectViewTypeSignal,
  mark,
  SdAnchor,
  SdBusyContainer,
  SdButton,
  SdCheckbox,
  SdCommandDirective,
  SdDock,
  SdDockContainer,
  SdFileDialogProvider,
  SdForm,
  SdItemOfTemplate,
  type SdSelectModal,
  SdSharedDataSelect,
  SdSheet,
  SdSheetColumn,
  SdSheetColumnCellTemplate,
  SdTextfield,
  SdToastProvider,
  SdTopbar,
  SdTopbarContainer,
  type SelectModalOutputResult,
  setupCanDeactivate,
  type SortingDef,
} from "@simplysm/angular";
// 앱별 대체: ORM/공유 데이터/인증 provider + DbContext. simplysm 패키지가 아니라 각 앱이 소유한다.
import { AppOrmProvider, AppSharedDataProvider, useSharedSignal } from "@adtek/client-common";
import type { MainDbContext } from "@adtek/db-main";
import { AppAuthProvider } from "../../../providers/AppAuthProvider";

interface IFilter {
  searchText?: string;
  isIncludeDeleted: boolean;
}

interface ICustomer {
  id?: number;
  name?: string;
  phone?: string;
  categoryId?: number;
  isDeleted: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}

@Component({
  selector: "app-customer-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainer, SdTopbarContainer, SdTopbar,
    SdDockContainer, SdDock,
    SdForm, SdSheet, SdSheetColumn, SdSheetColumnCellTemplate,
    SdButton, SdAnchor, SdCheckbox, SdTextfield,
    SdSharedDataSelect, SdItemOfTemplate,
    NgIcon, FormatPipe,
  ],
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdRefreshCommand)": "onRefreshButtonClick()",
    "(sdSaveCommand)": "onSaveButtonClick()",
  },
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      @if (initialized()) {
        @if (!perms().includes("use")) {
          <div class="fill tx-theme-gray-light p-xxl tx-center">
            <br />
            <ng-icon [svg]="tablerAlertTriangle" [size]="'5em'" />
            <br />
            <br />
            '{{ viewTitle() }}'에 대한 사용권한이 없습니다. 시스템 관리자에게 문의하세요.
          </div>
        } @else {
          <sd-topbar-container>
            @if (viewType() === "page") {
              <sd-topbar>
                <h4>{{ viewTitle() }}</h4>

                <sd-button [theme]="'link-info'" (click)="onRefreshButtonClick()">
                  <ng-icon [svg]="tablerRefresh" />
                  새로고침
                  <small>(CTRL+ALT+L)</small>
                </sd-button>
                @if (canEdit()) {
                  <sd-button [theme]="'link-primary'" (click)="onSaveButtonClick()">
                    <ng-icon [svg]="tablerDeviceFloppy" />
                    저장
                    <small>(CTRL+S)</small>
                  </sd-button>
                }
                <sd-button [theme]="'link-success'" (click)="onDownloadExcelButtonClick()">
                  <ng-icon [svg]="tablerFileExcel" />
                  엑셀 다운로드
                </sd-button>
                @if (canEdit()) {
                  <sd-button [theme]="'link-success'" (click)="onUploadExcelButtonClick()">
                    <ng-icon [svg]="tablerUpload" />
                    엑셀 업로드
                  </sd-button>
                }
              </sd-topbar>
            }

            <sd-dock-container>
              <!-- 필터 -->
              <sd-dock class="p-default">
                <sd-form (formSubmit)="onFilterSubmit()">
                  <div class="form-box-inline">
                    <div class="form-box-item">
                      <sd-button [type]="'submit'" [theme]="'info'">
                        <ng-icon [svg]="tablerSearch" />
                        조회
                      </sd-button>
                    </div>
                    <div class="form-box-item">
                      <label>검색어</label>
                      <sd-textfield
                        [type]="'text'"
                        [placeholder]="'이름/전화번호'"
                        [(value)]="filter().searchText"
                        (valueChange)="mark(filter)"
                      />
                    </div>
                    <div class="form-box-item">
                      <sd-checkbox
                        [(value)]="filter().isIncludeDeleted"
                        (valueChange)="mark(filter)"
                      >
                        삭제항목 포함
                      </sd-checkbox>
                    </div>
                  </div>
                </sd-form>
              </sd-dock>

              <!-- 도구 (inline 편집용, page 뷰에서만) -->
              @if (canEdit() && viewType() === "page") {
                <sd-dock class="flex-row gap-sm p-xs-default">
                  <sd-button
                    [size]="'sm'"
                    [theme]="'link-primary'"
                    (click)="onAddItemButtonClick()"
                  >
                    <ng-icon [svg]="tablerCirclePlus" />
                    등록
                  </sd-button>
                  <sd-button
                    [size]="'sm'"
                    [theme]="'link-danger'"
                    (click)="onToggleDeleteItemsButtonClick(true)"
                    [disabled]="!hasSelectedNotDeleted()"
                  >
                    <ng-icon [svg]="tablerEraser" />
                    선택 삭제
                  </sd-button>
                  @if (hasSelectedDeleted()) {
                    <sd-button
                      [size]="'sm'"
                      [theme]="'link-warning'"
                      (click)="onToggleDeleteItemsButtonClick(false)"
                    >
                      <ng-icon [svg]="tablerRestore" />
                      선택 복구
                    </sd-button>
                  }
                </sd-dock>
              }

              <!-- 시트 (main 영역) -->
              <sd-form #formCtrl (formSubmit)="onSubmit()" class="block fill p-default pt-0">
                <sd-sheet
                  [key]="'customer-list-sheet'"
                  [items]="items()"
                  [(currentPage)]="page"
                  [totalPageCount]="pageLength()"
                  [(sorts)]="sortingDefs"
                  [selectMode]="selectMode() ?? 'multi'"
                  [(selectedItems)]="selectedItems"
                  [trackByFn]="trackByFn"
                  [getItemCellStyleFn]="getItemCellStyleFn"
                  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
                >
                  <!-- 확장 C: row별 inline 삭제 열 (page 뷰 + canEdit에서만) -->
                  @if (canEdit() && viewType() === "page") {
                    <sd-sheet-column [fixed]="true" [key]="'_isDeleted'">
                      <ng-template #headerTpl>
                        <div class="p-xs-sm tx-center">
                          <ng-icon [svg]="tablerEraser" />
                        </div>
                      </ng-template>
                      <ng-template [cell]="items()" let-item="item">
                        <div class="p-xs-sm tx-center">
                          <sd-anchor
                            [theme]="'danger'"
                            (click)="onToggleDeleteItemButtonClick(item)"
                          >
                            <ng-icon [svg]="item.isDeleted ? tablerRestore : tablerEraser" />
                            {{ item.isDeleted ? "복구" : "삭제" }}
                          </sd-anchor>
                        </div>
                      </ng-template>
                    </sd-sheet-column>
                  }

                  <sd-sheet-column [fixed]="true" [key]="'id'" [header]="'#'">
                    <ng-template [cell]="items()" let-item="item">
                      <div
                        class="p-xs-sm"
                        [class.tx-right]="item.id"
                        [style.background]="getIsItemChanged(item) ? 'yellow' : ''"
                      >
                        @if (item.id) {
                          {{ item.id }}
                        } @else if (canEdit()) {
                          <sd-anchor (click)="onRemoveNewItemButtonClick(item)">
                            <ng-icon [svg]="tablerX" />
                          </sd-anchor>
                        }
                      </div>
                    </ng-template>
                  </sd-sheet-column>

                  <sd-sheet-column [key]="'name'" [header]="'이름'">
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

                  <sd-sheet-column [key]="'phone'" [header]="'전화번호'">
                    <ng-template [cell]="items()" let-item="item" let-edit="edit">
                      <sd-textfield
                        [type]="'text'"
                        [inset]="true"
                        [size]="'sm'"
                        [disabled]="!canEdit()"
                        [readonly]="!edit"
                        [(value)]="item.phone"
                        (valueChange)="mark(items)"
                      />
                    </ng-template>
                  </sd-sheet-column>

                  <sd-sheet-column [key]="'categoryId'" [header]="'카테고리'">
                    <ng-template [cell]="items()" let-item="item">
                      <sd-shared-data-select
                        [inset]="true"
                        [size]="'sm'"
                        [disabled]="!canEdit()"
                        [items]="sharedCategories.items()"
                        [(value)]="item.categoryId"
                        (valueChange)="mark(items)"
                      >
                        <ng-template [itemOf]="sharedCategories.items()" let-cat>
                          {{ cat.name }}
                        </ng-template>
                      </sd-shared-data-select>
                    </ng-template>
                  </sd-sheet-column>

                  <sd-sheet-column [key]="'lastModifiedAt'" [header]="'수정일시'" [hidden]="true">
                    <ng-template [cell]="items()" let-item="item">
                      <div class="p-xs-sm tx-center">
                        {{ item.lastModifiedAt | format: "yyyy-MM-dd HH:mm" }}
                      </div>
                    </ng-template>
                  </sd-sheet-column>

                  <sd-sheet-column [key]="'lastModifiedBy'" [header]="'수정자'" [hidden]="true">
                    <ng-template [cell]="items()" let-item="item">
                      <div class="p-xs-sm tx-center">{{ item.lastModifiedBy }}</div>
                    </ng-template>
                  </sd-sheet-column>
                </sd-sheet>
              </sd-form>

              <!-- modal 하단 확인 바 -->
              @if (viewType() === "modal") {
                <sd-dock
                  [position]="'bottom'"
                  class="p-sm-default flex-row main-align-end gap-sm bdt bdt-theme-gray-lightest"
                >
                  <sd-button
                    [size]="'sm'"
                    [theme]="'danger'"
                    (click)="onModalCancelClick()"
                    [disabled]="selectedItems().length < 1"
                  >
                    선택 해제
                  </sd-button>
                  @if (selectMode() === "multi") {
                    <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalConfirmClick()">
                      확인({{ selectedItems().length }})
                    </sd-button>
                  }
                </sd-dock>
              }
            </sd-dock-container>
          </sd-topbar-container>
        }
      }
    </sd-busy-container>
  `,
})
export class CustomerListPage implements SdSelectModal<ICustomer> {
  //== DI ==
  private readonly _appOrm = inject(AppOrmProvider);
  private readonly _appAuth = inject(AppAuthProvider);
  private readonly _appSharedData = inject(AppSharedDataProvider);
  private readonly _sdToast = inject(SdToastProvider);
  private readonly _sdFileDialog = inject(SdFileDialogProvider);

  //== SdSelectModal<ICustomer> 계약 (확장 D) ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  //== viewChild ==
  formCtrl = viewChild<SdForm>("formCtrl");

  //== 식별 / 권한 ==
  SHARED_DATA_KEY = "고객" as const;

  perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);
  canEdit = computed(() => this.perms().includes("edit") && this.viewType() === "page");

  viewType = injectViewTypeSignal();
  viewTitle = injectViewTitleSignal();

  //== 공유 데이터 ==
  sharedCategories = useSharedSignal("카테고리");

  //== 상태 ==
  initialized = signal(false);
  busyCount = signal(0);

  private _itemsSnapshot: ICustomer[] = [];
  items = signal<ICustomer[]>([]);
  selectedItems = signal<ICustomer[]>([]);
  diffs = computed(() => this.items().oneWayDiffs(this._itemsSnapshot, "id"));

  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<SortingDef[]>([]);

  filter = signal<IFilter>({ isIncludeDeleted: false });
  lastFilter = signal<IFilter>({ isIncludeDeleted: false });

  //== 파생 ==
  hasSelectedDeleted = computed(() => this.selectedItems().some((it) => it.isDeleted));
  hasSelectedNotDeleted = computed(() => this.selectedItems().some((it) => !it.isDeleted));

  //== 시트 fn ==
  trackByFn = (item: ICustomer) => item.id;
  getItemCellStyleFn = (item: ICustomer): string | undefined =>
    item.isDeleted ? "text-decoration: line-through;" : undefined;

  //== 엑셀 스키마 (확장 G) ==
  private readonly _excelWrapper = new ExcelWrapper(
    z.object({
      id: z.number().optional().describe("ID"),
      name: z.string().describe("이름"),
      phone: z.string().optional().describe("전화번호"),
      categoryId: z.number().optional().describe("카테고리.ID"),
      isDeleted: z.boolean().describe("삭제"),
      lastModifiedAt: z.custom<DateTime>().optional().describe("최종수정일시"),
      lastModifiedBy: z.string().optional().describe("최종수정자"),
    }),
  );

  constructor() {
    // 필터/페이지/정렬/perms 변경 시 재조회
    effect(() => {
      if (!this.perms().includes("use")) {
        this.initialized.set(true);
        return;
      }

      this.lastFilter();
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

    // 모달 뷰: selectedItemKeys → selectedItems 복원 (확장 D)
    effect(() => {
      if (this.viewType() !== "modal") return;

      const keys = this.selectedItemKeys();
      if (keys.length === 0) return;

      const currItems = this.items();
      if (currItems.length === 0) return;

      untracked(() => {
        const sel = currItems.filter((it) => keys.includes(this.trackByFn(it)));
        if (sel.length > 0) this.selectedItems.set(sel);
      });
    });

    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
  }

  getIsItemChanged(item: ICustomer): boolean {
    if (item.id == null) return true;
    return this.diffs().some((diff) => diff.item.id === item.id);
  }

  //== Handlers ==
  onFilterSubmit(): void {
    this.page.set(0);
    this.lastFilter.set({ ...this.filter() });
  }

  onRefreshButtonClick(): void {
    if (this.busyCount() > 0) return;
    if (!this.perms().includes("use")) return;
    if (!this._checkIgnoreChanges()) return;

    mark(this.lastFilter);
  }

  onSaveButtonClick(): void {
    this.formCtrl()?.requestSubmit();
  }

  async onSubmit(): Promise<void> {
    if (this.busyCount() > 0) return;

    const diffs = this.diffs();
    if (diffs.length === 0) {
      this._sdToast.info("변경사항이 없습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const changedIds: number[] = [];
      await this._appOrm.connectAsync(async (db) => {
        for (const diff of diffs) {
          const changedId = await this._upsertItem(
            db,
            diff.item,
            diff.type === "create" ? "등록" : "수정",
          );
          changedIds.push(changedId);
        }
      });
      await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, changedIds);

      this._sdToast.success("저장되었습니다.");

      await this._refresh();
    });

    this.busyCount.update((v) => v - 1);
  }

  onAddItemButtonClick(): void {
    this.items.update((list) => [{ isDeleted: false }, ...list]);
  }

  onRemoveNewItemButtonClick(item: ICustomer): void {
    this.items.update((list) => list.filter((it) => it !== item));
  }

  onToggleDeleteItemsButtonClick(del: boolean): void {
    for (const it of this.selectedItems()) it.isDeleted = del;
    mark(this.items);
  }

  // 확장 C: row별 inline 삭제 열
  onToggleDeleteItemButtonClick(item: ICustomer): void {
    item.isDeleted = !item.isDeleted;
    mark(this.items);
  }

  onModalConfirmClick(): void {
    const sel = this.selectedItems();
    this.close.emit({
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  onModalCancelClick(): void {
    this.selectedItems.set([]);

    if (this.selectMode() === "single") {
      this.close.emit({ selectedItemKeys: [], selectedItems: [] });
    }
  }

  // 확장 G: 엑셀
  async onDownloadExcelButtonClick(): Promise<void> {
    if (this.busyCount() > 0) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const r = await this._search(false);
      const wb = await this._excelWrapper.write(this.viewTitle(), r.items);
      try {
        downloadBlob(
          await wb.toBlob(),
          `${this.viewTitle()}_${new DateTime().toFormatString("yyMMdd")}.xlsx`,
        );
      } finally {
        await wb.close();
      }
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadExcelButtonClick(): Promise<void> {
    const file = await this._sdFileDialog.showAsync(false, ".xlsx");
    if (file == null) return;
    if (Array.isArray(file)) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const excelItems = await this._excelWrapper.read(file);
      const changedIds: number[] = [];
      await this._appOrm.connectAsync(async (db) => {
        for (const raw of excelItems) {
          changedIds.push(await this._upsertItem(db, raw, "엑셀업로드"));
        }
      });
      await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, changedIds);

      this._sdToast.success("업로드되었습니다.");

      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }

  //== Internals ==
  private _checkIgnoreChanges(): boolean {
    return this.diffs().length === 0 || confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?");
  }

  private async _refresh(): Promise<void> {
    const r = await this._search(true);
    this.items.set(r.items);
    this.pageLength.set(r.pageLength);

    const currKeys = new Set(r.items.map((it) => this.trackByFn(it)));
    this.selectedItems.update((sel) => sel.filter((it) => currKeys.has(this.trackByFn(it))));

    this._itemsSnapshot = obj.clone(r.items);
  }

  private async _search(
    usePagination: boolean,
  ): Promise<{ items: ICustomer[]; pageLength: number }> {
    const filter = this.lastFilter();
    const sortingDefs = this.sortingDefs();
    const page = this.page();

    return this._appOrm.connectAsync(async (db) => {
      let qr1 = db.customer();

      if (!str.isNullOrEmpty(filter.searchText)) {
        qr1 = qr1.search((item) => [item.name, item.phone], filter.searchText);
      }
      if (!filter.isIncludeDeleted) {
        qr1 = qr1.where((item) => [expr.eq(item.isDeleted, false)]);
      }

      const pageLength = usePagination ? Math.ceil((await qr1.count()) / 50) : 0;

      let qr2 = qr1.joinLastDataLog().select((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        categoryId: item.categoryId,
        isDeleted: item.isDeleted,
        lastModifiedAt: item.lastDataLog?.dateTime,
        lastModifiedBy: item.lastDataLog?.userName,
      }));

      for (const sortingDef of sortingDefs) {
        qr2 = qr2.orderBy(sortingDef.key, sortingDef.desc ? "DESC" : "ASC");
      }
      if (!sortingDefs.some((s) => s.key === "name")) {
        qr2 = qr2.orderBy((item) => item.name);
      }

      if (usePagination) {
        qr2 = qr2.limit(page * 50, 50);
      }

      const items = await qr2.execute();
      return { items, pageLength };
    });
  }

  private async _upsertItem(
    db: MainDbContext,
    item: ICustomer,
    logType: string,
  ): Promise<number> {
    if (
      !item.isDeleted &&
      (await db
        .customer()
        .where((c) => [
          expr.eq(c.name, item.name),
          expr.not(expr.eq(c.id, item.id)),
          expr.eq(c.isDeleted, false),
        ])
        .exists())
    ) {
      throw new ArgumentError("동일한 명칭이 이미 등록되어 있습니다.", { 명칭: item.name });
    }

    const upsertResult = await db
      .customer()
      .where((c) => [expr.eq(c.id, item.id)])
      .upsert(
        () => ({
          name: item.name!,
          phone: item.phone,
          categoryId: item.categoryId,
          isDeleted: item.isDeleted,
        }),
        ["id"],
      );
    const upsertId = upsertResult[0].id;

    await db.customer().insertDataLogAsync({
      type: logType,
      itemId: upsertId,
      valueJson: undefined,
      userId: this._appAuth.authInfo()!.user.id,
    });

    return upsertId;
  }

  //== 아이콘 ==
  protected readonly tablerAlertTriangle = tablerAlertTriangle;
  protected readonly tablerCirclePlus = tablerCirclePlus;
  protected readonly tablerDeviceFloppy = tablerDeviceFloppy;
  protected readonly tablerEraser = tablerEraser;
  protected readonly tablerFileExcel = tablerFileExcel;
  protected readonly tablerRefresh = tablerRefresh;
  protected readonly tablerRestore = tablerRestore;
  protected readonly tablerSearch = tablerSearch;
  protected readonly tablerUpload = tablerUpload;
  protected readonly tablerX = tablerX;
  protected readonly mark = mark;
}
```

## 부록 B. 확장 매트릭스 표

각 확장이 **추가/변경하는 코드 항목**을 카테고리별로 정리. 최소 뼈대(§3)에 대한 누적 diff로 읽는다. `-` = 변경 없음, `+` = 추가, `~` = 교체, `-`(접두사) = 제거.

| 확장 | imports | DI | input·output | 상태 | computed | effect | 메서드 | hostDirectives | host | 템플릿 블록 |
|---|---|---|---|---|---|---|---|---|---|---|
| **최소 뼈대** | NgIcon, tabler{AlertTriangle,Refresh,Search}, Component core (effect, inject, signal, untracked, ViewEncapsulation), str, injectPermsSignal, injectViewTitleSignal, injectViewTypeSignal, mark, SdBusyContainer, SdButton, SdCommandDirective, SdDock/SdDockContainer, SdForm, SdSheet/SdSheetColumn/SdSheetColumnCellTemplate, SdTextfield, SdToastProvider, SdTopbar/SdTopbarContainer, SortingDef | AppOrmProvider, SdToastProvider | 없음 | busyCount, initialized, items, page, pageLength, sortingDefs, filter, lastFilter, perms, viewType, viewTitle | 없음 | 초기 effect (perms/lastFilter/page/sortingDefs 의존성) | onFilterSubmit, onRefreshButtonClick, _refresh, _search, trackByFn | SdCommandDirective outputs ["sdRefreshCommand"] | (sdRefreshCommand)="onRefreshButtonClick()" | busy-container → @if (initialized) → 권한 경고 else { topbar(page만) + dock-container > dock(필터) + sheet(읽기 전용 셀 3열: id/name/phone) } |
| **A. inline 편집** | +computed, +viewChild, +obj, +ArgumentError, +type DateTime, +expr, +FormatPipe, +SdAnchor, +SdCheckbox, +SdItemOfTemplate, +SdSharedDataSelect, +setupCanDeactivate, +tablerCirclePlus, +tablerDeviceFloppy, +tablerEraser, +tablerRestore, +tablerX (side-effect로 `oneWayDiffs` 활성화) | +AppAuthProvider, +AppSharedDataProvider | 없음 | +_itemsSnapshot (field), +SHARED_DATA_KEY | +canEdit, +diffs | 없음 | +onSaveButtonClick, +onSubmit, +onAddItemButtonClick, +onRemoveNewItemButtonClick, +_checkIgnoreChanges, +_upsertItem, +getIsItemChanged, +getItemCellStyleFn (field) | +outputs ["sdSaveCommand"] | +(sdSaveCommand)="onSaveButtonClick()" | +viewChild #formCtrl, +topbar "저장" 버튼, +필터 "삭제항목 포함" 체크박스, ~시트 셀을 inline 편집(`<sd-textfield>`·`<sd-shared-data-select>`), ~시트를 `<sd-form #formCtrl>`로 감쌈, +생성자 setupCanDeactivate, +_refresh에 snapshot 갱신, +sharedCategories(useSharedSignal) |
| **B. 선택 + 선택 삭제/복구** | 확장 A 동일 (이미 포함) | 확장 A 동일 | 없음 | +selectedItems | +hasSelectedDeleted, +hasSelectedNotDeleted | 없음 | +onToggleDeleteItemsButtonClick | 없음 | 없음 | +시트에 `[selectMode]="'multi'"` + `[(selectedItems)]`, +상단 inline 도구 dock("등록/선택 삭제/선택 복구"), +_refresh 내 선택 유지 로직 |
| **C. inline 삭제 열** | 확장 A 동일 | 없음 | 없음 | 없음 | 없음 | 없음 | +onToggleDeleteItemButtonClick | 없음 | 없음 | +시트 맨 앞 `[fixed]="true" [key]="'_isDeleted'"` 컬럼 + `#headerTpl` + `<sd-anchor>` 토글 |
| **D. 선택 모달 전환** | +input, +output, +type SdSelectModal, +type SelectModalOutputResult | 없음 | +`selectMode = input<...>()`, +`selectedItemKeys = input<...>([])`, +`close = output<...>()` | 없음 | 없음 | +modal 뷰 복원 effect (selectedItemKeys → selectedItems) | +onModalConfirmClick, +onModalCancelClick | 없음 | 없음 | `implements SdSelectModal<T>`, +시트 `[selectMode]="selectMode() ?? 'multi'"` + `[cumulativeSelection]`, +modal 하단 `<sd-dock [position]="'bottom'">` (선택 해제·확인), setupCanDeactivate 조건에 `viewType() === "modal"` 단락 추가 |
| **E. 조회 전용 modal** | +input | 없음 | +부모 식별자(예: `customerId = input.required<number>()`) | 없음 | 없음 | ~초기 effect 의존성에 부모 식별자 input 추가 | ~_search where절에 부모 식별자 반영 | - outputs sdSaveCommand (사용 시) | - (sdSaveCommand) | 확장 A/B/C/D 계약 **전부 미부착** (implements SdSelectModal, selectedItems, 하단 바, canEdit, diffs, _itemsSnapshot, setupCanDeactivate, `<sd-form #formCtrl>` 래퍼 모두 제거). 시트 셀은 순수 표시만 |
| **F. 모달 편집 모드** | +SdAnchor(이미 A), +SdModalProvider, +tablerEdit, +CustomerEditModal | +SdModalProvider | 없음 | 없음 | 없음 | 없음 | +onCreateItemButtonClick, +onEditItemButtonClick, +_editItem / - onSubmit, - onSaveButtonClick, - onAddItemButtonClick, - onRemoveNewItemButtonClick, - _checkIgnoreChanges, - _upsertItem, - getIsItemChanged, - getItemCellStyleFn (필요 시 유지), - _refresh의 snapshot 로직 | - outputs sdSaveCommand | - (sdSaveCommand) | ~이름 열을 `<sd-anchor>` + 편집 아이콘, - `<sd-form #formCtrl>` 래퍼, - `let-edit` / `[readonly]="!edit"`, - setupCanDeactivate 호출. (선택 삭제/복구 유지 시 bulk API로 전환) |
| **G. 엑셀 업로드/다운로드** | +SdFileDialogProvider, +DateTime(이미 A), +downloadBlob, +ExcelWrapper, +z, +tablerFileExcel, +tablerUpload | +SdFileDialogProvider | 없음 | +_excelWrapper (field) | 없음 | 없음 | +onDownloadExcelButtonClick, +onUploadExcelButtonClick (내부에서 `_search(false)` + `_upsertItem` 재사용) | 없음 | 없음 | +topbar에 엑셀 다운로드/업로드 버튼 2개 |

범례:

- **누적 규칙**: 왼쪽 행(최소 뼈대 → A → B → C → D → G)을 세로로 누적하면 [부록 A 풀 스택 합본](#부록-a-풀-스택-합본-완성본)이 된다.
- **확장 E / 확장 F는 상호 배타적**이므로 부록 A에 포함되지 않는다. 각 확장 섹션에서 단독으로 조립한다.
- **확장 C는 확장 A가 전제**(플래그 토글이 일괄 저장 흐름에 편입되어야 의미가 있음).
- **확장 D는 확장 A + 확장 B가 전제**(편집·선택 흐름 위에 selectMode·cumulativeSelection·close.emit을 얹는 구조).
- **확장 G는 확장 A가 전제**(`_upsertItem` 재사용).

## 이관 후보 목록

> 본 레시피 내 MOVE 표식(`<!-- MOVE: docs/*.md#anchor -->`)의 이관 작업 체크리스트. 2차 Feature 3.x에서 각 항목을 `[x]`로 체크하며 진행한다. 각 항목은 "해당 API의 단독 사용법을 `docs/*.md`로 이관 + 각 API 섹션 끝에 본 레시피로 역링크 추가 + 본 레시피의 MOVE 표식 블록을 축약 링크로 대체 + 이관 후보 체크"를 포함한다.

### docs/ui-data.md (Feature 3.1)

- [x] `<sd-sheet>` 기본 사용법 — `items` / `currentPage` / `totalPageCount` / `sorts` / `trackByFn` / `getItemCellStyleFn` / `selectMode` / `selectedItems` / `cumulativeSelection` (최소 뼈대 §3 / 확장 B / 확장 D)
- [x] `<sd-sheet-column>` — `key` / `header` / `fixed` / `hidden` (최소 뼈대 §3 / 확장 C)
- [x] `<sd-sheet-column>` `[cell]` template context (`let-item` / `let-edit` / `let-index` / `let-depth`) (최소 뼈대 §3 / 확장 A)
- [x] `<sd-sheet-column>` `#headerTpl` 커스텀 헤더 템플릿 (확장 C)
- [x] 시트 셀 내부 컨트롤의 `[inset]="true" [size]="'sm'"` 규칙 (§14 규칙 1 → sd-sheet 주의사항으로 이관)
- [x] `[cumulativeSelection]` 사용 패턴 (확장 D)

### docs/ui-form.md (Feature 3.1)

- [x] `<sd-form>` `(formSubmit)` + `requestSubmit()` + `#formCtrl` 템플릿 변수 (최소 뼈대 §3 / 확장 A)
- [x] `<sd-textfield>` — form 내 사용 + 시트 셀 내 사용(`[inset]="true" [size]="'sm'" [readonly]="!edit" [disabled]`) (최소 뼈대 §3 / 확장 A)
- [x] `<sd-button>` theme (`link-*` / `primary` / `danger` / `warning` / `success` / `info`) + `[type]="'submit'"` (최소 뼈대 §3 / 확장 A / 확장 G)
- [x] `<sd-anchor>` 인라인 버튼 + theme(`danger` / `info` / 기본) (확장 A / 확장 C / 확장 F)
- [x] `<sd-checkbox>` form 내 사용 (확장 A 필터 "삭제항목 포함")
- [x] `<sd-shared-data-select>` + `<ng-template [itemOf]="...">` 패턴 — 시트 셀 내 (확장 A)

### docs/ui-layout.md (Feature 3.1)

- [x] `<sd-dock-container>` + `<sd-dock>` 기본 사용 패턴 (최소 뼈대 §3)
- [x] `<sd-dock>` `[position]` input 값 (`"top"` 기본, `"bottom"` / `"left"` / `"right"`). **modal 하단 바는 `[position]="'bottom'"` 반드시 명시** 주의사항 포함 (확장 D)

### docs/ui-overlay.md (Feature 3.1)

- [x] `<sd-busy-container>` input: `[busy]` / `[message]` / `[type]` (최소 뼈대 §3)
- [x] `busyCount` 카운트 패턴 (호출부에서 `busyCount.update((v) => v + 1)` / `- 1`, `busyCount() > 0`로 busy 표시) (최소 뼈대 §3)
- [x] `busyMessage` 선택적 사용 패턴 (긴 작업 시, 확장 G 포인트에서 언급)

### docs/ui-navigation.md (Feature 3.1)

- [x] `<sd-topbar-container>` + `<sd-topbar>` 기본 패턴 — page 뷰에서만 조건부 렌더, modal/control에서 생략 (최소 뼈대 §3)
- [x] topbar 내부 슬롯 활용 (`<h4>` 제목, 버튼 배치, `<small>` 단축키 표시) (최소 뼈대 §3 / 확장 A / 확장 G)

### docs/utils.md (Feature 3.6)

- [x] `injectViewTypeSignal()` — 호출 시점 제약(생성자/필드 이니셜라이저만, `NG0203`), 자동 판정 규칙(page / modal / control), 수동 오버라이드 패턴 (최소 뼈대 §3 / §13 주의사항)
- [x] `injectViewTitleSignal()` 사용법 (최소 뼈대 §3)
- [x] `setupCanDeactivate(guardFn)` 가드 함수 패턴, 라우트 이탈 / 모달 close 시 동작 (확장 A / 확장 D)
- [x] `mark(sig)` 의미 (shallow copy로 참조 갱신 → OnPush 재렌더 + computed/effect 의존성 갱신). **"저장 감지가 아니다"** 명시 (§14 규칙 2 → mark 주의사항으로 이관)
- [x] `injectPermsSignal(viewCodes, keys)` 사용 예, 반환 signal 구조 (최소 뼈대 §3) — D1 결정: providers.md 대신 utils.md로 이관

### docs/provider-types.md (Feature 3.7)

- [x] `SdSelectModal<T>` 인터페이스 구현 방법 — `selectMode = input<...>()` / `selectedItemKeys = input<...>([])` / `close = output<...>()` / 복원 effect 패턴 / 선택 해제·확인 하단 바 패턴 (확장 D). **신규 앵커 생성 대상**
- [x] `SelectModalOutputResult<T>` 구조 — `selectedItemKeys` / `selectedItems` / `filterExists()`로 undefined 제거, index fallback 금지 (확장 D)
- [x] 선택 모달 vs 조회 전용 modal 용도 구분 서술 (recipes와 일관된 워딩) (확장 D / 확장 E)

### docs/providers.md (Feature 3.8)

- [x] `injectPermsSignal(viewCodes, keys)` 사용 예, 반환 signal 구조 (최소 뼈대 §3)
- [x] `SdToastProvider.try(fn, messageFn?)` 에러 래퍼 사용법 (반환 타입, 에러 시 자동 토스트) (최소 뼈대 §3)
- [x] `SdModalProvider.showAsync({ type, inputs, title, ... }, options?)` 호출 패턴 — 선택 모달 호출 예 (`inputs: { selectMode, selectedItemKeys }`, 반환값으로 `SelectModalOutputResult<T>` 처리) / 조회 전용 modal 호출 예 (`inputs: { parentId }`, 반환값 미사용) (확장 D / 확장 E / 확장 F)
- [x] `SdFileDialogProvider.showAsync(multiple, accept)` 호출법 (확장 G 엑셀 업로드)
