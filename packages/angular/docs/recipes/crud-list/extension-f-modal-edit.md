← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 F: 모달 편집 모드

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음 — [확장 A](./extension-a-inline-edit.md)와 **상호 배타**)

시트 셀 직접 수정(inline 편집) + 일괄 저장 대신, **행 클릭 시 편집 모달을 띄워 한 행씩 편집**하는 모드. 확장 A(inline 편집)와 **상호 배타적**이다 — inline 편집 파이프라인(`diffs` / `_itemsSnapshot` / `onSubmit` / `setupCanDeactivate` / `hostDirectives.sdSaveCommand` 등)을 **전부 제거**하고, 대신 `SdModalProvider.showAsync`로 편집 모달을 호출한다.

**이 확장이 도입하는 요소:**

- **imports:** `SdAnchor`, `SdModalProvider`, `tablerEdit`
- **DI:** `SdModalProvider`
- **메서드:** `onCreateItemButtonClick`, `onEditItemButtonClick`, `_editItem`
- **템플릿:** 이름 컬럼 셀을 `<sd-anchor>` + 편집 아이콘으로 교체. inline 편집용 `<sd-textfield let-edit="edit">`는 사용하지 않는다.
- **제거 대상(확장 A의 inline 편집을 얹지 않는 경우):** `hostDirectives.sdSaveCommand` / `host (sdSaveCommand)` / `onSaveButtonClick` / `onSubmit` / `diffs` / `_itemsSnapshot` / `_checkIgnoreChanges` / `_upsertItem` / `getIsItemChanged` / `onRemoveNewItemButtonClick` / `setupCanDeactivate` / `<sd-form #formCtrl (formSubmit)="onSubmit()">` 래퍼

> 상세: [`SdModalProvider.showAsync` 편집 모달 호출](../../providers/sd-modal-provider.md#편집-모달-호출) · [`<sd-anchor>`](../../ui-form/sd-anchor.md)

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
- **`CustomerEditModal`은 [`crud-detail.md`](../crud-detail.md) 레시피로 별도 작성.** modal 뷰 분기를 그대로 활용.
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

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 관련: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) (이 확장과 상호 배타)
