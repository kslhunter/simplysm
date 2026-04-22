← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 A: inline 편집/저장

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음)

시트 셀을 **직접 편집**하고 상단 저장 버튼(또는 Ctrl+S)으로 **일괄 저장**한다. 최소 뼈대(§3)의 읽기 전용 셀을 `<sd-textfield [inset]="true" [size]="'sm'" [readonly]="!edit">`로 교체하고, `oneWayDiffs` 기반 변경 감지 + `_upsertItem` 일괄 실행을 추가한다. `crud-detail.md` 레시피로 편집 모달을 쓰려면 [확장 F. 모달 편집 모드](./extension-f-modal-edit.md)를 대신 얹는다.

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

> 상세: [`setupCanDeactivate`](../../utils/setup-functions.md#setupcandeactivate) · [`<sd-form>`](../../ui-form/sd-form.md) · [`<sd-textfield>`](../../ui-form/sd-textfield.md) · [`<sd-checkbox>`](../../ui-form/sd-checkbox.md) · [`<sd-anchor>`](../../ui-form/sd-anchor.md) · [`[cell] let-edit`](../../ui-data/sd-sheet.md#sdsheetcolumncelltemplate)

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

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 다음 확장: [확장 B: 선택 기능 + 선택 삭제/복구](./extension-b-selection.md) (이 확장 위에 누적)
- 관련 확장: [확장 F: 모달 편집 모드](./extension-f-modal-edit.md) (이 확장과 상호 배타)
