← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 F: 모달 편집 모드

> **선행:** 없음 (최소 뼈대 §3에 직접 얹음 — [확장 A: inline 편집/저장](./extension-a-inline-edit.md)와 **상호 배타**)

시트 셀 직접 수정(inline 편집) + 일괄 저장 대신, **행 클릭 시 편집 모달을 띄워 한 행씩 편집**하는 모드. 확장 A(inline 편집)와 **상호 배타**이므로 확장 A가 덧씌우는 파이프라인(`diffs` / `_itemsSnapshot` / `onSubmit` / `setupCanDeactivate` / `hostDirectives.sdSaveCommand` / `<sd-form #formCtrl>` 래퍼)을 이 확장에서는 부착하지 않는다. 대신 [`SdModalProvider.showAsync`](../../providers/sd-modal-provider.md)로 편집 모달을 호출하고, 모달 close 후 `_refresh()`로 리스트를 재조회한다.

**이 확장이 도입하는 요소:**

- **imports:** `SdAnchor`, `SdModalProvider`, `tablerEdit`
- **DI:** `SdModalProvider`
- **클래스 필드:** `tablerEdit` 아이콘 템플릿 참조
- **메서드:** `onCreateItemButtonClick`, `onEditItemButtonClick`, `_editItem`
- **템플릿:** 이름 컬럼 셀을 `<sd-anchor>` + 편집 아이콘으로 교체한다. inline 편집용 `<sd-textfield let-edit="edit">`는 사용하지 않는다. 등록 버튼은 `_editItem()` 직접 호출로 전환한다
- **제거 대상(확장 A가 이미 적용되어 있는 경우):** `hostDirectives.sdSaveCommand` / `host (sdSaveCommand)` / `onSaveButtonClick` / `onSubmit` / `diffs` / `_itemsSnapshot` / `_checkIgnoreChanges` / `_upsertItem` / `getIsItemChanged` / `onRemoveNewItemButtonClick` / `setupCanDeactivate` / `<sd-form #formCtrl (formSubmit)="onSubmit()">` 래퍼

> 상세: [`SdModalProvider.showAsync` 편집 모달 호출](../../providers/sd-modal-provider.md#편집-모달-호출) · [`<sd-anchor>`](../../ui-form/sd-anchor.md)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 최소 뼈대 위에 번호 순서대로 삽입할 지점을 나타낸다. 그대로 컴파일되지 않는다.

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

// 4) template — 이름 컬럼 셀을 <sd-anchor> + 편집 아이콘으로 교체한다.
//    inline 편집용 <sd-textfield> / let-edit 바인딩은 쓰지 않는다.
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
//    "선택 삭제/복구"를 남기려면 bulk API로 전환한다(아래 포인트 참조).
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

// 7) 제거 대상 (확장 A가 이미 적용되어 있는 경우 — 위 "제거 대상" 불릿 참조):
//    - @Component hostDirectives의 sdSaveCommand / host의 (sdSaveCommand)
//    - onSaveButtonClick / onSubmit / onAddItemButtonClick
//    - diffs computed / _itemsSnapshot / _checkIgnoreChanges / _upsertItem
//    - getIsItemChanged / onRemoveNewItemButtonClick
//    - setupCanDeactivate(...) 호출 (이탈 방지는 편집 모달 쪽 책임)
//    - <sd-form #formCtrl (formSubmit)="onSubmit()"> 래퍼 → <sd-sheet>를 main 영역에 직접 배치
```

**전환 후 남는 핵심 요소 체크리스트 (확장 A에서 확장 F로 이관 시 검증용):**

- [x] `hostDirectives`: `sdRefreshCommand`만 유지 (`sdSaveCommand` 제거)
- [x] host: `(sdRefreshCommand)="onRefreshButtonClick()"`만 유지
- [x] DI: `_sdModal`, `_appOrm`, `_sdToast` (+ 선택적으로 확장 B 병용 시 `_appAuth`, `_appSharedData`)
- [x] 상태: `items` / `page` / `pageLength` / `sortingDefs` / `filter` / `lastFilter` / `perms` / `viewType` / `viewTitle` / `busyCount` / `initialized`
- [x] 메서드: `onFilterSubmit` / `onRefreshButtonClick` / `onCreateItemButtonClick` / `onEditItemButtonClick` / `_editItem` / `_refresh` / `_search` / `trackByFn`
- [x] 템플릿: `<sd-form (formSubmit)="onFilterSubmit()">` 필터 dock + 이름 컬럼 `<sd-anchor>` + 기타 읽기 전용 셀
- [x] `onRefreshButtonClick` 선두의 `if (!this._checkIgnoreChanges()) return;` **제거** (확장 A 잔재)

**포인트:**

- **모달 편집 모드에는 inline diff 개념이 없다.** 개별 item 변경은 `CustomerEditModal`(상세 폼) 내부에서 즉시 upsert하고 결과를 `close.emit(true)` 같은 신호로 반환한다. 리스트는 모달 close 후 `_refresh()`로 재조회한다.
- **`CustomerEditModal`은 [`crud-detail.md`](../crud-detail.md) 레시피로 별도 작성한다.** modal 뷰 분기를 그대로 활용한다.
- **시트 `[cell]` 템플릿에 `let-edit="edit"` / `[readonly]="!edit"` 바인딩은 불필요** — inline 편집이 아니며 읽기 전용 표시만 한다.
- **"선택 삭제/복구"를 남길 경우 (확장 B와 병용):** `onToggleDeleteItemsButtonClick(del)` 내부를 diff 방식 대신 **bulk API 호출 + `_refresh()`** 로 구현한다. 확장 F는 `diffs` 파이프라인이 없어 확장 B 원본의 diff 경로가 동작하지 않기 때문이다.
  ```typescript
  protected async onToggleDeleteItemsButtonClick(del: boolean): Promise<void> {
    if (this.busyCount() > 0) return;
    const ids = this.selectedItems().map((it) => this.trackByFn(it)).filterExists();
    if (ids.length === 0) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      await this._appOrm.connectAsync((db) =>
        db.customer().where((c) => [expr.in(c.id, ids)])
          .update(() => ({ isDeleted: del })));
      await this._appSharedData.emitAsync(this.SHARED_DATA_KEY, ids);
      this._sdToast.success(`${del ? "삭제" : "복구"}되었습니다.`);
      await this._refresh();
    });
    this.busyCount.update((v) => v - 1);
  }
  ```
- **`itemId: item?.id`**: `item`이 undefined이면 "등록", id가 있으면 "수정"으로 위임한다. `CustomerEditModal` 내부에서 id 유무로 분기한다.

**🚫 흔한 실수**

> 공통 규칙(`mark` 오용, `setupCanDeactivate` 호출 위치, 시트 셀 `[inset]`/`[size]` 등)은 [레시피 공통 규칙](../_common-rules.md)을 참조한다. 이 섹션은 **모달 편집 모드 고유 실수**만 다룬다.

### 확장 A의 inline 편집 파이프라인과 동시 적용

```typescript
// ❌ 확장 A의 일괄 저장 경로와 확장 F의 모달 편집 경로를 모두 부착
@Component({
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand", "sdSaveCommand"] },
  ],
  host: {
    "(sdSaveCommand)": "onSaveButtonClick()",   // 확장 A 경로 잔존
  },
  template: `
    <sd-form #formCtrl (formSubmit)="onSubmit()">    <!-- 확장 A 래퍼 잔존 -->
      <sd-sheet ...>
        <sd-sheet-column [key]="'name'">
          <ng-template [cell]="items()" let-item="item">
            <sd-anchor (click)="onEditItemButtonClick(item, $event)"> <!-- 확장 F -->
              <ng-icon [svg]="tablerEdit" /> {{ item.name }}
            </sd-anchor>
          </ng-template>
        </sd-sheet-column>
      </sd-sheet>
    </sd-form>
  `,
})

// ✅ 두 경로 중 하나만 선택한다. 확장 F를 선택하면 확장 A가 덧씌웠던 파이프라인은 전부 제거한다.
@Component({
  hostDirectives: [
    { directive: SdCommandDirective, outputs: ["sdRefreshCommand"] },
  ],
  // (sdSaveCommand) host 바인딩 없음
  template: `
    <!-- <sd-form #formCtrl (formSubmit)="onSubmit()"> 래퍼 없음 -->
    <sd-sheet ...>
      <sd-sheet-column [key]="'name'">
        <ng-template [cell]="items()" let-item="item">
          <sd-anchor (click)="onEditItemButtonClick(item, $event)">
            <ng-icon [svg]="tablerEdit" /> {{ item.name }}
          </sd-anchor>
        </ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
})
```

**근거**: Ctrl+S가 어느 폼을 submit할지 모호해지고, `setupCanDeactivate`가 편집 모달 open 중에 이중 발동하며, 동일 행 편집 경로(inline vs 모달)가 둘 다 활성화되어 UX가 깨진다. "편집 모드"는 하나만 선택한다.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 관련: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) (이 확장과 상호 배타)
- 공통 규칙: [_common-rules.md](../_common-rules.md)
