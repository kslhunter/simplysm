← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 B: 선택 기능 + 선택 삭제/복구

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md)

시트에 **체크박스 기반 선택 기능**을 추가하고, 선택된 행에 대한 "선택 삭제 / 선택 복구" 버튼 바를 상단에 배치한다. 확장 A(inline 편집)를 전제로 한다 — `canEdit` / `mark(items)` / 일괄 저장 흐름이 필요하기 때문이다.

**이 확장이 도입하는 요소:**

- **상태:** `selectedItems = signal<ICustomer[]>([])`
- **파생:** `hasSelectedDeleted = computed(() => selectedItems().some((it) => it.isDeleted))`, `hasSelectedNotDeleted` (대응)
- **메서드:** `onToggleDeleteItemsButtonClick(del: boolean)`
- **템플릿:** `<sd-sheet>`에 `[selectMode]="'multi'"` + `[(selectedItems)]="selectedItems"` + `[trackByFn]` 추가. 필터 dock 아래에 inline 도구 dock(등록 / 선택 삭제 / 선택 복구) 추가.
- **_refresh 변경:** `selectedItems` 중 현재 페이지에 없는 항목 필터링 — 페이지 이동 시 선택 유지를 위해

> 상세: [`<sd-sheet> selectMode/selectedItems`](../../ui-data/sd-sheet.md)

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
- **선택 유지 (`_refresh` 내부 `selectedItems.update(...)`)**: 페이지 이동 / 정렬 변경 / 필터 제출 후 선택 상태를 **현재 페이지에 남아 있는 항목만** 유지한다. `useSelectionManager`의 trackByFn 기반 identity 비교와 동일 원리이므로, 다른 페이지로 넘어가면 해당 페이지 selection은 사라진다(페이지 누적 선택이 필요하면 [확장 D: 선택 모달 전환](./extension-d-select-modal.md)의 `[cumulativeSelection]`을 참고하되, 그것은 선택 모달 전용).

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md)
- 다음 확장: [확장 C: inline 삭제 열](./extension-c-inline-delete.md), [확장 D: 선택 모달 전환](./extension-d-select-modal.md) (이 확장 위에 누적)
