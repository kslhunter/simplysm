← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 D: 선택 모달 전환

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md) + [확장 B: 선택 기능](./extension-b-selection.md)

같은 리스트 화면이 **다른 화면에서 항목을 골라주는 "선택 모달"로도 재사용**되도록 한다. 라우트로 진입하면 page 뷰(CRUD 리스트), `SdModalProvider.showAsync()`로 열리면 modal 뷰(selectMode에 따라 single/multi)로 자동 전환되며, 선택 결과를 `close.emit`으로 돌려준다. 조회 전용 modal(부모 레코드의 자식 목록·이력)은 [확장 E](./extension-e-readonly-modal.md)이며 계약이 다르다.

**이 확장이 도입하는 요소:**

- **imports:** `input`, `output`, `type SdSelectModal`, `type SelectModalOutputResult`
- **계약:** `implements SdSelectModal<ICustomer>` + `selectMode = input<"single" | "multi" | undefined>()` + `selectedItemKeys = input<(number | undefined)[]>([])` + `close = output<SelectModalOutputResult<ICustomer> | undefined>()`
- **생성자 effect:** modal 뷰일 때 `selectedItemKeys` → `selectedItems` 복원
- **메서드:** `onModalConfirmClick`, `onModalCancelClick`
- **`setupCanDeactivate` 변경:** modal 뷰에서는 변경사항 체크 스킵
- **템플릿:** `<sd-sheet>`에 `[selectMode]="selectMode() ?? 'multi'"` + `[cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"`. 시트 아래에 modal 전용 하단 dock(`[position]="'bottom'"`) — 선택 해제·확인 버튼.

<!-- MOVE: docs/provider-types.md#sdselectmodal --> → [`SdSelectModal<T>` 구현 패턴](../../provider-types/sd-modal-content-def.md#구현-패턴) 참조
<!-- MOVE: docs/provider-types.md#selectmodaloutputresult --> → [`SelectModalOutputResult<T>`](../../provider-types/sd-modal-content-def.md#selectmodaloutputresult) 참조
> 상세: [`<sd-dock> position="bottom"`](../../ui-layout/sd-dock.md) · [`cumulativeSelection 사용 패턴`](../../ui-data/sd-sheet.md#cumulativeselection-사용-패턴)

```typescript
// 1) imports 추가 — @angular/core의 {input, output}, @simplysm/angular의 {type SdSelectModal, type SelectModalOutputResult}
import { input, output } from "@angular/core";
import { type SdSelectModal, type SelectModalOutputResult } from "@simplysm/angular";

// 2) 클래스에 SdSelectModal<ICustomer> 계약 구현
export class CustomerListPage implements SdSelectModal<ICustomer> {
  // ...

  //== SdSelectModal<ICustomer> 계약 ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  // 3) 생성자에 복원 effect + setupCanDeactivate 조건 완화
  constructor() {
    // ... 기존 초기 effect

    // modal 뷰: selectedItemKeys → selectedItems 복원 (items 로드 후)
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

  // 4) 메서드 추가
  onModalConfirmClick(): void {
    const sel = this.selectedItems();
    this.close.emit({
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  onModalCancelClick(): void {
    this.selectedItems.set([]);

    // single 모드에서만 즉시 close (multi는 "확인" 버튼 필요)
    if (this.selectMode() === "single") {
      this.close.emit({ selectedItemKeys: [], selectedItems: [] });
    }
  }
}

// 5) template — <sd-sheet>에 selectMode·cumulativeSelection 추가, 시트 뒤에 modal 하단 dock 배치
`
<sd-sheet
  ...(기존)
  [selectMode]="selectMode() ?? 'multi'"
  [(selectedItems)]="selectedItems"
  [cumulativeSelection]="viewType() === 'modal' && selectMode() === 'multi'"
>
  <!-- 컬럼들 동일 -->
</sd-sheet>

<!-- modal 하단 확인 바 -->
@if (viewType() === "modal") {
  <sd-dock
    [position]="'bottom'"
    class="p-sm-default flex-row main-align-end gap-sm bdt bdt-theme-gray-lightest"
  >
    <sd-button [size]="'sm'" [theme]="'danger'"
      (click)="onModalCancelClick()"
      [disabled]="selectedItems().length < 1">
      선택 해제
    </sd-button>
    @if (selectMode() === "multi") {
      <sd-button [size]="'sm'" [theme]="'primary'" (click)="onModalConfirmClick()">
        확인({{ selectedItems().length }})
      </sd-button>
    }
  </sd-dock>
}
`
```

**포인트:**

- **`<sd-dock>` 하단 바는 `[position]="'bottom'"` 반드시 명시.** 생략 시 기본값 `"top"`이 적용되어 필터 위에 쌓이며 레이아웃이 깨진다(`sd-dock.ts:97`).
- **`cumulativeSelection` 의도**: 페이지를 넘어 선택을 **누적**한다. 기본값(`false`)이면 페이지 이동 시 선택 초기화. 선택 모달에서는 multi 모드일 때만 누적 의미가 있으므로 `viewType() === 'modal' && selectMode() === 'multi'`로 조건부 활성화. page 뷰의 "선택 삭제/복구"는 현재 페이지 행만 다루므로 누적하지 않는다.
- **모달 "선택 해제"는 single 모드에서만 즉시 close.** multi 모드에서 `close.emit`을 무조건 호출하면 "선택 해제 = 취소 + 닫기"가 되어 다시 선택하려면 모달을 재오픈해야 한다. multi에서는 `selectedItems.set([])`만 하고 close는 호출하지 않는다(사용자가 "확인" 버튼으로 최종 emit).
- **`selectedItemKeys`는 `filterExists()`로 undefined 제거.** `<sd-sheet>`는 key 기반이 아니라 item 기반이므로 `SelectModalOutputResult<T>.selectedItemKeys`는 수동 변환: `selectedItems().map((it) => trackByFn(it)).filterExists()`. **index fallback(`trackByFn(it, i) ?? i`) 금지** — id=undefined인 신규 행이 있을 때 0, 1, 2 같은 index 값이 가짜 key로 들어가 호출 측이 잘못된 selection을 돌려받는다.
- **`canEdit = computed(() => perms().includes("edit") && viewType() === "page")`**: modal 뷰에서는 항상 false가 되어 inline 편집 셀이 자동으로 읽기 전용으로 전환되고, 상단 "저장" 버튼과 inline 도구 dock(등록/선택 삭제·복구)이 숨겨진다. 선택 모달에서는 편집이 필요 없기 때문.
- **`setupCanDeactivate` 조건 완화:** modal 뷰에서는 라우트 이탈 개념이 없으므로 `viewType() === "modal"`이면 무조건 true 리턴. 변경사항 확인은 page 뷰에서만.
- **selectedItemKeys 복원 effect는 items 로드 후에만 동작** — 두 번째 effect가 `items()`와 `selectedItemKeys()` 둘 다 의존. `untracked()`로 감싸 set 호출이 effect 자기 자신을 재실행하지 않도록.

## Cross-reference

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A](./extension-a-inline-edit.md) + [확장 B](./extension-b-selection.md)
- 관련: [확장 E: 조회 전용 modal](./extension-e-readonly-modal.md) (계약이 다른 modal 변형)
