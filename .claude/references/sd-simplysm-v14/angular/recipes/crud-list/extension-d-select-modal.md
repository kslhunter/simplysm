← [CRUD 리스트 레시피 진입점](../crud-list.md)

# 확장 D: 선택 모달 전환

> **선행:** [확장 A: inline 편집/저장](./extension-a-inline-edit.md) + [확장 B: 선택 기능](./extension-b-selection.md)

같은 리스트 화면이 **다른 화면에서 항목을 골라주는 "선택 모달"로도 재사용**되도록 한다. 라우트로 진입하면 page 뷰(CRUD 리스트), `SdModalProvider.showAsync()`로 열리면 modal 뷰(selectMode에 따라 single/multi)로 자동 전환되며, 선택 결과를 `close.emit`으로 돌려준다.

## When to use / When NOT to use

- ✅ 같은 리스트를 라우트 페이지와 "선택 모달" 두 용도로 겸용
- ✅ 항목을 골라 호출 측에 `SelectModalOutputResult<T>`로 돌려주는 selector 화면
- ✅ multi 선택에서 페이지 이동 후에도 선택을 누적 유지해야 하는 경우
- ❌ 부모 레코드의 자식 목록·이력을 **읽기 전용으로** 표시(닫기는 SdModal 기본 "X") → [확장 E](./extension-e-readonly-modal.md)
- ❌ 리스트 **자체는 page** 이고 행 클릭 시 **편집 모달**만 띄우는 경우 → [확장 F](./extension-f-modal-edit.md). 확장 A(inline 편집)와 상호 배타
- ❌ 리스트가 아닌 단일 값 셀렉트 버튼 → [`data-select-button.md`](../data-select-button.md)

## 전제조건

- 선행: 확장 A(inline 편집/저장) + 확장 B(선택 기능). 본 확장의 코드는 A의 `canEdit` / `_checkIgnoreChanges` 와 B의 `selectedItems` / `isDeleted` / `getItemCellStyleFn` / `selectMode="multi"` 를 그대로 재사용한다
- 횡단 규칙: [`_common-rules.md`](../_common-rules.md) — 특히 [`injectViewTypeSignal()` 호출 시점](../_common-rules.md#injectviewtypesignal은-생성자-또는-필드-이니셜라이저에서만-호출한다), [signal 필드 초기값에서 다른 signal 읽기 금지](../_common-rules.md#signal-필드-초기값에서-다른-signal을-읽지-않는다)
- 호출 측: `SdModalProvider.showAsync(CustomerList, { inputs: { selectMode: "multi", selectedItemKeys: [...] } })` 형태로 연다

## 이 확장이 도입하는 요소

| 영역 | 추가 |
|------|------|
| imports | `input`, `output` (`@angular/core`), `type SdSelectModal`, `type SelectModalOutputResult` (`@simplysm/angular`) |
| 계약 | `implements SdSelectModal<ICustomer>` + `selectMode` input + `selectedItemKeys` input + `close` output |
| 생성자 effect | modal 뷰일 때 `selectedItemKeys` → `selectedItems` 복원 (items 로드 후) |
| `setupCanDeactivate` | modal 뷰에서 변경사항 체크 스킵 |
| 메서드 | `onSelectedItemsChange` — modal + single 모드일 때 선택 즉시 자동 닫기 |
| 메서드 | `onModalConfirmClick`, `onModalCancelClick` |
| 파생 | `canEdit = computed(() => perms().includes("edit") && viewType() === "page")` — modal에서는 inline 편집 자동 비활성화 |
| 템플릿 | `<sd-sheet>`에 `[selectMode]` 조건부 바인딩 + `[autoSelect]` single 모드 클릭 자동선택 + modal 전용 하단 dock (확인/선택 해제) |

## 코드 (확장 A + B 위에 얹는 diff)

> **아래 코드 블록은 diff 조각이다.** 독립 실행 가능한 완성 클래스가 아니며, 선행 확장(A+B) 위에 번호 순서대로 삽입·교체할 지점을 나타낸다. 그대로 컴파일되지 않는다.

```typescript
// 1) imports 추가
import { input, output } from "@angular/core";
import { type SdSelectModal, type SelectModalOutputResult } from "@simplysm/angular";

// 2) 클래스에 SdSelectModal<ICustomer> 계약 구현
export class CustomerList implements SdSelectModal<ICustomer> {
  // ... 기존 확장 A + B 멤버 ...

  //== SdSelectModal<ICustomer> 계약 ==
  selectMode = input<"single" | "multi" | undefined>();
  selectedItemKeys = input<(number | undefined)[]>([]);
  close = output<SelectModalOutputResult<ICustomer> | undefined>();

  //== 파생 재정의 — modal 뷰에서는 inline 편집 자동 비활성화 ==
  // canEdit을 viewType=="page" 조건으로 묶어, modal 뷰에서는 편집 셀·저장·등록 버튼이 자동으로 숨겨진다
  canEdit = computed(() => this.perms().includes("edit") && this.viewType() === "page");

  constructor() {
    // ... 기존 초기 effect (필터/페이지/정렬 재조회) ...

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

    // modal 뷰는 라우트 이탈 개념이 없으므로 변경사항 체크 스킵
    setupCanDeactivate(() => this.viewType() === "modal" || this._checkIgnoreChanges());
  }

  // 3) 메서드 추가

  // modal + single 모드: 선택 즉시 자동 닫기
  onSelectedItemsChange(): void {
    if (this.viewType() !== "modal") return;
    if (this.selectMode() !== "single") return;

    const sel = this.selectedItems();
    if (sel.length !== 1) return;

    const selKey = this.trackByFn(sel[0]);
    if (this.selectedItemKeys().includes(selKey)) return;

    this.close.emit({
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  onModalConfirmClick(): void {
    const sel = this.selectedItems();
    this.close.emit({
      // id=undefined 신규 행 제거 — index fallback 금지(아래 Anti-patterns 참조)
      selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
      selectedItems: sel,
    });
  }

  onModalCancelClick(): void {
    this.selectedItems.set([]);

    // single 모드에서만 즉시 close (multi는 "확인" 버튼 필요 — 아래 Anti-patterns 참조)
    if (this.selectMode() === "single") {
      this.close.emit({ selectedItemKeys: [], selectedItems: [] });
    }
  }
}
```

```html
<!-- 4) template — <sd-sheet>에 selectMode + autoSelect 추가, selectedItemsChange 이벤트, 시트 뒤에 modal 하단 dock 배치 -->
<sd-sheet
  ...(기존)
  [selectMode]="selectMode() ?? 'multi'"
  [autoSelect]="viewType() === 'modal' && selectMode() === 'single' ? 'click' : undefined"
  [(selectedItems)]="selectedItems"
  (selectedItemsChange)="onSelectedItemsChange()"
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
```

## 포인트

- **`canEdit`에 `viewType() === "page"` 조건 추가.** modal 뷰에서 자동으로 inline 편집 셀이 읽기 전용이 되고, 상단 "저장" 버튼과 inline 도구 dock(등록/선택 삭제·복구)이 숨겨진다. 선택 모달은 편집 목적이 아니다.
- **`[autoSelect]="'click'"` — modal + single 모드 전용.** 클릭 한 번으로 행이 즉시 선택되도록 한다. multi 모드에서는 `undefined`(기본 동작)로 두어 체크박스 누적 선택이 유지된다.
- **`(selectedItemsChange)` 이벤트에서 single 자동 닫기.** modal + single 모드일 때 행 하나가 선택되면 `close.emit`으로 결과를 즉시 반환한다. 이미 선택된 key와 동일한 행을 클릭하면 무시하여 중복 닫기를 방지한다.
## 🚫 Anti-patterns

### multi 모드에서 "선택 해제"가 close까지 호출

```typescript
// ✅ single에서만 즉시 close. multi는 set([])만 수행 후 "확인" 버튼으로 최종 emit
onModalCancelClick(): void {
  this.selectedItems.set([]);
  if (this.selectMode() === "single") {
    this.close.emit({ selectedItemKeys: [], selectedItems: [] });
  }
}
```

**근거**: multi에서 "선택 해제" = "취소 + 닫기"가 되면 사용자가 다시 선택을 시작하려고 모달을 재오픈해야 한다. multi는 여러 행을 점진적으로 누적하는 UX이므로 닫는 트리거는 "확인" 버튼에만 둔다.

### `selectedItemKeys` 반환에 index fallback

```typescript
// ✅ undefined를 제거하여 확정된 key만 전달
this.close.emit({
  selectedItemKeys: sel.map((it) => this.trackByFn(it)).filterExists(),
  selectedItems: sel,
});
```

**근거**: `SelectModalOutputResult<T>.selectedItemKeys`는 호출 측이 DB 식별자로 사용한다(`packages/angular/src/core/select-modal-output-result.ts:4`). 신규 행 index를 섞으면 호출 측의 "이미 저장된 id" 집합과 충돌한다.

## 관련 Entry

- 진입점: [crud-list.md](../crud-list.md)
- 선행: [확장 A: inline 편집/저장](./extension-a-inline-edit.md) — `canEdit` / `_checkIgnoreChanges` 제공
- 선행: [확장 B: 선택 기능](./extension-b-selection.md) — `selectedItems` / multi 선택 / `getItemCellStyleFn` 제공
- 대안: [확장 E: 조회 전용 modal](./extension-e-readonly-modal.md) — 부모 레코드의 자식 목록·이력을 input으로 받아 읽기 전용 표시. `SdSelectModal<T>` 계약을 부착하지 않는다
- 대안: [확장 F: 모달 편집 모드](./extension-f-modal-edit.md) — page 상에서 행 클릭 시 편집 모달. inline 편집(확장 A)과 상호 배타
- 계약 타입: `SdSelectModal<T>` (`packages/angular/src/controls/button/sd-modal-select-button.ts:30`), `SelectModalOutputResult<T>` (`packages/angular/src/core/select-modal-output-result.ts:4`)
