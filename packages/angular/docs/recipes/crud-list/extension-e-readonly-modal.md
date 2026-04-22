← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 E: 조회 전용 modal

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음 — 확장 A/B/D 미사용)

호출자(상세 화면 등)가 부모 레코드 식별자를 input으로 전달하면, 이 modal은 해당 부모의 자식 목록·이력만 필터링해 읽기 전용으로 표시한다. 닫기는 SdModal 기본 "X" 버튼이며, 선택·확정·저장·이탈 방지는 전부 불필요하다.

- ✅ 부모 레코드의 자식 목록·이력만 필터링해 읽기 전용으로 표시할 때
- ❌ 항목을 골라 호출자에게 돌려줘야 할 때 → [확장 D: 선택 모달](./extension-d-select-modal.md)
- ❌ 부모 레코드에 대한 inline 편집·삭제가 필요할 때 → [확장 A](./extension-a-inline-edit.md)(+B) 또는 [확장 F: 모달 편집](./extension-f-modal-edit.md)

호출 예:

```typescript
await this._sdModal.showAsync({
  title: "고객 주문 이력",
  type: CustomerOrderHistoryModal,
  inputs: { customerId: 123 },
});
```

**이 확장이 도입하는 요소:**

- **imports:** `input`(`@angular/core`), `expr`(`@simplysm/orm-common`) 추가
- **input:** 부모 식별자(예: `customerId = input.required<number>()`)
- **초기 effect 의존성:** 부모 식별자 input 추가
- **`_search` 변경:** where절에 부모 식별자 하드 필터(`expr.eq(...)`), 기존 `filter.searchText` 조건과 AND
- **부착하지 않는 요소:** `implements SdSelectModal<T>` 계약, `selectedItems` / 하단 확인 바 / `cumulativeSelection` / `canEdit` / `diffs` / `setupCanDeactivate` / `<sd-form #formCtrl>` 래퍼

```typescript
// 1) imports 추가 — @angular/core의 {input}
import { input } from "@angular/core";

// 2) 클래스 선언 — implements 없음. SdSelectModal<T> 계약 3종 부착 안 함
export class CustomerOrderHistoryModal {
  // ...DI, perms, 상태는 최소 뼈대와 동일

  // 3) 부모 식별자 input (필수) — 맥락에 맞는 이름(customerId / orderId / companyId 등)
  customerId = input.required<number>();

  // 4) 초기 effect 의존성에 input 추가
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

  // 5) _search — where절에 부모 식별자 하드 필터. filter.searchText 등 기존 조건과 AND
  private async _search(usePagination: boolean): Promise<{ items: ICustomerOrder[]; pageLength: number }> {
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

// 6) template — modal 전용 레이아웃. <sd-sheet>에 selectMode / selectedItems / cumulativeSelection 미사용.
//    시트 셀은 순수 표시({{ item.name }}). 하단 "선택 해제 / 확인" 바, 상단 inline 도구 dock 부재.
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
      <sd-sheet-column [key]="'name'" [header]="'이름'">
        <ng-template [cell]="items()" let-item="item">
          <div class="p-xs-sm">{{ item.name }}</div>
        </ng-template>
      </sd-sheet-column>
      <!-- 필요한 조회 컬럼만 -->
    </sd-sheet>
  </sd-dock-container>
</sd-topbar-container>
`
```

**포인트:**

- **부모 식별자는 호출자가 `inputs`으로 전달한다.** 값이 반드시 주어져야 하면 `input.required<T>()`, 없으면 전체 조회로 fallback하는 설계면 `input<T | undefined>()`. 어느 쪽이든 `_search`의 `where` 절과 초기 effect 의존성에 반드시 포함시킨다.
- **닫기 = SdModal 기본 "X".** `close` output이 없으므로 `SdModalProvider.showAsync`의 리턴값도 사용하지 않는다. 호출 측은 `await showAsync(...)` 결과를 버리거나 `void`로 처리한다.
- **시트는 읽기 전용.** `[cell]` 템플릿에 `<sd-textfield>` 대신 `{{ item.name }}` 같은 순수 표시만 쓰고, `let-edit="edit"` / `[readonly]="!edit"` / `(valueChange)="mark(items)"`는 제거한다. `canEdit` / `diffs` / `_itemsSnapshot` / `setupCanDeactivate`도 함께 제거한다.
- **`viewType()` 분기는 쓰지 않아도 된다.** 조회 전용 modal은 보통 modal 전용으로 라우트 없이 등록된다. page/modal 양쪽을 모두 지원해야 할 때만 `viewType()`으로 topbar 영역을 분기하고, 시트·필터는 공통으로 둔다.
- **input 반영 패턴은 공통 규칙을 따른다.** → [공통 규칙: input 변경을 effect 내부에서 filter·lastFilter·page에 반영한다](../_common-rules.md#input-변경을-effect-내부에서-filterlastfilterpage에-반영한다) · [공통 규칙: input 의존 데이터 로딩에 `void this._initAsync()`를 사용하지 않는다](../_common-rules.md#input-의존-데이터-로딩에-void-this_initasync를-사용하지-않는다)

## 🚫 흔한 실수

### signal 필드 초기값에서 부모 식별자 input 읽기

```typescript
// ❌ 필드 이니셜라이저는 클래스 생성 시점에 실행된다 — input 기본값만 반환
filter = signal<IFilter>({
  customerId: this.customerId(),   // 항상 undefined (required) / 초기값
});

// ✅ 기본값은 고정, 부모 식별자는 _search 호출부에서 input을 직접 읽는다
filter = signal<IFilter>({});
// _search 내부:
const customerId = this.customerId();
qr1 = qr1.where((item) => [expr.eq(item.customerId, customerId)]);
```

**근거**: 필드 이니셜라이저는 부모로부터 input 값이 전달되기 전에 실행되므로 항상 기본값만 반환한다. → [공통 규칙: signal 필드 초기값에서 다른 signal을 읽지 않는다](../_common-rules.md#signal-필드-초기값에서-다른-signal을-읽지-않는다)

### modal = 선택 계약으로 반사 부착

```typescript
// ❌ 조회 전용인데 SdSelectModal 계약 일체를 그대로 이식
export class CustomerOrderHistoryModal implements SdSelectModal<ICustomerOrder> {
  selectMode = input<"single" | "multi">();
  selectedItemKeys = input<any[]>([]);
  close = output<SelectModalOutputResult<ICustomerOrder>>();
  // ... cumulativeSelection, 하단 "선택 해제 / 확인" 바까지 전부
}

// ✅ 계약 없이 부모 식별자 input만 받는다
export class CustomerOrderHistoryModal {
  customerId = input.required<number>();
  // ...
}
```

**근거**: 조회 전용 modal은 선택 결과를 돌려주지 않는다. 계약을 부착하면 호출되지 않아 죽은 코드가 된다. 항목 선택이 필요하면 [확장 D: 선택 모달](./extension-d-select-modal.md).

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 관련: [확장 D: 선택 모달 전환](./extension-d-select-modal.md) (계약이 다른 modal 변형) · [확장 F: 모달 편집 모드](./extension-f-modal-edit.md) (부모 레코드 편집 modal)
