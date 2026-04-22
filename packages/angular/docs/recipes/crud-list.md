# CRUD 리스트 화면 직접 조립

`<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` · `<sd-sheet>` · `<sd-sheet-column>` 표준 컴포넌트를 소비 화면이 **직접 조립**하여 CRUD 리스트 화면을 구성하는 레시피. 최소 뼈대(조회 전용 page) 위에 편집·선택·모달·엑셀 등 필요한 확장만 선택적으로 얹는다.

> **modal 뷰는 용도(선택 모달 vs 조회 전용)를 먼저 확정한다.** 상세와 회피 방법은 아래 [🚫 흔한 실수](#-흔한-실수-anti-patterns)의 "modal = 선택 모달로 반사적 부착" 참조.

## When to use / When NOT to use

- ✅ 검색·페이지네이션·정렬을 갖춘 리스트 조회 화면
- ✅ 셀 직접 편집·일괄 저장·선택 삭제·엑셀 업로드/다운로드가 필요한 리스트 CRUD
- ✅ 같은 리스트 화면을 page·select-modal·readonly-modal 등으로 재사용
- ❌ 단일 레코드 상세 폼 → [`crud-detail.md`](./crud-detail.md)
- ❌ 모달 선택 버튼(항목을 골라 받는 버튼) 조립 → [`data-select-button.md`](./data-select-button.md)
- ❌ 뷰 분기(page/modal/control) 공통 껍데기만 필요 → [`page-modal-container.md`](./page-modal-container.md)

### 뷰 범위 선택

- **page**: 라우트로 진입하는 주 리스트 화면 → 본 파일의 [기본 레시피](#기본-레시피) 그대로
- **modal (선택)**: 다른 화면에서 항목을 골라 `close.emit`으로 돌려주는 selector → [확장 D](./crud-list/extension-d-select-modal.md)
- **modal (조회 전용)**: 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용으로 표시(닫기는 SdModal 기본 "X") → [확장 E](./crud-list/extension-e-readonly-modal.md)
- **control**: 마스터-디테일의 리스트 영역으로 임베딩 → [공통 규칙 "page가 topbar 소유"](./_common-rules.md#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다) + 필요 시 확장 D/E 참조

## 전제조건

- Provider: 앱 루트에 `provideSdAngular`가 등록되어 있음
- peer: Angular 21 standalone, zoneless, `@simplysm/angular`
- 앱별: ORM provider + `DbContext` (예제의 `AppOrmProvider`·`@adtek/client-common`은 각 앱이 소유하는 placeholder)
- 횡단 규칙: [`_common-rules.md`](./_common-rules.md)에 정의된 공통 규칙을 모두 준수한다. 본 파일에서 재정의하지 않는다
  - [`injectViewTypeSignal()` 호출 시점](./_common-rules.md#injectviewtypesignal은-생성자-또는-필드-이니셜라이저에서만-호출한다)
  - [page 컴포넌트가 `<sd-topbar>`를 소유](./_common-rules.md#page-컴포넌트가-sd-topbar-container와-sd-topbar를-소유한다)
  - [시트 셀 컨트롤에 `[inset]="true" [size]="'sm'"` 명시](./_common-rules.md#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다)
  - [input 변경을 effect에서 filter·lastFilter·page에 반영](./_common-rules.md#input-변경을-effect-내부에서-filterlastfilterpage에-반영한다)
  - [`void this._initAsync()` 금지](./_common-rules.md#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다) / [signal 필드 초기값에서 다른 signal 읽기 금지](./_common-rules.md#signal-필드-초기값에서-다른-signal을-읽지-않는다) / [`mark()`를 저장 감지 수단으로 오해 금지](./_common-rules.md#marksig를-저장-감지-수단으로-사용하지-않는다)

## 기본 레시피

조회 전용 page 기준의 최소 뼈대 완성 컴포넌트. 라우트로 진입하면 검색 + 페이지네이션 + 정렬이 동작하는 읽기 전용 리스트로 표시된다. 편집·선택·모달·엑셀은 아래 [변형](#변형-variation) 표에서 필요한 확장을 선택적으로 얹는다.

> **이 최소 뼈대가 포함하지 않는 것:** 감사 필드(`lastModifiedAt`/`lastModifiedBy`) · 카테고리 등 FK 표시 컬럼 · 편집 권한(`"edit"`) · 편집용 컨트롤은 모두 확장 A 이후에 도입된다. (참고: `crud-detail.md` 최소 뼈대는 page 전용 읽기 폼이므로 감사 필드 2열을 포함한다 — 도메인 범위는 같지만 뼈대 범위가 다르다.)

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
  initialized = signal(false);   // 최초 조회 완료 — @if (initialized()) 가드 해제
  busyCount = signal(0);         // 중첩 비동기 작업 카운트 (0 초과 시 busy 표시)

  items = signal<ICustomer[]>([]);

  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<SortingDef[]>([]);

  filter = signal<IFilter>({});      // 입력 버퍼. onFilterSubmit 시 lastFilter로 스냅샷
  lastFilter = signal<IFilter>({});  // 조회 트리거 — effect 의존성은 이 signal

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

    mark(this.lastFilter);  // 값 변경 없이 참조만 갱신 → effect 재실행
  }

  //== Internals ==
  private async _refresh(): Promise<void> {
    const r = await this._search(true);
    this.items.set(r.items);
    this.pageLength.set(r.pageLength);
  }

  private async _search(
    usePagination: boolean,  // false는 전체 조회 (엑셀 다운로드 등에서 재사용)
  ): Promise<{ items: ICustomer[]; pageLength: number }> {
    const filter = this.lastFilter();
    const sortingDefs = this.sortingDefs();
    const page = this.page();

    return this._appOrm.connectAsync(async (db) => {
      let qr1 = db.customer();

      if (!str.isNullOrEmpty(filter.searchText)) {
        qr1 = qr1.search((item) => [item.name, item.phone], filter.searchText);
      }

      // 페이지당 50건 — 시트 화면 표준치 (조정 시 UX 확인 필요)
      const pageLength = usePagination ? Math.ceil((await qr1.count()) / 50) : 0;

      let qr2 = qr1.select((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
      }));

      // orderBy는 string overload 사용 — 람다+obj.getChainValue는 Anti-patterns 참조
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

본 섹션에 등장하는 개별 API의 단독 사용법은 각 문서를 참조한다:

- [`<sd-busy-container>`](../ui-overlay/sd-busy-container.md) — busy 오버레이 + busyCount 카운트 패턴
- [`<sd-topbar-container>` · `<sd-topbar>`](../ui-navigation/sd-topbar-container.md) — 탑바
- [`<sd-dock-container>` · `<sd-dock>`](../ui-layout/sd-dock-container.md) — 도킹 레이아웃
- [`<sd-form>`](../ui-form/sd-form.md) — 폼 래퍼 + `(formSubmit)` + `requestSubmit()`
- [`<sd-button>`](../ui-form/sd-button.md) · [`<sd-textfield>`](../ui-form/sd-textfield.md)
- [`<sd-sheet>` · `<sd-sheet-column>` · `<ng-template [cell]>`](../ui-data/sd-sheet.md)
- [`injectViewTypeSignal`](../utils/inject-routing-signals.md#injectviewtypesignal) · [`injectViewTitleSignal`](../utils/inject-routing-signals.md#injectviewtitlesignal) · [`mark`](../utils/mark.md) · [`injectPermsSignal`](../utils/inject-routing-signals.md#injectpermssignal) · [`SdToastProvider.try`](../providers/sd-toast-provider.md#try-사용-패턴)

### 조건부 요소 포함 기준

최소 뼈대의 인프라·라이프사이클 요소는 화면의 필요에 따라 포함·생략한다. 필요 없는 요소를 기계적으로 포함하지 않는다.

| 요소 | 포함 조건 | 생략하는 경우 예시 |
|------|----------|-------------------|
| `<sd-topbar-container>` + `<sd-topbar>` | routes로 연결된 페이지에서 헤더를 표시할 때 | route 미연결 컴포넌트(control, 래퍼 등) |
| `injectViewTitleSignal()` | 타이틀이 필요할 때. topbar에 타이틀을 표시하는 page에는 보통 포함 | topbar가 없거나 타이틀 표시가 불필요한 화면 |
| `injectViewTypeSignal()` + `@if (viewType() === "page")` 가드 | 해당 컴포넌트가 page 외에 modal 또는 control로도 겸용될 때 | page 전용 리스트, page 전용 대시보드 |
| `injectPermsSignal()` + 권한 없음 메시지 | 권한 제어가 있는 화면. 권한 제어 자체가 있으면 필수 | 권한 제어가 없는 화면 |
| `<sd-busy-container>` + `busyCount` | 화면에 비동기 작업(DB 조회, API 호출 등)이 있어서 busy 표시가 필요할 때 | 비동기 로딩 없이 동기적으로 렌더되는 래퍼/레이아웃 화면 |
| `initialized` + `@if (initialized())` 가드 | 초기 데이터 로딩이 완료되기 전에는 화면을 그리면 안 되는 경우 (깜박임 방지) | 초기 로딩이 필요 없거나, 빈 상태로 보여줘도 무방한 화면 |
| `SHARED_DATA_KEY` + `emitAsync()` 호출 | 해당 화면에서 `SdSharedDataProvider`에 등록된 데이터를 변경(생성/수정/삭제)하는 경우 | 조회만 하는 화면, sharedData에 등록되지 않은 데이터를 다루는 화면 |

## 변형 (Variation)

아래 확장 중 필요한 것만 선택적으로 얹는다. 각 확장은 self-contained 문서에서 최소 뼈대 대비 diff를 제공한다.

| 확장 | 언제 쓰나 | 전제 | 문서 |
|---|---|---|---|
| A | 셀 직접 편집 + 일괄 저장(inline 편집) | 없음 | [extension-a-inline-edit.md](./crud-list/extension-a-inline-edit.md) |
| B | 선택 체크박스 + 선택 삭제·복구 | A | [extension-b-selection.md](./crud-list/extension-b-selection.md) |
| C | 시트 맨 앞 고정 열에 row별 inline 삭제·복구 | A + B | [extension-c-inline-delete.md](./crud-list/extension-c-inline-delete.md) |
| D | 선택 모달 전환(항목을 골라 `close.emit`으로 돌려줌) | A + B | [extension-d-select-modal.md](./crud-list/extension-d-select-modal.md) |
| E | 조회 전용 modal(부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용 표시) | 없음 (최소 뼈대에 직접) | [extension-e-readonly-modal.md](./crud-list/extension-e-readonly-modal.md) |
| F | 모달 편집 모드(행 클릭 → 편집 모달). A와 상호 배타 | 없음 | [extension-f-modal-edit.md](./crud-list/extension-f-modal-edit.md) |
| G | 엑셀 업로드/다운로드 (`_upsertItem` 재사용) | A | [extension-g-excel.md](./crud-list/extension-g-excel.md) |

## 🚫 흔한 실수 (Anti-patterns)

### modal = 선택 모달로 반사적 부착

`viewType() === "modal"`이라는 사실만으로 "선택 모달"이라고 단정하고 `SdSelectModal<T>` 계약을 부착하지 않는다. modal 용도는 최소 두 가지다 — (a) 선택 모달(확장 D): 항목을 골라 `close.emit`으로 돌려줌 / (b) 조회 전용(확장 E): 부모 레코드의 자식 목록·이력을 읽기 전용으로 표시, 닫기는 SdModal 기본 "X".

```typescript
// ❌ viewType() === "modal"만 보고 선택 모달 계약을 반사적으로 부착
export class CustomerList implements SdSelectModal<ICustomer> {
  selectMode = input<"single" | "multi">();
  selectedItemKeys = input<any[]>([]);
  close = output<SelectModalOutputResult<ICustomer>>();
  // ... 조회 전용인데도 하단 "선택 해제 / 확인" 바, cumulativeSelection까지 전부 이식
}

// ✅ modal 용도를 먼저 확정한다
//   (a) 선택 모달이면 확장 D 스켈레톤부터 시작
//   (b) 조회 전용이면 확장 E 스켈레톤부터 시작 — SdSelectModal 계약 부착 안 함
```

**근거**: 조회 전용 modal에 선택 계약을 부착하면 호출되지 않아 죽은 코드가 된다. LLM이 풀 스택 합본을 복사하면서 "modal 지원"이라는 이유로 반사적으로 이식하는 회귀가 잦다. [확장 E](./crud-list/extension-e-readonly-modal.md) 참조.

### viewType 추측으로 3뷰 모두 박기 / 완전 분리 블록 작성

화면이 실제 어떤 뷰로 쓰이는지 확정하지 않은 채 page·modal·control 3뷰용 조각을 모두 배치하지 않는다(당장 쓰지 않는 뷰의 계약·분기는 죽은 코드가 된다). 또한 시트 페이지를 page와 modal로 겸용할 때(확장 D)도 page 블록과 modal 블록을 각각 완성하면서 필터·시트를 중복 작성하지 않는다. 하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기 위에 뷰별로 다른 조각만 `@if`로 얹는다.

```html
<!-- ❌ page 블록과 modal 블록을 각각 완성 — 필터·시트가 중복되어 수정 시 양쪽을 고쳐야 함 -->
@if (viewType() === "page") {
  <sd-topbar-container>
    <sd-topbar>...</sd-topbar>
    <sd-dock-container>
      <sd-dock class="p-default"><sd-form>...</sd-form></sd-dock>
      <sd-sheet ...>...</sd-sheet>
    </sd-dock-container>
  </sd-topbar-container>
}
@if (viewType() === "modal") {
  <sd-topbar-container>
    <sd-dock-container>
      <sd-dock class="p-default"><sd-form>...</sd-form></sd-dock>
      <sd-sheet ...>...</sd-sheet>
    </sd-dock-container>
  </sd-topbar-container>
}

<!-- ✅ 하나의 껍데기 + 차이점만 @if로 얹는다 -->
<sd-topbar-container>
  @if (viewType() === "page") { <sd-topbar>...</sd-topbar> }
  <sd-dock-container>
    <sd-dock class="p-default"><sd-form>...</sd-form></sd-dock>
    <sd-sheet ...>...</sd-sheet>
  </sd-dock-container>
</sd-topbar-container>
```

**근거**: 필터 한 줄을 수정할 때 두 블록을 모두 고쳐야 하는 상황이 생기면 구조가 잘못된 것이다. "완전 분리"는 확장 D에서 modal 하단 바 같은 **뷰별 고유 조각**에만 적용한다.

### `orderBy` 람다 + `obj.getChainValue` 회귀

`Queryable.orderBy`는 string overload를 지원하므로(`packages/orm-common/src/exec/queryable.ts:420`), 람다 + `obj.getChainValue` 우회 코드를 쓰지 않는다.

```typescript
// ❌ overload 도입 전 우회 코드 — LLM 훈련 데이터에 잔존
for (const s of sortingDefs) {
  qr2 = qr2.orderBy(
    (item) => obj.getChainValue(item, s.key, true) as any,
    s.desc ? "DESC" : "ASC",
  );
}

// ✅ string overload 사용. 체인 경로도 string으로 지원: qr.orderBy("user.name")
for (const s of sortingDefs) {
  qr2 = qr2.orderBy(s.key, s.desc ? "DESC" : "ASC");
}
```

**근거**: 람다 형태는 타입 추론을 깨뜨리고 `as any` 캐스팅을 강제한다. string overload는 체인 경로까지 타입 안전하게 지원한다.

### 테스트용 public API 노출

테스트에서 호출하려고 private 메서드의 얇은 public wrapper를 노출하지 않는다.

```typescript
// ❌ "테스트에서 호출하려고" private 메서드를 public으로 노출
async submit(diffs: IDiff[]): Promise<void> {
  await this._submitAsync(diffs);
}

// ✅ TestBed fixture + click/dispatch 이벤트 경로 또는 host의 sdSaveCommand 트리거
fixture.nativeElement.dispatchEvent(
  new KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
);
```

**근거**: public wrapper는 캡슐화를 깨고 컴포넌트의 외부 API 인상을 오염시킨다. 실제 사용자가 쓰지 않는 진입점을 공개 API로 만들면 추후 리팩토링 시 제약이 된다.

## 관련 Entry

- [`_common-rules.md`](./_common-rules.md) — 4계열 레시피 횡단 공통 규칙. 본 파일에서 재정의하지 않는 모든 규칙은 여기에 있음
- [`crud-detail.md`](./crud-detail.md) — 차이: 단일 레코드 상세 폼(뷰 범위 선택·편집·저장·삭제/복구)
- [`data-select-button.md`](./data-select-button.md) — 차이: 모달 기반 선택 버튼 직접 조립(`<sd-modal-select-button>`)
- [`page-modal-container.md`](./page-modal-container.md) — 차이: page/modal/control 3뷰 재사용 공통 껍데기만
