# Recipe: CRUD 리스트 화면 직접 조립

소비 화면이 `<sd-busy-container>` · `<sd-topbar-container>` · `<sd-topbar>` · `<sd-form>` · `<sd-sheet>` · `<sd-sheet-column>` 표준 컴포넌트를 **직접 조립**하여 CRUD 리스트 화면을 구성한다. 과거 `SdDataSheet` / `SdDataSheetBase` / `SdDataSheetColumn`이 감추고 있던 필터·페이지네이션·정렬·선택·편집·삭제복구·엑셀 업로드·다운로드·단축키 흐름을 화면 내부에 인라인으로 풀어쓴다.

## 1. Overview

- 제거된 추상화: `SdDataSheet`(컴포넌트) / `SdDataSheetBase`(추상 클래스) / `SdDataSheetColumn`(디렉티브) / `SdDataSheetItemPropInfo`·`SdDataSheetItemInfo`·`SdDataSheetSearchResult`(타입 3종) / `setupCloserWhenSingleSelectionChange`(단일 선택 시 모달 자동 닫기 유틸) / 내부 Manager 5종(`injectDataSheet{Refresh,InlineEdit,ModalEdit,Excel}Manager`, `useDataSheetFilterManager`)
- 대체: 소비 컴포넌트가 표준 조각을 직접 조립
- 조립 요소:
  - `<sd-busy-container [busy]>` — 전체 busy 오버레이
  - `<sd-topbar-container>` + `<sd-topbar>` — 공통 컨테이너, `<sd-topbar>`는 page 뷰에서만 조건부 렌더
  - `<sd-dock-container>` + `<sd-dock>` — 필터 / 도구 / 모달 하단 바를 dock로 부착, 본문(시트)은 main 영역
  - `<sd-form (formSubmit)>` — 필터 제출 / inline 편집 일괄 저장 트리거
  - `<sd-sheet>` + `<sd-sheet-column>` + `<ng-template [cell]>` — 시트 본체 (items, 페이지네이션, 정렬, 선택, `cumulativeSelection`, 셀 스타일)
  - `injectViewTypeSignal()` — page / modal / control 뷰 판정
  - `injectPermsSignal()` — 권한 signal
  - `setupCanDeactivate()` — 이탈 방지
  - `mark(sig)` — signal 참조 갱신
  - `SdToastProvider.try(fn)` — 에러 래퍼 (busy 카운트는 호출부에서 `busyCount.update`로 직접 제어)
  - `SdSelectModal<T>` — 선택 모달 계약. 소비 화면이 직접 `implements`하여 `selectMode` / `selectedItemKeys` input + `close` output 노출
  - `SdCommandDirective`(`sdRefreshCommand` / `sdSaveCommand`) — Ctrl+Alt+L / Ctrl+S 단축키
- 선택적:
  - `SdFileDialogProvider.showAsync(...)` — 엑셀 업로드 파일 선택 (`## 7` 변형)
- 데이터 비교:
  - `Array.prototype.oneWayDiffs(orgItems, keyFn)` (`@simplysm/core-common` side-effect import) — `ArrayOneWayDiffResult<T>[]` 반환 (`type: "create" | "update" | "same"`)
  - `obj.clone(items)` — snapshot 깊은 복제 (`@simplysm/core-common`)

## 2. 언제 사용하는가

| 상황 | 적용 여부 |
|---|---|
| 필터 + 페이지네이션 + 정렬 + 선택 + inline 편집이 있는 일반 CRUD 리스트 | 본 레시피 전체 적용 (기본 예제가 page 뷰) |
| 다른 화면에서 항목을 고르는 선택 모달로도 재사용 | 기본 예제가 page + modal 2뷰를 함께 지원 — 별도 variant 불필요 |
| 시트 첫 열에 row별 inline 삭제/복구 버튼이 필요 | 레시피 + [변형 1: inline 삭제 열](#5-변형-inline-삭제-열) |
| 행 클릭 시 편집 모달을 띄우는 모달 편집 모드 | 레시피 + [변형 2: 모달 편집 모드](#6-변형-모달-편집-모드) |
| 엑셀 업로드 / 다운로드가 필요 | 레시피 + [변형 3: 엑셀 업로드·다운로드](#7-변형-엑셀-업로드다운로드) |
| 상세 폼(단일 레코드 편집) | 본 레시피 대신 [`crud-detail.md`](./crud-detail.md) 사용 |
| 페이지 / 모달 뷰 분기만 필요한 단순 화면 | [`page-modal-container.md`](./page-modal-container.md) 사용 |

## 3. 완성 예제

아래는 **page + modal 2뷰 동시 지원 + inline 편집** 기준 완성 컴포넌트다. 하나의 화면이 라우트로 진입하면 CRUD 리스트(조회·등록·inline 수정·선택 삭제/복구)로 동작하고, `SdModalProvider.showAsync()`로 열리면 동일 화면이 "선택 모달"로 전환된다(selectMode에 따라 single/multi, 선택 결과를 `close.emit`). inline 삭제 열 / 엑셀 업로드·다운로드 / 모달로 row 편집은 `## 5`~`## 7`의 변형 스니펫으로 교체·추가한다.

```typescript
import { NgIcon } from "@ng-icons/core";
import {
  tablerAlertTriangle,
  tablerCirclePlus,
  tablerEraser,
  tablerDeviceFloppy,
  tablerRefresh,
  tablerRestore,
  tablerSearch,
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
import { expr } from "@simplysm/orm-common";
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
        @if (!canUse()) {
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

  //== SdSelectModal<ICustomer> 계약 ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  //== viewChild ==
  formCtrl = viewChild<SdForm>("formCtrl");

  //== 식별 / 권한 ==
  SHARED_DATA_KEY = "고객" as const;

  perms = injectPermsSignal(["sales.customer"], ["use", "edit"]);
  canUse = computed(() => this.perms().includes("use"));
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

  constructor() {
    // 필터/페이지/정렬/perms 변경 시 재조회
    effect(() => {
      if (!this.canUse()) {
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

    // 모달 뷰: selectedItemKeys → selectedItems 복원
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
    if (!this.canUse()) return;
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

  //== Internals ==
  private _checkIgnoreChanges(): boolean {
    return this.diffs().length === 0 || confirm("변경사항이 있습니다. 무시하고 진행하시겠습니까?");
  }

  // 로드+snapshot만 담당. busy/try는 호출부에서 처리.
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
  protected readonly tablerRefresh = tablerRefresh;
  protected readonly tablerRestore = tablerRestore;
  protected readonly tablerSearch = tablerSearch;
  protected readonly tablerX = tablerX;
  protected readonly mark = mark;
}
```

## 4. 분해 설명

각 블록의 역할과 원본 `SdDataSheet` 코드 대응 지점:

| 블록 | 역할 | 원본 대응 |
|---|---|---|
| `<sd-busy-container [busy]>` | 전체 busy 오버레이 | `sd-data-sheet.ts:65-71` + `SdBaseContainer` |
| `@if (initialized())` | 초기 데이터 로딩 전 콘텐츠 숨김 (깜박임 방지) | `sd-data-sheet.base.ts:94`·initial effect 말미 `initialized.set(true)` |
| `@if (!canUse())` | 권한 없음 메시지 | `sd-base-container.ts:44-51` + `page-modal-container.md` |
| `<sd-topbar-container>` 공통 껍데기 + `@if (viewType() === "page")` 내부 `<sd-topbar>` | page 뷰만 topbar 표시, modal/control은 topbar 없는 컨테이너로 사용 | `sd-data-sheet.ts:65-87` `pageTopbarTpl` |
| `<sd-dock-container>` + `<sd-dock>` (필터 / inline 도구 / modal 하단 바) | 필터·도구·modal 하단 바를 dock로 부착, 본문(`<sd-form>` + `<sd-sheet>`)은 main 영역 | `sd-data-sheet.ts:89-203` |
| `<sd-form (formSubmit)>` + `form-box-inline` + `form-box-item` | 필터 제출 폼 — 각 입력을 `<div class="form-box-item">`로 감싸 label/버튼 배치 | `sd-data-sheet.ts:111-125` 필터 슬롯 |
| inline 도구 `<sd-dock>` (page 뷰 + canEdit에만) | 등록 / 선택 삭제 / 선택 복구 | `sd-data-sheet.ts:127-203` 도구 영역 |
| `<sd-form #formCtrl (formSubmit)="onSubmit()">` + `<sd-sheet>` | main 영역의 일괄 저장 form + 시트 본체 | `sd-data-sheet.ts:205-346` + `inline-edit` 매니저 |
| `[cell]` 템플릿의 `let-edit="edit"` + `[readonly]="!edit"` | inline 편집 가능 셀 (`[inset]="true" [size]="'sm'"` 필수) | — |
| `getItemCellStyleFn` | `isDeleted` 시 취소선 | `sd-data-sheet.base.ts:137-140` |
| modal 하단 `<sd-dock [position]="'bottom'">` | 모달 뷰에서만 "선택 해제 / 확인" 바 노출 | `sd-data-sheet.ts:287-315` 모달 하단 바 |
| `hostDirectives` + `SdCommandDirective` | Ctrl+Alt+L / Ctrl+S 단축키 | `sd-data-sheet.ts:57-63` |
| `setupCanDeactivate(() => viewType() === "modal" || checkIgnoreChanges())` | 라우트 이탈 시 변경사항 확인 | `sd-data-sheet.base.ts:227` |
| 호출부(`onRefresh`/`onSubmit`/초기 effect) 내 `busyCount.update` + `sdToast.try(...)` | busy 카운트 증감 + 에러 토스트 래핑 | `injectDataSheetRefreshManager.ts:33-46` (삭제됨) |
| `diffs = computed(() => items.oneWayDiffs(_itemsSnapshot, "id"))` | 변경 감지 signal — 템플릿·호출부 모두에서 `this.diffs()`로 참조 | `injectDataSheetRefreshManager.ts`의 `getDiffs()` (삭제됨) |
| `effect(() => { if (!canUse()) ...; lastFilter(); page(); sortingDefs(); untracked(async ...); })` | 필터/페이지/정렬/perms 변경 시 재조회 + 초기 로드 | `injectDataSheetRefreshManager.ts` (삭제됨) |
| `effect(() => { if (viewType() !== "modal") return; selectedItemKeys() → selectedItems })` | 모달 뷰 초기 selection 복원 | `sd-data-sheet.base.ts:165-183` |
| `mark(this.lastFilter)` | lastFilter 참조 갱신 → effect 재실행 (값 변경 없음) | `sd-data-sheet.base.ts:245` |

### 상태 분해

| signal / computed | 역할 |
|---|---|
| `busyCount` | 중첩 비동기 작업 카운트 (0 초과 시 busy 표시) |
| `initialized` | 최초 조회 완료 여부 (완료 전 본문 숨김) |
| `items` | 현재 페이지 items |
| `selectedItems` | 선택된 item 배열 (`<sd-sheet [(selectedItems)]>`로 양방향) |
| `diffs` | `computed(() => items().oneWayDiffs(_itemsSnapshot, "id"))` — 변경 감지 signal. 템플릿(`getIsItemChanged`)·호출부(`onSubmit`·`_checkIgnoreChanges`) 모두에서 `diffs()`로 참조 |
| `page` / `pageLength` | 0-based 현재 페이지 / 전체 페이지 수 |
| `sortingDefs` | `SortingDef[]` — `{ key: string; desc: boolean }[]`, `<sd-sheet [(sorts)]>`로 양방향 |
| `filter` / `lastFilter` | `filter`는 입력 버퍼, `lastFilter`는 "조회" 제출 시점 스냅샷 (effect 의존성) |
| `_itemsSnapshot` | 최근 `_refresh()` 시점의 items 깊은 복제 (변경 감지용) |
| `hasSelectedDeleted` / `hasSelectedNotDeleted` | 선택 항목의 삭제 상태 — 선택 삭제/복구 버튼 조건 |
| `perms` / `canUse` / `canEdit` | 권한. `canEdit`은 page 뷰 + edit 권한일 때만 true (modal에선 항상 false) |
| `close` (output) | `SdSelectModal<T>` 요구 — 모달 결과 전달 |

### 메서드 분해

| 메서드 | 역할 |
|---|---|
| `onFilterSubmit()` | page=0 리셋 + `lastFilter.set({ ...filter() })` |
| `onRefreshButtonClick()` | busy/권한/변경사항 확인 후 `mark(lastFilter)` — 참조 갱신으로 effect 재실행 |
| `onSaveButtonClick()` | `formCtrl()?.requestSubmit()` — Ctrl+S와 동일 경로. `host`의 `sdSaveCommand`와 어휘 일치 |
| `onSubmit()` | diff 0건이면 정보 토스트 → `busyCount` 증가 → `_sdToast.try(diff 일괄 upsert + emit + _refresh)` → `busyCount` 감소 |
| `onAddItemButtonClick()` | `items.update((list) => [{ isDeleted: false }, ...list])` — 신규 행을 맨 앞에 삽입 |
| `onToggleDeleteItemsButtonClick(del)` | 선택 항목의 `isDeleted = del` 토글 + `mark(items)`. 실제 DB 반영은 저장 버튼 클릭 시 `onSubmit`에서 일괄 처리 |
| `onModalConfirmClick()` / `onModalCancelClick()` | 모달 결과 emit. 취소는 `selectMode === "single"`일 때만 즉시 close |
| `_checkIgnoreChanges()` | `diffs()` 길이 0이면 true, 아니면 `confirm` 후 true/false |
| `getIsItemChanged(item)` | row 하이라이트 판정 — `item.id == null`(신규) 또는 `diffs()`에 해당 id가 포함되면 true |
| `onRemoveNewItemButtonClick(item)` | 저장 전 신규 row(`id == null`) 제거 — reference 기반 `filter((it) => it !== item)` |
| `_refresh()` | `_search(true)` → `items.set` + `pageLength.set` + 선택 유지 + `_itemsSnapshot = obj.clone(r.items)`. busy/try는 호출부 책임 |
| `_search(usePagination)` | ORM 쿼리 (filter/sort/limit) — `_refresh`와 엑셀 다운로드 등에서 재사용 |
| `_upsertItem(db, item, logType)` | 중복 검사 → `upsert(() => record, ["id"])` → `insertDataLogAsync` |

## 5. 변형: inline 삭제 열

기본 예제는 상단 "선택 삭제 / 선택 복구" 버튼만 사용하지만, row별 inline 삭제/복구 버튼을 함께 제공하고 싶으면 시트 맨 앞 고정 컬럼에 `<sd-anchor>`를 추가한다. `CustomerListPage`를 기준으로 아래 변경을 적용한다.

```typescript
// 1) imports 추가
import { SdAnchor } from "@simplysm/angular";
// @Component imports 배열에도 SdAnchor 추가

// 2) template — <sd-sheet> 가장 앞에 isDeleted 고정 컬럼 삽입
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
  <!-- 나머지 컬럼(id, name, phone, categoryId, ...)은 기본 예제 그대로 -->
</sd-sheet>

// 3) 메서드 추가
protected onToggleDeleteItemButtonClick(item: ICustomer): void {
  item.isDeleted = !item.isDeleted;
  mark(this.items); // OnPush 재렌더 + effect 알림
}
```

**포인트:**

- inline 삭제도 **`item.isDeleted` 플래그 토글**로 표현. 행을 `items`에서 제거하면 `oneWayDiffs`가 누락한다. DB 반영은 저장 버튼 클릭 시 `onSubmit`에서 일괄 처리(soft-delete).
- **`canEdit() && viewType() === "page"` 조건**: modal 뷰 / 권한 없음이면 열 자체 숨김 (`canEdit`은 이미 page 한정이지만 명시적으로 쓰면 의도가 분명).
- 컬럼 key는 **`"_isDeleted"`** (언더스코어 prefix) — 서버 정렬·컬럼 지속성 설정과 충돌하지 않는 임의 키.
- 기본 예제의 상단 "선택 삭제/복구" 버튼과 **공존** 가능. row별 빠른 처리 + 다건 일괄 처리.

> **`oneWayDiffs`는 delete를 다루지 않는다.** `newItems.oneWayDiffs(orgItems, keyFn)`은 `type: "create" | "update" | "same"`만 반환한다. 삭제 의사는 **`item.isDeleted = true` 플래그**로 표현하여 `"update"` diff로 전송된다. 행을 `items` 배열에서 물리적으로 제거하면 diff에서 누락되므로 절대 삭제하지 않는다.

## 6. 변형: 모달 편집 모드

기본 예제는 시트 셀 직접 수정(inline 편집) + 일괄 저장 방식이지만, 행 클릭 시 **편집 모달을 띄워 한 행씩 편집**하는 모드가 필요하면 아래 변경을 적용한다. 일괄 저장(diff) / snapshot / `_checkIgnoreChanges` / `setupCanDeactivate`는 불필요해져 모두 제거된다.

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

// 5) template — inline 편집용 도구 <sd-dock>의 "등록" 버튼은 _editItem() 호출로 바꿈.
//    "선택 삭제/복구"는 bulk API로 별도 처리(개별 _refresh 필요).
<sd-button ... (click)="onCreateItemButtonClick()">등록</sd-button>

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

// 7) 제거:
//    - hostDirectives의 sdSaveCommand / host의 (sdSaveCommand)
//    - onSaveButtonClick / onSubmit / onAddItemButtonClick
//    - diffs computed / _itemsSnapshot / _checkIgnoreChanges / _upsertItem / getIsItemChanged / onRemoveNewItemButtonClick
//    - setupCanDeactivate(...) 호출 (다른 화면의 이탈 방지는 편집 모달이 책임짐)
//    - <sd-form #formCtrl (formSubmit)="onSubmit()"> 래퍼 → <sd-sheet>를 main 영역에 직접 배치
```

**포인트:**

- 모달 편집 모드에서는 **inline diff 개념이 없다.** 개별 item 변경은 `CustomerEditModal`(상세 폼) 내부에서 즉시 upsert하고 결과를 `close.emit(true)`로 전달. 리스트는 모달 close 후 `_refresh()`로 재조회.
- `CustomerEditModal`은 [`crud-detail.md`](./crud-detail.md) 레시피로 별도 작성. modal 뷰 분기를 그대로 활용.
- 시트 `[cell]` 템플릿에 **`let-edit="edit"` / `[readonly]="!edit"`는 불필요** (inline 편집 아님). 읽기 전용 표시만.
- "선택 삭제/복구"를 남길 경우 `onToggleDeleteItemsButtonClick(del)` 내부를 diff 방식 대신 **bulk API 호출 + `_refresh()`** 로 구현한다:
  ```typescript
  protected async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
    if (this.busyCount() > 0) return;
    const ids = this.selectedItems().map((it) => this.trackByFn(it)).filterExists();
    if (ids.length === 0) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._appOrm.connectAsync((db) => db.customer().where((c) => [expr.in(c.id, ids)]).updateAsync(() => ({ isDeleted: del })));
      await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, ids);
      this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }
  ```

## 7. 변형: 엑셀 업로드/다운로드

`SdFileDialogProvider`로 파일 선택, `ExcelWrapper`(@simplysm/excel) + `zod` 스키마로 읽기/쓰기. 다운로드는 `_search(false)`로 전체 페이지 조회 후 `@simplysm/core-browser`의 `downloadBlob`으로 내려받는다.

```typescript
// 1) import 추가
import { tablerFileExcel, tablerUpload } from "@ng-icons/tabler-icons";
import { SdFileDialogProvider } from "@simplysm/angular";
import { DateTime } from "@simplysm/core-common";
import { downloadBlob } from "@simplysm/core-browser";
import { ExcelWrapper } from "@simplysm/excel";
import { z } from "zod";

// 2) DI 추가
private readonly _sdFileDialog = inject(SdFileDialogProvider);

// 3) 클래스 필드 추가 — 아이콘 + ExcelWrapper (zod 스키마로 컬럼 정의)
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

// 5) 메서드 추가
async onDownloadExcelButtonClick(): Promise<void> {
  if (this.busyCount() > 0) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    // 전체 조회 (페이지네이션 없이) — 기본 예제의 _search를 그대로 재사용
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

- 다운로드는 **`_search(false)`**(페이지네이션 없이 전체)로 쿼리. 페이지당 50건 제한이 걸리면 현재 페이지만 다운로드되는 실수가 생기므로 `usePagination: false` 명시 필수.
- 업로드는 `_excelWrapper.read(file)` → `_upsertItem`(기본 예제의 메서드) **재사용**. 중복 검사·DataLog 기록 로직이 동일하게 적용됨.
- 엑셀의 텍스트 컬럼(고객사명·MPN 등)을 FK id로 변환해야 하면 **DB 재조회 대신 `useSharedSignal(...)`로 이미 로드된 공유 데이터를 재사용**한다. 예: `this.sharedCustomers.items().toMapValues((it) => it.name, (it) => it.orderBy((v) => (v.__isHidden ? 1 : 0))[0])`. 같은 키에 숨김·비숨김 항목이 섞여 있으면 `orderBy`로 비숨김(`__isHidden: false`)을 우선순위로 정렬한다. 별도 `_buildIdMap` 같은 helper로 분리하지 말고 `toMapValues`를 `onUploadExcelButtonClick` 내부에 직접 인라인한다 (단일 호출처).
- 오래 걸리는 대량 업로드에는 §9 "`busyMessage`는 필요할 때만 추가"를 참조하여 `busyMessage.set("엑셀 업로드 중...")`을 선택적으로 부착.

## 8. 뷰 타입 분기

page·modal·control 세 뷰는 **하나의 `<sd-topbar-container>` + `<sd-dock-container>` 공통 껍데기** 위에 뷰별로 다른 조각만 `@if`로 얹어 구성한다. 세 뷰별로 별도 블록을 전체 복제하지 않는다.

| 뷰 | topbar | dock (도구 바) | main (시트) | 하단 바 |
|---|---|---|---|---|
| page | `<sd-topbar>` (새로고침/저장/...) | inline 도구 `<sd-dock>` (canEdit) | `<sd-form>` + `<sd-sheet>` | 없음 |
| modal | 없음 | inline 도구 숨김 (`canEdit` = false) | 동일 | `<sd-dock [position]="'bottom'">` (선택 해제 / 확인) |
| control | 없음 | 필요 시 주석만 | 동일 | 없음 |

- **`<sd-dock>` position 명시**: 필터·inline 도구는 기본 `"top"`. **modal 하단 바는 반드시 `[position]="'bottom'"`를 명시**한다 — 누락하면 상단에 쌓여 필터·도구와 겹친다(`packages/angular/src/layout/dock/sd-dock.ts:97`).
- **`canEdit = perms().includes("edit") && viewType() === "page"`**: edit 권한이 있어도 modal 뷰에서는 항상 false. 시트 셀의 `[readonly]="!edit"`·inline 도구 바 모두 자동으로 비활성화.
- **`selectMode ?? 'multi'`**: modal로 호출할 때 input으로 `"single"` / `"multi"` 전달. 기본은 page 뷰용 `'multi'`로 fallback.
- **`cumulativeSelection="viewType() === 'modal' && selectMode() === 'multi'"`**: 모달 + 다중 선택 조합에서만 페이지를 넘어 선택 누적. 기본값(`false`)이면 페이지 이동 시 선택이 초기화되는데, 일괄 작업 대상 리스트에서 이는 의도적 동작.

## 9. 주의사항 (자주 하는 실수)

### 공통 유틸 재도입 금지

- `useCrudList()`, `useDataSheet()`, `setupCumulateSelectedKeys2()` 같은 공통 헬퍼를 도입하지 말 것. 이 레시피가 제거한 추상화를 다시 만드는 행위다. 세 화면이 비슷해 보여도 화면마다 필드·동작 시그니처가 조금씩 다르므로 복사·수정이 낫다

### 뷰 분기를 "완전 분리 블록"으로 쓰지 않는다

- 시트 페이지를 modal로도 쓰는 경우, LLM이 page 블록과 modal 블록을 각각 완성하면서 **필터·시트를 중복 작성**하기 쉽다. 본 레시피의 기본 예제처럼 **하나의 껍데기 + 차이점만 `@if`** 로 얹어야 한다. 필터 하나를 수정할 때 두 블록을 모두 고치는 상황이 나오면 구조가 잘못된 것.

### `<sd-dock>` position 누락

- `<sd-dock>`의 `position` input 기본값은 `"top"`이다(`sd-dock.ts:97`). 모달 하단 "확인 바"에 `[position]="'bottom'"`을 빠뜨리면 필터 위에 쌓여 레이아웃이 깨진다.

### 시트 셀 스타일 함정

- `<sd-sheet-column>`의 `[cell]` 템플릿 내부에 삽입되는 컨트롤(`sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea` 등)은 **`[inset]="true" [size]="'sm'"` 명시 필수**. 누락 시 컴파일 에러 없이 스타일만 깨진다(테두리·여백이 시트 셀에 맞지 않음). 예외: 복합 구조(텍스트+컨트롤)는 `[inset]="false"`, 시트 행 높이가 큰 경우는 `[size]` 생략 가능

### `oneWayDiffs`의 삭제 처리

- `newItems.oneWayDiffs(orgItems, keyFn)`은 **삭제(delete)를 다루지 않는다**. `type: "create" | "update" | "same"`만 반환
- 삭제 의사 표현은 **`item.isDeleted = true` 플래그**로 하고 `"update"` diff로 전송 (서버가 soft-delete 처리)
- inline 편집 시 `items` 배열에서 row를 제거하지 말 것. diff에서 해당 row가 누락되어 서버가 변경을 감지할 수 없다

### `selectedItemKeys`는 `filterExists()`로 undefined 제거

- `<sd-sheet>`는 key 기반이 아니라 item 기반이므로 `SelectModalOutputResult<T>.selectedItemKeys`는 수동 변환한다: `selectedItems().map((it) => trackByFn(it)).filterExists()`.
- **index fallback(`trackByFn(it, i) ?? i`) 금지.** id가 `undefined`인 신규 row가 있을 때 0, 1, 2 같은 index 값이 가짜 key로 들어가 호출 측이 잘못된 selection을 돌려받는다. `filterExists()`로 `undefined`를 제거하는 게 안전하다.

### 모달 "선택 해제"는 single 모드에서만 close

- `onModalCancelClick`에서 `this.close.emit`을 무조건 호출하면 multi 모드에서 "선택 해제 = 취소 + 닫기"가 되어 다시 선택하려면 모달을 재오픈해야 한다. multi에서는 `selectedItems.set([])`만 하고 close는 호출하지 않는다(사용자가 "확인" 버튼으로 최종 emit).

### `injectViewTypeSignal()` 호출 시점

- `injectViewTypeSignal()`은 생성자 실행 중 또는 필드 이니셜라이저에서만 호출한다. `computed`·`effect` 콜백이나 일반 메서드에서 호출하면 `NG0203` 런타임 에러가 발생한다 (Angular `inject()` 제약)

### `busyMessage`는 필요할 때만 추가

- 기본 예제는 `<sd-busy-container [busy]="busyCount() > 0">`만 사용하고 `busyMessage` signal을 두지 않는다. 짧은 CRUD는 progress 아이콘만으로 충분.
- 오래 걸리는 작업(대량 엑셀 업로드·집계 등)에 진행 문구가 필요하면 **필요한 화면에만** `busyMessage = signal<string | undefined>(undefined)` 추가 + `[message]="busyMessage()"` 바인딩 + 구간별 `busyMessage.set(...)`/`set(undefined)` 제어. 미사용 시 선언·바인딩 모두 생략.

### 테스트만을 위한 public API 금지

- `async submit(diffs) { await this._submitAsync(diffs); }` 같이 "테스트에서 호출하려고" private 메서드의 얇은 public wrapper를 노출하지 않는다. 캡슐화를 깨고 컴포넌트의 외부 API 인상을 오염시킨다. 테스트는 TestBed fixture + click/dispatch 이벤트 경로 또는 host의 `sdSaveCommand` 트리거로 수행.

## 10. 레시피 작성 관용 규칙

향후 `crud-detail.md` · `data-select-button.md` 등 데이터 관련 레시피가 추가될 때 아래 3개 규칙을 공통으로 따른다.

### 규칙 1: 시트 셀 내부 컨트롤은 `[inset]="true" [size]="'sm'"` 명시

- `<sd-sheet-column>` `[cell]` 템플릿 내부의 `sd-textfield` / `sd-select` / `sd-checkbox` / `sd-numpad` / `sd-date-range-picker` / `sd-textarea`는 레시피에서 **항상** `[inset]="true" [size]="'sm'"`를 함께 노출한다
- 예외: 복합 구조(텍스트+컨트롤) → `[inset]="false"`. 큰 시트 행 → `[size]` 생략
- 누락 시 컴파일 에러가 발생하지 않아 LLM이 빠뜨리기 쉽다. 자주 하는 실수 섹션에 명시

### 규칙 2: `mark(sig)`는 "저장 감지"가 아니라 "UI 동기화"

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
