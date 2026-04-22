← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 E: 조회 전용 modal

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음 — 확장 A/B/D 미사용)

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
- **부모 대상에 대한 inline 편집/삭제가 필요하면** 이 확장이 아니라 최소 뼈대 + 확장 A(+B) 또는 [확장 F. 모달 편집 모드](./extension-f-modal-edit.md)를 사용한다. 조회 전용 variant는 이름 그대로 조회만 담당한다.
- **확장 E는 독립 경로** — 최소 뼈대에만 얹으며 확장 A/B/D를 얹지 않는다. 조립 결과는 진입점의 [부록 B. 확장 매트릭스 표](../crud-list.md#부록-b-확장-매트릭스-표)에서 한눈에 확인할 수 있다.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 관련: [확장 D: 선택 모달 전환](./extension-d-select-modal.md) (계약이 다른 modal 변형)
