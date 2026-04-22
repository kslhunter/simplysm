# Recipe: CRUD 리스트 화면 직접 조립

> **CRITICAL: 뷰 범위 + modal 용도 확인 선행**
> 이 레시피로 실제 화면을 생성하기 전, 지원할 뷰(page / modal / control)를 **반드시 사용자에게 질문**한다. **modal을 포함하면 용도까지 함께 질문한다 — (a) 선택 모달: 다른 화면에서 항목을 골라 `close.emit`으로 돌려주는 selector / (b) 조회 전용 modal: input으로 받은 부모 레코드의 자식 목록·이력 등을 보여주기만 함(닫기는 SdModal 기본 "X").** 본 레시피는 **최소 뼈대(§3. 조회 전용 page) → 확장 A~G 누적** 구조로 구성된다. 필요한 확장만 선택적으로 얹고, 당장 쓰지 않는 뷰/확장의 분기·계약은 **죽은 코드가 되므로 생성에서 제외**한다. 선택 모달 계약(`implements SdSelectModal<T>` / `selectMode` / `selectedItemKeys` / `close` / `cumulativeSelection`)은 [확장 D](./crud-list/extension-d-select-modal.md)에서, 부모 레코드의 자식 목록·이력 조회 전용 modal은 [확장 E](./crud-list/extension-e-readonly-modal.md)에서 각각 다룬다. 추측으로 "modal = 선택 모달"로 단정하여 선택 계약을 반사적으로 부착하지 않는다.

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
- **확장이 도입하는 요소**는 각 확장 문서(A~G) 서두에서 명시한다. 각 확장이 추가/변경하는 코드 항목 요약은 [부록 B. 확장 매트릭스 표](#부록-b-확장-매트릭스-표)에서 한눈에 확인할 수 있다.
- **제거된 추상화:** `SdDataSheet`(컴포넌트) / `SdDataSheetBase`(추상 클래스) / `SdDataSheetColumn`(디렉티브) / `SdDataSheetItemPropInfo`·`SdDataSheetItemInfo`·`SdDataSheetSearchResult`(타입 3종) / `setupCloserWhenSingleSelectionChange`(단일 선택 시 모달 자동 닫기 유틸) / 내부 Manager 5종(`injectDataSheet{Refresh,InlineEdit,ModalEdit,Excel}Manager`, `useDataSheetFilterManager`). 대체: 소비 컴포넌트가 표준 조각을 직접 조립.

## 2. 언제 사용하는가

| 상황 | 시작 지점 + 필요한 확장 |
|---|---|
| 부모 레코드·대시보드용 **조회 전용 리스트** (검색 + 페이지네이션 + 정렬만) | §3 최소 뼈대만 |
| 셀을 직접 편집하고 일괄 저장하는 **inline 편집** CRUD | §3 + [확장 A](./crud-list/extension-a-inline-edit.md) |
| 선택 체크박스·"선택 삭제/복구" 버튼이 필요 | §3 + [확장 A](./crud-list/extension-a-inline-edit.md) + [확장 B](./crud-list/extension-b-selection.md) |
| 시트 맨 앞에 row별 inline 삭제/복구 열이 필요 | §3 + 확장 A + [확장 C](./crud-list/extension-c-inline-delete.md) |
| 다른 화면에서 항목을 고르는 **선택 모달**(single/multi)로도 재사용 | §3 + 확장 A + 확장 B + [확장 D](./crud-list/extension-d-select-modal.md) |
| 부모 레코드의 자식 목록·이력을 input으로 받아 **조회만** 하는 modal | §3 + [확장 E](./crud-list/extension-e-readonly-modal.md) (입력 기반 조회 전용 화면) |
| 행 클릭 시 편집 모달을 띄우는 **모달 편집 모드** | §3 + [확장 F](./crud-list/extension-f-modal-edit.md) (확장 A inline 편집 대신 선택) |
| 엑셀 업로드/다운로드가 필요 | §3 + 확장 A + [확장 G](./crud-list/extension-g-excel.md) |
| 단일 레코드 상세 폼 | 본 레시피 대신 [`crud-detail.md`](./crud-detail.md) 사용 |
| 페이지/모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 최소 뼈대: 조회 전용 page

아래는 **조회 전용 page** 기준의 최소 뼈대 완성 컴포넌트다. 라우트로 진입하면 검색 + 페이지네이션 + 정렬이 동작하는 읽기 전용 리스트로 표시된다. 편집·선택·모달·엑셀이 필요하면 [확장 A~G](#5-확장-a-inline-편집저장) 중 필요한 확장 문서를 선택적으로 참조하여 얹는다.

> **조건부 요소 안내:** 아래 최소 뼈대는 "routes 페이지 + DB 조회 + 권한 체크 + modal 겸용"을 모두 갖춘 전형적 구성 기준이다. 각 요소의 포함 조건은 [§4 조건부 요소 포함 기준](#조건부-요소-포함-기준)에서 확인하며, 해당하지 않는 요소는 생략한다.

본 섹션에 등장하는 개별 API의 단독 사용법:

- [`<sd-busy-container>`](../ui-overlay/sd-busy-container.md) — busy 오버레이 + [busyCount 패턴](../ui-overlay/sd-busy-container.md#busycount-카운트-패턴)
- [`<sd-topbar-container>` · `<sd-topbar>`](../ui-navigation/sd-topbar-container.md) — 탑바 + [슬롯 활용](../ui-navigation/sd-topbar-container.md#topbar-내부-슬롯-활용)
- [`<sd-dock-container>` · `<sd-dock>`](../ui-layout/sd-dock-container.md) — 도킹 레이아웃
- [`<sd-form>`](../ui-form/sd-form.md) — 폼 래퍼 + `(formSubmit)` + `requestSubmit()`
- [`<sd-button>`](../ui-form/sd-button.md) · [`<sd-textfield>`](../ui-form/sd-textfield.md) — 버튼 · 텍스트 입력
- [`<sd-sheet>` · `<sd-sheet-column>` · `<ng-template [cell]>`](../ui-data/sd-sheet.md) — 스프레드시트
- [`injectViewTypeSignal`](../utils/inject-routing-signals.md#injectviewtypesignal) · [`injectViewTitleSignal`](../utils/inject-routing-signals.md#injectviewtitlesignal) · [`mark`](../utils/mark.md) · [`injectPermsSignal`](../utils/inject-routing-signals.md#injectpermssignal) · [`SdToastProvider.try`](../providers/sd-toast-provider.md#try-사용-패턴)

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
                <sd-sheet-column [fixed]="true" [header]="'#'" [key]="'id'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm tx-right">{{ item.id }}</div>
                  </ng-template>
                </sd-sheet-column>

                <sd-sheet-column [header]="'이름'" [key]="'name'">
                  <ng-template [cell]="items()" let-item="item">
                    <div class="p-xs-sm">{{ item.name }}</div>
                  </ng-template>
                </sd-sheet-column>

                <sd-sheet-column [header]="'전화번호'" [key]="'phone'">
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
export class CustomerList {
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

### 조건부 요소 포함 기준

최소 뼈대의 인프라·라이프사이클 요소는 화면의 필요에 따라 포함/생략한다. 필요 없는 요소를 기계적으로 포함하지 않는다.

| 요소 | 포함 조건 | 생략하는 경우 예시 |
|------|----------|-------------------|
| `<sd-topbar-container>` + `<sd-topbar>` | routes로 연결된 페이지에서 헤더를 표시할 때 | route 미연결 컴포넌트(control, 래퍼 등) |
| `injectViewTitleSignal()` | 타이틀이 필요할 때. topbar에 타이틀을 표시하는 page에는 보통 포함 | topbar가 없거나 타이틀 표시가 불필요한 화면 |
| `injectViewTypeSignal()` + `@if (viewType() === "page")` 가드 | 해당 컴포넌트가 page 외에 modal 또는 control로도 **겸용**될 때 | page 전용 리스트, page 전용 대시보드 |
| `injectPermsSignal()` + 권한 없음 메시지 | 권한 제어가 있는 화면. 권한 제어 자체가 있으면 필수 | 권한 제어가 없는 화면 |
| `<sd-busy-container>` + `busyCount` | 화면에 비동기 작업(DB 조회, API 호출 등)이 있어서 busy 표시가 필요할 때 | 비동기 로딩 없이 동기적으로 렌더되는 래퍼/레이아웃 화면 |
| `initialized` + `@if (initialized())` 가드 | 초기 데이터 로딩이 완료되기 전에는 화면을 그리면 안 되는 경우 (깜박임 방지) | 초기 로딩이 필요 없거나, 빈 상태로 보여줘도 무방한 화면 |
| `SHARED_DATA_KEY` + `emitAsync()` 호출 | 해당 화면에서 `SdSharedDataProvider`에 등록된 데이터를 **변경**(생성/수정/삭제)하는 경우 | 조회만 하는 화면, sharedData에 등록되지 않은 데이터를 다루는 화면 |

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
| `perms` | 권한 signal. **인라인 `perms().includes("...")`이 기본 패턴**. `perms()` 외에 다른 조건(viewType, 데이터 상태 등)도 함께 확인해야 할 때만 `computed`로 wrapping한다 (예: 확장 A의 `canEdit = computed(() => perms().includes("edit") && viewType() === "page")`) |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onFilterSubmit()` | page=0 리셋 + `lastFilter.set({ ...filter() })` |
| `onRefreshButtonClick()` | busy/권한 확인 후 `mark(lastFilter)` — 참조 갱신으로 effect 재실행 |
| `trackByFn(item)` | 시트 row 추적 — `item.id`로 identity 유지 |
| `_refresh()` | `_search(true)` → `items.set` + `pageLength.set` |
| `_search(usePagination)` | ORM 쿼리 (filter / sort / limit). `usePagination: false`는 전체 조회 — 엑셀 다운로드 등에서 재사용 |

> **확장이 도입하는 블록·상태·메서드** (예: `canEdit` / `diffs` / `selectedItems` / `onSubmit` / `close` output / `cumulativeSelection` 등)는 각 확장 문서의 "포인트" bullet에서 다룬다.

## 5. 확장 A: inline 편집/저장

시트 셀을 직접 편집하고 일괄 저장한다. 최소 뼈대의 읽기 전용 셀을 inline 편집 컨트롤로 교체.

- **선행:** 없음 (최소 뼈대에 직접 얹음)
- **도입 요소:** `canEdit`, `diffs`, `setupCanDeactivate`, Ctrl+S 저장, `_upsertItem` 등
- **줄 수:** 376줄

→ **[상세 문서](./crud-list/extension-a-inline-edit.md)**

## 6. 확장 B: 선택 기능 + 선택 삭제/복구

시트에 체크박스 기반 선택 기능을 추가하고, 선택된 행에 대한 "선택 삭제 / 선택 복구" 버튼 바를 상단에 배치한다.

- **선행:** [확장 A](./crud-list/extension-a-inline-edit.md)
- **도입 요소:** `selectedItems`, `hasSelectedDeleted`/`hasSelectedNotDeleted`, `onToggleDeleteItemsButtonClick`, `selectMode="multi"`
- **줄 수:** 89줄

→ **[상세 문서](./crud-list/extension-b-selection.md)**

## 7. 확장 C: inline 삭제 열

시트 맨 앞 고정 컬럼에 row별 inline 삭제/복구 아이콘을 추가한다. 확장 B와 공존 가능.

- **선행:** [확장 A](./crud-list/extension-a-inline-edit.md)
- **도입 요소:** `onToggleDeleteItemButtonClick`, `[fixed]="true" [key]="'_isDeleted'"` 컬럼
- **줄 수:** 50줄

→ **[상세 문서](./crud-list/extension-c-inline-delete.md)**

## 8. 확장 D: 선택 모달 전환

같은 리스트 화면이 다른 화면에서 항목을 골라주는 "선택 모달"로도 재사용되도록 한다.

- **선행:** [확장 A](./crud-list/extension-a-inline-edit.md) + [확장 B](./crud-list/extension-b-selection.md)
- **도입 요소:** `implements SdSelectModal<T>`, `selectMode`/`selectedItemKeys` input, `close` output, `cumulativeSelection`, modal 하단 dock
- **줄 수:** 115줄

→ **[상세 문서](./crud-list/extension-d-select-modal.md)**

## 9. 확장 E: 조회 전용 modal

부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 보여준다. SdModal 기본 "X"로 닫기.

- **선행:** 없음 (최소 뼈대에 직접 얹음 — 확장 A/B/D 미사용)
- **도입 요소:** 부모 식별자 `input.required<T>()`, `_search` where절 변경
- **줄 수:** 120줄

→ **[상세 문서](./crud-list/extension-e-readonly-modal.md)**

## 10. 확장 F: 모달 편집 모드

행 클릭 시 편집 모달을 띄워 한 행씩 편집하는 모드. 확장 A(inline 편집)와 상호 배타적.

- **선행:** 없음 (최소 뼈대에 직접 얹음 — 확장 A와 상호 배타)
- **도입 요소:** `SdModalProvider`, `_editItem`, `onEditItemButtonClick`
- **줄 수:** 102줄

→ **[상세 문서](./crud-list/extension-f-modal-edit.md)**

## 11. 확장 G: 엑셀 업로드/다운로드

`ExcelWrapper` + `zod` 스키마로 엑셀 읽기/쓰기. 다운로드는 전체 페이지 조회.

- **선행:** [확장 A](./crud-list/extension-a-inline-edit.md) (`_upsertItem` 재사용)
- **도입 요소:** `SdFileDialogProvider`, `ExcelWrapper`, `downloadBlob`, `onDownloadExcelButtonClick`, `onUploadExcelButtonClick`
- **줄 수:** 111줄

→ **[상세 문서](./crud-list/extension-g-excel.md)**

## 12. 뷰 타입 분기

page·modal·control 세 뷰는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 세 뷰별로 별도 블록을 전체 복제하지 않는다. modal은 동일한 `viewType() === "modal"`이어도 **용도에 따라 선택 / 조회 전용**으로 나뉘며, 각기 다른 조각을 얹는다.

| 뷰 | topbar | dock (도구 바) | main (시트) | 하단 바 |
|---|---|---|---|---|
| page | `<sd-topbar>` (새로고침/저장/...) | inline 도구 `<sd-dock>` (canEdit) | `<sd-form>` + `<sd-sheet>` | 없음 |
| modal (선택) | 없음 | inline 도구 숨김 (`canEdit` = false) | 동일 (selectMode·selectedItems·cumulativeSelection 사용) | `<sd-dock [position]="'bottom'">` (선택 해제 / 확인) |
| modal (조회 전용) | 없음 | inline 도구 제거 | `<sd-sheet>` 직접 배치, selectMode·selectedItems·cumulativeSelection **미사용**, 셀은 읽기 전용 | 없음 (SdModal 기본 "X"로 닫기) |
| control | 없음 | 필요 시 주석만 | 동일 | 없음 |

- `<sd-dock>` position 규칙·`[cumulativeSelection]`·modal 하단 바 상세 → [확장 D: 선택 모달 전환](./crud-list/extension-d-select-modal.md)
- `canEdit = perms().includes("edit") && viewType() === "page"` 정의·효과 → [확장 A: inline 편집/저장](./crud-list/extension-a-inline-edit.md)
- 조회 전용 modal의 계약 미부착·`selectMode` input 미도입 → [확장 E: 조회 전용 modal](./crud-list/extension-e-readonly-modal.md)

## 13. 주의사항 (자주 하는 실수)

> 확장 레이어와 직결된 주의사항(`<sd-dock>` position 누락 / 시트 셀 `[inset]`·`[size]` / `oneWayDiffs`의 delete 미처리 / `selectedItemKeys` `filterExists()` / 모달 "선택 해제" single / `busyMessage`)은 각 확장 문서의 "포인트" bullet에서 해당 확장과 함께 다룬다. 이 섹션에는 **최소 뼈대 + 모든 확장에 공통되는 구조·시스템 레벨 주의**만 남긴다.

### modal 뷰 = 반드시 선택 모달인 것은 아니다

- `viewType() === "modal"`이라는 사실만으로 "선택 모달"이라고 단정하지 않는다. modal 용도는 최소 두 가지다 — **(a) 선택 모달**: 항목을 골라 `close.emit`으로 돌려줌([확장 D](./crud-list/extension-d-select-modal.md)) / **(b) 조회 전용**: 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 보여줌([확장 E](./crud-list/extension-e-readonly-modal.md), SdModal 기본 "X"로 닫기).
- 조회 전용 modal에는 `implements SdSelectModal<T>`, `selectMode` / `selectedItemKeys` input, `close` output, 하단 "선택 해제 / 확인" 바, `cumulativeSelection`, `selectedItems` 상태·복원 effect를 **전부 부착하지 않는다.** 부착해도 호출되지 않아 죽은 코드가 된다.
- LLM이 풀 스택 합본을 복사하면서 modal 지원이라는 이유로 선택 모달 계약을 반사적으로 이식하는 경우가 잦다. 상단 "뷰 범위 + modal 용도 확인 선행"에 따라 **용도를 먼저 확정**하고, 조회 전용이면 확장 E 스켈레톤부터 조립한다.

### `input()` 의존 데이터 로딩에 `void this._initAsync()` 금지

- `input()` / `input.required()` signal 값에 따라 데이터를 로드하는 컴포넌트에서, 생성자에서 `void this._initAsync()`를 호출하고 별도 메서드에서 비동기 로직을 수행하는 패턴은 **절대 사용하지 않는다.** 이 패턴은 최초 1회만 실행되어 input 변경에 반응하지 않는다.
- 반드시 `effect`로 input 의존성을 등록하고, 비동기 작업은 `void untracked(async () => { ... })`로 감싼다:
  ```typescript
  // ❌ input 변경에 반응하지 않음 — 최초 1회만 실행
  constructor() {
    void this._initAsync();
  }
  private async _initAsync(): Promise<void> { ... this.someInput() ... }

  // ✅ input 변경 시 자동 재실행
  constructor() {
    effect(() => {
      this.someInput(); // 의존성 등록 (untracked 바깥)
      void untracked(async () => { ... });
    });
  }
  ```
- 이 규칙은 최소 뼈대(§3)의 초기 effect, [확장 E(조회 전용 modal)](./crud-list/extension-e-readonly-modal.md)의 부모 식별자 input 등 **모든 input 의존 데이터 로딩에 공통**으로 적용된다.

### signal 필드 초기값에서 다른 signal 읽기 금지 + input → filter 동기화

- `signal()` 필드 이니셜라이저에서 `this.someInput()` 같은 **다른 signal을 읽어서는 안 된다.** 필드 이니셜라이저는 클래스 생성 시점에 실행되며, input signal은 아직 부모로부터 값을 전달받기 전이므로 항상 기본값만 반환한다.
  ```typescript
  // ❌ this.someInput()은 항상 기본값 → ?? [] 가 매번 실행되어 의미 없는 코드
  filter = signal<IFilter>({
    includeIds: this.includeIds() ?? [],
    isIncludeDeleted: this.isIncludeDeleted() ?? false,
  });

  // ✅ 기본값만 사용
  filter = signal<IFilter>({
    includeIds: [],
    isIncludeDeleted: false,
  });
  ```
- **초기값에서 빼는 것만으로는 부족하다.** input 값을 필터에 반영하는 로직이 반드시 effect 안에 있어야 한다. input이 변경되면 `filter`/`lastFilter`를 갱신하고 `page`를 리셋해야 조회가 올바르게 재실행된다:
  ```typescript
  constructor() {
    effect(() => {
      if (!this.perms().includes("use")) { ... }

      // input 변경 감지 → lastFilter 재반영
      const ids = this.includeIds() ?? [];
      const lf = this.lastFilter();
      if (!obj.equal(ids, lf.includeIds)) {
        untracked(() => {
          this.filter.update((f) => ({ ...f, includeIds: ids }));
          this.lastFilter.set({ ...this.filter() });
          this.page.set(0);
        });
      }

      this.lastFilter();
      this.page();
      this.sortingDefs();

      void untracked(async () => { ... });
    });
  }
  ```
- `untracked(() => { ... })`로 감싸는 이유: filter/lastFilter/page를 갱신하면 effect 의존성이 즉시 재트리거될 수 있으므로, 중간 상태 갱신은 추적 없이 수행하고 이후 `this.lastFilter()` 읽기에서 최종 값이 반영되게 한다.

### 공유 데이터 사용 시 `_sdSharedData.wait()` 필수

- 화면에서 공유 데이터(`useSharedSignal`, `getHandle` 등)를 사용한다면, `_refresh()` 맨 앞에 **반드시** `await this._sdSharedData.wait();`를 호출한다. 공유 데이터 로딩이 완료되기 전에 화면을 렌더하면 셀렉트 드롭다운 등이 비어있는 상태로 표시된다.
- 공유 데이터를 사용하지 않는 화면에서는 불필요.

### 공통 유틸 재도입 금지

- `useCrudList()` / `useDataSheet()` / `setupCumulateSelectedKeys2()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다.

### 뷰 분기를 "완전 분리 블록"으로 쓰지 않는다

- 시트 페이지를 modal로도 쓰는 경우(확장 D), LLM이 page 블록과 modal 블록을 각각 완성하면서 **필터·시트를 중복 작성**하기 쉽다. 최소 뼈대처럼 **하나의 껍데기 + 차이점만 `@if`** 로 얹어야 한다. 필터 하나를 수정할 때 두 블록을 모두 고치는 상황이 나오면 구조가 잘못된 것.

### `injectViewTypeSignal()` 호출 시점

- `injectViewTypeSignal()`은 **생성자 실행 중 또는 필드 이니셜라이저에서만** 호출한다. `computed`·`effect` 콜백이나 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다 (Angular `inject()` 제약). `canEdit = computed(() => ... && this.viewType() === "page")`처럼 생성자 시점에 필드로 선언된 signal을 **읽는** 것은 computed 안에서도 문제 없다 — 호출 자체는 클래스 초기화 시점에 이미 완료됐기 때문.

### page 컴포넌트가 `<sd-topbar>`를 소유한다

- 마스터-디테일 구조(시트 + 상세를 나란히 배치하는 페이지)에서 `<sd-topbar-container>` + `<sd-topbar>`(페이지 타이틀·주요 액션)는 **page 컴포넌트가 소유**한다. 임베딩되는 sheet/detail control 컴포넌트에 `<sd-topbar-container>`나 `<sd-topbar>`를 넣지 않는다.
  ```html
  <!-- ❌ page에 topbar 없이, control 컴포넌트가 topbar를 소유 -->
  <!-- Page -->
  <div class="flex-row fill">
    <app-sheet />
    <app-detail />  <!-- 내부에 <sd-topbar-container> 존재 -->
  </div>

  <!-- ✅ page가 topbar를 소유, control은 sd-dock-container만 사용 -->
  <!-- Page -->
  <sd-topbar-container>
    <sd-topbar><h4>{{ viewTitle() }}</h4> ...</sd-topbar>
    <div class="flex-row fill">
      <app-sheet />   <!-- 내부: <sd-dock-container> -->
      <app-detail />  <!-- 내부: <sd-dock-container> -->
    </div>
  </sd-topbar-container>
  ```
- control 뷰의 도구 바(필터·등록·저장 등)는 `<sd-dock-container>` + `<sd-dock>`으로 배치한다.

### `SdCommandDirective` document 리스너 중복 주의

- `SdCommandDirective`는 **document 레벨** keydown 리스너를 등록한다 (`sd-command.ts:40`). 같은 화면에서 여러 컴포넌트에 부착하면 **모두 발동**된다 (모달 내부 판정(`shouldProcessCommandEvent`)만 거를 뿐, 형제 컴포넌트 간 구분은 없음).
- 따라서 **`_refresh()`/`onSubmit()`을 직접 소유하는 컴포넌트에서만** 부착한다. 자식 컴포넌트를 조합만 하는 page 래퍼, 권한 체크 + 레이아웃만 담당하는 컨테이너에는 부착하지 않는다.
- 마스터-디테일 구조에서 sheet와 detail **양쪽**에 `sdRefreshCommand`를 부착하면 Ctrl+Alt+L 시 양쪽 `_refresh()`가 동시에 실행된다. 의도된 동작이 아니면 한쪽에만 부착한다.

### 테스트만을 위한 public API 금지

- `async submit(diffs) { await this._submitAsync(diffs); }` 같이 "테스트에서 호출하려고" private 메서드의 얇은 public wrapper를 노출하지 않는다. 캡슐화를 깨고 컴포넌트의 외부 API 인상을 오염시킨다. 테스트는 TestBed fixture + click/dispatch 이벤트 경로 또는 host의 `sdSaveCommand` 트리거로 수행.

## 14. 레시피 작성 관용 규칙

향후 `crud-detail.md` · `data-select-button.md` 등 데이터 관련 레시피가 추가될 때 아래 3개 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

> 상세: [셀 내용 작성 지침](../ui-data/sd-sheet.md#sdsheetcolumncelltemplate)

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다. 확장 A(inline 편집)의 "포인트"에도 동일 경고 포함

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

> 상세: [`mark` — 역할·주의사항](../utils/mark.md)

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

- **누적 규칙**: 왼쪽 행(최소 뼈대 → A → B → C → D → G)을 세로로 누적하면 풀 스택 합본이 된다.
- **확장 E / 확장 F는 상호 배타적**이므로 합본에 포함되지 않는다. 각 확장 문서에서 단독으로 조립한다.
- **확장 C는 확장 A가 전제**(플래그 토글이 일괄 저장 흐름에 편입되어야 의미가 있음).
- **확장 D는 확장 A + 확장 B가 전제**(편집·선택 흐름 위에 selectMode·cumulativeSelection·close.emit을 얹는 구조).
- **확장 G는 확장 A가 전제**(`_upsertItem` 재사용).

## Cross-reference

- CRUD 상세 폼 — 단일 레코드 편집·조회 레시피. → [`crud-detail.md`](./crud-detail.md)
- 모달 기반 선택 버튼 — `<sd-modal-select-button>` 직접 조립. → [`data-select-button.md`](./data-select-button.md)
- 페이지/모달 컨테이너 — 뷰 분기 공통 껍데기 조립. → [`page-modal-container.md`](./page-modal-container.md)
