← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 B: 선택 기능 + 선택 삭제/복구

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md)

시트에 체크박스 기반 선택 기능을 추가하고, 선택된 행에 대한 "선택 삭제 / 선택 복구" 버튼 바를 상단에 배치한다. 확장 A(inline 편집)가 도입한 `canEdit` / `SHARED_DATA_KEY` / `_appAuth` / `_appSharedData` 등을 그대로 재사용하며, 본 확장이 `isDeleted` 플래그 / `isIncludeDeleted` 필터 / `getItemCellStyleFn`(삭제 취소선)을 도입한다.

> **적용 조건:** DB Table에 `isDeleted` 컬럼이 있는 경우에만 사용한다. 컬럼이 없는 테이블은 물리 삭제(row DELETE)로 처리하며 이 확장을 사용하지 않는다 → [공통 규칙: 삭제 방식](../_common-rules.md#삭제-방식은-db-스키마에-따라-결정한다).

**이 확장이 도입하는 요소:**

- **imports:** `SdCheckbox` (필터 "삭제항목 포함" 체크박스), `tablerEraser`, `tablerRestore`
- **타입 확장:** `IFilter`에 `isIncludeDeleted: boolean` 추가, `ICustomer`에 `isDeleted: boolean` 추가
- **상태:** `selectedItems = signal<ICustomer[]>([])`, `filter`/`lastFilter` 기본값에 `isIncludeDeleted: false` 추가
- **파생:** `hasSelectedDeleted`, `hasSelectedNotDeleted`, `getItemCellStyleFn` (삭제 행 취소선)
- **메서드:** `onToggleDeleteItemsButtonClick(del: boolean)` — confirm → DB `update` → `emitAsync` → 토스트 → `_refresh`
- **템플릿:** 필터 dock에 "삭제항목 포함" 체크박스 추가, 확장 A 도구 dock("등록" 버튼 우측)에 "선택 삭제 / 선택 복구" 버튼 추가, `<sd-sheet>`에 `[selectMode]="'multi'"` + `[(selectedItems)]` + `[getItemCellStyleFn]` 바인딩 추가
- **_search 변경:** `isIncludeDeleted` 필터에 따른 `isDeleted` where절 추가, select에 `isDeleted` 필드 추가
- **_upsertItem 변경:** upsert 데이터에 `isDeleted: item.isDeleted` 추가, 중복 검사에 `expr.eq(c.isDeleted, false)` 조건 추가
- **onAddItemButtonClick 변경:** 신규 행 리터럴에 `isDeleted: false` 포함
- **_refresh 변경:** 말미에 "현재 페이지에 남아 있는 항목만 `selectedItems` 유지" 로직 추가 — 페이지 이동 시 선택 유지를 위해

> 상세: [`<sd-sheet> selectMode/selectedItems`](../../ui-data/sd-sheet.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A) 위에 번호 순서대로 삽입·교체할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 0) imports 추가 — SdCheckbox, tablerEraser, tablerRestore
// 타입 확장 — IFilter에 isIncludeDeleted, ICustomer에 isDeleted 추가
interface IFilter {
  searchText?: string;
  isIncludeDeleted: boolean;   // ← 추가
}

interface ICustomer {
  // ...기존 필드...
  isDeleted: boolean;           // ← 추가
}

// filter/lastFilter 기본값에 isIncludeDeleted 추가
filter = signal<IFilter>({ isIncludeDeleted: false });
lastFilter = signal<IFilter>({ isIncludeDeleted: false });

// onAddItemButtonClick — 신규 행에 isDeleted: false 포함
onAddItemButtonClick(): void {
  this.items.update((list) => [{ isDeleted: false }, ...list]);
}

// 1) 상태·파생 추가
selectedItems = signal<ICustomer[]>([]);

hasSelectedDeleted = computed(() => this.selectedItems().some((it) => it.isDeleted));
hasSelectedNotDeleted = computed(() => this.selectedItems().some((it) => !it.isDeleted));

// 삭제 행 취소선 스타일
getItemCellStyleFn = (item: ICustomer): string | undefined =>
  item.isDeleted ? "text-decoration: line-through;" : undefined;

// 2) _search — isIncludeDeleted 필터 + select에 isDeleted 추가
// (기존 _search의 qr1 뒤에 추가)
if (!filter.isIncludeDeleted) {
  qr1 = qr1.where((item) => [expr.eq(item.isDeleted, false)]);
}
// select에 isDeleted 추가:
//   isDeleted: item.isDeleted,

// _upsertItem — upsert 데이터에 isDeleted 추가, 중복 검사에 isDeleted 조건 추가
// 중복 검사: expr.eq(c.isDeleted, false) 조건 추가
// upsert: isDeleted: item.isDeleted 추가

// 3) 선택 삭제/복구 메서드 — confirm → 즉시 DB 반영 → refresh → 토스트
async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
  if (!confirm(del ? "정말 삭제하시겠습니까?" : "정말 복구하시겠습니까?")) return;

  this.busyCount.update((v) => v + 1);
  await this._sdToast.try(async () => {
    const targets = this.selectedItems().filter((it) => it.id != null);
    await this._appOrm.connectAsync(async (db) => {
      for (const item of targets) {
        await db.customer()
          .where((c) => [expr.eq(c.id, item.id!)])
          .update(() => ({ isDeleted: del }));

        await db.customer().insertDataLogAsync({
          type: del ? "삭제" : "복구",
          itemId: item.id!,
          valueJson: undefined,
          userId: this._appAuth.authInfo()!.user.id,
        });
      }
    });
    await this._appSharedData.emitAsync(
      this.SHARED_DATA_KEY,
      targets.map((it) => it.id!),
    );
    this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
    await this._refresh();
  });
  this.busyCount.update((v) => v - 1);
}

// 4) _refresh 재정의 — 확장 A의 _refresh 본문에 "선택 유지 블록"만 삽입한다.
//    삽입 위치: items/pageLength 세팅 후, _itemsSnapshot 갱신 전.
//    다른 줄(r.items 세팅, _itemsSnapshot 갱신)은 확장 A와 동일하며 여기서 다시 쓰지 않는다.
private async _refresh(): Promise<void> {
  const r = await this._search(true);
  this.items.set(r.items);
  this.pageLength.set(r.pageLength);

  // ── 확장 B 추가 블록 시작 ──
  // 현재 페이지에 남아 있는 항목만 선택 유지
  const currKeys = new Set(r.items.map((it) => this.trackByFn(it)));
  this.selectedItems.update((sel) => sel.filter((it) => currKeys.has(this.trackByFn(it))));
  // ── 확장 B 추가 블록 끝 ──

  this._itemsSnapshot = obj.clone(r.items);
}

// template — 필터에 "삭제항목 포함" 체크박스, 도구 dock에 선택 삭제/복구 버튼,
//            <sd-sheet>에 selectMode + selectedItems + getItemCellStyleFn 바인딩 추가
`
  <sd-dock class="p-default">
    <sd-form (formSubmit)="onFilterSubmit()">
      <div class="form-box-inline">
        <!-- ...기존 필터 필드... -->
        <div class="form-box-item">
          <sd-checkbox [(value)]="filter().isIncludeDeleted" (valueChange)="mark(filter)">
            삭제항목 포함
          </sd-checkbox>
        </div>
      </div>
    </sd-form>
  </sd-dock>

  <!-- 확장 A가 도입한 도구 dock에 버튼 추가 (등록 버튼 우측) -->
  @if (canEdit() && viewType() === "page") {
    <sd-dock class="flex-row gap-sm p-xs-default">
      <sd-button [size]="'sm'" [theme]="'link-primary'" (click)="onAddItemButtonClick()">
        <ng-icon [svg]="tablerCirclePlus" /> 등록
      </sd-button>
      <!-- ↓ 확장 B가 추가 -->
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
    <!--
      확장 B가 추가하는 속성:
        [selectMode]="'multi'"
        [(selectedItems)]="selectedItems"
        [getItemCellStyleFn]="getItemCellStyleFn"  (삭제 행 취소선)
    -->
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
    >
      <!-- 컬럼들은 확장 A와 동일 -->
    </sd-sheet>
  </sd-form>
`
```

**포인트:**

- **선택 삭제/복구는 confirm 후 즉시 DB 반영한다.** `confirm()` → DB `update` → `emitAsync`(공유 데이터) → 토스트 → `_refresh()`. 확장 A의 inline 편집 일괄 저장 흐름과 별도 경로다 — inline 편집은 셀 수정 → 저장 버튼, 선택 삭제는 체크 → 즉시 반영.
- **`selectMode` 기본값은 `"multi"`로 둔다** — 한 번에 여러 행 삭제/복구가 기본 요구. 단일 선택이 필요한 화면에서는 `"single"`로 바꾼다.
- **페이지 이동/정렬/필터 제출 후 `_refresh` 내부에서 `selectedItems`를 현재 페이지 항목으로만 유지한다.** `trackByFn`이 반환하는 key를 기준으로 남은 항목만 걸러낸다. 페이지 간 누적 선택이 필요하면 [확장 D: 선택 모달 전환](./extension-d-select-modal.md)의 `[cumulativeSelection]`을 참조한다 (선택 모달 전용).

**🚫 흔한 실수**

> 공통 규칙(`mark` 저장 감지 오해, 시트 셀 `[inset]/[size]`, 삭제 방식 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 본 섹션은 **선택 삭제/복구 확장 고유 실수**만 다룬다.

### 신규 행(id == null)을 선택 삭제 대상에 포함한다

```typescript
// ❌ selectedItems() 전체를 DB update 대상으로 사용 —
//    신규 행(id == null)은 DB에 존재하지 않으므로 where 조건(expr.eq(c.id, undefined))이
//    예상 밖의 row를 스캔하거나 조용히 실패한다. emitAsync의 ids 단정(!)도 런타임 에러가 된다.
async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
  for (const item of this.selectedItems()) {
    await db.customer()
      .where((c) => [expr.eq(c.id, item.id)])
      .update(() => ({ isDeleted: del }));
  }
}

// ✅ id != null 만 통과시켜 실제로 DB에 저장된 row만 대상으로 한다.
async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
  const targets = this.selectedItems().filter((it) => it.id != null);
  for (const item of targets) {
    await db.customer()
      .where((c) => [expr.eq(c.id, item.id!)])
      .update(() => ({ isDeleted: del }));
  }
  await this._appSharedData.emitAsync(
    this.SHARED_DATA_KEY,
    targets.map((it) => it.id!),
  );
}
```

**근거**: 확장 A의 신규 행(`id == null`)은 DB에 insert되기 전 상태이므로 "선택 삭제"의 의미가 성립하지 않는다. 신규 행 제거는 확장 A의 [`onRemoveNewItemButtonClick`](./extension-a-inline-edit.md)이 담당한다. `emitAsync`로 전달하는 `ids` 배열의 non-null 단정(`it.id!`)도 동일 필터가 선행되어야 런타임 안전하다.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md)
- 다음 확장: [확장 C: inline 삭제/복구](./extension-c-inline-delete.md), [확장 D: 선택 모달 전환](./extension-d-select-modal.md) (이 확장 위에 누적)
